// -------------------------------------------------------------
// DETERMINISTIC ATTENDANCE & MATHEMATICAL SIMULATION ENGINE
// -------------------------------------------------------------

import { 
  AttendanceRiskLevel, 
  AttendanceSubject, 
  DEFAULT_SUBJECTS 
} from '../storage/defaults';

export type { AttendanceRiskLevel, AttendanceSubject };
export { DEFAULT_SUBJECTS };

export interface SubjectAttendanceMetrics {
  subject: AttendanceSubject;
  currentPercentage: number;
  riskLevel: AttendanceRiskLevel;
  safeSkips: number;
  classesRequired: number;
  statusText: string;
}

export interface OverallAttendanceSummary {
  totalAttended: number;
  totalConducted: number;
  overallPercentage: number;
  overallRiskLevel: AttendanceRiskLevel;
  lowestSubject?: SubjectAttendanceMetrics;
  highestSubject?: SubjectAttendanceMetrics;
  criticalSubjectsCount: number;
  warningSubjectsCount: number;
  safeSubjectsCount: number;
}

export interface SimulationResult {
  subjectName: string;
  initialAttended: number;
  initialTotal: number;
  initialPercentage: number;
  futureAttended: number;
  futureSkipped: number;
  projectedAttended: number;
  projectedTotal: number;
  projectedPercentage: number;
  projectedRiskLevel: AttendanceRiskLevel;
  percentageDelta: number;
  targetPercentage: number;
  isAboveTarget: boolean;
  recoveryClassesNeeded: number;
  adviceText: string;
}

// -------------------------------------------------------------
// PURE DETERMINISTIC MATHEMATICS
// -------------------------------------------------------------

/**
 * Computes exact metrics for a single subject without model estimation.
 */
export function calculateSubjectMetrics(subject: AttendanceSubject): SubjectAttendanceMetrics {
  const attended = Math.max(0, subject.attended);
  const total = Math.max(attended, subject.total);
  const target = subject.targetPercentage || 75;
  const targetRatio = target / 100;

  const currentPercentage = total === 0 ? 100 : Number(((attended / total) * 100).toFixed(2));

  let riskLevel: AttendanceRiskLevel = 'SAFE';
  if (currentPercentage < 70) {
    riskLevel = 'CRITICAL';
  } else if (currentPercentage < target) {
    riskLevel = 'WARNING';
  }

  // Safe Skips: y = floor((A - T * C) / T)
  let safeSkips = 0;
  if (currentPercentage >= target) {
    safeSkips = Math.floor((attended - targetRatio * total) / targetRatio);
  }

  // Classes Required: x = ceil((T * C - A) / (1 - T))
  let classesRequired = 0;
  if (currentPercentage < target) {
    classesRequired = Math.ceil((targetRatio * total - attended) / (1 - targetRatio));
  }

  let statusText = '';
  if (currentPercentage >= target) {
    statusText = safeSkips > 0 
      ? `You can safely skip up to ${safeSkips} class${safeSkips > 1 ? 'es' : ''} while staying above ${target}%.` 
      : `You are exactly on target. Any missed class will drop you below ${target}%.`;
  } else {
    statusText = `You need to attend the next ${classesRequired} consecutive class${classesRequired > 1 ? 'es' : ''} to reach ${target}%.`;
  }

  return {
    subject,
    currentPercentage,
    riskLevel,
    safeSkips: Math.max(0, safeSkips),
    classesRequired: Math.max(0, classesRequired),
    statusText
  };
}

/**
 * Simulates future attendance changes (e.g. "If I skip 3 classes and attend 2").
 */
