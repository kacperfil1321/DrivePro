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

// ─────────────────────────────────────────────────────────────────────────────
// JEDNA TABELA: DYSPOZYCJE I GRAFIK INSTRUKTORÓW
// ─────────────────────────────────────────────────────────────────────────────
// status: 'szkic' | 'oczekuje' (zgłoszona do admina) | 'zatwierdzona' (oficjalny grafik) | 'odrzucona'
export type DispositionStatus = 'szkic' | 'oczekuje' | 'zatwierdzona' | 'odrzucona';

export interface InstructorDisposition {
  id?: number;
  id_instruktora: number;
  data: string; // YYYY-MM-DD
  godzina_od: string; // "08:00" lub "08:00:00"
  godzina_do: string; // "16:00" lub "16:00:00"
  status: DispositionStatus;
  uwagi?: string | null;
}

// Kompatybilność wsteczna typów
export type OfficialScheduleEntry = InstructorDisposition;
export interface WeeklyScheduleDay {
  id?: number;
  id_instruktora: number;
  dzien_tygodnia: number;
  godzina_od: string;
  godzina_do: string;
  aktywny: boolean;
}
export interface AvailabilityException {
  id: number;
  id_instruktora: number;
  data: string;
  typ: 'wolne' | 'praca';
  godzina_od?: string | null;
  godzina_do?: string | null;
  powod?: string | null;
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
  time: string; // np. "10:00"
  endTime?: string; // np. "12:00"
  isAvailable: boolean;
  reason?: 'booked' | 'outside_working_hours' | 'day_off' | 'past' | 'too_far';
}

export const LESSON_DURATION_HOURS = 2; // Każda lekcja jazdy trwa 2 godziny

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMaxBookingDate(now: Date = new Date()): Date {
  const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  maxDate.setDate(maxDate.getDate() + 14);
  return maxDate;
}

export function isBookingDateAllowed(dateStr: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return false;
  }

  return dateStr > toLocalDateKey(now) && dateStr <= toLocalDateKey(getMaxBookingDate(now));
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

