import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MOCK_SCHOOL } from '../mockData';
import {
  DEFAULT_INSTRUCTORS,
  fetchInstructors,
  fetchAllDispositionsForMonth,
  updateDispositionStatusByAdmin,
  fetchBookedRides,
  parseRideTimestamp,
  type Instructor,
  type InstructorDisposition,
  type RideReservation,
} from '../lib/bookingService';
import { supabase, supabaseUrl, supabasePublishableKey } from '../lib/supabase';
import type { School } from '../types';

type OwnerTab = 'school' | 'instructors' | 'students' | 'calendar' | 'rides';
type AvailabilityStatus = 'submitted' | 'confirmed';

interface ShiftRange {
  start: string;
  end: string;
}

interface WorkAvailability {
  id: string;
  instructorId: number;
  date: string;
  shifts: ShiftRange[];
  status: AvailabilityStatus;
}

interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  category: string;
}

interface StudentDatabaseRecord {
  id: number | string;
  imie: string | null;
  nazwisko: string | null;
  email: string | null;
  telefon: string | null;
  kategoria: string | null;
  pkk: string | null;
}

interface Props {
  onExit: () => void;
}

const ADMIN_TABS: { id: OwnerTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'school',
    label: 'Szkoła jazdy',
    icon: <><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01M16 14v.01M16 17v.01" /></>,
  },
  {
    id: 'instructors',
    label: 'Instruktorzy',
    icon: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 4.6V20" /></>,
  },
  {
    id: 'students',
    label: 'Kursanci',
    icon: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  },
  {
    id: 'calendar',
    label: 'Dyspozycje',
    icon: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m8 15 2 2 5-5" /></>,
  },
  {
    id: 'rides',
    label: 'Terminarz jazd',
    icon: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14l2 2 4-4M8 18l2 2 4-4" /></>,
  },
];

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];
const LONG_MONTHS = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPhone(phone?: string | null): string {
  return phone || '—';
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
}

