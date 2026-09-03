// -------------------------------------------------------------
// ACADEMIC CALENDAR & EXAM TIMETABLE ENGINE
// -------------------------------------------------------------

import { 
  CalendarEventType, 
  AcademicCalendarEvent, 
  DEFAULT_ACADEMIC_EVENTS 
} from '../storage/defaults';

export type { CalendarEventType, AcademicCalendarEvent };
export { DEFAULT_ACADEMIC_EVENTS };

export interface EnrichedCalendarEvent extends AcademicCalendarEvent {
  daysRemaining: number;
  isPast: boolean;
  isToday: boolean;
  formattedDate: string;
}

import { db } from '../storage/db';

export function loadAcademicCalendar(): AcademicCalendarEvent[] {
  return db.getAcademicCalendar();
}

export function saveAcademicCalendar(events: AcademicCalendarEvent[]): void {
  db.saveAcademicCalendar(events);
}

export function enrichEvent(event: AcademicCalendarEvent, referenceDate: Date = new Date()): EnrichedCalendarEvent {
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const [y, m, d] = event.date.split('-').map(Number);
  const eventDate = new Date(y, m - 1, d);
  
  const diffTime = eventDate.getTime() - ref.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isToday = daysRemaining === 0;
  const isPast = daysRemaining < 0;

  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  let formattedDate = eventDate.toLocaleDateString('en-US', dateOpts);
  if (event.endDate) {
    const [ey, em, ed] = event.endDate.split('-').map(Number);
    const endEvtDate = new Date(ey, em - 1, ed);
    formattedDate += ` - ${endEvtDate.toLocaleDateString('en-US', dateOpts)}`;
  }

  return {
    ...event,
    daysRemaining,
    isPast,
    isToday,
    formattedDate
  };
}

export function getAllEnrichedEvents(): EnrichedCalendarEvent[] {
  const raw = loadAcademicCalendar();
  return raw
    .map(e => enrichEvent(e))
    .sort((a, b) => {
      // Sort upcoming first by date ascending, then past events
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return a.date.localeCompare(b.date);
    });
}

export function getUpcomingEvents(daysThreshold: number = 60): EnrichedCalendarEvent[] {
  const events = getAllEnrichedEvents();
  return events.filter(e => !e.isPast || e.isToday).filter(e => e.daysRemaining <= daysThreshold);
}

export function getExamSchedule(subjectQuery?: string): EnrichedCalendarEvent[] {
  const events = getAllEnrichedEvents().filter(e => e.type === 'EXAM' || e.type === 'MIDTERM');
  if (!subjectQuery || subjectQuery.trim() === '') return events;

  const q = subjectQuery.toLowerCase().trim();
  return events.filter(e => 
    e.title.toLowerCase().includes(q) || 
    (e.subject && e.subject.toLowerCase().includes(q))
  );
}

export function getDaysUntilNextExam(): { nextExam?: EnrichedCalendarEvent; days: number; count: number } {
  const upcomingExams = getExamSchedule().filter(e => !e.isPast || e.isToday);
  if (upcomingExams.length === 0) {
    return { days: -1, count: 0 };
  }
  return {
    nextExam: upcomingExams[0],
    days: upcomingExams[0].daysRemaining,
    count: upcomingExams.length
  };
}

export function getUpcomingHolidays(): EnrichedCalendarEvent[] {
  return getAllEnrichedEvents().filter(e => e.type === 'HOLIDAY' && (!e.isPast || e.isToday));
}

export function mergeImportedEvents(newEvents: AcademicCalendarEvent[], overwrite: boolean = false): AcademicCalendarEvent[] {
  if (overwrite) {
    saveAcademicCalendar(newEvents);
    return newEvents;
  }
  const current = loadAcademicCalendar();
  const currentTitles = new Set(current.map(c => `${c.title.toLowerCase().trim()}_${c.date}`));
  
  const merged = [...current];
  newEvents.forEach(ne => {
    const key = `${ne.title.toLowerCase().trim()}_${ne.date}`;
    if (!currentTitles.has(key)) {
      merged.push({
        ...ne,
        id: ne.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      });
      currentTitles.add(key);
    }
  });

  saveAcademicCalendar(merged);
  return merged;
}

// =============================================================
// GEHU WORKING DAYS & ATTENDANCE CALENDAR ENGINE
// =============================================================

export interface GEHUDayClassification {
  date: string; // YYYY-MM-DD
  dayName: string;
  isWorkingDay: boolean;
  workingDayNumber: number | null; // 1 to 90
  isHoliday: boolean;
  holidayName?: string;
  isExam: boolean;
  examCode?: 'TEP' | 'TET' | 'ESEP' | 'ESET';
  label: string;
}