export function addHours(timeStr: string, hours: number): string {
  const [h, m] = (timeStr || '10:00').split(':').map(Number);
  const endH = (h || 0) + hours;
  return `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

export function formatRideTimeRange(startTime: string): string {
  const [hStr, mStr] = (startTime || '10:00').split(':');
  const startH = parseInt(hStr, 10) || 10;
  const endH = String(startH + LESSON_DURATION_HOURS).padStart(2, '0');
  const min = (mStr || '00').slice(0, 2);
  return `${String(startH).padStart(2, '0')}:${min}–${endH}:${min}`;
}

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
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return { dateStr: `${y}-${m}-${day}`, timeStr: `${hh}:${mm}` };
  }

  return { dateStr: String(dataStr).slice(0, 10), timeStr: '10:00' };
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
  { id: 2, imie: 'Marek', nazwisko: 'Nowak', telefon: '601 234 567' },
  { id: 3, imie: 'Anna', nazwisko: 'Wiśniewska', telefon: '602 345 678' },
  { id: 4, imie: 'Piotr', nazwisko: 'Kowalski', telefon: '603 456 789' },
];

export async function fetchInstructors(): Promise<Instructor[]> {
  if (!supabase) return DEFAULT_INSTRUCTORS;
  try {
    const { data, error } = await supabase.from('instruktorzy').select('*').order('id', { ascending: true });
    if (error || !data || data.length === 0) return DEFAULT_INSTRUCTORS;
    return data;
  } catch {
    return DEFAULT_INSTRUCTORS;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERACJE NA JEDNEJ TABELI: dyspozycje_instruktorow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pobiera wszystkie dyspozycje dla wszystkich instruktorów na dany miesiąc (widok panelu administratora)
 */
export async function fetchAllDispositionsForMonth(
  year: number,
  month: number
): Promise<InstructorDisposition[]> {
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const getLocal = (): InstructorDisposition[] => {
    const list: InstructorDisposition[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('disp_list_') && key.endsWith(`_${year}_${month}`)) {
        try {
          const arr = JSON.parse(localStorage.getItem(key) || '[]');
          list.push(...arr);
        } catch {
          // ignore
        }
      }
    }
    return list;
  };

  if (!supabase) return getLocal();

  try {
    const { data, error } = await supabase
      .from('dyspozycje_instruktorow')
      .select('*')
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data', { ascending: true });

    if (error || !data) return getLocal();
    // Dołącz dane z localStorage jeśli były wprowadzane w sesji demo
    const local = getLocal();
    const map = new Map<string, InstructorDisposition>();
    data.forEach((d) => map.set(`${d.id_instruktora}_${d.data}`, d));
    local.forEach((l) => map.set(`${l.id_instruktora}_${l.data}`, l));
    return Array.from(map.values());
  } catch {
    return getLocal();
  }
}

export async function fetchDispositionsForMonth(
  instructorId: number,
  year: number,
  month: number
): Promise<InstructorDisposition[]> {
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const getLocal = (): InstructorDisposition[] => {
    const local = localStorage.getItem(`disp_list_${instructorId}_${year}_${month}`);
    return local ? JSON.parse(local) : [];
  };

  if (!supabase) return getLocal();

  try {
    const { data, error } = await supabase
      .from('dyspozycje_instruktorow')
      .select('*')
      .eq('id_instruktora', instructorId)
      .gte('data', startDate)
      .lte('data', endDate)
      .order('data', { ascending: true });

    if (error || !data || data.length === 0) return getLocal();
    return data;
  } catch {
    return getLocal();
  }
}

/**
 * Zapisuje lub aktualizuje dyspozycje na dany miesiąc (np. wysłanie ze statusem 'oczekuje')
 */
export async function saveDispositionsForMonth(params: {
  instructorId: number;
  year: number;
  month: number;
  days: { data: string; godzina_od: string; godzina_do: string }[];
  status: DispositionStatus;
  uwagi?: string;
}): Promise<{ success: boolean; error?: string; savedToDatabase: boolean }> {
  const monthStr = String(params.month).padStart(2, '0');
  const startDate = `${params.year}-${monthStr}-01`;
  const lastDay = new Date(params.year, params.month, 0).getDate();
  const endDate = `${params.year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const rows: InstructorDisposition[] = params.days.map((d, idx) => ({
    id: Date.now() + idx,
    id_instruktora: params.instructorId,
    data: d.data,
    godzina_od: d.godzina_od.length === 5 ? `${d.godzina_od}:00` : d.godzina_od,
    godzina_do: d.godzina_do.length === 5 ? `${d.godzina_do}:00` : d.godzina_do,
    status: params.status,
    uwagi: params.uwagi || null,
  }));

  // Zapisz lokalnie w pamięci przeglądarki (fallback offline)
  localStorage.setItem(`disp_list_${params.instructorId}_${params.year}_${params.month}`, JSON.stringify(rows));

  if (!supabase) {
    return { success: true, savedToDatabase: false, error: 'Brak konfiguracji klienta Supabase' };
  }

  try {
    // 1. Usuń dotychczasowe wpisy z tego miesiąca dla instruktora
    const { error: delError } = await supabase
      .from('dyspozycje_instruktorow')
      .delete()
      .eq('id_instruktora', params.instructorId)
      .gte('data', startDate)
      .lte('data', endDate);

    if (delError) {
      console.error('Błąd usuwania poprzednich dyspozycji z Supabase:', delError);
      return { success: true, savedToDatabase: false, error: delError.message };
    }

    // 2. Wstaw nowe wpisy
    if (rows.length > 0) {
      const insertData = rows.map(({ id: _ignored, ...rest }) => rest);
      const { error: insError } = await supabase.from('dyspozycje_instruktorow').insert(insertData);
      if (insError) {
        console.error('Błąd wstawiania dyspozycji do Supabase:', insError);
        return { success: true, savedToDatabase: false, error: insError.message };
      }
    }

    return { success: true, savedToDatabase: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Błąd połączenia z bazą Supabase przy zapisie dyspozycji:', msg);
    return { success: true, savedToDatabase: false, error: msg };
  }
}

/**
 * Pobiera zatwierdzony oficjalny grafik (status = 'zatwierdzona') dla instruktora
 */
export async function fetchOfficialSchedule(
  instructorId: number,
  startDate?: string,
  endDate?: string
): Promise<InstructorDisposition[]> {
  const getLocal = (): InstructorDisposition[] => {
    const list: InstructorDisposition[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`disp_list_${instructorId}_`)) {
        try {
          const arr: InstructorDisposition[] = JSON.parse(localStorage.getItem(key) || '[]');
          list.push(...arr.filter((item) => item.status === 'zatwierdzona'));
        } catch {
          // ignore
        }
      }
    }
    return list;
  };

  if (!supabase) return getLocal();

  try {
    let query = supabase
      .from('dyspozycje_instruktorow')
      .select('*')
      .eq('id_instruktora', instructorId)
      .eq('status', 'zatwierdzona')
      .order('data', { ascending: true });

    if (startDate) query = query.gte('data', startDate);
    if (endDate) query = query.lte('data', endDate);

    const { data, error } = await query;
    if (error || !data || data.length === 0) return getLocal();
    return data;
  } catch {
    return getLocal();
  }
}