export const OwnerPanel: React.FC<Props> = ({ onExit }) => {
  const [now] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<OwnerTab>('school');

  useEffect(() => {
    document.title = 'DrivePro · Panel właściciela';
  }, []);
  const [school, setSchool] = useState<School>(MOCK_SCHOOL);
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [schoolSaved, setSchoolSaved] = useState(false);
  const [instructorSearch, setInstructorSearch] = useState('');
  const [isAddingInstructor, setIsAddingInstructor] = useState(false);
  const [newInstructorFirstName, setNewInstructorFirstName] = useState('');
  const [newInstructorLastName, setNewInstructorLastName] = useState('');
  const [newInstructorPhone, setNewInstructorPhone] = useState('');
  const [newInstructorEmail, setNewInstructorEmail] = useState('');
  const [newInstructorPassword, setNewInstructorPassword] = useState('');
  const [newInstructorEmployment, setNewInstructorEmployment] = useState<
    'pełny etat' | '3/4 etatu' | '1/2 etatu' | '1/4 etatu' | 'zlecenie'
  >('pełny etat');
  const [newInstructorError, setNewInstructorError] = useState('');
  const [isSavingInstructor, setIsSavingInstructor] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentPkkValues, setStudentPkkValues] = useState<Record<string, string>>({});
  const [studentCategories, setStudentCategories] = useState<Record<string, string>>({});
  const [instructorEmployment, setInstructorEmployment] = useState<
    Record<number, 'pełny etat' | '1/4 etatu' | '1/2 etatu' | '3/4 etatu' | 'zlecenie'>
  >({});
  const [editingPkkStudentId, setEditingPkkStudentId] = useState<string | null>(null);
  const [pkkDraft, setPkkDraft] = useState('');
  const [pkkError, setPkkError] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentsRequireLogin, setStudentsRequireLogin] = useState(false);
  const [studentsReloadKey, setStudentsReloadKey] = useState(0);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [isSigningInOwner, setIsSigningInOwner] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth() + 1, 1),
  );
  const [selectedDate, setSelectedDate] = useState(
    () => toDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 3)),
  );

  useEffect(() => {
    if (activeTab !== 'students') return;

    let isActive = true;
    const loadStudents = async () => {
      setStudentsLoading(true);
      setStudentsError(null);
      setStudentsRequireLogin(false);

      if (!supabase) {
        setStudentsError('Brak konfiguracji Supabase. Sprawdź zmienne VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY.');
        setStudentsLoading(false);
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) {
          setStudentsRequireLogin(true);
          setStudentsLoading(false);
          return;
        }

        const pageSize = 500;
        const records: StudentDatabaseRecord[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('kursanci')
            .select('id, imie, nazwisko, email, telefon, kategoria, pkk')
            .order('id', { ascending: true })
            .range(from, from + pageSize - 1);

          if (error) throw error;

          const page: StudentDatabaseRecord[] = data;
          records.push(...page);
          hasMore = page.length === pageSize;
          from += pageSize;
        }

        if (isActive) {
          setStudentPkkValues(
            records.reduce<Record<string, string>>((values, record) => {
              if (record.pkk) values[String(record.id)] = record.pkk;
              return values;
            }, {}),
          );
          setStudents(records.map((record) => ({
            id: String(record.id),
            firstName: record.imie || '',
            lastName: record.nazwisko || '',
            email: record.email || '',
            phone: record.telefon || '',
            category: record.kategoria || '',
          })));
        }
      } catch (error) {
        if (isActive) {
          setStudentsError(
            error instanceof Error
              ? `Nie udało się pobrać kursantów: ${error.message}`
              : 'Nie udało się pobrać kursantów z Supabase.',
          );
        }
      } finally {
        if (isActive) setStudentsLoading(false);
      }
    };

    void loadStudents();
    return () => {
      isActive = false;
    };
  }, [activeTab, studentsReloadKey]);

  const handleOwnerSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStudentsError(null);

    if (!supabase) {
      setStudentsError('Brak konfiguracji Supabase. Sprawdź zmienne VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setIsSigningInOwner(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: ownerEmail.trim().toLowerCase(),
        password: ownerPassword,
      });

      if (error) {
        setStudentsError(`Nie udało się zalogować: ${error.message}`);
        return;
      }

      setOwnerPassword('');
      setStudentsRequireLogin(false);
      setStudentsReloadKey((key) => key + 1);
    } catch (error) {
      setStudentsError(
        error instanceof Error
          ? `Nie udało się połączyć z Supabase: ${error.message}`
          : 'Wystąpił nieoczekiwany błąd podczas logowania.',
      );
    } finally {
      setIsSigningInOwner(false);
    }
  };

  const startPkkEdit = (studentId: string) => {
    setEditingPkkStudentId(studentId);
    setPkkDraft(studentPkkValues[studentId] || '');
    setPkkError('');
  };

  const savePkk = async (event: React.FormEvent<HTMLFormElement>, studentId: string) => {
    event.preventDefault();
    const normalizedPkk = pkkDraft.trim();
    if (!/^\d{20}$/.test(normalizedPkk)) {
      setPkkError('Numer PKK powinien składać się z 20 cyfr.');
      return;
    }

    if (!supabase) {
      setPkkError('Brak konfiguracji Supabase.');
      return;
    }

    const { error } = await supabase
      .from('kursanci')
      .update({ pkk: normalizedPkk })
      .eq('id', Number(studentId));

    if (error) {
      setPkkError(`Nie udało się zapisać PKK: ${error.message}`);
      return;
    }

    setStudentPkkValues((current) => ({ ...current, [studentId]: normalizedPkk }));
    setEditingPkkStudentId(null);
    setPkkDraft('');
    setPkkError('');
  };

  const [instructors, setInstructors] = useState<Instructor[]>(DEFAULT_INSTRUCTORS);
  const [availabilityState, setAvailabilityState] = useState<WorkAvailability[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState<boolean>(false);
  const [rides, setRides] = useState<RideReservation[]>([]);
  const [isLoadingRides, setIsLoadingRides] = useState(false);
  const [rideSortMode, setRideSortMode] = useState<'instructor' | 'student'>('instructor');
  const [rideInstructorFilter, setRideInstructorFilter] = useState('all');
  const [rideStudentFilter, setRideStudentFilter] = useState('all');

  // Pobierz rzeczywistą listę instruktorów z bazy
  useEffect(() => {
    fetchInstructors().then((data) => {
      if (data && data.length > 0) {
        setInstructors(data);
        setInstructorEmployment(
          data.reduce<Record<number, 'pełny etat' | '1/4 etatu' | '1/2 etatu' | '3/4 etatu' | 'zlecenie'>>(
            (values, instructor) => {
              values[instructor.id] = instructor.etat || 'pełny etat';
              return values;
            },
            {},
          ),
        );
      }
    });
  }, []);

  useEffect(() => {
    if (activeTab !== 'rides' && activeTab !== 'students') return;
    let isActive = true;
    setIsLoadingRides(true);
    fetchBookedRides().then((data) => {
      if (isActive) setRides(data);
      if (isActive) setIsLoadingRides(false);
    });
    return () => {
      isActive = false;
    };
  }, [activeTab]);

  // Pobierz wyłącznie FAKTYCZNE dyspozycje instruktorów na dany miesiąc
  useEffect(() => {
    let isActive = true;
    setIsLoadingAvailability(true);

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;

    fetchAllDispositionsForMonth(year, month).then((disps: InstructorDisposition[]) => {
      if (!isActive) return;
      const actualAvailability: WorkAvailability[] = disps
        .filter((item) => item.status === 'oczekuje' || item.status === 'zatwierdzona')
        .map((item) => ({
          id: `${item.data}-${item.id_instruktora}`,
          instructorId: item.id_instruktora,
          date: item.data,
          shifts: [{ start: item.godzina_od.slice(0, 5), end: item.godzina_do.slice(0, 5) }],
          status: item.status === 'zatwierdzona' ? 'confirmed' : 'submitted',
        }));
      setAvailabilityState(actualAvailability);
      setIsLoadingAvailability(false);
    });

    return () => {
      isActive = false;
    };
  }, [calendarMonth]);

  const availability = availabilityState;

  const handleApproveShift = async (entry: WorkAvailability) => {
    setAvailabilityState((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, status: 'confirmed' } : item))
    );

    await updateDispositionStatusByAdmin(
      entry.instructorId,
      entry.date,
      'zatwierdzona',
      entry.shifts[0] ? { start: entry.shifts[0].start, end: entry.shifts[0].end } : undefined
    );
  };
  const availabilityByDate = useMemo(() => {
    const map = new Map<string, WorkAvailability[]>();
    availability.forEach((entry) => {
      map.set(entry.date, [...(map.get(entry.date) || []), entry]);
    });
    return map;
  }, [availability]);
  const selectedAvailability = availabilityByDate.get(selectedDate) || [];
  const selectedDateValue = new Date(`${selectedDate}T12:00:00`);
  const isSelectedDateInMonth =
    selectedDateValue.getFullYear() === calendarMonth.getFullYear() &&
    selectedDateValue.getMonth() === calendarMonth.getMonth();

  const filteredInstructors = instructors.filter((instructor) =>
    `${instructor.imie} ${instructor.nazwisko}`.toLowerCase().includes(instructorSearch.toLowerCase()),
  );
  const filteredStudents = students.filter((student) =>
    `${student.firstName} ${student.lastName} ${student.email}`.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  const handleAddInstructor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewInstructorError('');

    const firstName = newInstructorFirstName.trim();
    const lastName = newInstructorLastName.trim();
    const phone = newInstructorPhone.trim();
    const email = newInstructorEmail.trim().toLowerCase();
    const password = newInstructorPassword;

    if (!firstName || !lastName) {
      setNewInstructorError('Podaj imię i nazwisko instruktora.');
      return;
    }
    if (!email || !password) {
      setNewInstructorError('Podaj adres e-mail i tymczasowe hasło konta instruktora.');
      return;
    }
    if (password.length < 8) {
      setNewInstructorError('Tymczasowe hasło musi mieć co najmniej 8 znaków.');
      return;
    }
    if (!supabase) {
      setNewInstructorError('Brak konfiguracji Supabase.');
      return;
    }

    setIsSavingInstructor(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setNewInstructorError(
          'Zaloguj się jako właściciel, aby utworzyć konto instruktora.',
        );
        return;
      }
      if (!supabaseUrl || !supabasePublishableKey) {
        setNewInstructorError('Brak konfiguracji Supabase.');
        return;
      }

      const accountClient = createClient(supabaseUrl, supabasePublishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: authData, error: authError } = await accountClient.auth.signUp({
        email,
        password,
        options: {
          data: { imie: firstName, nazwisko: lastName, telefon: phone || null, role: 'instructor' },
        },
      });

      if (authError) {
        setNewInstructorError(`Nie udało się utworzyć konta: ${authError.message}`);
        return;
      }
      if (!authData.user) {
        setNewInstructorError('Supabase nie zwróciło danych nowego konta.');
        return;
      }

      const { data: newInstructor, error: insertError } = await supabase
        .from('instruktorzy')
        .insert({
          imie: firstName,
          nazwisko: lastName,
          telefon: phone || null,
          email,
          etat: newInstructorEmployment,
          user_id: authData.user.id,
        })
        .select('*')
        .single();

      if (insertError) {
        setNewInstructorError(`Konto utworzono, ale nie udało się zapisać profilu: ${insertError.message}`);
        return;
      }
      setInstructors((current) => [...current, newInstructor].sort((a, b) =>
        `${a.nazwisko} ${a.imie}`.localeCompare(`${b.nazwisko} ${b.imie}`, 'pl'),
      ));
      setInstructorEmployment((current) => ({
        ...current,
        [newInstructor.id]: newInstructorEmployment,
      }));
      setNewInstructorFirstName('');
      setNewInstructorLastName('');
      setNewInstructorPhone('');
      setNewInstructorEmail('');
      setNewInstructorPassword('');
      setNewInstructorEmployment('pełny etat');
      setIsAddingInstructor(false);
    } catch (error) {
      setNewInstructorError(
        error instanceof Error
          ? `Nie udało się zapisać instruktora: ${error.message}`
          : 'Nie udało się zapisać instruktora.',
      );
    } finally {
      setIsSavingInstructor(false);
    }
  };

  const setMonth = (offset: number) => {
    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
    const selectedDay = Math.min(selectedDateValue.getDate(), lastDay);
    setCalendarMonth(nextMonth);
    setSelectedDate(toDateKey(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), selectedDay)));
  };

  const selectCalendarDate = (date: Date) => {
    const dateKey = toDateKey(date);
    setSelectedDate(dateKey);
    if (date.getMonth() !== calendarMonth.getMonth() || date.getFullYear() !== calendarMonth.getFullYear()) {
      setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Date[] = [];

    for (let index = 0; index < offset; index += 1) {
      cells.push(new Date(year, month, 1 - offset + index));
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) {
      const lastCell = cells[cells.length - 1];
      cells.push(new Date(lastCell.getFullYear(), lastCell.getMonth(), lastCell.getDate() + 1));
    }
    return cells;
  }, [calendarMonth]);

  const handleSchoolSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsEditingSchool(false);
    setSchoolSaved(true);
    window.setTimeout(() => setSchoolSaved(false), 2800);
  };

  const renderSchoolTab = () => (
    <>
      <div className="owner-stat-grid">
        <div className="owner-stat-card"><span className="owner-stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /></svg></span><span className="owner-stat-copy"><small>Szkoła jazdy</small><strong>{school.name}</strong></span></div>
        <div className="owner-stat-card"><span className="owner-stat-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4.6V20" /></svg></span><span className="owner-stat-copy"><small>Instruktorzy</small><strong>{instructors.length} <em>aktywnych</em></strong></span></div>
        <button type="button" className="owner-stat-card owner-stat-action" onClick={() => setActiveTab('students')}><span className="owner-stat-icon violet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg></span><span className="owner-stat-copy"><small>Kursanci</small><strong>{students.length} <em>{studentsLoading ? 'pobieranie…' : 'z bazy Supabase'}</em></strong></span></button>
        <button type="button" className="owner-stat-card owner-stat-action" onClick={() => setActiveTab('calendar')}><span className="owner-stat-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg></span><span className="owner-stat-copy"><small>Grafik · {MONTHS[calendarMonth.getMonth()]}</small><strong>{totalPending} <em>do potwierdzenia</em></strong></span><span className="owner-stat-arrow">›</span></button>
      </div>
      <div className="owner-school-layout">
        <section className="owner-card owner-school-card">
        <div className="owner-card-heading">
          <div className="owner-heading-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ADMIN_TABS[0].icon}</svg></div>
          <div>
            <h2>Dane szkoły jazdy</h2>
            <p>Informacje widoczne w panelach kursantów i instruktorów.</p>
          </div>
          {!isEditingSchool && <button className="owner-secondary-button" type="button" onClick={() => setIsEditingSchool(true)}>Edytuj dane</button>}
        </div>

        {isEditingSchool ? (
          <form className="owner-school-form" onSubmit={handleSchoolSave}>
            <label>Nazwa szkoły<input value={school.name} onChange={(event) => setSchool({ ...school, name: event.target.value })} required /></label>
            <div className="owner-form-row">
              <label>Adres<input value={school.address} onChange={(event) => setSchool({ ...school, address: event.target.value })} required /></label>
              <label>Miasto i kod<input value={school.city} onChange={(event) => setSchool({ ...school, city: event.target.value })} required /></label>
            </div>
            <div className="owner-form-row">
              <label>Telefon<input value={school.phone} onChange={(event) => setSchool({ ...school, phone: event.target.value })} required /></label>
              <label>E-mail<input type="email" value={school.email} onChange={(event) => setSchool({ ...school, email: event.target.value })} required /></label>
            </div>
            <div className="owner-form-row">
              <label>Strona internetowa<input value={school.website} onChange={(event) => setSchool({ ...school, website: event.target.value })} /></label>
              <label>NIP<input value={school.nip} onChange={(event) => setSchool({ ...school, nip: event.target.value })} /></label>
            </div>
            <label>Godziny otwarcia<input value={school.openHours} onChange={(event) => setSchool({ ...school, openHours: event.target.value })} /></label>
            <div className="owner-form-actions">
              <button className="owner-secondary-button" type="button" onClick={() => { setSchool(MOCK_SCHOOL); setIsEditingSchool(false); }}>Anuluj</button>
              <button className="owner-primary-button" type="submit">Zapisz zmiany</button>
            </div>
          </form>
        ) : (
          <div className="owner-school-details">
            {[
              ['Adres', `${school.address}, ${school.city}`],
              ['Telefon', school.phone],
              ['E-mail', school.email],
              ['Strona', school.website],
              ['NIP', school.nip],
              ['Godziny otwarcia', school.openHours],
              ['Samochód szkoleniowy', school.carModel || '—'],
            ].map(([label, value]) => (
              <div className="owner-detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
            {schoolSaved && <p className="owner-inline-success" role="status">Zmiany zapisano w podglądzie. Połączenie z bazą dodamy w kolejnym etapie.</p>}
          </div>
        )}
      </section>

      <aside className="owner-card owner-school-summary">
        <span className="owner-summary-label">PODGLĄD PROFILU</span>
        <div className="owner-school-monogram">DP</div>
        <h3>{school.name}</h3>
        <p>{school.address}<br />{school.city}</p>
        <div className="owner-summary-divider" />
        <div className="owner-summary-contact"><span>Telefon</span><strong>{school.phone}</strong></div>
        <div className="owner-summary-contact"><span>E-mail</span><strong>{school.email}</strong></div>
        </aside>
      </div>
    </>
  );

  const renderInstructorsTab = () => (
    <section className="owner-card">
        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead><tr><th>Instruktor</th><th>Telefon</th><th>Kategorie</th><th>Etat</th><th>Status</th></tr></thead>
            <tbody>
              {filteredInstructors.map((instructor) => (
                <tr key={instructor.id}>
                  <td><div className="owner-person-cell"><span className="owner-person-avatar">{initials(instructor.imie, instructor.nazwisko)}</span><strong>{instructor.imie} {instructor.nazwisko}</strong></div></td>
                  <td>{formatPhone(instructor.telefon)}</td>
                  <td><span className="owner-category-chip">Kat. B</span></td>
                  <td>
                    <select
                      className="owner-table-select"
                      aria-label={`Etat instruktora ${instructor.imie} ${instructor.nazwisko}`}
                      value={instructorEmployment[instructor.id] || 'pełny etat'}
                      onChange={async (event) => {
                        const employment = event.target.value as
                          | 'pełny etat'
                          | '1/4 etatu'
                          | '1/2 etatu'
                          | '3/4 etatu'
                          | 'zlecenie';
                        if (!supabase) {
                          setStudentsError('Brak konfiguracji Supabase. Nie udało się zapisać etatu.');
                          return;
                        }
                        const { error } = await supabase
                          .from('instruktorzy')
                          .update({ etat: employment })
                          .eq('id', instructor.id);
                        if (error) {
                          setStudentsError(`Nie udało się zapisać etatu instruktora: ${error.message}`);
                          return;
                        }
                        setInstructorEmployment((current) => ({
                          ...current,
                          [instructor.id]: employment,
                        }));
                        setStudentsError(null);
                      }}
                    >
                      <option value="pełny etat">Pełny etat</option>
                      <option value="3/4 etatu">3/4 etatu</option>
                      <option value="1/2 etatu">1/2 etatu</option>
                      <option value="1/4 etatu">1/4 etatu</option>
                      <option value="zlecenie">Zlecenie</option>
                    </select>
                  </td>
                  <td><span className="owner-status-pill owner-status-active"><span />Aktywny</span></td>
                </tr>
              ))}
              {filteredInstructors.length === 0 && <tr><td className="owner-empty-cell" colSpan={5}>Nie znaleziono instruktora.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="owner-table-footer-action">
          <button type="button" className="owner-table-add-button" onClick={() => setIsAddingInstructor(true)}>
            + Dodaj instruktora
          </button>
        </div>
    </section>
  );

  const renderStudentsTab = () => (
    <section className="owner-card">
      {studentsError && <p className="owner-data-error" role="alert">{studentsError} Sprawdź też, czy polityka RLS w tabeli `kursanci` pozwala temu kontu na odczyt danych szkoły.</p>}
      {studentsRequireLogin && (
        <form className="owner-data-login" onSubmit={handleOwnerSignIn}>
          <div>
            <strong>Zaloguj właściciela szkoły</strong>
            <p>Lista pokaże wyłącznie rekordy dozwolone dla tego konta przez politykę RLS.</p>
          </div>
          <label>E-mail<input type="email" autoComplete="username" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} required /></label>
          <label>Hasło<input type="password" autoComplete="current-password" value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} required /></label>
          <button className="owner-primary-button" type="submit" disabled={isSigningInOwner}>{isSigningInOwner ? 'Logowanie…' : 'Zaloguj'}</button>
        </form>
      )}
      <div className="owner-table-wrap">
        <table className="owner-table owner-students-table">
          <thead><tr><th>Numer kursanta</th><th>Kursant</th><th>Kontakt</th><th>Kategoria</th><th>Odbytych godzin</th><th>Status</th><th>Numer PKK</th></tr></thead>
          <tbody>
            {studentsLoading && <tr><td className="owner-empty-cell" colSpan={7}>Pobieranie kursantów z Supabase…</td></tr>}
            {!studentsLoading && studentsRequireLogin && <tr><td className="owner-empty-cell" colSpan={7}>Zaloguj się, aby wczytać dane kursantów.</td></tr>}
            {!studentsLoading && filteredStudents.map((student) => (
              <tr key={student.id}>
                <td><strong className="owner-student-number">#{student.id}</strong></td>
                <td><div className="owner-person-cell"><span className="owner-person-avatar owner-student-avatar">{initials(student.firstName, student.lastName)}</span><strong>{student.firstName} {student.lastName}</strong></div></td>
                <td><span>{student.email || '—'}</span><small>{student.phone || '—'}</small></td>
                <td>
                  <select
                    className="owner-table-select"
                    aria-label={`Kategoria kursanta ${student.firstName} ${student.lastName}`}
                    value={studentCategories[student.id] || student.category || 'B'}
                    onChange={(event) => setStudentCategories((current) => ({
                      ...current,
                      [student.id]: event.target.value,
                    }))}
                  >
                    <option value="A">Kat. A</option>
                    <option value="A1">Kat. A1</option>
                    <option value="A2">Kat. A2</option>
                    <option value="B">Kat. B</option>
                    <option value="B1">Kat. B1</option>
                    <option value="C">Kat. C</option>
                    <option value="C1">Kat. C1</option>
                    <option value="D">Kat. D</option>
                    <option value="T">Kat. T</option>
                  </select>
                </td>
                <td>
                  {(() => {
                    const nowTime = new Date();
                    const studentRides = rides.filter((ride) =>
                      ride.id_kursanta === Number(student.id),
                    );
                    const completedCount = studentRides.filter((ride) => {
                      const rideDate = new Date(ride.data);
                      return !Number.isNaN(rideDate.getTime()) && rideDate < nowTime;
                    }).length;
                    const plannedCount = studentRides.filter((ride) => {
                      const rideDate = new Date(ride.data);
                      return !Number.isNaN(rideDate.getTime()) && rideDate >= nowTime;
                    }).length;
                    const completedHours = completedCount * 2;
                    return (
                      <div className="owner-student-hours-cell">
                        <div>
                          <strong className="owner-student-hours">{completedHours}</strong>
                          <span className="owner-hours-unit">godz.</span>
                        </div>
                        {plannedCount > 0 && (
                          <span className="owner-planned-hours">
                            + {plannedCount * 2} godz. zaplanowanych
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td>
                  {(() => {
                    const nowTime = new Date();
                    const completedCount = rides.filter((ride) =>
                      ride.id_kursanta === Number(student.id)
                      && new Date(ride.data) < nowTime,
                    ).length;
                    const completedHours = completedCount * 2;
                    const status = completedHours >= 30 ? 'Ukończył kurs' : 'Aktywny';
                    return (
                      <span className={`owner-status-pill ${completedHours >= 30 ? 'owner-status-done' : 'owner-status-active'}`}>
                        <span />
                        {status}
                      </span>
                    );
                  })()}
                </td>
                <td>
                  {editingPkkStudentId === student.id ? (
                    <form className="owner-pkk-form" onSubmit={(event) => savePkk(event, student.id)}>
                      <input
                        aria-label={`Numer PKK dla ${student.firstName} ${student.lastName}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={20}
                        placeholder="20 cyfr"
                        value={pkkDraft}
                        onChange={(event) => {
                          setPkkDraft(event.target.value.replace(/\D/g, ''));
                          setPkkError('');
                        }}
                        autoFocus
                      />
                      <button type="submit" className="owner-pkk-save">Zapisz</button>
                      <button type="button" className="owner-pkk-cancel" onClick={() => { setEditingPkkStudentId(null); setPkkError(''); }}>Anuluj</button>
                      {pkkError && <small className="owner-pkk-error" role="alert">{pkkError}</small>}
                    </form>
                  ) : (
                    <div className="owner-pkk-cell">
                      <span>{studentPkkValues[student.id] || 'Nie przypisano'}</span>
                      <button type="button" onClick={() => startPkkEdit(student.id)}>
                        {studentPkkValues[student.id] ? 'Edytuj' : 'Przypisz PKK'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!studentsLoading && !studentsError && !studentsRequireLogin && filteredStudents.length === 0 && (
              <tr><td className="owner-empty-cell" colSpan={5}>
                {students.length === 0
                  ? 'Brak kursantów dostępnych dla tej sesji. Sprawdź politykę RLS.'
                  : 'Nie znaleziono kursanta.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderCalendarTab = () => (
    <div className="owner-calendar-layout">
      <section className="owner-card owner-calendar-card">
        <div className="owner-calendar-toolbar">
          <div>
            <h2>Terminarz pracy</h2>
            <p>Dyspozycyjność instruktorów w widoku miesięcznym.</p>
          </div>
          <div className="owner-month-controls">
            <button type="button" aria-label="Poprzedni miesiąc" onClick={() => setMonth(-1)}>‹</button>
            <strong>{MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</strong>
            <button type="button" aria-label="Następny miesiąc" onClick={() => setMonth(1)}>›</button>
          </div>
        </div>

        <div className="owner-calendar-weekdays">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="owner-calendar-grid">
          {calendarCells.map((date) => {
            const dateKey = toDateKey(date);
            const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
            const isToday = dateKey === toDateKey(now);
            const isSelected = dateKey === selectedDate;
            const entries = availabilityByDate.get(dateKey) || [];
            const className = [
              'owner-calendar-day',
              !isCurrentMonth ? 'outside-month' : '',
              isToday ? 'today' : '',
              isSelected ? 'selected' : '',
            ].filter(Boolean).join(' ');

            return (
              <button className={className} type="button" key={dateKey} onClick={() => selectCalendarDate(date)}>
                <span className="owner-calendar-day-number">{date.getDate()}</span>
                <span className="owner-calendar-events">
                  {entries.slice(0, 2).map((entry) => {
                    const instructor = instructors.find((item) => item.id === entry.instructorId);
                    return (
                      <span className={`owner-calendar-event ${entry.status}`} key={entry.id}>
                        {entry.shifts.map((shift) => (
                          <b aria-label={`${shift.start}–${shift.end}`} key={`${entry.id}-${shift.start}`}>
                            <span className="owner-time-full">{shift.start}–{shift.end}</span>
                            <span className="owner-time-compact">{shift.start.slice(0, 2)}–{shift.end.slice(0, 2)}</span>
                          </b>
                        ))}
                        <span>{instructor?.imie || 'Instr.'}</span>
                      </span>
                    );
                  })}
                  {entries.length > 2 && <span className="owner-calendar-more">+{entries.length - 2} więcej</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="owner-calendar-legend">
          <span><i className="submitted" />Zgłoszona dyspozycja ({totalPending})</span>
          <span><i className="confirmed" />Zatwierdzona ({totalConfirmed})</span>
          {isLoadingAvailability && <span style={{ marginLeft: 12, color: 'var(--gray-500)' }}>Wczytywanie dyspozycji...</span>}
        </div>
      </section>

      <aside className="owner-card owner-day-details">
        <span className="owner-day-eyebrow">WYBRANY DZIEŃ</span>
        <h3>{selectedDateValue.getDate()} {LONG_MONTHS[selectedDateValue.getMonth()]} {selectedDateValue.getFullYear()}</h3>
        {!isSelectedDateInMonth && <p className="owner-day-month-note">Widok kalendarza został przełączony na wybrany miesiąc.</p>}
        {selectedAvailability.length ? (
          <div className="owner-day-entry-list">
            {selectedAvailability.map((entry) => {
              const instructor = instructors.find((item) => item.id === entry.instructorId);
              return (
                <div className="owner-day-entry" key={entry.id}>
                  <div className="owner-person-cell">
                    <span className="owner-person-avatar">{initials(instructor?.imie || '?', instructor?.nazwisko || '')}</span>
                    <div><strong>{instructor ? `${instructor.imie} ${instructor.nazwisko}` : 'Instruktor'}</strong><small>{entry.status === 'submitted' ? 'Oczekuje na potwierdzenie' : 'Dyspozycyjność potwierdzona'}</small></div>
                  </div>
                  <div className="owner-shift-list">
                    {entry.shifts.map((shift) => (
                      <span className="owner-shift-time" key={`${entry.id}-${shift.start}`}>{shift.start}<b>–</b>{shift.end}</span>
                    ))}
                  </div>
                  <span className={`owner-status-pill ${entry.status === 'submitted' ? 'owner-status-pending' : 'owner-status-done'}`}><span />{entry.status === 'submitted' ? 'Do zatwierdzenia' : 'Zatwierdzona w grafiku'}</span>
                  {entry.status === 'submitted' && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: 8, padding: '4px 10px', fontSize: 11 }}
                      onClick={() => handleApproveShift(entry)}
                    >
                      ✓ Zatwierdź do grafiku
                    </button>
                  )}
                </div>
              );

            })}
          </div>
        ) : (
          <div className="owner-day-empty">
            <span className="owner-day-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg></span>
            <strong>Brak dyspozycyjności</strong>
            <span>Na ten dzień nie dodano jeszcze przedziałów pracy.</span>
          </div>
        )}
      </aside>
    </div>
  );

  const ridesInSelectedMonth = rides
    .filter((ride) => {
      const parsed = parseRideTimestamp(ride.data);
      return parsed.dateStr.startsWith(
        `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`,
      );
    })
    .filter((ride) =>
      rideInstructorFilter === 'all' || String(ride.id_instruktora) === rideInstructorFilter,
    )
    .filter((ride) =>
      rideStudentFilter === 'all' || String(ride.id_kursanta || '') === rideStudentFilter,
    )
    .sort((left, right) => left.data.localeCompare(right.data));

  const rideStudentOptions = Array.from(
    new Map(
      rides
        .filter((ride) => ride.id_kursanta)
        .map((ride) => [
          String(ride.id_kursanta),
          ride.kursant
            ? `${ride.kursant.imie} ${ride.kursant.nazwisko}`
            : `Kursant ID ${ride.id_kursanta}`,
        ]),
    ).entries(),
  );

  const rideGroups = useMemo(() => {
    const grouped = new Map<string, RideReservation[]>();
    ridesInSelectedMonth.forEach((ride) => {
      const key = rideSortMode === 'instructor'
        ? `instructor-${ride.id_instruktora}`
        : `student-${ride.id_kursanta || 'unknown'}`;
      grouped.set(key, [...(grouped.get(key) || []), ride]);
    });
    return Array.from(grouped.entries()).sort(([leftKey, leftRides], [rightKey, rightRides]) => {
      if (rideSortMode === 'instructor') {
        const left = instructors.find((item) => `instructor-${item.id}` === leftKey);
        const right = instructors.find((item) => `instructor-${item.id}` === rightKey);
        return `${left?.nazwisko || ''} ${left?.imie || ''}`.localeCompare(
          `${right?.nazwisko || ''} ${right?.imie || ''}`,
          'pl',
        );
      }
      const leftRide = leftRides[0];
      const rightRide = rightRides[0];
      return `${leftRide?.kursant?.nazwisko || ''} ${leftRide?.kursant?.imie || ''}`.localeCompare(
        `${rightRide?.kursant?.nazwisko || ''} ${rightRide?.kursant?.imie || ''}`,
        'pl',
      );
    });
  }, [ridesInSelectedMonth, rideSortMode, instructors]);

  const renderRidesTab = () => (
    <section className="owner-card owner-rides-card">
      <div className="owner-calendar-toolbar">
        <div>
          <h2>Terminarz jazd</h2>
          <p>Sortuj jazdy według instruktora lub kursanta.</p>
        </div>
        <div className="owner-month-controls">
          <button type="button" aria-label="Poprzedni miesiąc" onClick={() => setMonth(-1)}>‹</button>
          <strong>{MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</strong>
          <button type="button" aria-label="Następny miesiąc" onClick={() => setMonth(1)}>›</button>
        </div>
      </div>

      <div className="owner-rides-controls">
        <div className="owner-rides-sort" role="group" aria-label="Sortowanie jazd">
          <button
            type="button"
            className={rideSortMode === 'instructor' ? 'active' : ''}
            onClick={() => setRideSortMode('instructor')}
          >
            Według instruktora
          </button>
          <button
            type="button"
            className={rideSortMode === 'student' ? 'active' : ''}
            onClick={() => setRideSortMode('student')}
          >
            Według kursanta
          </button>
        </div>
        <div className="owner-rides-filters">
          <label>
            Instruktor
            <select value={rideInstructorFilter} onChange={(event) => setRideInstructorFilter(event.target.value)}>
              <option value="all">Wszyscy instruktorzy</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={String(instructor.id)}>
                  {instructor.imie} {instructor.nazwisko}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kursant
            <select value={rideStudentFilter} onChange={(event) => setRideStudentFilter(event.target.value)}>
              <option value="all">Wszyscy kursanci</option>
              {rideStudentOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoadingRides ? (
        <div className="owner-day-empty"><strong>Wczytywanie jazd...</strong></div>
      ) : ridesInSelectedMonth.length === 0 ? (
        <div className="owner-day-empty">
          <span className="owner-day-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          </span>
          <strong>Brak zarezerwowanych jazd</strong>
          <span>W tym miesiącu nie ma jeszcze żadnych jazd.</span>
        </div>
      ) : (
        <div className="owner-rides-groups">
          {rideGroups.map(([key, groupRides]) => {
            const firstRide = groupRides[0];
            const instructor = instructors.find((item) => `instructor-${item.id}` === key);
            const studentName = firstRide?.kursant
              ? `${firstRide.kursant.imie} ${firstRide.kursant.nazwisko}`
              : `Kursant ID ${firstRide?.id_kursanta || '—'}`;
            const groupName = rideSortMode === 'instructor'
              ? (instructor ? `${instructor.imie} ${instructor.nazwisko}` : `Instruktor ID ${firstRide?.id_instruktora}`)
              : studentName;
            const groupInitials = rideSortMode === 'instructor'
              ? initials(instructor?.imie || '?', instructor?.nazwisko || '')
              : initials(firstRide?.kursant?.imie || 'K', firstRide?.kursant?.nazwisko || '');

            return (
              <section className="owner-rides-group" key={key}>
                <div className="owner-rides-group-heading">
                  <span className="owner-rides-avatar">{groupInitials}</span>
                  <div>
                    <strong>{groupName}</strong>
                    <span>{rideSortMode === 'instructor' ? 'Instruktor' : 'Kursant'}</span>
                  </div>
                  <b>{groupRides.length} {groupRides.length === 1 ? 'jazda' : 'jazd'}</b>
                </div>

                <div className="owner-rides-list">
                  {groupRides.map((ride) => {
                    const parsed = parseRideTimestamp(ride.data);
                    const rideInstructor = instructors.find((item) => item.id === ride.id_instruktora);
                    const student = ride.kursant;
                    const date = new Date(`${parsed.dateStr}T12:00:00`);
                    const endHour = String(parseInt(parsed.timeStr.slice(0, 2), 10) + 2).padStart(2, '0');
                    return (
                      <div className="owner-ride-row" key={ride.id}>
                        <div className="owner-ride-date">
                          <strong>{date.getDate()}</strong>
                          <span>{MONTHS[date.getMonth()].slice(0, 3)}</span>
                        </div>
                        <div className="owner-ride-main">
                          <strong>{parsed.timeStr}–{endHour}:00</strong>
                          <small>{ride.typ_jazdy || 'Jazda szkoleniowa'}</small>
                        </div>
                        {rideSortMode === 'student' ? (
                          <div className="owner-ride-person">
                            <span>Instruktor</span>
                            <strong>{rideInstructor ? `${rideInstructor.imie} ${rideInstructor.nazwisko}` : `ID ${ride.id_instruktora}`}</strong>
                          </div>
                        ) : (
                          <div className="owner-ride-person">
                            <span>Kursant</span>
                            <strong>{student ? `${student.imie} ${student.nazwisko}` : `ID ${ride.id_kursanta || '—'}`}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );

  const activeTabDefinition = ADMIN_TABS.find((tab) => tab.id === activeTab) || ADMIN_TABS[0];
  const totalConfirmed = availability.filter((entry) => entry.status === 'confirmed').length;
  const totalPending = availability.filter((entry) => entry.status === 'submitted').length;

  return (
    <div className="owner-app-shell">
      <header className="owner-topbar">
        <div className="owner-brand">
          <span className="owner-brand-icon"><svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="15.5" stroke="currentColor" strokeWidth="2.5" /><circle cx="18" cy="18" r="4.5" stroke="currentColor" strokeWidth="2.5" /><path d="M18 2.5v11m-11.5 13 8-6m14.5 6-8-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></span>
          <span className="owner-brand-name">DrivePro</span>
          <span className="owner-brand-divider" />
          <span className="owner-panel-label">Panel Właściciela</span>
        </div>
        <div className="owner-topbar-actions">
          <div className="owner-profile">
            <span className="owner-profile-avatar">WS</span>
            <span><strong>Właściciel szkoły</strong><small>{school.name}</small></span>
          </div>
          <button type="button" className="owner-exit-button" onClick={onExit}>Wróć do logowania</button>
        </div>
      </header>

      <nav className="owner-tabs" aria-label="Nawigacja panelu właściciela">
        {ADMIN_TABS.map((tab) => (
          <button type="button" className={`owner-tab${activeTab === tab.id ? ' active' : ''}`} key={tab.id} onClick={() => setActiveTab(tab.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{tab.icon}</svg>
            <span>{tab.label}</span>
            {tab.id === 'calendar' && totalPending > 0 && <span className="owner-tab-badge">{totalPending}</span>}
          </button>
        ))}
      </nav>

      <main className="owner-main">
        <div className="owner-page-heading">
          <div><span className="owner-breadcrumb">PANEL WŁAŚCICIELA <b>/</b> {activeTabDefinition.label.toUpperCase()}</span><h1>{activeTabDefinition.label}</h1></div>
          {activeTab === 'instructors' && (
            <div className="owner-heading-actions">
              <label className="owner-search owner-heading-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                <input aria-label="Szukaj instruktora" value={instructorSearch} onChange={(event) => setInstructorSearch(event.target.value)} placeholder="Szukaj instruktora" />
              </label>
              <button type="button" className="owner-primary-button" onClick={() => setIsAddingInstructor(true)}>
                + Dodaj instruktora
              </button>
            </div>
          )}
          {activeTab === 'students' && (
            <div className="owner-heading-actions">
              <label className="owner-search owner-heading-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                <input aria-label="Szukaj kursanta" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Szukaj kursanta" />
              </label>
              <button className="owner-secondary-button" type="button" onClick={() => setStudentsReloadKey((key) => key + 1)} disabled={studentsLoading}>
                {studentsLoading ? 'Odświeżanie…' : 'Odśwież'}
              </button>
            </div>
          )}
        </div>

        {activeTab === 'school' && renderSchoolTab()}
        {activeTab === 'instructors' && renderInstructorsTab()}
        {activeTab === 'students' && renderStudentsTab()}
        {activeTab === 'calendar' && renderCalendarTab()}
        {activeTab === 'rides' && renderRidesTab()}

        <footer className="owner-footer">
          <span>DrivePro</span>
          <i />
          <span>Panel właściciela</span>
          <span className="owner-footer-date">{now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </footer>
      </main>
      {isAddingInstructor && (
        <div className="owner-modal-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsAddingInstructor(false);
        }}>
          <form className="owner-instructor-modal" onSubmit={handleAddInstructor}>
            <div className="owner-instructor-modal-heading">
              <div>
                <h2>Dodaj instruktora</h2>
                <p>Wprowadź dane nowego instruktora szkoły jazdy.</p>
              </div>
              <button type="button" aria-label="Zamknij" onClick={() => setIsAddingInstructor(false)}>×</button>
            </div>

            <div className="owner-instructor-modal-fields">
              <label>
                Imię
                <input
                  value={newInstructorFirstName}
                  onChange={(event) => setNewInstructorFirstName(event.target.value)}
                  placeholder="np. Jan"
                  required
                  autoFocus
                />
              </label>
              <label>
                Nazwisko
                <input
                  value={newInstructorLastName}
                  onChange={(event) => setNewInstructorLastName(event.target.value)}
                  placeholder="np. Kowalski"
                  required
                />
              </label>
              <label>
                Telefon
                <input
                  value={newInstructorPhone}
                  onChange={(event) => setNewInstructorPhone(event.target.value)}
                  placeholder="np. 500 600 700"
                />
              </label>
              <label>
                E-mail do logowania
                <input
                  type="email"
                  value={newInstructorEmail}
                  onChange={(event) => setNewInstructorEmail(event.target.value)}
                  placeholder="np. jan@szkola.pl"
                  required
                />
              </label>
              <label>
                Tymczasowe hasło
                <input
                  type="password"
                  value={newInstructorPassword}
                  onChange={(event) => setNewInstructorPassword(event.target.value)}
                  placeholder="Minimum 8 znaków"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Etat
                <select
                  value={newInstructorEmployment}
                  onChange={(event) => setNewInstructorEmployment(
                    event.target.value as 'pełny etat' | '3/4 etatu' | '1/2 etatu' | '1/4 etatu' | 'zlecenie',
                  )}
                >
                  <option value="pełny etat">Pełny etat</option>
                  <option value="3/4 etatu">3/4 etatu</option>
                  <option value="1/2 etatu">1/2 etatu</option>
                  <option value="1/4 etatu">1/4 etatu</option>
                  <option value="zlecenie">Zlecenie</option>
                </select>
              </label>
            </div>

            {newInstructorError && (
              <p className="owner-data-error" role="alert">{newInstructorError}</p>
            )}

            <div className="owner-instructor-modal-actions">
              <button
                type="button"
                className="owner-secondary-button"
                onClick={() => setIsAddingInstructor(false)}
                disabled={isSavingInstructor}
              >
                Anuluj
              </button>
              <button type="submit" className="owner-primary-button" disabled={isSavingInstructor}>
                {isSavingInstructor ? 'Zapisywanie…' : 'Dodaj instruktora'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
