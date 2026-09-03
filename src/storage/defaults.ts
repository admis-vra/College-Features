// -------------------------------------------------------------
// DEFAULT DATA SEEDS & CORE SHARED INTERFACES
// Independent, zero-dependency leaf module to prevent circular TDZ errors
// -------------------------------------------------------------

export type AttendanceRiskLevel = 'SAFE' | 'WARNING' | 'CRITICAL';

export interface AttendanceSubject {
  id: string;
  name: string;
  code?: string;
  attended: number;
  total: number;
  targetPercentage: number;
  notes?: string;
}

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

export type OCRDocType = 'ERP_ATTENDANCE' | 'TIMETABLE' | 'ACADEMIC_CALENDAR' | 'AUTO_DETECT' | 'UNKNOWN';

export interface OCRScanResult {
  docType: OCRDocType;
  rawText: string;
  confidence: number;
  processingTimeMs: number;
  methodUsed: 'MULTIMODAL_AI' | 'LOCAL_OCR' | 'SAMPLE_MOCK';
  summaryText: string;
  extractedData: {
    subjects?: AttendanceSubject[];
    timetable?: any[];
    calendarEvents?: AcademicCalendarEvent[];
  };
}

export const DEFAULT_SUBJECTS: AttendanceSubject[] = [
  {
    id: 'sub_1',
    name: 'Object Oriented Programming with C++',
    code: 'TCS-301',
    attended: 28,
    total: 32,
    targetPercentage: 75
  },
  {
    id: 'sub_2',
    name: 'Fundamentals of Cloud Computing and Big Data',
    code: 'TCS-302',
    attended: 22,
    total: 30,
    targetPercentage: 75
  },
  {
    id: 'sub_3',
    name: 'Introduction to Cryptography',
    code: 'TCS-303',
    attended: 17,
    total: 25,
    targetPercentage: 75
  },
  {
    id: 'sub_4',
    name: 'Python Programming',
    code: 'TCS-304',
    attended: 29,
    total: 34,
    targetPercentage: 75
  },
  {
    id: 'sub_5',
    name: 'Career Skills-I',
    code: 'XCS-301',
    attended: 14,
    total: 16,
    targetPercentage: 75
  }
];

export const DEFAULT_ACADEMIC_EVENTS: AcademicCalendarEvent[] = [
  {
    id: 'gehu_commence_senior',
    title: 'Commencement of 3rd, 5th and 7th Semesters',
    type: 'REGISTRATION',
    date: '2026-07-13',
    description: 'First instructional working day (Day 1 of 90) for senior semesters.'
  },
  {
    id: 'gehu_commence_freshers',
    title: 'Commencement of 1st Semester Induction Program',
    type: 'REGISTRATION',
    date: '2026-07-20',
    description: 'Induction program & orientation for newly admitted 1st semester students.'
  },
  {
    id: 'gehu_hol_independence',
    title: 'Independence Day (University Holiday)',
    type: 'HOLIDAY',
    date: '2026-08-15',
    description: 'National holiday - Flag hoisting & campus closed.'
  },
  {
    id: 'gehu_hol_eid',
    title: 'Eid-e-Milad (University Holiday)',
    type: 'HOLIDAY',
    date: '2026-08-26',
    description: 'Gazetted university holiday.'
  },
  {
    id: 'gehu_hol_raksha',
    title: 'Raksha Bandhan (University Holiday)',
    type: 'HOLIDAY',
    date: '2026-08-28',
    description: 'University holiday.'
  },
  {
    id: 'gehu_hol_janmashtami',
    title: 'Sri Krishna Janmashtami (University Holiday)',
    type: 'HOLIDAY',
    date: '2026-09-04',
    description: 'University holiday - No classes scheduled.'
  },
  {
    id: 'gehu_exam_tep',
    title: 'TEP: Term Evaluation - Practical',
    type: 'MIDTERM',
    date: '2026-09-14',
    endDate: '2026-09-19',
    description: 'Mid-semester practical laboratory evaluations and viva assessments (Days 51-56).'
  },
  {
    id: 'gehu_exam_tet',
    title: 'TET: Term Evaluation - Theory (Mid-Term Exams)',
    type: 'MIDTERM',
    date: '2026-09-21',
    endDate: '2026-09-26',
    description: 'Mid-term written examination for all theoretical courses.'
  },
  {
    id: 'gehu_hol_gandhi',
    title: 'Gandhi Jayanti (University Holiday)',
    type: 'HOLIDAY',
    date: '2026-10-02',
    description: 'National holiday - Campus closed.'
  },
  {
    id: 'gehu_hol_dussehra',
    title: 'Dussehra (Vijayadashami)',
    type: 'HOLIDAY',
    date: '2026-10-20',
    description: 'Festival holiday.'
  },
  {
    id: 'gehu_hol_diwali',
    title: 'Deepawali Break & Festivities',
    type: 'HOLIDAY',
    date: '2026-11-05',
    endDate: '2026-11-11',
    description: 'Diwali university festival holiday break.'
  },
  {
    id: 'gehu_last_teaching_day',
    title: 'Last Instructional Working Day (Day 90)',
    type: 'EVENT',
    date: '2026-11-14',
    description: '90th instructional working day. Regular classroom teaching concludes.'
  },
  {
    id: 'gehu_exam_esep',
    title: 'ESEP: End Semester Examination - Practical',
    type: 'EXAM',
    date: '2026-11-16',
    endDate: '2026-11-23',
    description: 'Final end semester practical examinations and project evaluations.'
  },
  {
    id: 'gehu_hol_gurunanak',
    title: 'Guru Nanak Jayanti (University Holiday)',
    type: 'HOLIDAY',
    date: '2026-11-24',
    description: 'University holiday.'
  },
  {
    id: 'gehu_exam_eset',
    title: 'ESET: End Semester Examination - Theory',
    type: 'EXAM',
    date: '2026-11-25',
    endDate: '2026-12-12',
    description: 'Comprehensive end semester theoretical examinations conducted by Controller of Examinations.'
  },
  {
    id: 'gehu_hol_christmas',
    title: 'Christmas (University Holiday)',
    type: 'HOLIDAY',
    date: '2026-12-25',
    description: 'Gazetted university holiday.'
  },
  {
    id: 'gehu_commence_even',
    title: 'Commencement of Even Semesters (II, IV, VI, VIII & X)',
    type: 'REGISTRATION',
    date: '2027-01-04',
    description: 'Classes commence for upcoming Even Semesters.'
  }
];