export function simulateAttendanceScenario(
  subjectName: string,
  currentAttended: number,
  currentTotal: number,
  futureAttended: number,
  futureSkipped: number,
  targetPercentage: number = 75
): SimulationResult {
  const initialAttended = Math.max(0, currentAttended);
  const initialTotal = Math.max(initialAttended, currentTotal);
  const initialPercentage = initialTotal === 0 ? 100 : Number(((initialAttended / initialTotal) * 100).toFixed(2));

  const projectedAttended = initialAttended + futureAttended;
  const projectedTotal = initialTotal + futureAttended + futureSkipped;
  const projectedPercentage = projectedTotal === 0 ? 100 : Number(((projectedAttended / projectedTotal) * 100).toFixed(2));

  let projectedRiskLevel: AttendanceRiskLevel = 'SAFE';
  if (projectedPercentage < 70) {
    projectedRiskLevel = 'CRITICAL';
  } else if (projectedPercentage < targetPercentage) {
    projectedRiskLevel = 'WARNING';
  }

  const percentageDelta = Number((projectedPercentage - initialPercentage).toFixed(2));
  const isAboveTarget = projectedPercentage >= targetPercentage;

  let recoveryClassesNeeded = 0;
  if (!isAboveTarget) {
    const targetRatio = targetPercentage / 100;
    recoveryClassesNeeded = Math.ceil((targetRatio * projectedTotal - projectedAttended) / (1 - targetRatio));
  }

  let adviceText = '';
  if (isAboveTarget) {
    const targetRatio = targetPercentage / 100;
    const remainingSafeSkips = Math.floor((projectedAttended - targetRatio * projectedTotal) / targetRatio);
    adviceText = `✅ Attendance remains SAFE at ${projectedPercentage}%. You will still have ${remainingSafeSkips} safe skip${remainingSafeSkips !== 1 ? 's' : ''} available.`;
  } else {
    adviceText = `⚠️ Attendance will DROP to ${projectedPercentage}% (below ${targetPercentage}%). You would need to attend ${recoveryClassesNeeded} consecutive class${recoveryClassesNeeded > 1 ? 'es' : ''} to recover!`;
  }

  return {
    subjectName,
    initialAttended,
    initialTotal,
    initialPercentage,
    futureAttended,
    futureSkipped,
    projectedAttended,
    projectedTotal,
    projectedPercentage,
    projectedRiskLevel,
    percentageDelta,
    targetPercentage,
    isAboveTarget,
    recoveryClassesNeeded: Math.max(0, recoveryClassesNeeded),
    adviceText
  };
}

/**
 * Calculates aggregate summary across all subjects.
 */
export function calculateOverallAttendance(subjects: AttendanceSubject[], defaultTarget = 75): OverallAttendanceSummary {
  if (!subjects || subjects.length === 0) {
    return {
      totalAttended: 0,
      totalConducted: 0,
      overallPercentage: 100,
      overallRiskLevel: 'SAFE',
      criticalSubjectsCount: 0,
      warningSubjectsCount: 0,
      safeSubjectsCount: 0
    };
  }

  let totalAttended = 0;
  let totalConducted = 0;
  const metricsList = subjects.map(s => calculateSubjectMetrics(s));

  metricsList.forEach(m => {
    totalAttended += m.subject.attended;
    totalConducted += m.subject.total;
  });

  const overallPercentage = totalConducted === 0 ? 100 : Number(((totalAttended / totalConducted) * 100).toFixed(2));

  let overallRiskLevel: AttendanceRiskLevel = 'SAFE';
  if (overallPercentage < 70) {
    overallRiskLevel = 'CRITICAL';
  } else if (overallPercentage < defaultTarget) {
    overallRiskLevel = 'WARNING';
  }

  const sorted = [...metricsList].sort((a, b) => a.currentPercentage - b.currentPercentage);
  const lowestSubject = sorted[0];
  const highestSubject = sorted[sorted.length - 1];

  const criticalSubjectsCount = metricsList.filter(m => m.riskLevel === 'CRITICAL').length;
  const warningSubjectsCount = metricsList.filter(m => m.riskLevel === 'WARNING').length;
  const safeSubjectsCount = metricsList.filter(m => m.riskLevel === 'SAFE').length;

  return {
    totalAttended,
    totalConducted,
    overallPercentage,
    overallRiskLevel,
    lowestSubject,
    highestSubject,
    criticalSubjectsCount,
    warningSubjectsCount,
    safeSubjectsCount
  };
}

// -------------------------------------------------------------
// INDEXEDDB DATA STORE HELPERS (UNLIMITED BROWSER STORAGE)
// -------------------------------------------------------------
import { db } from '../storage/db';

export function loadStudentSubjects(): AttendanceSubject[] {
  return db.getAttendance();
}

export function saveStudentSubjects(subjects: AttendanceSubject[]): void {
  db.saveAttendance(subjects);
}

export function findMatchingSubject(query: string, subjects: AttendanceSubject[]): AttendanceSubject | undefined {
  const clean = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Exact match or substring
  for (const s of subjects) {
    const cleanName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCode = (s.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.includes(cleanName) || cleanName.includes(clean)) return s;
    if (cleanCode && (clean.includes(cleanCode) || cleanCode.includes(clean))) return s;
  }

  // Keyword match
  const keywordsMap: Record<string, string[]> = {
    'c++': ['c++', 'cpp', 'oops'],
    'cloud': ['cloud', 'big data', 'aws'],
    'crypto': ['crypto', 'cryptography', 'security'],
    'python': ['python', 'py'],
    'career': ['career', 'skills', 'aptitude', 'xcs']
  };

  for (const s of subjects) {
    const sNameLower = s.name.toLowerCase();
    for (const [, tags] of Object.entries(keywordsMap)) {
      if (tags.some(t => query.toLowerCase().includes(t)) && tags.some(t => sNameLower.includes(t))) {
        return s;
      }
    }
  }

  return undefined;
}

