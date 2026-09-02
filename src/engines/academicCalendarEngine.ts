// -------------------------------------------------------------
// ACADEMIC CALENDAR & EXAM TIMETABLE ENGINE
// -------------------------------------------------------------

export type CalendarEventType = 'EXAM' | 'MIDTERM' | 'HOLIDAY' | 'SUBMISSION' | 'EVENT' | 'REGISTRATION';

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  subject?: string;
  location?: string;
  description?: string;
}

export interface EnrichedCalendarEvent extends AcademicCalendarEvent {
  daysRemaining: number;
  isPast: boolean;
  isToday: boolean;
  formattedDate: string;
}

// Default academic calendar events seed
export const DEFAULT_ACADEMIC_EVENTS: AcademicCalendarEvent[] = [
  {
    id: 'evt_1',
    title: 'Mid-Term Examination: C++ & Data Structures',
    type: 'MIDTERM',
    date: '2026-09-15',
    subject: 'Object Oriented Programming with C++',
    location: 'CS Lab 3 & Room 204',
    description: 'Units 1-3. Written + Lab Code Assessment.'
  },
  {
    id: 'evt_2',
    title: 'Mid-Term Examination: Cloud Computing',
    type: 'MIDTERM',
    date: '2026-09-18',
    subject: 'Fundamentals of Cloud Computing and Big Data',
    location: 'LT-102',
    description: 'Architecture, Virtualization & MapReduce concepts.'
  },
  {
    id: 'evt_3',
    title: 'Mid-Term Examination: Cryptography & Network Security',
    type: 'MIDTERM',
    date: '2026-09-22',
    subject: 'Introduction to Cryptography',
    location: 'LT-104',
    description: 'Symmetric/Asymmetric Ciphers, RSA, AES.'
  },
  {
    id: 'evt_4',
    title: 'Gandhi Jayanti (University Holiday)',
    type: 'HOLIDAY',
    date: '2026-10-02',
    description: 'National holiday - Campus closed.'
  },
  {
    id: 'evt_5',
    title: 'Python Mini Project & Lab Record Submission',
    type: 'SUBMISSION',
    date: '2026-10-14',
    subject: 'Python Programming',
    location: 'Lab 4 to Prof. Sharma',
    description: 'Full code repository + documentation printout.'
  },
  {
    id: 'evt_6',
    title: 'Diwali Break & Autumn Fest',
    type: 'HOLIDAY',
    date: '2026-11-01',
    endDate: '2026-11-06',
    description: 'Autumn University Break.'
  },
  {
    id: 'evt_7',
    title: 'End-Term Practical / Viva Examination',
    type: 'EXAM',
    date: '2026-11-20',
    endDate: '2026-11-27',
    description: 'Lab practicals for all enrolled practical subjects.'
  },
  {
    id: 'evt_8',
    title: 'End-Semester University Theory Examinations',
    type: 'EXAM',
    date: '2026-12-05',
    endDate: '2026-12-23',
    description: 'Final end-term semester examinations.'
  }
];

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
