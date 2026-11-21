import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type Instructor,
  type RideReservation,
  type DispositionStatus,
  type InstructorDisposition,
  fetchBookedRides,
  fetchDispositionsForMonth,
  saveDispositionsForMonth,
  fetchOfficialSchedule,
  formatRideTimeRange,
  parseRideTimestamp,
} from '../lib/bookingService';

interface Props {
  instructor: Instructor;
  onLogout: () => void;
  onNotify?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const MONTH_NAMES_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const WEEKDAY_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

function toDateKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export const InstructorPanel: React.FC<Props> = ({ instructor, onLogout, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'dyspozycja' | 'grafik' | 'kalendarz'>('dyspozycja');

  const today = useMemo(() => new Date(), []);
  const nextMonthInitial = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [today]);

  const [dispYear, setDispYear] = useState<number>(nextMonthInitial.year);
  const [dispMonth, setDispMonth] = useState<number>(nextMonthInitial.month); // 1-12
  const [shiftsMap, setShiftsMap] = useState<Map<string, { start: string; end: string; status: DispositionStatus }>>(new Map());

  const [isLoadingDisp, setIsLoadingDisp] = useState<boolean>(false);
  const [isSavingDisp, setIsSavingDisp] = useState<boolean>(false);

  const [quickStart, setQuickStart] = useState('08:00');
  const [quickEnd, setQuickEnd] = useState('16:00');

  // Aktywnie zaznaczony dzień do bezpośredniej edycji godzin
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Grafik zatwierdzony przez administratora (status = 'zatwierdzona')
  const [officialSchedules, setOfficialSchedules] = useState<InstructorDisposition[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);

  // Kalendarz rezerwacji kursantów
  const [rides, setRides] = useState<RideReservation[]>([]);
  const [ridesFilter, setRidesFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [isLoadingRides, setIsLoadingRides] = useState(false);

  // Wczytanie dyspozycji z jednej tabeli dyspozycje_instruktorow
  const loadDisposition = useCallback(async (year: number, month: number) => {
    setIsLoadingDisp(true);
    try {
      const items: InstructorDisposition[] = await fetchDispositionsForMonth(instructor.id, year, month);
      const newMap = new Map<string, { start: string; end: string; status: DispositionStatus }>();
      items.forEach((item) => {
        newMap.set(item.data, {
          start: item.godzina_od.slice(0, 5),
          end: item.godzina_do.slice(0, 5),
          status: item.status,
        });
      });
      setShiftsMap(newMap);

    } catch (err) {
      console.error('Błąd wczytywania dyspozycji:', err);
    } finally {
      setIsLoadingDisp(false);
    }
  }, [instructor.id]);

  // Wczytanie oficjalnego grafiku (zatwierdzonych dni)
  const loadOfficialSchedule = useCallback(async () => {
    setIsLoadingSchedule(true);
    try {
      const data = await fetchOfficialSchedule(instructor.id);
      setOfficialSchedules(data);
    } catch (err) {
      console.error('Błąd pobierania grafiku:', err);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, [instructor.id]);

  // Wczytanie rezerwacji jazd
  const loadRides = useCallback(async () => {
    setIsLoadingRides(true);
    try {
      const data = await fetchBookedRides(instructor.id);
      setRides(data);
    } catch (err) {
      console.error('Błąd pobierania rezerwacji jazd:', err);
    } finally {
      setIsLoadingRides(false);
    }
  }, [instructor.id]);

  useEffect(() => {
    loadDisposition(dispYear, dispMonth);
    loadOfficialSchedule();
    loadRides();
  }, [loadDisposition, loadOfficialSchedule, loadRides, dispYear, dispMonth]);

  // Ogólny status miesiąca: jeśli choć 1 oczekuje -> 'oczekuje', jeśli wszystkie zatwierdzone -> 'zatwierdzona'
  const overallMonthStatus: DispositionStatus = useMemo(() => {
    if (shiftsMap.size === 0) return 'szkic';
    const statuses = Array.from(shiftsMap.values()).map((v) => v.status);
    if (statuses.some((s) => s === 'oczekuje')) return 'oczekuje';
    if (statuses.every((s) => s === 'zatwierdzona')) return 'zatwierdzona';
    if (statuses.some((s) => s === 'odrzucona')) return 'odrzucona';
    return 'szkic';
  }, [shiftsMap]);

  // Siatka kalendarza
  const calendarDays = useMemo(() => {
    const firstDay = new Date(dispYear, dispMonth - 1, 1);
    const lastDay = new Date(dispYear, dispMonth, 0);
    const daysCount = lastDay.getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const days: { dayNumber: number | null; dateKey: string | null }[] = [];
    for (let i = 0; i < startOffset; i++) {
      days.push({ dayNumber: null, dateKey: null });
    }
    for (let d = 1; d <= daysCount; d++) {
      days.push({ dayNumber: d, dateKey: toDateKey(dispYear, dispMonth, d) });
    }
    return days;
  }, [dispYear, dispMonth]);

  const handleToggleDayShift = (dateKey: string) => {
    if (overallMonthStatus === 'oczekuje') {
      onNotify?.('Dyspozycja na ten miesiąc została już wysłana do administratora.', 'info');
      setSelectedDayKey(dateKey);
      return;
    }

    setShiftsMap((prev) => {
      const next = new Map(prev);
      if (next.has(dateKey)) {
        // Jeśli dzień jest już zaznaczony:
        // - Jeśli to aktualnie edytowany dzień → odznacz go
        // - Jeśli to inny dzień → tylko przełącz edycję na ten dzień (nie odznaczaj)
        if (selectedDayKey === dateKey) {
          next.delete(dateKey);
          setSelectedDayKey(null);
        } else {
          setSelectedDayKey(dateKey);
        }
      } else {
        // Dzień niezaznaczony → zaznacz i otwórz do edycji
        next.set(dateKey, { start: quickStart, end: quickEnd, status: 'szkic' });
        setSelectedDayKey(dateKey);
      }
      return next;
    });
  };

  // Bezpośrednia zmiana godzin dla konkretnego dnia
  const handleUpdateDayHours = (dateKey: string, start: string, end: string) => {
    if (overallMonthStatus === 'oczekuje') return;
    setShiftsMap((prev) => {
      const next = new Map(prev);
      const current = next.get(dateKey);
      next.set(dateKey, {
        start,
        end,
        status: current?.status || 'szkic',
      });
      return next;
    });
  };

  const applyWeekdayPreset = (start: string, end: string) => {
    if (overallMonthStatus === 'oczekuje') {
      onNotify?.('Dyspozycja na ten miesiąc została już przekazana administratorowi.', 'info');
      return;
    }

    const next = new Map<string, { start: string; end: string; status: DispositionStatus }>();
    const lastDay = new Date(dispYear, dispMonth, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(dispYear, dispMonth - 1, d);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        next.set(toDateKey(dispYear, dispMonth, d), { start, end, status: 'szkic' });
      }
    }
    setShiftsMap(next);
    onNotify?.(`Zastosowano szablon dni roboczych ${start}–${end} na cały miesiąc.`, 'info');
  };

  const handleClearAll = () => {
    if (overallMonthStatus === 'oczekuje') return;
    setShiftsMap(new Map());
  };

  const handleSaveOrSubmit = async (targetStatus: DispositionStatus) => {
    if (shiftsMap.size === 0 && targetStatus === 'oczekuje') {
      onNotify?.('Zaznacz przynajmniej jeden dzień dyspozycyjności przed wysłaniem do admina.', 'error');
      return;
    }

    setIsSavingDisp(true);
    const days = Array.from(shiftsMap.entries()).map(([date, val]) => ({
      data: date,
      godzina_od: val.start,
      godzina_do: val.end,
    }));

    const result = await saveDispositionsForMonth({
      instructorId: instructor.id,
      year: dispYear,
      month: dispMonth,
      days,
      status: targetStatus,
    });

    setIsSavingDisp(false);

    if (result.success) {
      setShiftsMap((prev) => {
        const next = new Map(prev);
        next.forEach((val) => {
          val.status = targetStatus;
        });
        return next;
      });

      if (targetStatus === 'oczekuje') {
        if (result.savedToDatabase) {
          onNotify?.(`Dyspozycja na ${MONTH_NAMES_PL[dispMonth - 1]} ${dispYear} została zapisana w Supabase i przesłana do admina!`, 'success');
        } else {
          onNotify?.(`Dyspozycja zapisana lokalnie. Supabase: ${result.error || 'błąd połączenia lub brak tabeli w bazie'}`, 'info');
        }
      } else {
        onNotify?.('Szkic dyspozycji został pomyślnie zapisany.', 'info');
      }
      loadOfficialSchedule();
    } else {
      onNotify?.(`Wystąpił problem przy zapisie dyspozycji: ${result.error}`, 'error');
    }
  };

  const handlePrevMonth = () => {
    if (dispMonth === 1) {
      setDispYear((y) => y - 1);
      setDispMonth(12);
    } else {
      setDispMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (dispMonth === 12) {
      setDispYear((y) => y + 1);
      setDispMonth(1);
    } else {
      setDispMonth((m) => m + 1);
    }
  };

  // Filtrowanie jazd
  const now = new Date();
  const filteredRides = rides.filter((r) => {
    const rDate = new Date(r.data);
    if (ridesFilter === 'upcoming') return rDate >= now;
    if (ridesFilter === 'past') return rDate < now;
    return true;
  });

  const upcomingCount = rides.filter((r) => new Date(r.data) >= now).length;
  const pastCount = rides.filter((r) => new Date(r.data) < now).length;

  return (
    <div className="owner-app-shell">
      {/* Topbar instruktora – wzorowany na panelu admina */}
      <header className="owner-topbar">
        <div className="owner-brand">
          <span className="owner-brand-icon">
            <svg viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="15.5" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="4.5" stroke="currentColor" strokeWidth="2.5" />
              <path d="M18 2.5v11m-11.5 13 8-6m14.5 6-8-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="owner-brand-name">DrivePro</span>
          <span className="owner-brand-divider" />
          <span className="owner-panel-label">Panel Instruktora</span>
        </div>
        <div className="owner-topbar-actions">
          <div className="owner-profile">
            <span className="owner-profile-avatar">
              {instructor.imie[0]}{instructor.nazwisko[0]}
            </span>
            <span>
              <strong>{instructor.imie} {instructor.nazwisko}</strong>
              <small>Instruktor kat. B</small>
            </span>
          </div>
          <button type="button" className="owner-exit-button" onClick={onLogout}>Wyloguj się</button>
        </div>
      </header>

      {/* Nawigacja zakładek – wzorowana na panelu admina */}
      <nav className="owner-tabs" aria-label="Nawigacja panelu instruktora">
        <button
          type="button"
          className={`owner-tab${activeTab === 'dyspozycja' ? ' active' : ''}`}
          onClick={() => setActiveTab('dyspozycja')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Moja dyspozycja</span>
          {overallMonthStatus === 'oczekuje' && (
            <span className="owner-tab-badge">Wysłana</span>
          )}
        </button>

        <button
          type="button"
          className={`owner-tab${activeTab === 'grafik' ? ' active' : ''}`}
          onClick={() => setActiveTab('grafik')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Oficjalny grafik pracy</span>
          {officialSchedules.length > 0 && (
            <span className="owner-tab-badge">{officialSchedules.length} dni</span>
          )}
        </button>

        <button
          type="button"
          className={`owner-tab${activeTab === 'kalendarz' ? ' active' : ''}`}
          onClick={() => setActiveTab('kalendarz')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Rezerwacje i jazdy</span>
          {upcomingCount > 0 && (
            <span className="owner-tab-badge">{upcomingCount}</span>
          )}
        </button>
      </nav>

      {/* Główna zawartość */}
      <main className="owner-main">
        <div className="owner-page-heading">
          <div>
            <span className="owner-breadcrumb">
              PANEL INSTRUKTORA <b>/</b>{' '}
              {activeTab === 'dyspozycja' && 'MOJA DYSPOZYCJA'}
              {activeTab === 'grafik' && 'OFICJALNY GRAFIK PRACY'}
              {activeTab === 'kalendarz' && 'REZERWACJE I JAZDY'}
            </span>
            <h1>
              {activeTab === 'dyspozycja' && 'Moja dyspozycja'}
              {activeTab === 'grafik' && 'Oficjalny grafik pracy'}
              {activeTab === 'kalendarz' && 'Rezerwacje i jazdy'}
            </h1>
          </div>
          <span className="owner-current-date">
            {today.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* ─── ZAKŁADKA 1: DYSPOZYCJA MIESIĘCZNA ──────────────────────── */}
        {activeTab === 'dyspozycja' && (
          <div className="disp-layout-grid">
            <div className="card instructor-card">
              <div className="disp-header-bar">
                <div>
                  <h2 className="card-title">Zgłaszanie dyspozycji na miesiąc</h2>
                  <p className="card-subtitle">
                    Wybierz dni i godziny, w których jesteś dyspozycyjny. Po wysłaniu dyspozycja trafia do administratora, który ułoży grafik.
                  </p>
                </div>

                <div className="month-picker-controls">
                  <button type="button" className="cal-nav-btn" onClick={handlePrevMonth}>‹</button>
                  <span className="current-month-label">
                    {MONTH_NAMES_PL[dispMonth - 1]} {dispYear}
                  </span>
                  <button type="button" className="cal-nav-btn" onClick={handleNextMonth}>›</button>
                </div>
              </div>

              <div className={`disp-status-banner status-${overallMonthStatus}`}>
                <div className="disp-status-left">
                  <span className="disp-status-dot" />
                  <span>
                    Status dyspozycji na <strong>{MONTH_NAMES_PL[dispMonth - 1]} {dispYear}</strong>:{' '}
                    <strong>
                      {overallMonthStatus === 'szkic' && 'Szkic roboczy (niewysłana)'}
                      {overallMonthStatus === 'oczekuje' && 'Oczekuje na zatwierdzenie przez administratora'}
                      {overallMonthStatus === 'zatwierdzona' && 'Zatwierdzona przez administratora'}
                      {overallMonthStatus === 'odrzucona' && 'Wymaga poprawy / odrzucona'}
                    </strong>
                  </span>
                </div>
                <span className="disp-days-count">
                  Zaznaczono dni: <strong>{shiftsMap.size}</strong>
                </span>
              </div>

              {overallMonthStatus !== 'oczekuje' && (
                <div className="disp-templates-row">
                  <span className="template-label">Szybkie ustawienie:</span>
                  <button type="button" className="template-btn" onClick={() => applyWeekdayPreset('08:00', '16:00')}>
                    Pn–Pt 08:00–16:00
                  </button>
                  <button type="button" className="template-btn" onClick={() => applyWeekdayPreset('10:00', '18:00')}>
                    Pn–Pt 10:00–18:00
                  </button>
                  <button type="button" className="template-btn danger" onClick={handleClearAll}>
                    Wyczyść zaznaczenia
                  </button>
                </div>
              )}

              {isLoadingDisp ? (
                <div className="instructor-loading">Wczytywanie dyspozycji...</div>
              ) : (
                <div className="disp-calendar-grid">
                  <div className="disp-weekdays-row">
                    {WEEKDAY_NAMES.map((d) => (
                      <div key={d} className="disp-weekday-cell">{d}</div>
                    ))}
                  </div>

                  <div className="disp-days-grid">
                    {calendarDays.map((cell, idx) => {
                      if (!cell.dayNumber || !cell.dateKey) {
                        return <div key={`empty-${idx}`} className="disp-day-cell empty" />;
                      }

                      const isSelected = shiftsMap.has(cell.dateKey);
                      const shift = shiftsMap.get(cell.dateKey);
                      const isLocked = overallMonthStatus === 'oczekuje';
                      const isCurrentlyActive = selectedDayKey === cell.dateKey;

                      return (
                        <div
                          key={cell.dateKey}
                          className={`disp-day-cell${isSelected ? ' selected' : ''}${isLocked ? ' locked' : ''}${isCurrentlyActive ? ' active-focus' : ''}`}
                          onClick={() => handleToggleDayShift(cell.dateKey!)}
                          title={isSelected ? `Dostępny: ${shift?.start}–${shift?.end}. Kliknij, aby zmienić lub usunąć.` : 'Kliknij, aby dodać dyspozycję na ten dzień'}
                        >
                          <div className="disp-day-header">
                            <span className="disp-day-num">{cell.dayNumber}</span>
                            {isSelected && <span className="disp-check-icon">✓</span>}
                          </div>
                          {isSelected && shift ? (
                            <div className="disp-day-badge">
                              {shift.start}–{shift.end}
                            </div>
                          ) : (
                            <div className="disp-day-off">Wolne</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="disp-submit-card">
                <div className="disp-action-buttons">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => handleSaveOrSubmit('szkic')}
                    disabled={isSavingDisp || overallMonthStatus === 'oczekuje'}
                  >
                    Zapisz jako szkic
                  </button>

                  {overallMonthStatus === 'oczekuje' ? (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleSaveOrSubmit('szkic')}
                      disabled={isSavingDisp}
                    >
                      Cofnij wysłanie (edytuj)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleSaveOrSubmit('oczekuje')}
                      disabled={isSavingDisp || shiftsMap.size === 0}
                    >
                      {isSavingDisp ? 'Wysyłanie...' : 'Wyślij dyspozycję do admina'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="disp-side-col">
              {/* KARTA EDYCJI ZAZNACZONEGO DNIA */}
              {selectedDayKey && shiftsMap.has(selectedDayKey) ? (
                <div className="card instructor-card day-editor-card">
                  <div className="day-editor-header">
                    <div>
                      <span className="day-editor-tag">EDYCJA DNIA</span>
                      <h3 className="section-mini-title" style={{ margin: '4px 0 0', color: 'var(--blue-700)' }}>
                        {new Date(selectedDayKey + 'T12:00:00').toLocaleDateString('pl-PL', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="day-remove-btn"
                      onClick={() => handleToggleDayShift(selectedDayKey)}
                      title="Ustaw ten dzień jako wolny"
                    >
                      ✕ Wolne
                    </button>
                  </div>
                  <p className="side-hint-text" style={{ marginTop: 6 }}>
                    Dostosuj godziny pracy dla tego konkretnego dnia:
                  </p>

                  <div className="quick-hours-box">
                    <div className="field-group">
                      <label className="field-label">Godzina od</label>
                      <input
                        type="time"
                        className="field-input"
                        value={shiftsMap.get(selectedDayKey)?.start || '08:00'}
                        disabled={overallMonthStatus === 'oczekuje'}
                        onChange={(e) =>
                          handleUpdateDayHours(
                            selectedDayKey,
                            e.target.value,
                            shiftsMap.get(selectedDayKey)?.end || '16:00'
                          )
                        }
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Godzina do</label>
                      <input
                        type="time"
                        className="field-input"
                        value={shiftsMap.get(selectedDayKey)?.end || '16:00'}
                        disabled={overallMonthStatus === 'oczekuje'}
                        onChange={(e) =>
                          handleUpdateDayHours(
                            selectedDayKey,
                            shiftsMap.get(selectedDayKey)?.start || '08:00',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="day-editor-presets">
                    <span className="preset-mini-label">Szybkie przedziały:</span>
                    <button
                      type="button"
                      className="preset-pill-btn"
                      onClick={() => handleUpdateDayHours(selectedDayKey, '08:00', '16:00')}
                    >
                      08:00–16:00
                    </button>
                    <button
                      type="button"
                      className="preset-pill-btn"
                      onClick={() => handleUpdateDayHours(selectedDayKey, '10:00', '18:00')}
                    >
                      10:00–18:00
                    </button>
                    <button
                      type="button"
                      className="preset-pill-btn"
                      onClick={() => handleUpdateDayHours(selectedDayKey, '14:00', '20:00')}
                    >
                      14:00–20:00
                    </button>
                    <button
                      type="button"
                      className="preset-pill-btn"
                      onClick={() => handleUpdateDayHours(selectedDayKey, '07:00', '15:00')}
                    >
                      07:00–15:00
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card instructor-card day-editor-placeholder">
                  <div className="placeholder-icon">📅</div>
                  <strong>Edycja godzin wybranego dnia</strong>
                  <p className="side-hint-text" style={{ textAlign: 'center', marginTop: 4 }}>
                    Kliknij dowolny dzień w kalendarzu, aby indywidualnie zmienić jego godziny rozpoczęcia i zakończenia.
                  </p>
                </div>
              )}

              {/* KARTA DOMYŚLNYCH GODZIN DLA NOWYCH KLIKNIĘĆ */}
              <div className="card instructor-card">
                <h3 className="section-mini-title">Domyślne godziny dla nowych dni</h3>
                <p className="side-hint-text">
                  Te godziny zostaną przypisane automatycznie do nowo klikniętych dni w kalendarzu.
                </p>

                <div className="quick-hours-box">
                  <div className="field-group">
                    <label className="field-label">Godzina od</label>
                    <input
                      type="time"
                      className="field-input"
                      value={quickStart}
                      onChange={(e) => setQuickStart(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Godzina do</label>
                    <input
                      type="time"
                      className="field-input"
                      value={quickEnd}
                      onChange={(e) => setQuickEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="info-callout">
                  <div className="callout-icon">💡</div>
                  <div className="callout-body">
                    <strong>Wygodna edycja:</strong>
                    <ol>
                      <li>Kliknij dzień, aby go dodać lub zaznaczyć.</li>
                      <li>W panelu po prawej stronie możesz swobodnie zmienić godziny tylko dla tego konkretnego dnia.</li>
                      <li>Możesz też skorzystać z szybkich przycisków przedziałów czasowych.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── ZAKŁADKA 2: OFICJALNY GRAFIK OD ADMINA ──────────────────── */}
        {activeTab === 'grafik' && (
          <div className="card instructor-card">
            <div className="card-header">
              <div className="card-title-group">
                <span className="card-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div>
                  <h2 className="card-title">Oficjalny grafik pracy zatwierdzony przez administratora</h2>
                  <p className="card-subtitle">
                    Harmonogram zatwierdzonych dni dyżuru. Na podstawie tych godzin kursanci dokonują rezerwacji.
                  </p>
                </div>
              </div>
            </div>

            {isLoadingSchedule ? (
              <div className="instructor-loading">Pobieranie grafiku pracy...</div>
            ) : officialSchedules.length === 0 ? (
              <div className="instructor-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p className="empty-title">Brak zatwierdzonego grafiku na ten okres</p>
                <p className="empty-desc">
                  Administrator nie zatwierdził jeszcze dni pracy dla Twojego profilu. Upewnij się, że wysłałeś dyspozycję w zakładce <strong>Moja dyspozycja</strong>.
                </p>
              </div>
            ) : (
              <div className="official-schedule-list">
                <table className="instructor-rides-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Dzień tygodnia</th>
                      <th>Godziny pracy</th>
                      <th>Status grafiku</th>
                      <th>Uwagi administratora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officialSchedules.map((entry) => {
                      const d = new Date(entry.data + 'T12:00:00');
                      const dayName = d.toLocaleDateString('pl-PL', { weekday: 'long' });
                      const dateStr = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

                      return (
                        <tr key={entry.id || entry.data}>
                          <td><strong>{dateStr}</strong></td>
                          <td style={{ textTransform: 'capitalize' }}>{dayName}</td>
                          <td>
                            <span className="shift-time-chip">
                              {entry.godzina_od.slice(0, 5)} – {entry.godzina_do.slice(0, 5)}
                            </span>
                          </td>
                          <td>
                            <span className="status-chip status-done">Zatwierdzony</span>
                          </td>
                          <td>{entry.uwagi || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── ZAKŁADKA 3: REZERWACJE I JAZDY KURSANTÓW ────────────────── */}
        {activeTab === 'kalendarz' && (
          <div className="card instructor-card">
            <div className="card-header rides-header-flex">
              <div className="card-title-group">
                <span className="card-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <div>
                  <h2 className="card-title">Zarezerwowane jazdy kursantów</h2>
                  <p className="card-subtitle">
                    Jazdy umówione przez kursantów z Twojego oficjalnego grafiku.
                  </p>
                </div>
              </div>

              <div className="rides-filter-pills">
                <button
                  type="button"
                  className={`filter-pill${ridesFilter === 'upcoming' ? ' active' : ''}`}
                  onClick={() => setRidesFilter('upcoming')}
                >
                  Nadchodzące ({upcomingCount})
                </button>
                <button
                  type="button"
                  className={`filter-pill${ridesFilter === 'past' ? ' active' : ''}`}
                  onClick={() => setRidesFilter('past')}
                >
                  Poprzednie ({pastCount})
                </button>
                <button
                  type="button"
                  className={`filter-pill${ridesFilter === 'all' ? ' active' : ''}`}
                  onClick={() => setRidesFilter('all')}
                >
                  Wszystkie ({rides.length})
                </button>
              </div>
            </div>

            {isLoadingRides ? (
              <div className="instructor-loading">Wczytywanie listy jazd...</div>
            ) : filteredRides.length === 0 ? (
              <div className="instructor-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="empty-title">Brak jazd w wybranej kategorii</p>
                <p className="empty-desc">
                  {ridesFilter === 'upcoming'
                    ? 'Nie masz obecnie zaplanowanych nadchodzących jazd z kursantami.'
                    : 'Brak zrealizowanych jazd w historii.'}
                </p>
              </div>
            ) : (
              <div className="instructor-rides-table-wrap">
                <table className="instructor-rides-table">
                  <thead>
                    <tr>
                      <th>Data i godzina</th>
                      <th>Kursant</th>
                      <th>Kontakt</th>
                      <th>Rodzaj jazdy</th>
                      <th>Uwagi kursanta</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRides.map((ride) => {
                      const rDate = new Date(ride.data);
                      const isUpcoming = rDate >= now;
                      const dateFormatted = rDate.toLocaleDateString('pl-PL', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      });
                      const parsed = parseRideTimestamp(ride.data);
                      const timeRange = formatRideTimeRange(parsed.timeStr);

                      const studentName = ride.kursant
                        ? `${ride.kursant.imie} ${ride.kursant.nazwisko}`
                        : ride.id_kursanta
                        ? `Kursant #${ride.id_kursanta}`
                        : 'Kursant';

                      const studentPhone = ride.kursant?.telefon || '—';

                      return (
                        <tr key={ride.id} className={isUpcoming ? 'row-upcoming' : 'row-past'}>
                          <td>
                            <div className="ride-date-cell">
                              <span className="ride-day">{dateFormatted}</span>
                              <span className="ride-time-chip">{timeRange}</span>
                            </div>
                          </td>
                          <td>
                            <div className="ride-student-name">
                              <strong>{studentName}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="ride-phone">{studentPhone}</span>
                          </td>
                          <td>
                            <span className="ride-type-tag">
                              {ride.typ_jazdy || 'Jazda szkoleniowa'}
                            </span>
                          </td>
                          <td>
                            <span className="ride-notes-text">
                              {ride.uwagi || 'Brak uwag'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-chip ${isUpcoming ? 'status-upcoming' : 'status-done'}`}>
                              {isUpcoming ? 'Nadchodząca' : 'Zakończona'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <footer className="owner-footer"><span>DrivePro</span><i />Panel instruktora</footer>
      </main>
    </div>
  );
};
