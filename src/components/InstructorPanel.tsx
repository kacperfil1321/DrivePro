import React, { useState, useEffect, useCallback } from 'react';
import {
  type Instructor,
  type AvailabilityException,
  type RideReservation,
  DAYS_OF_WEEK,
  fetchWeeklySchedule,
  saveWeeklySchedule,
  fetchExceptions,
  addAvailabilityException,
  deleteAvailabilityException,
  fetchBookedRides,
} from '../lib/bookingService';

interface Props {
  instructor: Instructor;
  onLogout: () => void;
  onNotify?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const InstructorPanel: React.FC<Props> = ({ instructor, onLogout, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'dyspozycja' | 'kalendarz'>('dyspozycja');

  // ── 1. Stały grafik tygodniowy ──────────────────────────────────────────
  const [schedule, setSchedule] = useState<{
    dzien_tygodnia: number;
    godzina_od: string;
    godzina_do: string;
    aktywny: boolean;
  }[]>([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // ── 2. Wyjątki od grafiku ──────────────────────────────────────────────
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [newExcDate, setNewExcDate] = useState('');
  const [newExcType, setNewExcType] = useState<'wolne' | 'praca'>('wolne');
  const [newExcStart, setNewExcStart] = useState('09:00');
  const [newExcEnd, setNewExcEnd] = useState('17:00');
  const [newExcReason, setNewExcReason] = useState('');
  const [isAddingExc, setIsAddingExc] = useState(false);

  // ── 3. Kalendarz / Jazdy ───────────────────────────────────────────────
  const [rides, setRides] = useState<RideReservation[]>([]);
  const [ridesFilter, setRidesFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [isLoadingRides, setIsLoadingRides] = useState(false);

  // Wczytanie danych instruktora
  const loadInstructorData = useCallback(async () => {
    setIsLoadingRides(true);
    try {
      const [weeklyData, excData, ridesData] = await Promise.all([
        fetchWeeklySchedule(instructor.id),
        fetchExceptions(instructor.id),
        fetchBookedRides(instructor.id),
      ]);

      // Inicjalizacja 7 dni tygodnia
      const fullWeek = DAYS_OF_WEEK.map((day) => {
        const found = weeklyData.find((w) => w.dzien_tygodnia === day.id && w.aktywny);
        return {
          dzien_tygodnia: day.id,
          godzina_od: found ? found.godzina_od.slice(0, 5) : '10:00',
          godzina_do: found ? found.godzina_do.slice(0, 5) : '18:00',
          aktywny: !!found,
        };
      });

      setSchedule(fullWeek);
      setExceptions(excData);
      setRides(ridesData);
    } catch (err) {
      console.error('Błąd ładowania danych instruktora:', err);
    } finally {
      setIsLoadingRides(false);
    }
  }, [instructor.id]);

  useEffect(() => {
    loadInstructorData();
  }, [loadInstructorData]);

  // Obsługa zmiany grafiku dnia
  const handleToggleDay = (dayId: number) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dzien_tygodnia === dayId ? { ...d, aktywny: !d.aktywny } : d))
    );
  };

  const handleTimeChange = (dayId: number, field: 'godzina_od' | 'godzina_do', val: string) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dzien_tygodnia === dayId ? { ...d, [field]: val } : d))
    );
  };

  // Zastosowanie szablonów grafiku
  const applyPreset = (preset: 'wt-sb-10-18' | 'pn-pt-08-16' | 'all-10-18') => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (preset === 'wt-sb-10-18') {
          const isWorking = d.dzien_tygodnia >= 2 && d.dzien_tygodnia <= 6;
          return { ...d, aktywny: isWorking, godzina_od: '10:00', godzina_do: '18:00' };
        }
        if (preset === 'pn-pt-08-16') {
          const isWorking = d.dzien_tygodnia >= 1 && d.dzien_tygodnia <= 5;
          return { ...d, aktywny: isWorking, godzina_od: '08:00', godzina_do: '16:00' };
        }
        return { ...d, aktywny: true, godzina_od: '10:00', godzina_do: '18:00' };
      })
    );
    onNotify?.('Zastosowano szablon grafiku. Pamiętaj, aby zapisać zmiany.', 'info');
  };

  // Zapis grafiku
  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    const success = await saveWeeklySchedule(instructor.id, schedule);
    setIsSavingSchedule(false);

    if (success) {
      onNotify?.('Stały grafik tygodniowy został pomyślnie zapisany w bazie!', 'success');
    } else {
      onNotify?.('Wystąpił problem przy zapisywaniu grafiku.', 'error');
    }
  };

  // Dodawanie wyjątku
  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExcDate) {
      onNotify?.('Wybierz datę wyjątku.', 'error');
      return;
    }

    setIsAddingExc(true);
    const result = await addAvailabilityException({
      id_instruktora: instructor.id,
      data: newExcDate,
      typ: newExcType,
      godzina_od: newExcType === 'praca' ? newExcStart : undefined,
      godzina_do: newExcType === 'praca' ? newExcEnd : undefined,
      powod: newExcReason.trim() || undefined,
    });
    setIsAddingExc(false);

    if (result.success) {
      onNotify?.('Wyjątek został dodany do grafiku!', 'success');
      setNewExcDate('');
      setNewExcReason('');
      const updatedExc = await fetchExceptions(instructor.id);
      setExceptions(updatedExc);
    } else {
      onNotify?.(result.error || 'Nie udało się zapisać wyjątku.', 'error');
    }
  };

  // Usuwanie wyjątku
  const handleDeleteException = async (id: number) => {
    const success = await deleteAvailabilityException(id);
    if (success) {
      setExceptions((prev) => prev.filter((exc) => exc.id !== id));
      onNotify?.('Wyjątek został usunięty.', 'info');
    } else {
      onNotify?.('Nie udało się usunąć wyjątku.', 'error');
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
    <div className="instructor-app-shell">
      {/* Topbar instruktora */}
      <header className="topbar instructor-topbar">
        <div className="topbar-brand">
          <span className="brand-dot" />
          <span className="brand-name">DrivePro</span>
          <span className="instructor-role-badge">Panel Instruktora</span>
        </div>

        <div className="topbar-right">
          <div className="instructor-profile-chip">
            <span className="instructor-avatar-circle">
              {instructor.imie[0]}
              {instructor.nazwisko[0]}
            </span>
            <div className="instructor-meta">
              <span className="instructor-name">
                {instructor.imie} {instructor.nazwisko}
              </span>
              <span className="instructor-sub">Instruktor kat. B</span>
            </div>
          </div>

          <button
            className="btn-outline logout-btn"
            onClick={onLogout}
            title="Wyloguj się z panelu instruktora"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="16"
              height="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Wyloguj</span>
          </button>
        </div>
      </header>

      {/* Nawigacja zakładkowa */}
      <div className="instructor-tabs-bar">
        <div className="instructor-tabs-container">
          <button
            className={`instructor-nav-tab${activeTab === 'dyspozycja' ? ' active' : ''}`}
            onClick={() => setActiveTab('dyspozycja')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Dyspozycyjność i grafik</span>
          </button>

          <button
            className={`instructor-nav-tab${activeTab === 'kalendarz' ? ' active' : ''}`}
            onClick={() => setActiveTab('kalendarz')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Kalendarz i jazdy</span>
            {upcomingCount > 0 && (
              <span className="instructor-tab-count">{upcomingCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Główna zawartość */}
      <main className="instructor-main-container">
        {activeTab === 'dyspozycja' && (
          <div className="instructor-grid-layout">
            {/* Lewa kolumna: Sztywny grafik tygodniowy */}
            <div className="card instructor-card">
              <div className="card-header">
                <div className="card-title-group">
                  <span className="card-icon blue">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="18"
                      height="18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="card-title">Stały grafik tygodniowy</h2>
                    <p className="card-subtitle">
                      Wzorzec godzin Twojej dostępności powtarzany w każdym tygodniu.
                    </p>
                  </div>
                </div>

                {/* Szybkie presety */}
                <div className="schedule-presets">
                  <span className="preset-label">Szablony:</span>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyPreset('wt-sb-10-18')}
                  >
                    Wt–Sb 10–18
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyPreset('pn-pt-08-16')}
                  >
                    Pn–Pt 8–16
                  </button>
                </div>
              </div>

              <div className="schedule-days-list">
                {DAYS_OF_WEEK.map((day) => {
                  const dayState = schedule.find((s) => s.dzien_tygodnia === day.id) || {
                    dzien_tygodnia: day.id,
                    godzina_od: '10:00',
                    godzina_do: '18:00',
                    aktywny: false,
                  };

                  return (
                    <div
                      key={day.id}
                      className={`schedule-day-row${dayState.aktywny ? ' is-active' : ' is-off'}`}
                    >
                      <label className="schedule-day-toggle">
                        <input
                          type="checkbox"
                          checked={dayState.aktywny}
                          onChange={() => handleToggleDay(day.id)}
                        />
                        <span className="toggle-custom" />
                        <span className="schedule-day-name">{day.name}</span>
                      </label>

                      {dayState.aktywny ? (
                        <div className="schedule-hours-inputs">
                          <span className="hour-label">od</span>
                          <input
                            type="time"
                            className="hour-input"
                            value={dayState.godzina_od}
                            onChange={(e) =>
                              handleTimeChange(day.id, 'godzina_od', e.target.value)
                            }
                          />
                          <span className="hour-label">do</span>
                          <input
                            type="time"
                            className="hour-input"
                            value={dayState.godzina_do}
                            onChange={(e) =>
                              handleTimeChange(day.id, 'godzina_do', e.target.value)
                            }
                          />
                        </div>
                      ) : (
                        <div className="schedule-day-off-badge">Dzień wolny</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="schedule-save-footer">
                <span className="schedule-save-hint">
                  Kursanci widzą terminy w wyznaczonych powyżej oknach czasowych (max 14 dni w
                  przód).
                </span>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveSchedule}
                  disabled={isSavingSchedule}
                >
                  {isSavingSchedule ? 'Zapisywanie grafiku...' : 'Zapisz grafik tygodniowy'}
                </button>
              </div>
            </div>

            {/* Prawa kolumna: Wyjątki od grafiku (urlop / dodatkowa praca) */}
            <div className="card instructor-card">
              <div className="card-header">
                <div className="card-title-group">
                  <span className="card-icon cyan">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="18"
                      height="18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="card-title">Wyjątki od grafiku</h2>
                    <p className="card-subtitle">
                      Pojedyncze dni wolne (np. urlop) lub dodatkowe dyżury na konkretną datę.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formularz dodawania wyjątku */}
              <form className="exception-form" onSubmit={handleAddException}>
                <div className="exception-form-row">
                  <div className="field-group">
                    <label className="field-label" htmlFor="exc-date">
                      Data wyjątku
                    </label>
                    <input
                      id="exc-date"
                      type="date"
                      className="field-input"
                      min={new Date().toISOString().slice(0, 10)}
                      value={newExcDate}
                      onChange={(e) => setNewExcDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Rodzaj wyjątku</label>
                    <div className="exception-type-selector">
                      <button
                        type="button"
                        className={`exc-type-btn${newExcType === 'wolne' ? ' active red' : ''}`}
                        onClick={() => setNewExcType('wolne')}
                      >
                        🏖️ Dzień wolny
                      </button>
                      <button
                        type="button"
                        className={`exc-type-btn${newExcType === 'praca' ? ' active green' : ''}`}
                        onClick={() => setNewExcType('praca')}
                      >
                        🚗 Dodatkowa praca
                      </button>
                    </div>
                  </div>
                </div>

                {newExcType === 'praca' && (
                  <div className="exception-hours-row">
                    <div className="field-group">
                      <label className="field-label">Godzina od</label>
                      <input
                        type="time"
                        className="field-input"
                        value={newExcStart}
                        onChange={(e) => setNewExcStart(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Godzina do</label>
                      <input
                        type="time"
                        className="field-input"
                        value={newExcEnd}
                        onChange={(e) => setNewExcEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="field-group">
                  <label className="field-label" htmlFor="exc-reason">
                    Powód / Notatka (opcjonalnie)
                  </label>
                  <input
                    id="exc-reason"
                    type="text"
                    className="field-input"
                    placeholder="np. Urlop wypoczynkowy, Sobotni dyżur"
                    value={newExcReason}
                    onChange={(e) => setNewExcReason(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-secondary add-exc-btn"
                  disabled={isAddingExc}
                >
                  {isAddingExc ? 'Dodawanie...' : '+ Dodaj wyjątek do kalendarza'}
                </button>
              </form>

              {/* Lista aktywnych wyjątków */}
              <div className="exceptions-list-container">
                <h3 className="section-mini-title">Zaplanowane wyjątki ({exceptions.length})</h3>
                {exceptions.length === 0 ? (
                  <p className="empty-subtext">Brak zdefiniowanych wyjątków. Obowiązuje stały grafik.</p>
                ) : (
                  <div className="exceptions-cards">
                    {exceptions.map((exc) => {
                      const isWolne = exc.typ === 'wolne';
                      return (
                        <div
                          key={exc.id}
                          className={`exception-card-item ${isWolne ? 'exc-wolne' : 'exc-praca'}`}
                        >
                          <div className="exc-badge-icon">{isWolne ? '🏖️' : '🚗'}</div>
                          <div className="exc-meta">
                            <span className="exc-date">{exc.data}</span>
                            <span className="exc-type">
                              {isWolne
                                ? 'Cały dzień wolny'
                                : `Praca: ${exc.godzina_od?.slice(0, 5)} - ${exc.godzina_do?.slice(0, 5)}`}
                            </span>
                            {exc.powod && <span className="exc-reason">{exc.powod}</span>}
                          </div>
                          <button
                            type="button"
                            className="exc-delete-btn"
                            onClick={() => handleDeleteException(exc.id)}
                            title="Usuń ten wyjątek"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              width="16"
                              height="16"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Zakładka 2: Kalendarz / Jazdy instruktora */}
        {activeTab === 'kalendarz' && (
          <div className="card instructor-card">
            <div className="card-header rides-header-flex">
              <div className="card-title-group">
                <span className="card-icon blue">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="18"
                    height="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div>
                  <h2 className="card-title">Kalendarz i rezerwacje jazd</h2>
                  <p className="card-subtitle">
                    Wszystkie jazdy zarezerwowane przez kursantów z Twojego harmonogramu.
                  </p>
                </div>
              </div>

              {/* Filtry */}
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
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="48"
                  height="48"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                      const timeStr = ride.data.includes('T')
                        ? ride.data.split('T')[1].slice(0, 5)
                        : `${String(rDate.getHours()).padStart(2, '0')}:${String(rDate.getMinutes()).padStart(2, '0')}`;
                      const endH = String(parseInt(timeStr.split(':')[0], 10) + 1).padStart(2, '0');
                      const timeRange = `${timeStr} – ${endH}:${timeStr.split(':')[1]}`;

                      const studentName = ride.kursant
                        ? `${ride.kursant.imie} ${ride.kursant.nazwisko}`
                        : ride.id_kursanta
                        ? `Kursant #${ride.id_kursanta}`
                        : 'Kursant testowy';

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
                            <span
                              className={`status-chip ${isUpcoming ? 'status-upcoming' : 'status-done'}`}
                            >
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
      </main>
    </div>
  );
};
