import type { Student, Drive, Document, Termin, School } from './types';

export const MOCK_STUDENT: Student = {
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: 'jan.kowalski@email.com',
  phone: '+48 123 456 789',
  pesel: '98031512345',
  birthDate: '15 marca 1998',
  category: 'B',
  hoursCompleted: 0,
  hoursTotal: 30,
  courseProgress: 0,
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

export const MOCK_DRIVES: Drive[] = [];

export const MOCK_DOCUMENTS: Document[] = [
  { id: 'doc1', name: 'Dowód osobisty',        status: 'verified' },
  { id: 'doc2', name: 'Badanie lekarskie',     status: 'verified' },
  { id: 'doc3', name: 'Potwierdzenie wpłaty',  status: 'pending'  },
];

export const MOCK_TERMINY: Termin[] = [];
