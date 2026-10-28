import React from 'react';
import type { NavSection } from '../types';

interface NavItemDef {
  id: NavSection;
  label: string;
  badge?: string;
  icon: React.ReactNode;
}

interface Props {
  active: NavSection;
  onSelect: (section: NavSection) => void;
}

// New order: Start, Dokumenty, Jazdy (3rd), Szkoła, Info
const NAV_ITEMS: NavItemDef[] = [
  {
    id: 'start',
    label: 'Start',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'dokumenty',
    label: 'Moje Dokumenty',
    badge: '3',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 'jazdy',
    label: 'Moje Jazdy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: 'szkola',
    label: 'Moja Szkoła Jazdy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="15" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        <path d="M12 2v5" />
      </svg>
    ),
  },
  {
    id: 'info',
    label: 'Ważne Info',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
];

const Sidebar: React.FC<Props> = ({ active, onSelect }) => {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item${active === item.id ? ' active' : ''}`}
            id={`nav-${item.id}`}
            onClick={() => onSelect(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.label}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