// -------------------------------------------------------------
// SEMESTER-LEVEL ATTENDANCE PROJECTION (GEHU WORKING DAYS)
// -------------------------------------------------------------
import { getSemesterWorkingDaysStats, getGEHUDayDetails } from './academicCalendarEngine';
import { DailyAttendanceRecord } from '../storage/db';

export interface SemesterAttendanceProjection {
  subjectName: string;
  currentAttended: number;
  currentTotal: number;
  currentPercentage: number;
  targetPercentage: number;
  remainingWorkingDays: number;
  estimatedRemainingLectures: number;
  maxAchievablePercentage: number;
  minClassesToAttendFor75: number;
  maxBunksAllowedAcrossSemester: number;
  is75Achievable: boolean;
  statusVerdict: 'COMFORTABLY_SAFE' | 'ACHIEVABLE_WITH_REGULARITY' | 'CRITICAL_MUST_ATTEND_ALL' | 'MATHEMATICALLY_IMPOSSIBLE';
  summaryAdvice: string;
}

export function calculateSemesterAttendanceProjection(
  subject: AttendanceSubject,
  lecturesPerWeek: number = 4
): SemesterAttendanceProjection {
  const stats = getSemesterWorkingDaysStats();
  const remainingWorkingDays = stats.remainingDays; // e.g. 48

  // Calculate remaining weeks (approx 6 working days per week in GEHU timetable)
  const remainingWeeks = Math.max(0.5, remainingWorkingDays / 6);
  const estimatedRemainingLectures = Math.max(1, Math.round(remainingWeeks * lecturesPerWeek));

  const targetRatio = (subject.targetPercentage || 75) / 100;
  const finalProjectedTotal = subject.total + estimatedRemainingLectures;

  // 1. Max Achievable Percentage (if attends 100% of remaining lectures)
  const maxAttended = subject.attended + estimatedRemainingLectures;
  const maxAchievablePercentage = parseFloat(((maxAttended / finalProjectedTotal) * 100).toFixed(1));

  // 2. Minimum total attended needed by end of semester to stay >= 75%
  const requiredTotalAttended = Math.ceil(finalProjectedTotal * targetRatio);
  const minClassesToAttendFor75 = Math.max(0, requiredTotalAttended - subject.attended);

  // 3. Max bunks allowable out of remaining classes
  const maxBunksAllowedAcrossSemester = Math.max(0, estimatedRemainingLectures - minClassesToAttendFor75);

  // 4. Feasibility Check
  const is75Achievable = minClassesToAttendFor75 <= estimatedRemainingLectures;

  let statusVerdict: SemesterAttendanceProjection['statusVerdict'] = 'COMFORTABLY_SAFE';
  let summaryAdvice = '';

  if (!is75Achievable) {
    statusVerdict = 'MATHEMATICALLY_IMPOSSIBLE';
    summaryAdvice = `⚠️ Even if you attend all ${estimatedRemainingLectures} remaining classes, your maximum attendance will reach ${maxAchievablePercentage}% (short of ${subject.targetPercentage}%). Speak with your course coordinator.`;
  } else if (minClassesToAttendFor75 === estimatedRemainingLectures) {
    statusVerdict = 'CRITICAL_MUST_ATTEND_ALL';
    summaryAdvice = `🚨 Zero margin for error: You MUST attend all ${estimatedRemainingLectures} remaining classes to reach ${subject.targetPercentage}%. No more bunks allowed this semester.`;
  } else if (maxBunksAllowedAcrossSemester <= 2) {
    statusVerdict = 'ACHIEVABLE_WITH_REGULARITY';
    summaryAdvice = `⚡ Tight balance: You must attend at least ${minClassesToAttendFor75} out of ${estimatedRemainingLectures} remaining classes. You have only ${maxBunksAllowedAcrossSemester} safe bunk(s) left.`;
  } else {
    statusVerdict = 'COMFORTABLY_SAFE';
    summaryAdvice = `✅ Good standing: Out of ${estimatedRemainingLectures} remaining classes, you need to attend ${minClassesToAttendFor75}. You can safely skip up to ${maxBunksAllowedAcrossSemester} classes across the rest of the semester.`;
  }

  return {
    subjectName: subject.name,
    currentAttended: subject.attended,
    currentTotal: subject.total,
    currentPercentage: parseFloat(((subject.attended / (subject.total || 1)) * 100).toFixed(1)),
    targetPercentage: subject.targetPercentage || 75,
    remainingWorkingDays,
    estimatedRemainingLectures,
    maxAchievablePercentage,
    minClassesToAttendFor75,
    maxBunksAllowedAcrossSemester,
    is75Achievable,
    statusVerdict,
    summaryAdvice
  };
}

