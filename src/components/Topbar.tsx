import React, { useState, useRef, useEffect } from 'react';

// Steering wheel SVG logo
const SteeringWheelIcon = () => (
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="26" height="26">
    <circle cx="18" cy="18" r="16" stroke="white" strokeWidth="2.5" />
    <circle cx="18" cy="18" r="5" stroke="white" strokeWidth="2.5" />
    <line x1="18" y1="2" x2="18" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="7" y1="27" x2="13.5" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="29" y1="27" x2="22.5" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

interface Props {
  student: { firstName: string; lastName: string; category: string };
  courseProgress: number;
  onNavigateDane: () => void;
}

const DROPDOWN_ITEMS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    label: 'Moje dane',
    action: 'dane',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    label: 'Zmień hasło',
    action: 'password',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    label: 'Ustawienia',
    action: 'settings',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    label: 'Pomoc',
    action: 'help',
  },
];

const Topbar: React.FC<Props> = ({ student, courseProgress, onNavigateDane }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDropdownAction = (action: string) => {
    setDropdownOpen(false);
    if (action === 'dane') onNavigateDane();
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Logo */}
        <div className="logo-wrap">
          <div className="logo-badge">
            <SteeringWheelIcon />
          </div>
          <div className="logo-text">
            <span className="logo-title">DrivePro</span>
            <span className="logo-sub">Panel Kursanta</span>
          </div>
        </div>

        {/* Progress */}
        <div className="topbar-divider" />
        <div className="progress-wrap">
          <div className="progress-top-row">
            <span className="progress-label">Postęp kursu</span>
            <span className="progress-pct-label">{courseProgress}%</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${courseProgress}%` }} />
          </div>
          <span className="progress-sub">ukończono</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* User chip with dropdown */}
        <div className="user-dropdown-wrap" ref={dropdownRef}>
          <button
            className={`user-chip${dropdownOpen ? ' user-chip-open' : ''}`}
            id="userChipBtn"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="user-avatar">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div className="user-info">
              <span className="user-name">{student.firstName} {student.lastName}</span>
              <span className="user-role">Kursant · kat. {student.category}</span>
            </div>
            <svg className={`user-chevron${dropdownOpen ? ' rotated' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="user-dropdown" role="menu">
              <div className="dropdown-header">
                <div className="dropdown-avatar">
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <div>
                  <div className="dropdown-name">{student.firstName} {student.lastName}</div>
                  <div className="dropdown-role">Kursant · Kategoria {student.category}</div>
                </div>
              </div>

              <div className="dropdown-divider" />

              {DROPDOWN_ITEMS.map((item) => (
                <button
                  key={item.action}
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => handleDropdownAction(item.action)}
                >
                  <span className="dropdown-item-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}

              <div className="dropdown-divider" />

              <button
                className="dropdown-item dropdown-item-danger"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
              >
                <span className="dropdown-item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </span>
                Wyloguj się
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
