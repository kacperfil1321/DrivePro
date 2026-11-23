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
  const [activeTab, setActiveTab] = useState<'dyspozycja' | 'grafik'>('grafik');

  useEffect(() => {
    document.title = 'DrivePro · Panel instruktora';
  }, []);

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
  const [selectedScheduleDayKey, setSelectedScheduleDayKey] = useState<string | null>(null);

  // Grafik zatwierdzony przez administratora (status = 'zatwierdzona')
  const [officialSchedules, setOfficialSchedules] = useState<InstructorDisposition[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);

  // Kalendarz rezerwacji kursantów
  const [rides, setRides] = useState<RideReservation[]>([]);

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
    try {
      const data = await fetchBookedRides(instructor.id);
      setRides(data);
    } catch (err) {
      console.error('Błąd pobierania rezerwacji jazd:', err);
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
  const monthPrefix = toDateKey(dispYear, dispMonth, 1).slice(0, 7);
  const schedulesForMonth = officialSchedules.filter((entry) => entry.data.startsWith(monthPrefix));
  const ridesForMonth = rides.filter((ride) =>
    parseRideTimestamp(ride.data).dateStr.startsWith(monthPrefix),
  );

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
          className={`owner-tab${activeTab === 'grafik' ? ' active' : ''}`}
          onClick={() => setActiveTab('grafik')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Grafik pracy</span>
        </button>

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

      </nav>

      {/* Główna zawartość */}
      <main className="owner-main">
        <div className="owner-page-heading">
          <div>
            <span className="owner-breadcrumb">
              PANEL INSTRUKTORA <b>/</b>{' '}
              {activeTab === 'dyspozycja' && 'MOJA DYSPOZYCJA'}
              {activeTab === 'grafik' && 'GRAFIK PRACY'}
            </span>
            <h1>
              {activeTab === 'dyspozycja' && 'Moja dyspozycja'}
              {activeTab === 'grafik' && 'Grafik pracy'}
            </h1>
          </div>
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

        {/* ─── ZAKŁADKA 2: GRAFIK OD ADMINA ──────────────────── */}
        {activeTab === 'grafik' && (
          <div className="disp-layout-grid instructor-schedule-layout">
            <div className="card instructor-card">
              <div className="disp-header-bar">
                <div>
                  <h2 className="card-title">Grafik pracy</h2>
                  <p className="card-subtitle">Godziny dyżuru oraz liczba rezerwacji w każdym dniu.</p>
                </div>
                <div className="month-picker-controls">
                  <button type="button" className="cal-nav-btn" onClick={handlePrevMonth}>‹</button>
                  <span className="current-month-label">{MONTH_NAMES_PL[dispMonth - 1]} {dispYear}</span>
                  <button type="button" className="cal-nav-btn" onClick={handleNextMonth}>›</button>
                </div>
              </div>

              {isLoadingSchedule ? (
                <div className="instructor-loading">Pobieranie grafiku pracy...</div>
              ) : (
                <div className="disp-calendar-grid">
                  <div className="disp-weekdays-row">
                    {WEEKDAY_NAMES.map((d) => <div key={d} className="disp-weekday-cell">{d}</div>)}
                  </div>
                  <div className="disp-days-grid">
                    {calendarDays.map((cell, idx) => {
                      if (!cell.dayNumber || !cell.dateKey) {
                        return <div key={`empty-${idx}`} className="disp-day-cell empty" />;
                      }
                      const entry = schedulesForMonth.find((item) => item.data === cell.dateKey);
                      const dayRides = ridesForMonth.filter((ride) =>
                        parseRideTimestamp(ride.data).dateStr === cell.dateKey,
                      );
                      return (
                        <div
                          key={cell.dateKey}
                          className={`disp-day-cell${entry ? ' selected' : ''}${dayRides.length > 0 ? ' instructor-ride-day' : ''}${selectedScheduleDayKey === cell.dateKey ? ' active-focus' : ''}`}
                          title={entry ? `${entry.godzina_od.slice(0, 5)}–${entry.godzina_do.slice(0, 5)} · Zatwierdzony grafik` : 'Brak zatwierdzonego grafiku'}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedScheduleDayKey(cell.dateKey)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedScheduleDayKey(cell.dateKey);
                            }
                          }}
                        >
                          <div className="disp-day-header">
                            <span className="disp-day-num">{cell.dayNumber}</span>
                            {dayRides.length > 0 && <span className="disp-check-icon">{dayRides.length}</span>}
                          </div>
                          {entry
                            ? <div className="disp-day-badge">{entry.godzina_od.slice(0, 5)}–{entry.godzina_do.slice(0, 5)}</div>
                            : <div className="disp-day-off">—</div>}
                          {dayRides.length > 0 && (
                            <div className="instructor-ride-events">
                              {dayRides.slice(0, 2).map((ride) => {
                                const parsed = parseRideTimestamp(ride.data);
                                const studentName = ride.kursant
                                  ? `${ride.kursant.imie} ${ride.kursant.nazwisko}`
                                  : ride.id_kursanta
                                    ? `Kursant #${ride.id_kursanta}`
                                    : 'Kursant';
                                return (
                                  <div className="instructor-ride-event" key={ride.id}>
                                    <strong>{formatRideTimeRange(parsed.timeStr)}</strong>
                                    <span>{studentName}</span>
                                  </div>
                                );
                              })}
                              {dayRides.length > 2 && (
                                <div className="instructor-ride-more">+{dayRides.length - 2} więcej</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="card instructor-card instructor-schedule-details">
              {selectedScheduleDayKey ? (
                (() => {
                  const selectedDate = new Date(`${selectedScheduleDayKey}T12:00:00`);
                  const entry = schedulesForMonth.find((item) => item.data === selectedScheduleDayKey);
                  const dayRides = ridesForMonth.filter((ride) =>
                    parseRideTimestamp(ride.data).dateStr === selectedScheduleDayKey,
                  );
                  return (
                    <>
                      <span className="owner-day-eyebrow">WYBRANY DZIEŃ</span>
                      <h3>{selectedDate.toLocaleDateString('pl-PL', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}</h3>
                      <div className="instructor-detail-section">
                        <span>Godziny pracy</span>
                        {entry
                          ? <strong className="instructor-work-hours">{entry.godzina_od.slice(0, 5)}–{entry.godzina_do.slice(0, 5)}</strong>
                          : <p>Brak zatwierdzonych godzin pracy.</p>}
                      </div>
                      <div className="instructor-detail-section">
                        <div className="instructor-detail-heading">
                          <span>Jazdy kursantów</span>
                          <b>{dayRides.length}</b>
                        </div>
                        {dayRides.length === 0 ? (
                          <p>Brak zarezerwowanych jazd tego dnia.</p>
                        ) : (
                          <div className="instructor-detail-rides">
                            {dayRides.map((ride) => {
                              const parsed = parseRideTimestamp(ride.data);
                              const studentName = ride.kursant
                                ? `${ride.kursant.imie} ${ride.kursant.nazwisko}`
                                : ride.id_kursanta
                                  ? `Kursant #${ride.id_kursanta}`
                                  : 'Kursant';
                              return (
                                <div className="instructor-detail-ride" key={ride.id}>
                                  <strong>{formatRideTimeRange(parsed.timeStr)}</strong>
                                  <span>{studentName}</span>
                                  {ride.kursant?.telefon && <small>{ride.kursant.telefon}</small>}
                                  {ride.uwagi && <small>Uwagi: {ride.uwagi}</small>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="instructor-schedule-empty">
                  <span className="instructor-schedule-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                  </span>
                  <strong>Wybierz dzień</strong>
                  <span>Kliknij dzień w kalendarzu, aby zobaczyć szczegóły grafiku i jazd.</span>
                </div>
              )}
            </aside>
          </div>
        )}

        <footer className="owner-footer">
          <span>DrivePro</span>
          <i />
          <span>Panel instruktora</span>
          <span className="owner-footer-date">{today.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </footer>
      </main>
    </div>
  );
};
