import React from 'react';

interface Props {
  student: { firstName: string; lastName: string; category: string };
  courseProgress: number;
  onNavigateDane?: () => void;
  onLogout: () => void;
}

const Topbar: React.FC<Props> = ({ student, courseProgress, onLogout }) => {
  return (
    <header className="owner-topbar student-topbar">
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
        <span className="owner-panel-label">Panel Kursanta</span>

        {/* Postęp kursu */}
        <div className="owner-topbar-progress-divider" />
        <div className="owner-topbar-progress">
          <div className="owner-topbar-progress-header">
            <span className="owner-topbar-progress-title">Postęp kursu</span>
            <span className="owner-topbar-progress-val">{courseProgress}%</span>
          </div>
          <div className="owner-topbar-progress-track">
            <div
              className="owner-topbar-progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, courseProgress))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="owner-topbar-actions">
        <div className="owner-profile">
          <span className="owner-profile-avatar">
            {student.firstName[0] || 'K'}{student.lastName[0] || 'K'}
          </span>
          <span>
            <strong>{student.firstName} {student.lastName}</strong>
            <small>Kursant · kat. {student.category}</small>
          </span>
        </div>

        <button
          type="button"
          className="owner-exit-button"
          onClick={onLogout}
          title="Wyloguj się z panelu kursanta"
        >
          Wyloguj się
        </button>
      </div>
    </header>
  );
};

export default Topbar;