export interface SemesterWorkingDaysStats {
  totalInstructionalDays: number;
  completedDays: number;
  remainingDays: number;
  currentDayNumber: number;
  progressPercentage: number;
  currentDate: string;
  isTodayWorkingDay: boolean;
  todayLabel: string;
  nextHoliday?: { name: string; date: string; daysAway: number };
  nextExamBlock?: { name: string; code: string; startDate: string; daysAway: number };
  lastTeachingDate: string;
}

// Explicit Mapping for GEHU Official Odd Semester Instructional Days
const GEHU_EXPLICIT_WORKING_DAYS: Record<string, number> = {
  // July (1-17)
  '2026-07-13': 1, '2026-07-14': 2, '2026-07-15': 3, '2026-07-16': 4, '2026-07-17': 5, '2026-07-18': 6,
  '2026-07-20': 7, '2026-07-21': 8, '2026-07-22': 9, '2026-07-23': 10, '2026-07-24': 11, '2026-07-25': 12,
  '2026-07-27': 13, '2026-07-28': 14, '2026-07-29': 15, '2026-07-30': 16, '2026-07-31': 17,

  // August (18-40)
  '2026-08-01': 18, '2026-08-03': 19, '2026-08-04': 20, '2026-08-05': 21, '2026-08-06': 22, '2026-08-07': 23, '2026-08-08': 24,
  '2026-08-10': 25, '2026-08-11': 26, '2026-08-12': 27, '2026-08-13': 28, '2026-08-14': 29,
  '2026-08-17': 30, '2026-08-18': 31, '2026-08-19': 32, '2026-08-20': 33, '2026-08-21': 34, '2026-08-22': 35,
  '2026-08-24': 36, '2026-08-25': 37, '2026-08-27': 38, '2026-08-29': 39, '2026-08-31': 40,

  // September (41-59)
  '2026-09-01': 41, '2026-09-02': 42, '2026-09-03': 43, '2026-09-05': 44,
  '2026-09-07': 45, '2026-09-08': 46, '2026-09-09': 47, '2026-09-10': 48, '2026-09-11': 49, '2026-09-12': 50,
  '2026-09-14': 51, '2026-09-15': 52, '2026-09-16': 53, '2026-09-17': 54, '2026-09-18': 55, '2026-09-19': 56, // TEP
  '2026-09-28': 57, '2026-09-29': 58, '2026-09-30': 59,

  // October (60-84)
  '2026-10-01': 60, '2026-10-03': 61, '2026-10-05': 62, '2026-10-06': 63, '2026-10-07': 64, '2026-10-08': 65,
  '2026-10-09': 66, '2026-10-10': 67, '2026-10-12': 68, '2026-10-13': 69, '2026-10-14': 70, '2026-10-15': 71,
  '2026-10-16': 72, '2026-10-17': 73, '2026-10-19': 74, '2026-10-21': 75, '2026-10-22': 76, '2026-10-23': 77,
  '2026-10-24': 78, '2026-10-26': 79, '2026-10-27': 80, '2026-10-28': 81, '2026-10-29': 82, '2026-10-30': 83, '2026-10-31': 84,

  // November (85-90)
  '2026-11-02': 85, '2026-11-03': 86, '2026-11-04': 87,
  '2026-11-12': 88, '2026-11-13': 89, '2026-11-14': 90
};

// Official GEHU University Holidays
const GEHU_OFFICIAL_HOLIDAYS: Record<string, string> = {
  '2026-08-15': 'Independence Day',
  '2026-08-26': 'Eid-e-Milad',
  '2026-08-28': 'Raksha Bandhan',
  '2026-09-04': 'Sri Krishna Janmashtami',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-20': 'Dussehra (Vijayadashami)',
  '2026-11-05': 'Deepawali Break',
  '2026-11-06': 'Deepawali Break',
  '2026-11-07': 'Deepawali Break',
  '2026-11-08': 'Deepawali',
  '2026-11-09': 'Goverdhan Puja',
  '2026-11-10': 'Bhai Dooj',
  '2026-11-11': 'Deepawali University Break',
  '2026-11-24': 'Guru Nanak Jayanti',
  '2026-12-25': 'Christmas'
};

// Official GEHU Examination Windows
const GEHU_EXAM_PERIODS = [
  { code: 'TEP' as const, name: 'Term Evaluation - Practical', start: '2026-09-14', end: '2026-09-19' },
  { code: 'TET' as const, name: 'Term Evaluation - Theory (Mid-Term)', start: '2026-09-21', end: '2026-09-26' },
  { code: 'ESEP' as const, name: 'End Semester Exam - Practical', start: '2026-11-16', end: '2026-11-23' },
  { code: 'ESET' as const, name: 'End Semester Exam - Theory', start: '2026-11-25', end: '2026-12-12' },
  { code: 'ESET' as const, name: 'End Semester Exam - Theory (Final)', start: '2026-12-30', end: '2026-12-31' }
];

