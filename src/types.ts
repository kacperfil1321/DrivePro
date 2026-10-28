// Shared TypeScript types for the Driving School Student Panel

export type NavSection = 'start' | 'dokumenty' | 'jazdy' | 'szkola' | 'info';

export interface Termin {
  id: string;
  title: string;
  date: string;   // ISO date string YYYY-MM-DD
  time: string;
  type: 'ride' | 'exam' | 'other';
}

export interface Drive {
  id: number;
  date: string;       // ISO date YYYY-MM-DD
  timeRange: string;  // e.g. "10:00–11:00"
  instructor: string;
  duration: number;   // minutes
  status: 'completed' | 'upcoming' | 'cancelled';
}

export interface Document {
  id: string;
  name: string;
  status: 'verified' | 'pending' | 'missing';
}

export interface Student {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pesel: string;
  birthDate: string;
  category: string;
  hoursCompleted: number;
  hoursTotal: number;
  courseProgress: number; // percentage
  schoolName: string;
}

export interface School {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  nip: string;
  openHours: string;
  carModel?: string;
}
