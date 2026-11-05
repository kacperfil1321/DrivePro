import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from './Modal';
import {
  type Instructor,
  type WeeklyScheduleDay,
  type AvailabilityException,
  type RideReservation,
  calculateAvailableSlots,
  countSlotsForDay,
  fetchWeeklySchedule,
  fetchExceptions,
} from '../lib/bookingService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  instructors: Instructor[];
  bookedRides: RideReservation[];
  onConfirm: (booking: {
    instructorId: number;
    instructorName: string;
    date: string;
    time: string;
    rideType: string;
    notes: string;
  }) => Promise<boolean | void>;
}

/* ---- helpers ---- */
const MONTHS_PL = [
  'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień',
];

/** Zwraca YYYY-MM-DD dla Date używając lokalnej strefy czasowej (bez UTC offset) */
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Zwraca datę pierwszego dnia miesiąca */
function firstOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

/** Buduje tablicę dni do wyświetlenia w siatce kalendarza (poprzedni miesiąc uzupełnia) */
function buildCalendarDays(year: number, month: number): Date[] {
  const first = firstOfMonth(year, month);
  // Adjust: week starts Monday (1); Sunday = 7
  const startOffset = (first.getDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    days.push(d);
  }
  const last = new Date(year, month + 1, 0);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // Fill to complete last row
  const remainder = 7 - (days.length % 7);
  if (remainder < 7) {
    for (let i = 1; i <= remainder; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }
  return days;
}

/* =================== COMPONENT =================== */
export const BookingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  instructors,
  bookedRides,
  onConfirm,
}) => {
  const today = useMemo(() => new Date(), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateStr(d);
  }, []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d;
  }, []);

  const [selectedInstructorId, setSelectedInstructorId] = useState<number>(
    instructors[0]?.id || 0
  );
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* calendar navigation */
  const [calYear, setCalYear] = useState<number>(() => {
    const d = new Date(tomorrowStr);
    return d.getFullYear();
  });
  const [calMonth, setCalMonth] = useState<number>(() => {
    const d = new Date(tomorrowStr);
    return d.getMonth();
  });

  /* schedule / exceptions */
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleDay[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  /* Sync first instructor */
  useEffect(() => {
    if (instructors.length > 0 && !instructors.some((i) => i.id === selectedInstructorId)) {
      setSelectedInstructorId(instructors[0].id);
    }
  }, [instructors, selectedInstructorId]);

  /* Fetch schedule on instructor change */
  useEffect(() => {
    if (!selectedInstructorId) return;
    let mounted = true;
    setIsLoadingSchedule(true);
    Promise.all([
      fetchWeeklySchedule(selectedInstructorId),
      fetchExceptions(selectedInstructorId),
    ])
      .then(([ws, exc]) => {
        if (mounted) {
          setWeeklySchedule(ws);
          setExceptions(exc);
        }
      })
      .catch((err) => console.error('Błąd grafiku:', err))
      .finally(() => { if (mounted) setIsLoadingSchedule(false); });
    return () => { mounted = false; };
  }, [selectedInstructorId]);

  /* Slots for selected day */
  const slots = useMemo(() => {
    if (!selectedDate || !selectedInstructorId) return [];
    return calculateAvailableSlots(
      selectedDate,
      selectedInstructorId,
      bookedRides,
      weeklySchedule,
      exceptions
    );
  }, [selectedDate, selectedInstructorId, bookedRides, weeklySchedule, exceptions]);

  /* Show only working-hours slots (hide outside_working_hours silently) */
  const visibleSlots = useMemo(
    () => slots.filter((s) => s.reason !== 'outside_working_hours'),
    [slots]
  );

  const availableSlotsCount = useMemo(
    () => visibleSlots.filter((s) => s.isAvailable).length,
    [visibleSlots]
  );

  /* Auto-select first free slot when date/instructor changes */
  useEffect(() => {
    const firstFree = visibleSlots.find((s) => s.isAvailable);
    setSelectedTime(firstFree ? firstFree.time : '');
    setErrorMessage(null);
  }, [visibleSlots]);

  /* Calendar days */
  const calDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  /* Min/max calendar navigation */
  const canGoBack = useMemo(() => {
    const prevMonth = new Date(calYear, calMonth - 1, 1);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return prevMonth >= thisMonth;
  }, [calYear, calMonth, today]);

  const canGoForward = useMemo(() => {
    const nextMonth = new Date(calYear, calMonth + 1, 1);
    const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    return nextMonth <= maxMonth;
  }, [calYear, calMonth, maxDate]);

  const handlePrevMonth = () => {
    if (!canGoBack) return;
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (!canGoForward) return;
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  /* Dot count cache per day */
  const getDotInfo = useCallback((dateStr: string) => {
    return countSlotsForDay(dateStr, selectedInstructorId, bookedRides, weeklySchedule, exceptions);
  }, [selectedInstructorId, bookedRides, weeklySchedule, exceptions]);

  /* Submit */
  const selectedInstructor = instructors.find((i) => i.id === selectedInstructorId);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !selectedInstructorId) {
      setErrorMessage('Wybierz instruktora, datę i wolną godzinę.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    const instructorName = selectedInstructor
      ? `${selectedInstructor.imie} ${selectedInstructor.nazwisko}`
      : 'Instruktor';
    try {
      const result = await onConfirm({
        instructorId: selectedInstructorId,
        instructorName,
        date: selectedDate,
        time: selectedTime,
        rideType: 'Jazda szkoleniowa',
        notes: '',
      });
      if (result !== false) onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Wystąpił błąd rezerwacji.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = toDateStr(today);
  const maxDateStr = toDateStr(maxDate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Zarezerwuj Termin Jazdy"
      wideClass="modal-wide"
      footer={
        <>
          <button className="btn-outline" onClick={onClose} disabled={isSubmitting}>
            Anuluj
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedTime}
          >
            {isSubmitting ? 'Rezerwowanie...' : 'Potwierdź rezerwację'}
          </button>
        </>
      }
    >
      <div className="booking-modal-body">
        {errorMessage && (
          <div className="booking-alert-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Two-column layout: left = instruktor + kalendarz, right = godziny */}
        <div className="booking-two-col">

          {/* LEFT COLUMN */}
          <div className="booking-left-col">
            {/* 1. Wybór instruktora */}
            <div className="booking-field-group">
              <label className="field-label">Wybierz instruktora</label>
              <div className="booking-instructor-cards">
                {instructors.map((ins) => {
                  const isSelected = ins.id === selectedInstructorId;
                  const initials = `${ins.imie[0] || ''}${ins.nazwisko[0] || ''}`;
                  return (
                    <button
                      key={ins.id}
                      type="button"
                      className={`booking-instructor-chip${isSelected ? ' selected' : ''}`}
                      onClick={() => setSelectedInstructorId(ins.id)}
                    >
                      <span className="booking-ins-avatar">{initials}</span>
                      <div className="booking-ins-meta">
                        <span className="booking-ins-name">{ins.imie} {ins.nazwisko}</span>
                        {ins.telefon && <span className="booking-ins-phone">{ins.telefon}</span>}
                      </div>
                      {isSelected && <span className="booking-ins-check" aria-hidden="true">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Mini kalendarz */}
            <div className="booking-field-group">
              <label className="field-label">
                Data jazdy
                <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--blue-600)', fontSize: 11 }}>
                  maks. 2 tygodnie w przód
                </span>
              </label>

              {isLoadingSchedule ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
                  Wczytywanie grafiku...
                </div>
              ) : (
                <div className="booking-calendar">
                  {/* Nav */}
                  <div className="booking-cal-nav">
                    <button
                      type="button"
                      className="booking-cal-nav-btn"
                      onClick={handlePrevMonth}
                      disabled={!canGoBack}
                      title="Poprzedni miesiąc"
                    >
                      ‹
                    </button>
                    <span className="booking-cal-title">
                      {MONTHS_PL[calMonth]} {calYear}
                    </span>
                    <button
                      type="button"
                      className="booking-cal-nav-btn"
                      onClick={handleNextMonth}
                      disabled={!canGoForward}
                      title="Następny miesiąc"
                    >
                      ›
                    </button>
                  </div>

                  {/* Weekday headers */}
                  <div className="booking-cal-grid">
                    {['Pn','Wt','Śr','Cz','Pt','Sb','Nd'].map((d) => (
                      <div key={d} className="booking-cal-weekday">{d}</div>
                    ))}

                    {/* Day cells */}
                    {calDays.map((day, idx) => {
                      const dStr = toDateStr(day);
                      const isCurrentMonth = day.getMonth() === calMonth;
                      const isToday = dStr === todayStr;
                      const isSelected = dStr === selectedDate;
                      const isPast = dStr <= todayStr;
                      const isTooFar = dStr > maxDateStr;
                      const isDisabled = isPast || isTooFar || !isCurrentMonth;

                      // Dots: only compute for valid, current-month days
                      let dotEl: React.ReactNode = null;
                      if (isCurrentMonth && !isPast && !isTooFar) {
                        const { total, free } = getDotInfo(dStr);
                        if (total > 0) {
                          // Show up to 3 dots; colour by free ratio
                          const dotsCount = Math.min(total, 3);
                          const ratio = free / total;
                          const dotClass = ratio === 0 ? 'cal-dot-full' : ratio < 0.4 ? 'cal-dot-few' : 'cal-dot-free';
                          dotEl = (
                            <div className="cal-day-dots">
                              {Array.from({ length: dotsCount }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`cal-dot ${i < free ? dotClass : 'cal-dot-full'}`}
                                />
                              ))}
                            </div>
                          );
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          className={[
                            'booking-cal-day',
                            isSelected ? 'cal-day-selected' : '',
                            isToday ? 'cal-day-today' : '',
                            isDisabled ? 'cal-day-disabled' : '',
                            !isCurrentMonth ? 'cal-day-other-month' : '',
                          ].filter(Boolean).join(' ')}
                          disabled={isDisabled}
                          onClick={() => {
                            if (!isDisabled) {
                              setSelectedDate(dStr);
                              setCalYear(day.getFullYear());
                              setCalMonth(day.getMonth());
                            }
                          }}
                          title={dStr}
                        >
                          <span className="cal-day-num">{day.getDate()}</span>
                          {dotEl}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 12, padding: '7px 12px', fontSize: 10, color: 'var(--gray-500)', borderTop: '1px solid var(--gray-100)', background: 'var(--gray-50)', flexWrap: 'wrap' }}>
                    <span><span className="cal-dot cal-dot-free" style={{ display:'inline-block', marginRight:4 }} />Dużo wolnych</span>
                    <span><span className="cal-dot cal-dot-few"  style={{ display:'inline-block', marginRight:4 }} />Mało wolnych</span>
                    <span><span className="cal-dot cal-dot-full" style={{ display:'inline-block', marginRight:4 }} />Brak wolnych</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="booking-right-col">
            <div className="booking-field-group" style={{ height: '100%' }}>
              <div className="booking-slots-header">
                <label className="field-label" style={{ marginBottom: 0 }}>
                  Dostępne godziny
                </label>
                <span className="booking-slots-count">
                  {isLoadingSchedule ? (
                    'Sprawdzanie...'
                  ) : availableSlotsCount > 0 ? (
                    `${availableSlotsCount} wolnych`
                  ) : (
                    <span className="text-red">Brak terminów</span>
                  )}
                </span>
              </div>

              {/* Selected date badge */}
              {selectedDate && (
                <div style={{ fontSize: 12, color: 'var(--blue-600)', fontWeight: 600, marginBottom: 4 }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pl-PL', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })}
                </div>
              )}

              {visibleSlots.length === 0 && !isLoadingSchedule ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
                  {selectedDate
                    ? 'Instruktor nie pracuje w tym dniu.'
                    : 'Wybierz datę, aby zobaczyć dostępne godziny.'}
                </div>
              ) : (
                <div className="booking-slots-layout">
                  {visibleSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    const isBooked = slot.reason === 'booked';

                    if (!slot.isAvailable && !isBooked) {
                      // poza grafikiem / urlop / minął — nie pokazuj
                      return null;
                    }

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.isAvailable}
                        className={[
                          'bslot',
                          slot.isAvailable ? 'bslot-free' : 'bslot-booked',
                          isSelected ? 'bslot-active' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => slot.isAvailable && setSelectedTime(slot.time)}
                        title={
                          isBooked
                            ? 'Termin zajęty przez innego kursanta'
                            : `Wybierz ${slot.time}`
                        }
                      >
                        <span className="bslot-time">{slot.time}</span>
                        <span className="bslot-icon" aria-hidden="true">
                          {slot.isAvailable ? '🟢' : '🔴'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <p className="booking-legend-hint" style={{ marginTop: 'auto', paddingTop: 8 }}>
                <span className="legend-indicator dot-free" /> Wolny
                <span className="legend-indicator dot-booked" /> Zajęty
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
