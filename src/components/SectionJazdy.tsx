import React, { useState } from 'react';
import type { Drive, Student } from '../types';

interface Props {
  drives: Drive[];
  student?: Student;
  onReserve?: () => void;
}

const MONTH_NAMES = [
  'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień',
];
const POLISH_MONTHS_SHORT = [
  'sty','lut','mar','kwi','maj','cze',
  'lip','sie','wrz','paź','lis','gru',
];
const DAY_NAMES = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'];

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function formatDriveDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${POLISH_MONTHS_SHORT[m - 1]} ${y}`;
}

function getDrivesForMonth(drives: Drive[], year: number, month: number): Map<number, Drive[]> {
  const map = new Map<number, Drive[]>();
  drives.forEach((d) => {
    const [dy, dm, dd] = d.date.split('-').map(Number);
    if (dy === year && dm - 1 === month) {
      if (!map.has(dd)) map.set(dd, []);
      map.get(dd)!.push(d);
    }
  });
  return map;
}

const SectionJazdy: React.FC<Props> = ({ drives, student, onReserve }) => {
  const today = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const handlePrev = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const handleNext = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const cells    = buildCalendarCells(calYear, calMonth);
  const driveMap = getDrivesForMonth(drives, calYear, calMonth);

  const completedDrives = drives.filter(d => d.status === 'completed');
  const upcomingDrives  = drives.filter(d => d.status === 'upcoming')
                               .sort((a, b) => a.date.localeCompare(b.date));

  const completedHours = completedDrives.reduce((acc, d) => acc + (d.duration || 60) / 60, 0);
  const totalHours = student?.hoursTotal || 30;
  const remainingHours = Math.max(0, totalHours - completedHours);

  return (
    <section id="section-jazdy">
      <div className="section-header">
        <div>
          <h1>Moje Jazdy</h1>
          <p className="start-subtitle" style={{ marginTop: 2 }}>
            Zarządzaj swoimi jazdami szkoleniowymi i rezerwuj nowe terminy
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onReserve && (
            <button className="btn-primary" onClick={onReserve}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Zarezerwuj nową jazdę
            </button>
          )}
        </div>
      </div>

      {/* Licznik odbytych godzin */}
      <div className="card jazdy-hours-counter-card">
        <div className="jazdy-counter-grid">
          <div className="counter-item">
            <span className="counter-icon-wrap icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div>
              <div className="counter-val">{completedHours}h</div>
              <div className="counter-label">Odbyte godziny</div>
            </div>
          </div>

          <div className="counter-divider" />

          <div className="counter-item">
            <span className="counter-icon-wrap icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            <div>
              <div className="counter-val">{completedDrives.length}</div>
              <div className="counter-label">Odbyte spotkania</div>
            </div>
          </div>

          <div className="counter-divider" />

          <div className="counter-item">
            <span className="counter-icon-wrap icon-orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <div>
              <div className="counter-val">{remainingHours}h</div>
              <div className="counter-label">Pozostało do wyjeżdżenia</div>
            </div>
          </div>

          <div className="counter-divider" />

          <div className="counter-item counter-item-progress">
            <div className="counter-progress-header">
              <span className="counter-label">Postęp kursu ({completedHours}/{totalHours}h)</span>
              <span className="counter-pct-val">{Math.round((completedHours / totalHours) * 100)}%</span>
            </div>
            <div className="counter-track">
              <div
                className="counter-fill"
                style={{ width: `${Math.min(100, Math.round((completedHours / totalHours) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="jazdy-layout">

        {/* ─── Calendar ─────────────────────────────────── */}
        <div className="card jazdy-cal-card">
          <div className="cal-header">
            <button className="cal-nav" onClick={handlePrev}>&#8249;</button>
            <h3>{MONTH_NAMES[calMonth]} {calYear}</h3>
            <button className="cal-nav" onClick={handleNext}>&#8250;</button>
          </div>

          <div className="cal-day-names">
            {DAY_NAMES.map(d => <div key={d} className="cal-day-name">{d}</div>)}
          </div>

          <div className="cal-days">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} className="cal-day cal-empty" />;
              const isToday =
                today.getFullYear() === calYear &&
                today.getMonth() === calMonth &&
                today.getDate() === day;
              const dayDrives = driveMap.get(day) ?? [];
              const hasCompleted = dayDrives.some(d => d.status === 'completed');
              const hasUpcoming  = dayDrives.some(d => d.status === 'upcoming');

              return (
                <div key={day} className={[
                  'cal-day',
                  isToday ? 'cal-today' : '',
                  hasCompleted && !isToday ? 'cal-has-ride' : '',
                  hasUpcoming && !isToday ? 'cal-has-upcoming' : '',
                  isToday && (hasCompleted || hasUpcoming) ? 'cal-has-ride' : '',
                ].filter(Boolean).join(' ')}>
                  {day}
                </div>
              );
            })}
          </div>

          <div className="cal-legend">
            <span className="legend-dot dot-blue" /><span>Jazda odbyta</span>
            <span className="legend-dot dot-upcoming" /><span>Planowana</span>
            <span className="legend-dot dot-green" /><span>Dziś</span>
          </div>

          {onReserve && (
            <button className="btn-primary btn-full" style={{ marginTop: 16 }} onClick={onReserve}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Zarezerwuj termin jazdy
            </button>
          )}
        </div>

        {/* ─── Lists ────────────────────────────────────── */}
        <div className="jazdy-lists">

          {/* Upcoming */}
          <div className="card">
            <div className="jazdy-list-header">
              <h3 className="card-title" style={{ margin: 0 }}>Nadchodzące jazdy</h3>
              <span className="section-badge">{upcomingDrives.length}</span>
            </div>
            {upcomingDrives.length === 0 ? (
              <p className="dash-empty">Brak zaplanowanych jazd</p>
            ) : (
              <div className="jazdy-drive-list">
                {upcomingDrives.map(d => (
                  <div key={d.id} className="jazdy-drive-row jazdy-row-upcoming">
                    <div className="jazdy-drive-dot dot-upcoming-sm" />
                    <div className="jazdy-drive-info">
                      <span className="jazdy-drive-date">{formatDriveDate(d.date)}</span>
                      <span className="jazdy-drive-time-badge">{d.timeRange}</span>
                    </div>
                    <div className="jazdy-drive-instructor">{d.instructor}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed */}
          <div className="card">
            <div className="jazdy-list-header">
              <h3 className="card-title" style={{ margin: 0 }}>Historia jazd</h3>
              <span className="section-badge">{completedDrives.length}</span>
            </div>
            <div className="jazdy-drive-list">
              {completedDrives.map(d => (
                <div key={d.id} className="jazdy-drive-row">
                  <div className="jazdy-drive-dot dot-completed-sm" />
                  <div className="jazdy-drive-info">
                    <span className="jazdy-drive-date">{formatDriveDate(d.date)}</span>
                    <span className="jazdy-drive-time-badge jazdy-time-gray">{d.timeRange}</span>
                  </div>
                  <div className="jazdy-drive-instructor">{d.instructor}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default SectionJazdy;
