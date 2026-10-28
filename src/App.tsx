import React, { useState, useCallback } from 'react';
import type { NavSection, Termin, Drive } from './types';
import { MOCK_STUDENT, MOCK_SCHOOL, MOCK_DRIVES, MOCK_DOCUMENTS, MOCK_TERMINY } from './mockData';

import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import SectionStart from './components/SectionStart';
import SectionDokumenty from './components/SectionDokumenty';
import SectionSzkola from './components/SectionSzkola';
import SectionInfo from './components/SectionInfo';
import SectionJazdy from './components/SectionJazdy';
import Modal from './components/Modal';
import Toast, { type ToastMessage } from './components/Toast';

// ─── Helpers ───────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── App ───────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<NavSection>('start');
  const [drives, setDrives] = useState<Drive[]>(MOCK_DRIVES);
  const [terminy, setTerminy] = useState<Termin[]>(MOCK_TERMINY);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ── Modals ──────────────────────────────────────────────────────────────
  const [reserveOpen, setReserveOpen] = useState(false);
  const [terminOpen, setTerminOpen] = useState(false);

  // Reserve form state
  const [reserveDate, setReserveDate] = useState('');
  const [reserveTime, setReserveTime] = useState('10:00');
  const [reserveInstructor, setReserveInstructor] = useState('Marek Nowak');

  // Add termin form state
  const [terminName, setTerminName] = useState('');
  const [terminDate, setTerminDate] = useState('');
  const [terminHour, setTerminHour] = useState('');

  // ── Toast helper ────────────────────────────────────────────────────────
  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = uid();
    setToasts((prev) => [...prev, { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleConfirmReserve = () => {
    if (!reserveDate) return;
    const newTermin: Termin = {
      id: uid(),
      title: `Jazda szkoleniowa (${reserveInstructor})`,
      date: reserveDate,
      time: reserveTime,
      type: 'ride',
    };
    const newDrive: Drive = {
      id: Date.now(),
      date: reserveDate,
      timeRange: `${reserveTime}–${parseInt(reserveTime.split(':')[0], 10) + 1}:00`,
      instructor: reserveInstructor,
      duration: 60,
      status: 'upcoming',
    };
    setTerminy((prev) => [...prev, newTermin]);
    setDrives((prev) => [newDrive, ...prev]);
    setReserveOpen(false);
    setReserveDate('');
    addToast('Jazda zarezerwowana pomyślnie!', 'success');
  };

  const handleConfirmTermin = () => {
    if (!terminName || !terminDate || !terminHour) return;
    const newTermin: Termin = {
      id: uid(),
      title: terminName,
      date: terminDate,
      time: terminHour,
      type: 'other',
    };
    setTerminy((prev) => [...prev, newTermin]);
    setTerminOpen(false);
    setTerminName('');
    setTerminDate('');
    setTerminHour('');
    addToast('Termin dodany!', 'success');
  };

  const handleDeleteTermin = (id: string) => {
    setTerminy((prev) => prev.filter((t) => t.id !== id));
    addToast('Termin usunięty', 'info');
  };

  void handleDeleteTermin;

  // ── Render ───────────────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'start':
        return (
          <SectionStart
            student={MOCK_STUDENT}
            school={MOCK_SCHOOL}
            terminy={terminy}
            drives={drives}
            onReserve={() => setReserveOpen(true)}
            onAddTermin={() => setTerminOpen(true)}
            onNavigate={setActiveSection}
          />
        );
      case 'dokumenty':
        return (
          <SectionDokumenty
            documents={MOCK_DOCUMENTS}
            onAddDocument={() => addToast('Funkcja wgrywania dokumentów wkrótce dostępna', 'info')}
          />
        );
      case 'szkola':
        return <SectionSzkola />;
      case 'info':
        return <SectionInfo />;
      case 'jazdy':
        return (
          <SectionJazdy
            drives={drives}
            student={MOCK_STUDENT}
            onReserve={() => setReserveOpen(true)}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      {/* Topbar */}
      <Topbar
        student={MOCK_STUDENT}
        courseProgress={MOCK_STUDENT.courseProgress}
        onNavigateDane={() => addToast('Sekcja danych osobowych – wkrótce dostępna', 'info')}
      />

      {/* Layout */}
      <div className="layout">
        <Sidebar
          active={activeSection}
          onSelect={setActiveSection}
        />
        <main className="content">{renderSection()}</main>
      </div>

      {/* Footer */}
      <footer className="bottom-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Dane prezentowane w panelu pochodzą ze szkoły jazdy, do której przypisany jest kursant — {MOCK_STUDENT.schoolName}
      </footer>

      {/* Modal: Rezervacja */}
      <Modal
        isOpen={reserveOpen}
        onClose={() => setReserveOpen(false)}
        title="Zarezerwuj Jazdę"
        footer={
          <>
            <button className="btn-outline" onClick={() => setReserveOpen(false)}>Anuluj</button>
            <button className="btn-primary" id="confirmReserveBtn" onClick={handleConfirmReserve}>
              Potwierdź rezerwację
            </button>
          </>
        }
      >
        <div>
          <label className="field-label" htmlFor="reserveDate">Wybierz datę</label>
          <input
            className="field-input"
            type="date"
            id="reserveDate"
            value={reserveDate}
            onChange={(e) => setReserveDate(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="reserveTime">Wybierz godzinę</label>
          <select
            className="field-input"
            id="reserveTime"
            value={reserveTime}
            onChange={(e) => setReserveTime(e.target.value)}
          >
            {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="reserveInstructor">Instruktor</label>
          <select
            className="field-input"
            id="reserveInstructor"
            value={reserveInstructor}
            onChange={(e) => setReserveInstructor(e.target.value)}
          >
            <option>Marek Nowak</option>
            <option>Anna Wiśniewska</option>
          </select>
        </div>
      </Modal>

      {/* Modal: Dodaj termin */}
      <Modal
        isOpen={terminOpen}
        onClose={() => setTerminOpen(false)}
        title="Dodaj Termin"
        footer={
          <>
            <button className="btn-outline" onClick={() => setTerminOpen(false)}>Anuluj</button>
            <button className="btn-primary" id="confirmTerminBtn" onClick={handleConfirmTermin}>
              Dodaj termin
            </button>
          </>
        }
      >
        <div>
          <label className="field-label" htmlFor="terminName">Nazwa terminu</label>
          <input
            className="field-input"
            type="text"
            id="terminName"
            placeholder="np. Egzamin wewnętrzny"
            value={terminName}
            onChange={(e) => setTerminName(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="terminDate">Data</label>
          <input
            className="field-input"
            type="date"
            id="terminDate"
            value={terminDate}
            onChange={(e) => setTerminDate(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="terminHour">Godzina</label>
          <input
            className="field-input"
            type="time"
            id="terminHour"
            value={terminHour}
            onChange={(e) => setTerminHour(e.target.value)}
          />
        </div>
      </Modal>

      {/* Toasts */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default App;
