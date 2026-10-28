import React from 'react';

interface Props {
  currentYear: number;
  currentMonth: number; // 0-indexed
  rideDays: number[];
  examDays: number[];
  onMonthChange: (year: number, month: number) => void;
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];
const DAY_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = firstDay === 0 ? 6 : firstDay - 1;  // convert to Mon-start
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

const Calendar: React.FC<Props> = ({ currentYear, currentMonth, rideDays, examDays, onMonthChange }) => {
  const today = new Date();
  const cells = buildCalendarDays(currentYear, currentMonth);

  const handlePrev = () => {
    if (currentMonth === 0) onMonthChange(currentYear - 1, 11);
    else onMonthChange(currentYear, currentMonth - 1);
  };

  const handleNext = () => {
    if (currentMonth === 11) onMonthChange(currentYear + 1, 0);
    else onMonthChange(currentYear, currentMonth + 1);
  };

  return (
    <div className="card calendar-card">
      <div className="cal-header">
        <button className="cal-nav" onClick={handlePrev} id="calPrev">&#8249;</button>
        <h3 id="calMonthYear">{MONTH_NAMES[currentMonth]} {currentYear}</h3>
        <button className="cal-nav" onClick={handleNext} id="calNext">&#8250;</button>
      </div>

      <div className="cal-day-names">
        {DAY_NAMES.map((d) => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
      </div>

      <div className="cal-days">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="cal-day cal-empty" />;
          }
          const isToday =
            today.getFullYear() === currentYear &&
            today.getMonth() === currentMonth &&
            today.getDate() === day;
          const hasRide = rideDays.includes(day);
          const hasExam = examDays.includes(day);

          const classes = [
            'cal-day',
            isToday ? 'cal-today' : '',
            hasRide ? 'cal-has-ride' : '',
            hasExam ? 'cal-has-exam' : '',
          ].filter(Boolean).join(' ');

          return (
            <div key={day} className={classes}>
              {day}
            </div>
          );
        })}
      </div>

      <div className="cal-legend">
        <span className="legend-dot dot-blue" />
        <span>Jazda</span>
        <span className="legend-dot dot-red" />
        <span>Egzamin</span>
        <span className="legend-dot dot-green" />
        <span>Dziś</span>
      </div>
    </div>
  );
};

export default Calendar;
