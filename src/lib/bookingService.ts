import { supabase } from './supabase';

export interface Instructor {
  id: number;
  imie: string;
  nazwisko: string;
  telefon?: string | null;
  user_id?: string | null;
}

export interface StudentProfile {
  id: number;
  imie: string;
  nazwisko: string;
  telefon?: string | null;
  email?: string | null;
  kategoria?: string | null;
  pkk?: string | null;
  user_id?: string | null;
}

// Stały tygodniowy grafik instruktora (np. wtorek-sobota 10:00-18:00)
export interface WeeklyScheduleDay {
  id?: number;
  id_instruktora: number;
  dzien_tygodnia: number; // 1 = Pn, 2 = Wt, ..., 7 = Nd
  godzina_od: string; // "10:00:00"
  godzina_do: string; // "18:00:00"
  aktywny: boolean;
}

// Wyjątki od stałego grafiku na konkretną datę
export interface AvailabilityException {
  id: number;
  id_instruktora: number;
  data: string; // YYYY-MM-DD
  typ: 'wolne' | 'praca'; // 'wolne' = cały dzień wolny; 'praca' = dodatkowe godziny
  godzina_od?: string | null; // np. "09:00:00"
  godzina_do?: string | null; // np. "15:00:00"
  powod?: string | null; // np. "Urlop", "Sobota dodatkowa"
}

export interface RideReservation {
  id: number;
  id_instruktora: number;
  id_kursanta?: number | null;
  data: string; // ISO date string e.g. "2026-11-06T10:00:00"
  typ_jazdy?: string | null;
  uwagi?: string | null;
  kursant?: {
    imie: string;
    nazwisko: string;
    telefon?: string | null;
  };
}

export interface AvailableSlot {
  time: string; // "08:00"
  isAvailable: boolean;
  reason?: 'booked' | 'outside_working_hours' | 'day_off' | 'past' | 'too_far';
}

export const HOURLY_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

/**
 * Zlicza dostępne sloty dla konkretnego dnia — używane przez mini-kalendarz do rysowania kropek.
 * Zwraca { total, free } uwzględniając grafik i rezerwacje.
 */
export function countSlotsForDay(
  dateStr: string,
  instructorId: number,
  bookedRides: RideReservation[],
  weeklySchedule: WeeklyScheduleDay[],
  exceptions: AvailabilityException[]
): { total: number; free: number } {
  const slots = calculateAvailableSlots(dateStr, instructorId, bookedRides, weeklySchedule, exceptions);
  const workSlots = slots.filter((s) => s.reason !== 'outside_working_hours' && s.reason !== 'too_far');
  return {
    total: workSlots.length,
    free: workSlots.filter((s) => s.isAvailable).length,
  };
}

export const DAYS_OF_WEEK = [
  { id: 1, name: 'Poniedziałek', short: 'Pn' },
  { id: 2, name: 'Wtorek', short: 'Wt' },
  { id: 3, name: 'Środa', short: 'Śr' },
  { id: 4, name: 'Czwartek', short: 'Cz' },
  { id: 5, name: 'Piątek', short: 'Pt' },
  { id: 6, name: 'Sobota', short: 'Sb' },
  { id: 7, name: 'Niedziela', short: 'Nd' },
];

export const DEFAULT_INSTRUCTORS: Instructor[] = [
  { id: 2, imie: 'Marek', nazwisko: 'Nowak', telefon: '+48 601 234 567' },
  { id: 3, imie: 'Anna', nazwisko: 'Wiśniewska', telefon: '+48 602 345 678' },
  { id: 4, imie: 'Piotr', nazwisko: 'Kowalski', telefon: '+48 603 456 789' },
];

/**
 * Pobiera listę instruktorów
 */
export async function fetchInstructors(): Promise<Instructor[]> {
  if (!supabase) return DEFAULT_INSTRUCTORS;
  try {
    const { data, error } = await supabase
      .from('instruktorzy')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) return DEFAULT_INSTRUCTORS;
    return data;
  } catch {
    return DEFAULT_INSTRUCTORS;
  }
}

/**
 * Pobiera stały tygodniowy grafik instruktora
 */
