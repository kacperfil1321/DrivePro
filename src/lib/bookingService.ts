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
  time: string; // np. "10:00" - godzina rozpoczęcia jazdy
  endTime?: string; // np. "12:00"
  isAvailable: boolean;
  reason?: 'booked' | 'outside_working_hours' | 'day_off' | 'past' | 'too_far';
}

export const LESSON_DURATION_HOURS = 2; // Każda lekcja jazdy trwa 2 godziny

export function addHours(timeStr: string, hours: number): string {
  const [h, m] = (timeStr || '10:00').split(':').map(Number);
  const endH = (h || 0) + hours;
  return `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

/** Formatuje przedział 2-godzinnej lekcji, np. "10:00" -> "10:00–12:00" */
export function formatRideTimeRange(startTime: string): string {
  const [hStr, mStr] = (startTime || '10:00').split(':');
  const startH = parseInt(hStr, 10) || 10;
  const endH = String(startH + LESSON_DURATION_HOURS).padStart(2, '0');
  const min = (mStr || '00').slice(0, 2);
  return `${String(startH).padStart(2, '0')}:${min}–${endH}:${min}`;
}

/** Bezpiecznie parsuje timestamp jazdy z bazy Supabase */
export function parseRideTimestamp(dataStr?: string | null): { dateStr: string; timeStr: string } {
  if (!dataStr) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return { dateStr: `${y}-${m}-${d}`, timeStr: '10:00' };
  }

  const str = String(dataStr).trim().replace(' ', 'T');
  if (str.includes('T')) {
    const parts = str.split('T');
    const dateStr = parts[0];
    const timePart = parts[1] || '10:00';
    const timeStr = timePart.slice(0, 5);
    return { dateStr, timeStr };
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return { dateStr: `${y}-${m}-${day}`, timeStr: `${h}:${min}` };
  }

  return { dateStr: '', timeStr: '10:00' };
}

export const HOURLY_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

/**
 * Zlicza dostępne sloty dla konkretnego dnia — używane przez mini-kalendarz do rysowania kropek.
 * Zwraca { total, free } uwzględniając grafik i rezerwacje 2-godzinnych lekcji.
 */
export function countSlotsForDay(
  dateStr: string,
  instructorId: number,
  bookedRides: RideReservation[] = [],
  weeklySchedule: WeeklyScheduleDay[] = [],
  exceptions: AvailabilityException[] = []
): { total: number; free: number } {
  const slots = calculateAvailableSlots(dateStr, instructorId, bookedRides, weeklySchedule, exceptions);
  return {
    total: slots.length,
    free: slots.filter((s) => s.isAvailable).length,
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
  const defaultSchedule: WeeklyScheduleDay[] = [1, 2, 3, 4, 5, 6].map((day) => ({
    id_instruktora: instructorId,
    dzien_tygodnia: day,
    godzina_od: '10:00:00',
    godzina_do: '18:00:00',
    aktywny: true,
  }));

  if (!supabase) {
    return defaultSchedule;
  }

  try {
    const { data, error } = await supabase
      .from('dyspozycyjnosc_instruktorow')
      .select('*')
      .eq('id_instruktora', instructorId)
      .eq('aktywny', true);

    if (error || !data || data.length === 0) {
      return defaultSchedule;
    }
    return data;
  } catch {
    return defaultSchedule;
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
  bookedRides: RideReservation[] = [],
  weeklySchedule: WeeklyScheduleDay[] = [],
  exceptions: AvailabilityException[] = []
): AvailableSlot[] {
  if (!dateStr || !instructorId) return [];

  const now = new Date();
  const selectedDate = new Date(`${dateStr}T12:00:00`);

  // Max 2 tygodnie w przód (14 dni)
  const maxBookingDate = new Date();
  maxBookingDate.setDate(maxBookingDate.getDate() + 14);
  maxBookingDate.setHours(23, 59, 59, 999);

  if (selectedDate > maxBookingDate) {
    return [];
  }

  // Dzień tygodnia 1=Pn .. 7=Nd
  const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();

  // Sprawdzamy czy na ten dzień instruktor ma wyjątek
  const dayException = (exceptions || []).find(
    (e) => e && e.id_instruktora === instructorId && e.data === dateStr
  );

  // Jeśli ma wyjątek 'wolne' -> cały dzień niedostępny
  if (dayException && dayException.typ === 'wolne') {
    return [];
  }

  // Godziny pracy w tym dniu
  let startHour = '';
  let endHour = '';

  if (dayException && dayException.typ === 'praca' && dayException.godzina_od && dayException.godzina_do) {
    startHour = dayException.godzina_od.slice(0, 5);
    endHour = dayException.godzina_do.slice(0, 5);
  } else {
    const regularDay = (weeklySchedule || []).find(
      (s) => s && s.id_instruktora === instructorId && s.dzien_tygodnia === dayOfWeek && s.aktywny
    );
    if (regularDay && regularDay.godzina_od && regularDay.godzina_do) {
      startHour = regularDay.godzina_od.slice(0, 5);
      endHour = regularDay.godzina_do.slice(0, 5);
    } else if (!weeklySchedule || weeklySchedule.length === 0) {
      // Domyślny grafik jeśli grafik nie został jeszcze załadowany (Wt-Sb 10:00-18:00)
      if (dayOfWeek >= 2 && dayOfWeek <= 6) {
        startHour = '10:00';
        endHour = '18:00';
      }
    }
  }

  if (!startHour || !endHour) {
    return [];
  }

  const startH = parseInt(startHour.split(':')[0], 10) || 10;
  const endH = parseInt(endHour.split(':')[0], 10) || 18;

  // Pobieramy rezerwacje tego instruktora w danym dniu
  const safeBookedRides = Array.isArray(bookedRides) ? bookedRides : [];
  const dayRides = safeBookedRides.filter((ride) => {
    if (!ride || ride.id_instruktora !== instructorId) return false;
    const parsed = parseRideTimestamp(ride.data);
    return parsed.dateStr === dateStr;
  });

  const slots: AvailableSlot[] = [];

  for (let h = startH; h + LESSON_DURATION_HOURS <= endH; h += LESSON_DURATION_HOURS) {
    const slotStartTime = `${String(h).padStart(2, '0')}:00`;
    const slotEndTime = `${String(h + LESSON_DURATION_HOURS).padStart(2, '0')}:00`;
    const slotDateTime = new Date(`${dateStr}T${slotStartTime}:00`);

    // 1. Czy slot minął
    if (slotDateTime <= now) {
      slots.push({
        time: slotStartTime,
        endTime: slotEndTime,
        isAvailable: false,
        reason: 'past',
      });
      continue;
    }

    // 2. Czy termin koliduje z inną rezerwacją (każda rezerwacja trwa 2h)
    const slotStartMin = h * 60;
    const slotEndMin = (h + LESSON_DURATION_HOURS) * 60;

    const isBooked = dayRides.some((ride) => {
      const parsed = parseRideTimestamp(ride.data);
      const [rH, rM] = parsed.timeStr.split(':').map(Number);
      const rideStartMin = (rH || 0) * 60 + (rM || 0);
      const rideEndMin = rideStartMin + LESSON_DURATION_HOURS * 60;

      return slotStartMin < rideEndMin && slotEndMin > rideStartMin;
    });

    if (isBooked) {
      slots.push({
        time: slotStartTime,
        endTime: slotEndTime,
        isAvailable: false,
        reason: 'booked',
      });
      continue;
    }

    slots.push({
      time: slotStartTime,
      endTime: slotEndTime,
      isAvailable: true,
    });
  }

  return slots;
}

/**
 * Rezerwuje termin jazdy w bazie Supabase (zawsze 2 godziny lekcji)
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
  const startHour = parseInt(params.timeStr.split(':')[0], 10) || 10;
  const startMin = parseInt(params.timeStr.split(':')[1] || '0', 10) || 0;
  const slotStartMin = startHour * 60 + startMin;
  const slotEndMin = slotStartMin + LESSON_DURATION_HOURS * 60;

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
    // 1. Sprawdzenie czy inny kursant nie zajął terminu kolidującego z tą 2-godzinną lekcją
    const { data: existingRides } = await supabase
      .from('jazdy')
      .select('id, data')
      .eq('id_instruktora', params.instructorId);

    if (existingRides && existingRides.length > 0) {
      const hasConflict = existingRides.some((r) => {
        if (!r.data) return false;
        const parsed = parseRideTimestamp(r.data);
        if (parsed.dateStr !== params.dateStr) return false;
        const [rH, rM] = parsed.timeStr.split(':').map(Number);
        const rideStartMin = (rH || 0) * 60 + (rM || 0);
        const rideEndMin = rideStartMin + LESSON_DURATION_HOURS * 60;

        return slotStartMin < rideEndMin && slotEndMin > rideStartMin;
      });

      if (hasConflict) {
        return {
          success: false,
          error: 'Ten termin (lub część 2-godzinnej lekcji) został już zarezerwowany przez innego kursanta. Wybierz inną godzinę.',
        };
      }
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