// -------------------------------------------------------------
// DAILY WORKING DAY CHECK-IN & REAL-TIME ATTENDANCE LOGGING
// -------------------------------------------------------------

export interface DailySubjectCheckInStatus {
  subject: AttendanceSubject;
  isLogged: boolean;
  status?: 'PRESENT' | 'ABSENT' | 'CANCELLED';
  logId?: string;
}

export interface DayAttendanceStatus {
  date: string;
  dayName: string;
  workingDayNumber: number | null;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isCompleted: boolean;
  subjects: DailySubjectCheckInStatus[];
}

export function getDailyCheckInStatus(dateStr: string): DayAttendanceStatus {
  const dayInfo = getGEHUDayDetails(dateStr);
  const subjects = loadStudentSubjects();
  const allLogs = db.getDailyLogs().filter(l => l.date === dateStr);

  const subjectStatuses: DailySubjectCheckInStatus[] = subjects.map(s => {
    const existing = allLogs.find(l => l.subjectId === s.id);
    return {
      subject: s,
      isLogged: !!existing,
      status: existing?.status,
      logId: existing?.id
    };
  });

  const isCompleted = subjectStatuses.length > 0 && subjectStatuses.every(s => s.isLogged);

  return {
    date: dateStr,
    dayName: dayInfo.dayName,
    workingDayNumber: dayInfo.workingDayNumber,
    isWorkingDay: dayInfo.isWorkingDay,
    isHoliday: dayInfo.isHoliday,
    holidayName: dayInfo.holidayName,
    isCompleted,
    subjects: subjectStatuses
  };
}

export function recordDailyClassAttendance(
  dateStr: string,
  subjectId: string,
  status: 'PRESENT' | 'ABSENT' | 'CANCELLED'
): { updatedSubject: AttendanceSubject; record: DailyAttendanceRecord } {
  const dayInfo = getGEHUDayDetails(dateStr);
  const subjects = loadStudentSubjects();
  const targetSubject = subjects.find(s => s.id === subjectId);

  if (!targetSubject) {
    throw new Error(`Subject not found with id: ${subjectId}`);
  }

  // Check if there was an existing log for this day and subject to prevent double counting
  const existingLogs = db.getDailyLogs();
  const previousRecord = existingLogs.find(l => l.date === dateStr && l.subjectId === subjectId);

  // If there was a previous record today, revert its effect first
  if (previousRecord) {
    if (previousRecord.status === 'PRESENT') {
      targetSubject.attended = Math.max(0, targetSubject.attended - 1);
      targetSubject.total = Math.max(0, targetSubject.total - 1);
    } else if (previousRecord.status === 'ABSENT') {
      targetSubject.total = Math.max(0, targetSubject.total - 1);
    }
  }

  // Apply new status
  if (status === 'PRESENT') {
    targetSubject.attended += 1;
    targetSubject.total += 1;
  } else if (status === 'ABSENT') {
    targetSubject.total += 1;
  }
  // If CANCELLED: no increments to attended or total

  // Persist updated subject list
  saveStudentSubjects(subjects);

  // Save log record to IndexedDB
  const record: DailyAttendanceRecord = {
    id: `log_${dateStr}_${subjectId}`,
    date: dateStr,
    workingDayNumber: dayInfo.workingDayNumber,
    subjectId: targetSubject.id,
    subjectName: targetSubject.name,
    status,
    timestamp: new Date().toISOString()
  };

  db.addDailyLog(record);

  return { updatedSubject: targetSubject, record };
}

export function undoDailyClassAttendance(
  dateStr: string,
  subjectId: string
): { updatedSubject?: AttendanceSubject } {
  const subjects = loadStudentSubjects();
  const targetSubject = subjects.find(s => s.id === subjectId);
  const existingLogs = db.getDailyLogs();
  const previousRecord = existingLogs.find(l => l.date === dateStr && l.subjectId === subjectId);

  if (targetSubject && previousRecord) {
    if (previousRecord.status === 'PRESENT') {
      targetSubject.attended = Math.max(0, targetSubject.attended - 1);
      targetSubject.total = Math.max(0, targetSubject.total - 1);
    } else if (previousRecord.status === 'ABSENT') {
      targetSubject.total = Math.max(0, targetSubject.total - 1);
    }
    saveStudentSubjects(subjects);
    db.saveDailyLogs(existingLogs.filter(l => !(l.date === dateStr && l.subjectId === subjectId)));
  }

  return { updatedSubject: targetSubject };
}