export async function fetchWeeklySchedule(instructorId: number): Promise<WeeklyScheduleDay[]> {
  if (!supabase) {
    // Domyślny grafik: Wt-Sb 10:00-18:00
    return [2, 3, 4, 5, 6].map((day) => ({
      id_instruktora: instructorId,
      dzien_tygodnia: day,
      godzina_od: '10:00:00',
      godzina_do: '18:00:00',
      aktywny: true,
    }));
  }

  try {
    const { data, error } = await supabase
      .from('dyspozycyjnosc_instruktorow')
      .select('*')
      .eq('id_instruktora', instructorId)
      .eq('aktywny', true);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Zapisuje/aktualizuje stały tygodniowy grafik instruktora
 */
export async function saveWeeklySchedule(
  instructorId: number,
  schedule: { dzien_tygodnia: number; godzina_od: string; godzina_do: string; aktywny: boolean }[]
): Promise<boolean> {
  if (!supabase) return true;
  try {
    // Usuwamy dotychczasowy grafik instruktora
    await supabase
      .from('dyspozycyjnosc_instruktorow')
      .delete()
      .eq('id_instruktora', instructorId);

    // Wstawiamy tylko aktywne dni
    const activeDays = schedule
      .filter((s) => s.aktywny)
      .map((s) => ({
        id_instruktora: instructorId,
        dzien_tygodnia: s.dzien_tygodnia,
        godzina_od: s.godzina_od.length === 5 ? `${s.godzina_od}:00` : s.godzina_od,
        godzina_do: s.godzina_do.length === 5 ? `${s.godzina_do}:00` : s.godzina_do,
        aktywny: true,
      }));

    if (activeDays.length > 0) {
      const { error } = await supabase
        .from('dyspozycyjnosc_instruktorow')
        .insert(activeDays);
      if (error) throw error;
    }

    return true;
  } catch (err) {
    console.error('Błąd zapisu grafiku tygodniowego:', err);
    return false;
  }
}

/**
 * Pobiera wyjątki od dyspozycyjności
 */
export async function fetchExceptions(instructorId?: number): Promise<AvailabilityException[]> {
  if (!supabase) return [];
  try {
    let query = supabase.from('wyjatki_dyspozycyjnosci').select('*');
    if (instructorId) {
      query = query.eq('id_instruktora', instructorId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/**
 * Dodaje wyjątek od dyspozycyjności (wolne lub dodatkowy dzień/godziny pracy)
 */
export async function addAvailabilityException(exception: {
  id_instruktora: number;
  data: string;
  typ: 'wolne' | 'praca';
  godzina_od?: string | null;
  godzina_do?: string | null;
  powod?: string | null;
}): Promise<{ success: boolean; error?: string; data?: AvailabilityException }> {
  if (!supabase) return { success: true };
  try {
    // Sprawdzamy czy dla tej daty nie ma już wyjątku, jeśli tak to usuwamy poprzedni
    await supabase
      .from('wyjatki_dyspozycyjnosci')
      .delete()
      .eq('id_instruktora', exception.id_instruktora)
      .eq('data', exception.data);

    const { data, error } = await supabase
      .from('wyjatki_dyspozycyjnosci')
      .insert({
        id_instruktora: exception.id_instruktora,
        data: exception.data,
        typ: exception.typ,
        godzina_od: exception.godzina_od ? (exception.godzina_od.length === 5 ? `${exception.godzina_od}:00` : exception.godzina_od) : null,
        godzina_do: exception.godzina_do ? (exception.godzina_do.length === 5 ? `${exception.godzina_do}:00` : exception.godzina_do) : null,
        powod: exception.powod || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Nieznany błąd' };
  }
}

/**
 * Usuwa wyjątek
 */
export async function deleteAvailabilityException(exceptionId: number): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { error } = await supabase.from('wyjatki_dyspozycyjnosci').delete().eq('id', exceptionId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Pobiera wszystkie zarezerwowane jazdy (dla kursanta lub dla instruktora z danymi kursanta)
 */
export async function fetchBookedRides(instructorId?: number): Promise<RideReservation[]> {
  if (!supabase) return [];
  try {
    let query = supabase.from('jazdy').select('*').order('data', { ascending: true });
    if (instructorId) {
      query = query.eq('id_instruktora', instructorId);
    }
    const { data: rides, error } = await query;
    if (error || !rides) return [];

    // Pobierz dane kursantów dla widoku instruktora
    const studentIds = Array.from(new Set(rides.map((r) => r.id_kursanta).filter(Boolean)));
    let studentsMap = new Map<number, { imie: string; nazwisko: string; telefon?: string | null }>();

    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('kursanci')
        .select('id, imie, nazwisko, telefon')
        .in('id', studentIds);

      if (students) {
        students.forEach((s) => studentsMap.set(s.id, s));
      }
    }

    return rides.map((r) => ({
      ...r,
      kursant: r.id_kursanta ? studentsMap.get(r.id_kursanta) : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Oblicza wolne sloty godzinowe dla wybranej daty i instruktora.
 * Uwzględnia:
 * 1. Zasadę max 2 tygodnie do przodu
 * 2. Wyjątki na dany dzień (np. urlop/wolne lub niestandardowe godziny)
 * 3. Stały tygodniowy grafik (np. wt-sb 10-18)
 * 4. Istniejące rezerwacje innych kursantów (termin znika / jest zablokowany)
 */
export function calculateAvailableSlots(
  dateStr: string, // YYYY-MM-DD
  instructorId: number,
  bookedRides: RideReservation[],
  weeklySchedule: WeeklyScheduleDay[],
  exceptions: AvailabilityException[]
): AvailableSlot[] {
  if (!dateStr || !instructorId) return [];

  const now = new Date();
  const selectedDate = new Date(`${dateStr}T00:00:00`);

  // Max 2 tygodnie w przód (14 dni)
  const maxBookingDate = new Date();
  maxBookingDate.setDate(maxBookingDate.getDate() + 14);
  maxBookingDate.setHours(23, 59, 59, 999);

  if (selectedDate > maxBookingDate) {
    return HOURLY_SLOTS.map((slot) => ({
      time: slot,
      isAvailable: false,
      reason: 'too_far',
    }));
  }

  // Dzień tygodnia 1=Pn .. 7=Nd
  const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();

  // Sprawdzamy czy na ten dzień instruktor ma wyjątek
  const dayException = exceptions.find(
    (e) => e.id_instruktora === instructorId && e.data === dateStr
  );

  // Jeśli ma wyjątek 'wolne' -> cały dzień niedostępny
  if (dayException && dayException.typ === 'wolne') {
    return HOURLY_SLOTS.map((slot) => ({
      time: slot,
      isAvailable: false,
      reason: 'day_off',
    }));
  }

  // Godziny pracy w tym dniu
  let startHour = '';
  let endHour = '';

  if (dayException && dayException.typ === 'praca' && dayException.godzina_od && dayException.godzina_do) {
    // Niestandardowy dzień / godziny z wyjątku
    startHour = dayException.godzina_od.slice(0, 5);
    endHour = dayException.godzina_do.slice(0, 5);
  } else {
    // Stały tygodniowy grafik
    const regularDay = weeklySchedule.find(
      (s) => s.id_instruktora === instructorId && s.dzien_tygodnia === dayOfWeek && s.aktywny
    );
    if (regularDay) {
      startHour = regularDay.godzina_od.slice(0, 5);
      endHour = regularDay.godzina_do.slice(0, 5);
    }
  }

  return HOURLY_SLOTS.map((slot) => {
    const slotDateTime = new Date(`${dateStr}T${slot}:00`);

    // 1. Czy slot minął
    if (slotDateTime <= now) {
      return { time: slot, isAvailable: false, reason: 'past' };
    }

    // 2. Czy instruktor w ogóle pracuje o tej godzinie
    if (!startHour || !endHour || slot < startHour || slot >= endHour) {
      return { time: slot, isAvailable: false, reason: 'outside_working_hours' };
    }

    // 3. Czy termin jest już zajęty przez innego kursanta
    const isBooked = bookedRides.some((ride) => {
      if (ride.id_instruktora !== instructorId) return false;
      const rideDate = new Date(ride.data);
      const rideYMD = rideDate.toISOString().slice(0, 10);
      const rideTime = ride.data.includes('T')
        ? ride.data.split('T')[1].slice(0, 5)
        : `${String(rideDate.getHours()).padStart(2, '0')}:${String(rideDate.getMinutes()).padStart(2, '0')}`;
      return rideYMD === dateStr && rideTime === slot;
    });

    if (isBooked) {
      return { time: slot, isAvailable: false, reason: 'booked' };
    }

    return { time: slot, isAvailable: true };
  });
}

/**
 * Rezerwuje termin jazdy w bazie Supabase
 */
export async function bookRideInDatabase(params: {
  instructorId: number;
  dateStr: string;
  timeStr: string;
  type?: string;
  notes?: string;
  studentId?: number | null;
}): Promise<{ success: boolean; error?: string; ride?: RideReservation }> {
  const timestamp = `${params.dateStr}T${params.timeStr}:00`;

  if (!supabase) {
    return {
      success: true,
      ride: {
        id: Date.now(),
        id_instruktora: params.instructorId,
        id_kursanta: params.studentId || 1,
        data: timestamp,
        typ_jazdy: params.type || 'Jazda szkoleniowa',
        uwagi: params.notes,
      },
    };
  }

  try {
    // 1. Sprawdzenie czy inny kursant nie zajął terminu
    const { data: existing } = await supabase
      .from('jazdy')
      .select('id')
      .eq('id_instruktora', params.instructorId)
      .eq('data', timestamp)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: 'Ten termin został właśnie zarezerwowany przez innego kursanta. Wybierz inną godzinę.',
      };
    }

    // 2. Wstawienie nowej jazdy
    const { data, error } = await supabase
      .from('jazdy')
      .insert({
        id_instruktora: params.instructorId,
        id_kursanta: params.studentId || null,
        data: timestamp,
        typ_jazdy: params.type || 'Jazda szkoleniowa',
        uwagi: params.notes || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Termin u tego instruktora jest już zajęty przez innego kursanta.',
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, ride: data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Błąd zapisu' };
  }
}
