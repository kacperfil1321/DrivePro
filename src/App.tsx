import React, { useState, useCallback, useEffect } from 'react';
import type { NavSection, Termin, Drive, Student } from './types';
import { MOCK_STUDENT, MOCK_SCHOOL, MOCK_DRIVES, MOCK_DOCUMENTS, MOCK_TERMINY } from './mockData';

import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import SectionStart from './components/SectionStart';
import SectionDokumenty from './components/SectionDokumenty';
import SectionSzkola from './components/SectionSzkola';
import SectionInfo from './components/SectionInfo';
import SectionJazdy from './components/SectionJazdy';
import Modal from './components/Modal';
import { BookingModal } from './components/BookingModal';
import Toast, { type ToastMessage } from './components/Toast';
import LoginScreen, { type UserSession } from './components/LoginScreen';
import { InstructorPanel } from './components/InstructorPanel';
import {
  fetchInstructors,
  fetchBookedRides,
  bookRideInDatabase,
  type Instructor,
  type RideReservation,
} from './lib/bookingService';

// ─── Helpers ───────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── App ───────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('start');
  const [drives, setDrives] = useState<Drive[]>(MOCK_DRIVES);
  const [terminy, setTerminy] = useState<Termin[]>(MOCK_TERMINY);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ── Database Data ────────────────────────────────────────────────────────
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [bookedRides, setBookedRides] = useState<RideReservation[]>([]);

  // Pobieranie danych z Supabase przy starcie
  useEffect(() => {
    async function loadData() {
      const [insData, ridesData] = await Promise.all([
        fetchInstructors(),
        fetchBookedRides(),
      ]);

      setInstructors(insData);
      setBookedRides(ridesData);

      // Jeśli w bazie są już jazdy, aktualizujemy stan drives i terminy
      if (ridesData.length > 0) {
        const loadedDrives: Drive[] = ridesData.map((r: RideReservation) => {
          const rDate = new Date(r.data);
          const dateYMD = rDate.toISOString().slice(0, 10);
          const timeH = String(rDate.getHours()).padStart(2, '0');
          const timeM = String(rDate.getMinutes()).padStart(2, '0');
          const endH = String(rDate.getHours() + 1).padStart(2, '0');
          const ins = insData.find((i: Instructor) => i.id === r.id_instruktora);
          const insName = ins ? `${ins.imie} ${ins.nazwisko}` : 'Instruktor';

          return {
            id: r.id,
            date: dateYMD,
            timeRange: `${timeH}:${timeM}–${endH}:${timeM}`,
            instructor: insName,
            duration: 60,
            status: rDate < new Date() ? 'completed' : 'upcoming',
          };
        });

        const loadedTerminy: Termin[] = ridesData
          .filter((r: RideReservation) => new Date(r.data) >= new Date())
          .map((r: RideReservation) => {
            const rDate = new Date(r.data);
            const dateYMD = rDate.toISOString().slice(0, 10);
            const timeH = String(rDate.getHours()).padStart(2, '0');
            const timeM = String(rDate.getMinutes()).padStart(2, '0');
            const ins = insData.find((i: Instructor) => i.id === r.id_instruktora);
            const insName = ins ? `${ins.imie} ${ins.nazwisko}` : 'Instruktor';

            return {
              id: `db-${r.id}`,
              title: `${r.typ_jazdy || 'Jazda'} (${insName})`,
              date: dateYMD,
              time: `${timeH}:${timeM}`,
              type: 'ride',
            };
          });

        if (loadedDrives.length > 0) {
          setDrives((prev) => {
            const merged = [...loadedDrives];
            prev.forEach((p) => {
              if (!merged.some((m) => m.date === p.date && m.timeRange === p.timeRange)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }

        if (loadedTerminy.length > 0) {
          setTerminy((prev) => {
            const merged = [...loadedTerminy];
            prev.forEach((p) => {
              if (!merged.some((m) => m.date === p.date && m.time === p.time)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }
      }
    }

    loadData();
  }, []);

  // ── Modals ──────────────────────────────────────────────────────────────
  const [reserveOpen, setReserveOpen] = useState(false);
  const [terminOpen, setTerminOpen] = useState(false);

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

  // Jeśli brak zalogowanego użytkownika -> ekran logowania
  if (!currentUser) {
    return <LoginScreen onLogin={(session) => setCurrentUser(session)} />;
  }

  // Jeśli zalogowano jako Instruktor -> dedykowany Panel Instruktora
  if (currentUser.role === 'instructor') {
    const activeInstructor: Instructor = currentUser.instructor || {
      id: currentUser.id,
      imie: currentUser.name.split(' ')[0] || 'Instruktor',
      nazwisko: currentUser.name.split(' ').slice(1).join(' ') || '',
      telefon: currentUser.phone,
    };

    return (
      <>
        <InstructorPanel
          instructor={activeInstructor}
          onLogout={() => setCurrentUser(null)}
          onNotify={(msg, type) => addToast(msg, type)}
        />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  // Zalogowano jako Kursant -> student profile
  const studentData: Student = currentUser.student
    ? {
        ...MOCK_STUDENT,
        firstName: currentUser.student.imie,
        lastName: currentUser.student.nazwisko,
        email: currentUser.student.email || currentUser.email || MOCK_STUDENT.email,
        phone: currentUser.student.telefon || MOCK_STUDENT.phone,
        category: currentUser.student.kategoria || MOCK_STUDENT.category,
      }
    : {
        ...MOCK_STUDENT,
        firstName: currentUser.name.split(' ')[0] || MOCK_STUDENT.firstName,
        lastName: currentUser.name.split(' ').slice(1).join(' ') || MOCK_STUDENT.lastName,
        email: currentUser.email || MOCK_STUDENT.email,
      };

  // ── Rezerwacja z bazą Supabase ──────────────────────────────────────────
  const handleBookingConfirm = async (booking: {
    instructorId: number;
    instructorName: string;
    date: string;
    time: string;
    rideType: string;
    notes: string;
  }): Promise<boolean | void> => {
    const result = await bookRideInDatabase({
      instructorId: booking.instructorId,
      dateStr: booking.date,
      timeStr: booking.time,
      type: booking.rideType,
      notes: booking.notes,
      studentId: currentUser.id,
    });

    if (!result.success) {
      addToast(result.error || 'Nie udało się zarezerwować terminu', 'error');
      // Odświeżamy rezerwacje, żeby zaktualizować zajęte sloty
      const latestRides = await fetchBookedRides();
      setBookedRides(latestRides);
      return false;
    }

    // Dodanie do lokalnego stanu jazdy
    const startHour = parseInt(booking.time.split(':')[0], 10);
    const timeRange = `${booking.time}–${String(startHour + 1).padStart(2, '0')}:${booking.time.split(':')[1]}`;

    const newDrive: Drive = {
      id: result.ride?.id || Date.now(),
      date: booking.date,
      timeRange,
      instructor: booking.instructorName,
      duration: 60,
      status: 'upcoming',
    };

    const newTermin: Termin = {
      id: `ride-${Date.now()}`,
      title: `${booking.rideType} (${booking.instructorName})`,
      date: booking.date,
      time: booking.time,
      type: 'ride',
    };

    setDrives((prev) => [newDrive, ...prev]);
    setTerminy((prev) => [...prev, newTermin]);

    if (result.ride) {
      setBookedRides((prev) => [...prev, result.ride!]);
    }

    addToast(`Jazda zarezerwowana pomyślnie u: ${booking.instructorName}!`, 'success');
    return true;
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

  // ── Render sekcji kursanta ───────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'start':
        return (
          <SectionStart
            student={studentData}
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
            student={studentData}
            onReserve={() => setReserveOpen(true)}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      {/* Topbar */}
      <Topbar
        student={studentData}
        courseProgress={studentData.courseProgress}
        onNavigateDane={() => addToast('Sekcja danych osobowych – wkrótce dostępna', 'info')}
        onLogout={() => setCurrentUser(null)}
      />

      {/* Layout */}
      <div className="layout">
        <Sidebar active={activeSection} onSelect={setActiveSection} />
        <main className="content">{renderSection()}</main>
      </div>

      {/* Footer */}
      <footer className="bottom-bar">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="14"
          height="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Dane prezentowane w panelu pochodzą ze szkoły jazdy, do której przypisany jest kursant —{' '}
        {studentData.schoolName}
      </footer>

      {/* Modal Rezerwacji z instruktorem, grafikiem i limitami */}
      <BookingModal
        isOpen={reserveOpen}
        onClose={() => setReserveOpen(false)}
        instructors={instructors}
        bookedRides={bookedRides}
        onConfirm={handleBookingConfirm}
      />

      {/* Modal: Dodaj termin */}
      <Modal
        isOpen={terminOpen}
        onClose={() => setTerminOpen(false)}
        title="Dodaj Termin"
        footer={
          <>
            <button className="btn-outline" onClick={() => setTerminOpen(false)}>
              Anuluj
            </button>
            <button className="btn-primary" id="confirmTerminBtn" onClick={handleConfirmTermin}>
              Dodaj termin
            </button>
          </>
        }
      >
        <div>
          <label className="field-label" htmlFor="terminName">
            Nazwa terminu
          </label>
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
          <label className="field-label" htmlFor="terminDate">
            Data
          </label>
          <input
            className="field-input"
            type="date"
            id="terminDate"
            value={terminDate}
            onChange={(e) => setTerminDate(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="terminHour">
            Godzina
          </label>
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
