import React from 'react';
import type { Student, Termin, Drive } from '../types';
import type { School } from '../types';

interface Props {
  student: Student;
  school: School;
  terminy: Termin[];
  drives: Drive[];
  onReserve: () => void;
  onAddTermin?: () => void;
  onNavigate: (section: import('../types').NavSection) => void;
}

const POLISH_MONTHS_SHORT = [
  'sty','lut','mar','kwi','maj','cze',
  'lip','sie','wrz','paź','lis','gru',
];

function formatDateShort(dateStr: string, time: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${POLISH_MONTHS_SHORT[m - 1]} ${y}${time ? ` · ${time}` : ''}`;
}

interface WeekDay {
  dayName: string;
  dayNumber: number;
  dateStr: string;
  isToday: boolean;
  hasRide: boolean;
  rideInfo?: string;
}

function getCurrentWeekDays(today: Date, terminy: Termin[]): WeekDay[] {
  const currentDay = today.getDay(); // 0 = Sun
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const daysShort = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
  const weekDays: WeekDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayNum}`;

    const rideTermin = terminy.find((t) => t.date === dateStr);
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    weekDays.push({
      dayName: daysShort[i],
      dayNumber: d.getDate(),
      dateStr,
      isToday,
      hasRide: Boolean(rideTermin) || d.getDate() === 30, // 30th has ride
      rideInfo: rideTermin ? rideTermin.time : (d.getDate() === 30 ? '10:00' : undefined),
    });
  }

  return weekDays;
}

const MONTH_NAMES = [
  'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień',
];

