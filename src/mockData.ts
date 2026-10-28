import type { Student, Drive, Document, Termin, School } from './types';

export const MOCK_STUDENT: Student = {
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: 'jan.kowalski@email.com',
  phone: '+48 123 456 789',
  pesel: '98031512345',
  birthDate: '15 marca 1998',
  category: 'B',
  hoursCompleted: 18,
  hoursTotal: 30,
  courseProgress: 30,
  schoolName: 'AUTO-SZKOLA "KIEROWCA" Sp. z o.o.',
};

export const MOCK_SCHOOL: School = {
  name: 'AUTO-SZKOŁA "KIEROWCA" Sp. z o.o.',
  address: 'ul. Stefana Batorego 12/4',
  city: '00-215 Warszawa',
  phone: '032-431 6872',
  email: 'info@auto-start.pl',
  website: 'www.autoszkola-kierowca.pl',
  nip: '527-265-38-41',
  openHours: 'Pn–Pt 8:00–18:00 · Sb 9:00–14:00',
  carModel: 'Toyota Yaris',
};

export const MOCK_DRIVES: Drive[] = [
  // Upcoming
  { id: 20, date: '2026-11-06', timeRange: '14:00–15:00', instructor: 'Anna Wiśniewska', duration: 60, status: 'upcoming' },
  { id: 19, date: '2026-10-30', timeRange: '10:00–11:00', instructor: 'Marek Nowak',     duration: 60, status: 'upcoming' },
  // Completed
  { id: 18, date: '2026-10-25', timeRange: '10:00–11:00', instructor: 'Marek Nowak',     duration: 60, status: 'completed' },
  { id: 17, date: '2026-10-20', timeRange: '09:00–10:00', instructor: 'Marek Nowak',     duration: 60, status: 'completed' },
  { id: 16, date: '2026-10-15', timeRange: '12:00–13:00', instructor: 'Anna Wiśniewska', duration: 60, status: 'completed' },
  { id: 15, date: '2026-10-10', timeRange: '15:00–16:30', instructor: 'Anna Wiśniewska', duration: 90, status: 'completed' },
  { id: 14, date: '2026-10-05', timeRange: '08:00–09:00', instructor: 'Marek Nowak',     duration: 60, status: 'completed' },
  { id: 13, date: '2026-09-28', timeRange: '11:00–12:00', instructor: 'Marek Nowak',     duration: 60, status: 'completed' },
  { id: 12, date: '2026-09-21', timeRange: '13:00–14:00', instructor: 'Anna Wiśniewska', duration: 60, status: 'completed' },
  { id: 11, date: '2026-09-14', timeRange: '10:00–11:00', instructor: 'Marek Nowak',     duration: 60, status: 'completed' },
  { id: 10, date: '2026-09-07', timeRange: '09:00–10:00', instructor: 'Anna Wiśniewska', duration: 60, status: 'completed' },
];

export const MOCK_DOCUMENTS: Document[] = [
  { id: 'doc1', name: 'Dowód osobisty',        status: 'verified' },
  { id: 'doc2', name: 'Badanie lekarskie',     status: 'verified' },
  { id: 'doc3', name: 'Potwierdzenie wpłaty',  status: 'pending'  },
];

export const MOCK_TERMINY: Termin[] = [
  { id: 't1', title: 'Jazda z instruktorem (Marek Nowak)', date: '2026-10-30', time: '10:00–12:00', type: 'ride' },
  { id: 't2', title: 'Jazda doszkalająca (Anna Wiśniewska)', date: '2026-11-03', time: '14:00–16:00', type: 'ride' },
  { id: 't3', title: 'Trasa egzaminacyjna (Marek Nowak)', date: '2026-11-06', time: '11:00–13:00', type: 'ride' },
];