/**
 * Administrator zatwierdza lub modyfikuje godziny konkretnego dnia dyspozycji
 */
export async function updateDispositionStatusByAdmin(
  instructorId: number,
  dateStr: string,
  newStatus: DispositionStatus,
  hours?: { start: string; end: string }
): Promise<boolean> {
  // Aktualizacja w localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`disp_list_${instructorId}_`)) {
      try {
        const arr: InstructorDisposition[] = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = arr.map((item) => {
          if (item.data === dateStr) {
            return {
              ...item,
              status: newStatus,
              godzina_od: hours?.start ? `${hours.start}:00` : item.godzina_od,
              godzina_do: hours?.end ? `${hours.end}:00` : item.godzina_do,
            };
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  }

  if (!supabase) return true;

  try {
    const updatePayload: Partial<InstructorDisposition> = {
      status: newStatus,
    };
    if (hours) {
      updatePayload.godzina_od = hours.start.length === 5 ? `${hours.start}:00` : hours.start;
      updatePayload.godzina_do = hours.end.length === 5 ? `${hours.end}:00` : hours.end;
    }

    const { error } = await supabase
      .from('dyspozycje_instruktorow')
      .update(updatePayload)
      .eq('id_instruktora', instructorId)
      .eq('data', dateStr);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('Błąd updateDispositionStatusByAdmin:', err);
    return true;
  }
}

// Pomocnicze funkcje dla BookingModal / kompatybilności
export async function fetchWeeklySchedule(_instructorId: number): Promise<WeeklyScheduleDay[]> {
  return [];
}

export async function fetchExceptions(_instructorId?: number): Promise<AvailabilityException[]> {
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// REZERWACJE JAZD I SLOTY
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchBookedRides(instructorId?: number): Promise<RideReservation[]> {
  if (!supabase) return [];
  try {
    let query = supabase.from('jazdy').select('*').order('data', { ascending: true });
    if (instructorId) {
      query = query.eq('id_instruktora', instructorId);
    }
    const { data: rides, error } = await query;
    if (error || !rides) return [];

    const studentIds = Array.from(new Set(rides.map((r) => r.id_kursanta).filter(Boolean)));
    const studentsMap = new Map<number, { imie: string; nazwisko: string; telefon?: string | null }>();

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
 * Oblicza dostępne sloty.
 * Sprawdza w pierwszej kolejności zatwierdzoną dyspozycję (`status = 'zatwierdzona'`).
 */
export function calculateAvailableSlots(
  dateStr: string,
  instructorId: number,
  bookedRides: RideReservation[] = [],
  _weeklySchedule: WeeklyScheduleDay[] = [],
  _exceptions: AvailabilityException[] = [],
  officialSchedules: InstructorDisposition[] = []
): AvailableSlot[] {
  if (!dateStr || !instructorId) return [];
  if (!isBookingDateAllowed(dateStr)) return [];

  // 1. Sprawdzamy zatwierdzoną dyspozycję instruktora na dany dzień
  const dayEntry = (officialSchedules || []).find(
    (e) => e.id_instruktora === instructorId && e.data === dateStr && e.status === 'zatwierdzona'
  );

  if (!dayEntry) return [];
  const startMin = timeToMinutes(dayEntry.godzina_od);
  const endMin = timeToMinutes(dayEntry.godzina_do);
  if (startMin >= endMin) return [];

  const safeBookedRides = Array.isArray(bookedRides) ? bookedRides : [];
  const dayRides = safeBookedRides.filter((ride) => {
    if (!ride || ride.id_instruktora !== instructorId) return false;
    const parsed = parseRideTimestamp(ride.data);
    return parsed.dateStr === dateStr;
  });

  const slots: AvailableSlot[] = [];

  for (
    let slotStartMin = startMin;
    slotStartMin + LESSON_DURATION_HOURS * 60 <= endMin;
    slotStartMin += LESSON_DURATION_HOURS * 60
  ) {
    const slotEndMin = slotStartMin + LESSON_DURATION_HOURS * 60;
    const slotStartTime = `${String(Math.floor(slotStartMin / 60)).padStart(2, '0')}:${String(slotStartMin % 60).padStart(2, '0')}`;
    const slotEndTime = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;
    const slotDateTime = new Date(`${dateStr}T${slotStartTime}:00`);

    if (slotDateTime <= new Date()) {
      slots.push({
        time: slotStartTime,
        endTime: slotEndTime,
        isAvailable: false,
        reason: 'past',
      });
      continue;
    }

    const isBooked = dayRides.some((ride) => {
      const parsed = parseRideTimestamp(ride.data);
      const rideStartMin = timeToMinutes(parsed.timeStr);
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

export function countSlotsForDay(
  dateStr: string,
  instructorId: number,
  bookedRides: RideReservation[] = [],
  weeklySchedule: WeeklyScheduleDay[] = [],
  exceptions: AvailabilityException[] = [],
  officialSchedules: InstructorDisposition[] = []
): { total: number; free: number } {
  const slots = calculateAvailableSlots(
    dateStr,
    instructorId,
    bookedRides,
    weeklySchedule,
    exceptions,
    officialSchedules
  );
  return {
    total: slots.length,
    free: slots.filter((s) => s.isAvailable).length,
  };
}

export async function bookRideInDatabase(params: {
  instructorId: number;
  dateStr: string;
  timeStr: string;
  type?: string;
  notes?: string;
  studentId?: number | null;
}): Promise<{ success: boolean; error?: string; ride?: RideReservation }> {
  if (!isBookingDateAllowed(params.dateStr)) {
    return { success: false, error: 'Można rezerwować wyłącznie terminy od jutra do 14 dni naprzód.' };
  }

  const officialSchedules = await fetchOfficialSchedule(
    params.instructorId,
    params.dateStr,
    params.dateStr
  );
  const availableSlots = calculateAvailableSlots(
    params.dateStr,
    params.instructorId,
    [],
    [],
    [],
    officialSchedules
  );
  if (!availableSlots.some((slot) => slot.time === params.timeStr && slot.isAvailable)) {
    return { success: false, error: 'Wybrany termin nie znajduje się w zatwierdzonym grafiku instruktora.' };
  }

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
    const { data: existingRides, error: ridesError } = await supabase
      .from('jazdy')
      .select('id, data')
      .eq('id_instruktora', params.instructorId);

    if (ridesError) {
      return { success: false, error: ridesError.message };
    }

    const bookedRidesForInstructor: RideReservation[] = (existingRides || []).map((ride) => ({
      id: ride.id,
      id_instruktora: params.instructorId,
      data: ride.data,
    }));
    const confirmedSlots = calculateAvailableSlots(
      params.dateStr,
      params.instructorId,
      bookedRidesForInstructor,
      [],
      [],
      officialSchedules
    );
    if (!confirmedSlots.some((slot) => slot.time === params.timeStr && slot.isAvailable)) {
      return {
        success: false,
        error: 'Ten termin (lub część 2-godzinnej lekcji) został już zarezerwowany przez innego kursanta.',
      };
    }

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
        return { success: false, error: 'Termin u tego instruktora jest już zajęty.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, ride: data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Błąd zapisu' };
  }
}