const SectionStart: React.FC<Props> = ({ student, school, terminy, drives, onReserve, onAddTermin, onNavigate }) => {
  const today = new Date();
  const weekDays = getCurrentWeekDays(today, terminy);

  // Show upcoming terminy, or fall back to mock upcoming drives if terminy empty
  const upcomingList = (terminy && terminy.length > 0)
    ? terminy.slice(0, 4)
    : [
        { id: 'm1', title: 'Jazda z instruktorem (Marek Nowak)', date: '2026-10-30', time: '10:00–12:00', type: 'ride' as const },
        { id: 'm2', title: 'Jazda doszkalająca (Anna Wiśniewska)', date: '2026-11-03', time: '14:00–16:00', type: 'ride' as const },
      ];

  void drives;
  const hoursLeft = student.hoursTotal - student.hoursCompleted;

  return (
    <section id="section-start" className="section-fill">
      {/* Welcome header */}
      <div className="start-welcome">
        <div>
          <h1>Cześć, {student.firstName}! 👋</h1>
          <p className="start-subtitle">
            Masz ukończone <strong>{student.hoursCompleted} z {student.hoursTotal} godz.</strong> —
            zostało Ci jeszcze <strong>{hoursLeft} godz.</strong> do egzaminu.
          </p>
        </div>
      </div>

      {/* Dashboard grid – 2 columns matching user layout */}
      <div className="dashboard-grid dashboard-start-2col">

        {/* 1. DANE SZKOŁY */}
        <div className="dash-tile start-clean-card school-full-card">
          <div className="start-clean-header">
            <span className="dash-tile-icon dash-icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </span>
            <span className="start-clean-title">Dane szkoły</span>
            <button className="dash-tile-link" onClick={() => onNavigate('szkola')}>Więcej →</button>
          </div>

          <div className="start-clean-body">
            <div className="school-brand-header">
              <div className="school-brand-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <div>
                <div className="school-brand-title">{school.name}</div>
                <div className="school-brand-sub">Ośrodek Szkolenia Kierowców · Kat. B, A</div>
              </div>
            </div>

            <div className="school-details-grid">
              <div className="school-detail-item">
                <span className="school-detail-icon">📍</span>
                <div>
                  <div className="school-detail-label">Adres</div>
                  <div className="school-detail-val">{school.address}, {school.city}</div>
                </div>
              </div>

              <div className="school-detail-item">
                <span className="school-detail-icon">📞</span>
                <div>
                  <div className="school-detail-label">Telefon</div>
                  <div className="school-detail-val">{school.phone}</div>
                </div>
              </div>

              <div className="school-detail-item">
                <span className="school-detail-icon">✉️</span>
                <div>
                  <div className="school-detail-label">E-mail</div>
                  <div className="school-detail-val">{school.email}</div>
                </div>
              </div>

              <div className="school-detail-item">
                <span className="school-detail-icon">🕐</span>
                <div>
                  <div className="school-detail-label">Biuro czynne</div>
                  <div className="school-detail-val">{school.openHours}</div>
                </div>
              </div>
            </div>

            <div className="school-car-row-badge">
              <span className="school-car-label">Pojazd egzaminacyjny:</span>
              <span className="school-car-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
                {school.carModel || 'Toyota Yaris'} (identyczny z WORD)
              </span>
            </div>

            <button className="btn-outline btn-full dash-bottom-action-btn" onClick={() => onNavigate('szkola')}>
              Więcej informacji o szkole
            </button>
          </div>
        </div>

        {/* 2. KALENDARZ (AKTUALNY TYDZIEŃ) */}
        <div className="dash-tile start-clean-card cal-week-card">
          <div className="start-clean-header">
            <span className="dash-tile-icon dash-icon-cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span className="start-clean-title">Kalendarz · Ten tydzień</span>
            <span className="dash-tile-month">{MONTH_NAMES[today.getMonth()]} {today.getFullYear()}</span>
          </div>

          <div className="start-clean-body">
            <div className="week-cal-container">
              <div className="week-cal-days">
                {weekDays.map((w) => (
                  <div
                    key={w.dateStr}
                    className={[
                      'week-cal-col',
                      w.isToday ? 'week-col-today' : '',
                      w.hasRide ? 'week-col-ride' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="week-col-name">{w.dayName}</span>
                    <span className="week-col-num">{w.dayNumber}</span>
                    <div className="week-col-badge-slot">
                      {w.isToday && <span className="week-badge-today">Dziś</span>}
                      {w.hasRide && !w.isToday && (
                        <span className="week-badge-ride" title={`Jazda o ${w.rideInfo || '10:00'}`}>
                          🚗 {w.rideInfo || 'Jazda'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="week-cal-footer-info">
              <div className="week-cal-legend">
                <span className="cal-dot-today" /><span>Dziś</span>
                <span className="cal-dot-ride" /><span>Termin jazdy</span>
              </div>
              <span className="week-cal-hint">Kliknij poniżej, aby wybrać termin</span>
            </div>

            <button className="btn-primary btn-full dash-bottom-action-btn" onClick={onReserve}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Zarezerwuj jazdę
            </button>
          </div>
        </div>

        {/* 3. JAZDY */}
        <div className="dash-tile start-clean-card">
          <div className="start-clean-header">
            <span className="dash-tile-icon dash-icon-teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 5v3h-7V8z" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </span>
            <span className="start-clean-title">Jazdy</span>
            <button className="dash-tile-link" onClick={() => onNavigate('jazdy')}>Przejdź →</button>
          </div>

          <div className="start-clean-body">
            <div className="dash-section-subhead">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Moje nadchodzące terminy</span>
            </div>
            {upcomingList.length === 0 ? (
              <p className="dash-empty">Brak zaplanowanych jazd</p>
            ) : (
              <div className="dash-upcoming-bars">
                {upcomingList.map((t) => (
                  <div key={t.id} className="dash-bar-row">
                    <div className="dash-bar-main">
                      <div className="dash-bar-title">{t.title}</div>
                      <div className="dash-bar-time">{formatDateShort(t.date, t.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-primary btn-full dash-bottom-action-btn" onClick={() => onNavigate('jazdy')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Dodaj termin
            </button>
          </div>
        </div>

        {/* 4. EGZAMIN */}
        <div className="dash-tile start-clean-card">
          <div className="start-clean-header">
            <span className="dash-tile-icon dash-icon-indigo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </span>
            <span className="start-clean-title">Egzamin</span>
            <span className="egzamin-badge-clean">{Math.round((student.hoursCompleted / student.hoursTotal) * 100)}%</span>
          </div>

          <div className="start-clean-body">
            <div className="egzamin-status-block">
              <div className="egzamin-info-card">
                <span className="egzamin-info-title">Status przygotowania do egzaminu</span>
                <span className="egzamin-info-desc">
                  Ukończono {student.hoursCompleted} z {student.hoursTotal} godz. jazdy (zostało {hoursLeft}h)
                </span>
                <div className="mini-bar-track" style={{ marginTop: 6 }}>
                  <div
                    className="mini-bar-fill"
                    style={{ width: `${Math.round((student.hoursCompleted / student.hoursTotal) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="egzamin-actions-card">
                <div className="egzamin-action-item">
                  <span className="egzamin-item-label">Egzamin wewnętrzny teoretyczny:</span>
                  <span className="egzamin-item-badge badge-pending">Do zaliczenia</span>
                </div>
                <div className="egzamin-action-item">
                  <span className="egzamin-item-label">Egzamin wewnętrzny praktyczny:</span>
                  <span className="egzamin-item-badge badge-lock">Wymaga 30h jazd</span>
                </div>
              </div>
            </div>

            <button
              className="btn-outline btn-full dash-bottom-action-btn"
              onClick={onAddTermin || onReserve}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Dodaj termin egzaminu
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default SectionStart;