export function getGEHUDayDetails(dateStr: string): GEHUDayClassification {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = weekdays[dateObj.getDay()];

  // Check holiday
  const holidayName = GEHU_OFFICIAL_HOLIDAYS[dateStr];
  if (holidayName) {
    return {
      date: dateStr,
      dayName,
      isWorkingDay: false,
      workingDayNumber: null,
      isHoliday: true,
      holidayName,
      isExam: false,
      label: `Holiday: ${holidayName}`
    };
  }

  // Check Sunday
  if (dateObj.getDay() === 0) {
    return {
      date: dateStr,
      dayName,
      isWorkingDay: false,
      workingDayNumber: null,
      isHoliday: false,
      isExam: false,
      label: 'Sunday (Weekly Off)'
    };
  }

  // Check exam blocks
  const exam = GEHU_EXAM_PERIODS.find(e => dateStr >= e.start && dateStr <= e.end);
  const workingDayNum = GEHU_EXPLICIT_WORKING_DAYS[dateStr] || null;

  if (exam) {
    return {
      date: dateStr,
      dayName,
      isWorkingDay: workingDayNum !== null,
      workingDayNumber: workingDayNum,
      isHoliday: false,
      isExam: true,
      examCode: exam.code,
      label: `${exam.code}: ${exam.name}${workingDayNum ? ` (Day ${workingDayNum})` : ''}`
    };
  }

  if (workingDayNum !== null) {
    return {
      date: dateStr,
      dayName,
      isWorkingDay: true,
      workingDayNumber: workingDayNum,
      isHoliday: false,
      isExam: false,
      label: `Working Day ${workingDayNum} of 90`
    };
  }

  return {
    date: dateStr,
    dayName,
    isWorkingDay: false,
    workingDayNumber: null,
    isHoliday: false,
    isExam: false,
    label: 'Non-Instructional Day'
  };
}

export function getSemesterWorkingDaysStats(referenceDate: Date = new Date()): SemesterWorkingDaysStats {
  const y = referenceDate.getFullYear();
  const m = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const d = String(referenceDate.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  const todayDetails = getGEHUDayDetails(dateStr);
  const totalInstructionalDays = 90;

  let currentDayNumber = 0;
  if (todayDetails.workingDayNumber) {
    currentDayNumber = todayDetails.workingDayNumber;
  } else {
    // Find the latest completed working day
    const pastDays = Object.entries(GEHU_EXPLICIT_WORKING_DAYS)
      .filter(([date]) => date <= dateStr)
      .map(([, num]) => num);
    currentDayNumber = pastDays.length > 0 ? Math.max(...pastDays) : 0;
  }

  const completedDays = currentDayNumber;
  const remainingDays = Math.max(0, totalInstructionalDays - completedDays);
  const progressPercentage = parseFloat(((completedDays / totalInstructionalDays) * 100).toFixed(1));

  // Find next upcoming holiday
  const sortedHolidays = Object.entries(GEHU_OFFICIAL_HOLIDAYS)
    .filter(([date]) => date >= dateStr)
    .sort(([a], [b]) => a.localeCompare(b));

  let nextHoliday: { name: string; date: string; daysAway: number } | undefined;
  if (sortedHolidays.length > 0) {
    const [hDate, hName] = sortedHolidays[0];
    const diffDays = Math.ceil((new Date(hDate).getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    nextHoliday = { name: hName, date: hDate, daysAway: diffDays };
  }

  // Find next exam block
  const upcomingExams = GEHU_EXAM_PERIODS
    .filter(e => e.start >= dateStr)
    .sort((a, b) => a.start.localeCompare(b.start));

  let nextExamBlock: { name: string; code: string; startDate: string; daysAway: number } | undefined;
  if (upcomingExams.length > 0) {
    const exam = upcomingExams[0];
    const diffDays = Math.ceil((new Date(exam.start).getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    nextExamBlock = { name: exam.name, code: exam.code, startDate: exam.start, daysAway: diffDays };
  }

  return {
    totalInstructionalDays,
    completedDays,
    remainingDays,
    currentDayNumber,
    progressPercentage,
    currentDate: dateStr,
    isTodayWorkingDay: todayDetails.isWorkingDay,
    todayLabel: todayDetails.label,
    nextHoliday,
    nextExamBlock,
    lastTeachingDate: '2026-11-14'
  };
}

export function countWorkingDaysBetween(startDateStr: string, endDateStr: string): number {
  return Object.keys(GEHU_EXPLICIT_WORKING_DAYS).filter(d => d >= startDateStr && d <= endDateStr).length;
}

export function getAllOfficialGEHUHolidays(): { date: string; name: string }[] {
  return Object.entries(GEHU_OFFICIAL_HOLIDAYS)
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

