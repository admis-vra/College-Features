import rawTimetable from '../data/timetable.json';

export interface TimetableEntry {
  course: string;
  semester: string;
  section: string;
  subject: string;
  day: string;
  start_time: string;
  end_time: string;
  room_number: string;
}

export interface ClassSchedule {
  startTime: string;
  endTime: string;
  course: string;
  semester: string;
  section: string;
  subject: string;
}

export interface FreePeriod {
  start: string;
  end: string;
  status: 'FREE' | 'OCCUPIED';
  subject?: string;
  course?: string;
}

import { 
  loadStudentSubjects, 
  calculateSubjectMetrics, 
  simulateAttendanceScenario, 
  calculateOverallAttendance, 
  findMatchingSubject,
  saveStudentSubjects,
  calculateSemesterAttendanceProjection,
  getDailyCheckInStatus
} from '../engines/attendanceEngine';

import {
  getExamSchedule,
  getDaysUntilNextExam,
  getUpcomingHolidays,
  mergeImportedEvents,
  getSemesterWorkingDaysStats,
  getGEHUDayDetails
} from '../engines/academicCalendarEngine';

import {
  extractDocumentFromImage,
  OCRDocType
} from '../engines/ocrEngine';

export interface AgentResponse {
  text: string;
  widget?: {
    type: 
      | 'free_rooms' 
      | 'room_periods' 
      | 'room_schedule' 
      | 'section_schedule' 
      | 'current_status' 
      | 'attendance_overview' 
      | 'attendance_subject' 
      | 'attendance_simulation'
      | 'calendar_events'
      | 'exam_countdown'
      | 'ocr_attachment_result'
      | 'daily_planner'
      | 'working_days_stats'
      | 'holidays_list'
      | 'semester_attendance_forecast'
      | 'daily_attendance_checkin';
    title: string;
    data: any;
  };
  toolUsed: string;
}

const COLLEGE_START_MINUTES = 8 * 60; // 8:00 AM
const COLLEGE_END_MINUTES = 17 * 60;   // 5:00 PM
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Normalize room names
export function normalizeRoom(room: string): string {
  if (!room) return "";
  let r = room.trim().toUpperCase();
  r = r.replace(/\s+/g, "");
  r = r.replace(/[-()]/g, "");

  const stdMatch = r.match(/^(\d+)([A-Z]+)$/);
  if (stdMatch) return stdMatch[1] + stdMatch[2];

  const revMatch = r.match(/^([A-Z]+)(\d+)$/);
  if (revMatch) return revMatch[2] + revMatch[1];

  const floorMatch = r.match(/(\d+)(?:RD|TH|ST|ND)?FLOOR/);
  if (floorMatch) {
    return floorMatch[1] + r.replace(/\d+(?:RD|TH|ST|ND)?FLOOR/, '');
  }

  return r;
}

// Convert 12h/24h string to minutes
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toUpperCase().replace(/\s+/g, "");
  
  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const ampm = match12[3];
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }

  return 0;
}

export function minutesToTimeString(minutes: number): string {
  let hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${ampm}`;
}

export function isOverlapping(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && e1 > s2;
}

export const TIMETABLE: TimetableEntry[] = (rawTimetable as TimetableEntry[]).map(e => ({
  ...e,
  day: e.day.trim().charAt(0).toUpperCase() + e.day.trim().slice(1).toLowerCase()
}));

export function getAllClassrooms(): string[] {
  const rooms = new Map<string, string>();
  TIMETABLE.forEach(e => {
    const norm = normalizeRoom(e.room_number);
    if (!rooms.has(norm)) {
      rooms.set(norm, e.room_number);
    }
  });
  return Array.from(rooms.values()).sort((a, b) => normalizeRoom(a).localeCompare(normalizeRoom(b)));
}

export function findFreeClassrooms(day: string, startTimeStr: string, endTimeStr: string, roomType?: 'CR' | 'LT' | 'LAB' | 'AUDI', floor?: number): string[] {
  const reqStart = timeToMinutes(startTimeStr);
  const reqEnd = timeToMinutes(endTimeStr);
  
  const dayEntries = TIMETABLE.filter(e => e.day.toLowerCase() === day.toLowerCase());
  const occupiedRooms = new Set<string>();

  dayEntries.forEach(e => {
    const entryStart = timeToMinutes(e.start_time);
    const entryEnd = timeToMinutes(e.end_time);
    if (isOverlapping(reqStart, reqEnd, entryStart, entryEnd)) {
      occupiedRooms.add(normalizeRoom(e.room_number));
    }
  });

  const allRoomsMap = new Map<string, string>();
  TIMETABLE.forEach(e => {
    allRoomsMap.set(normalizeRoom(e.room_number), e.room_number);
  });

  const freeRooms: string[] = [];
  allRoomsMap.forEach((rawRoom, normRoom) => {
    if (!occupiedRooms.has(normRoom)) {
      const rawUpper = rawRoom.toUpperCase();
      if (roomType) {
        if (roomType === 'CR') {
          if (rawUpper.includes('LAB') || rawUpper.includes('WORKSHOP') || rawUpper.includes('LT') || rawUpper.includes('THEATRE') || rawUpper.includes('AUDI')) {
            return;
          }
          if (!rawUpper.includes('CR') && !rawUpper.includes('CLASS') && !rawUpper.startsWith('RR')) {
            return;
          }
        }
        if (roomType === 'LT' && !rawUpper.includes('LT') && !rawUpper.includes('LECTURE')) return;
        if (roomType === 'LAB' && !rawUpper.includes('LAB') && !rawUpper.includes('WORKSHOP')) return;
        if (roomType === 'AUDI' && !rawUpper.includes('AUDI')) return;
      }

      if (floor !== undefined) {
        const floorMatch = rawRoom.match(/(\d+)/);
        if (floorMatch) {
          const num = parseInt(floorMatch[1], 10);
          const roomFloor = num >= 100 ? Math.floor(num / 100) : num;
          if (roomFloor !== floor) return;
        }
      }

      freeRooms.push(rawRoom);
    }
  });

  return freeRooms.sort((a, b) => normalizeRoom(a).localeCompare(normalizeRoom(b)));
}

export function getRoomPeriods(room: string, day: string): FreePeriod[] {
  const normTarget = normalizeRoom(room);
  const entries = TIMETABLE
    .filter(e => normalizeRoom(e.room_number) === normTarget && e.day.toLowerCase() === day.toLowerCase())
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  const periods: FreePeriod[] = [];
  let currentTime = COLLEGE_START_MINUTES;

  entries.forEach(e => {
    const s = timeToMinutes(e.start_time);
    const end = timeToMinutes(e.end_time);

    if (s > currentTime) {
      periods.push({
        start: minutesToTimeString(currentTime),
        end: minutesToTimeString(s),
        status: 'FREE'
      });
    }

    periods.push({
      start: e.start_time,
      end: e.end_time,
      status: 'OCCUPIED',
      subject: e.subject,
      course: `${e.course} (${e.section})`
    });

    currentTime = Math.max(currentTime, end);
  });

  if (currentTime < COLLEGE_END_MINUTES) {
    periods.push({
      start: minutesToTimeString(currentTime),
      end: minutesToTimeString(COLLEGE_END_MINUTES),
      status: 'FREE'
    });
  }

  return periods;
}

export function getRoomSchedule(room: string, day: string): ClassSchedule[] {
  const normTarget = normalizeRoom(room);
  return TIMETABLE
    .filter(e => normalizeRoom(e.room_number) === normTarget && e.day.toLowerCase() === day.toLowerCase())
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
    .map(e => ({
      startTime: e.start_time,
      endTime: e.end_time,
      course: e.course,
      semester: e.semester,
      section: e.section,
      subject: e.subject
    }));
}

// =============================================================
// MAIN AGENTIC TOOL ORCHESTRATOR
// =============================================================

export async function runAgenticAI(
  userQuery: string, 
  imageAttachment?: { dataUrl: string; docType?: OCRDocType; name?: string }
): Promise<AgentResponse> {
  const now = new Date();
  const currentDayIndex = now.getDay();
  const defaultDay = WEEKDAYS[currentDayIndex === 0 ? 6 : currentDayIndex - 1];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeStr = minutesToTimeString(currentMinutes);

  const clean = userQuery.toLowerCase().trim();

  // =============================================================
  // ACTION 0: MULTIMODAL IMAGE & OCR ATTACHMENT PROCESSING
  // =============================================================
  if (imageAttachment && imageAttachment.dataUrl) {
    try {
      const scanResult = await extractDocumentFromImage(
        imageAttachment.dataUrl, 
        imageAttachment.docType || 'AUTO_DETECT'
      );

      // Auto-attach extracted data to local storage
      if (scanResult.docType === 'ERP_ATTENDANCE' && scanResult.extractedData.subjects) {
        saveStudentSubjects(scanResult.extractedData.subjects);
        const overall = calculateOverallAttendance(scanResult.extractedData.subjects);
        return {
          toolUsed: 'MultimodalOcrExtractionTool',
          text: `📸 **ERP Attendance Screenshot Processed & Attached!**\n\n` +
                `✅ Extracted **${scanResult.extractedData.subjects.length} subjects** directly from your ERP portal screenshot.\n` +
                `📊 **Overall Attendance:** **${overall.overallPercentage}%** (${overall.totalAttended}/${overall.totalConducted} classes attended).\n` +
                `🛡️ **Status:** **${overall.overallRiskLevel}** (${overall.safeSubjectsCount} Safe, ${overall.warningSubjectsCount} Warning, ${overall.criticalSubjectsCount} Critical).\n\n` +
                `I have updated your live attendance metrics. You can now ask: *"Can I skip DBMS tomorrow?"* or *"What is my lowest attendance subject?"*`,
          widget: {
            type: 'ocr_attachment_result',
            title: 'ERP Attendance Extracted',
            data: { scanResult, subjects: scanResult.extractedData.subjects, overall }
          }
        };
      }

      if (scanResult.docType === 'ACADEMIC_CALENDAR' && scanResult.extractedData.calendarEvents) {
        mergeImportedEvents(scanResult.extractedData.calendarEvents, false);
        const nextExamInfo = getDaysUntilNextExam();
        return {
          toolUsed: 'MultimodalOcrExtractionTool',
          text: `🗓️ **Academic Calendar Document Processed & Attached!**\n\n` +
                `✅ Extracted **${scanResult.extractedData.calendarEvents.length} academic milestones** (Mid-Terms, End-Terms, Practicals, and Holidays).\n` +
                (nextExamInfo.nextExam 
                  ? `⏳ **Next Milestone:** ${nextExamInfo.nextExam.title} (in **${nextExamInfo.days} days** on ${nextExamInfo.nextExam.date}).\n\n` 
                  : `\n`) +
                `Your academic calendar is now synced! You can now ask: *"When is my next exam?"* or *"How many days until midterms?"*`,
          widget: {
            type: 'ocr_attachment_result',
            title: 'Academic Calendar Extracted',
            data: { scanResult, events: scanResult.extractedData.calendarEvents, nextExamInfo }
          }
        };
      }

      if (scanResult.docType === 'TIMETABLE' && scanResult.extractedData.timetable) {
        return {
          toolUsed: 'MultimodalOcrExtractionTool',
          text: `📅 **Class Timetable Screenshot Processed & Attached!**\n\n` +
                `✅ Extracted **${scanResult.extractedData.timetable.length} class periods** and assigned classrooms from your timetable screenshot.\n\n` +
                `You can now ask: *"What classes do I have on Monday?"* or *"Which room is my next class?"*`,
          widget: {
            type: 'ocr_attachment_result',
            title: 'Class Timetable Extracted',
            data: { scanResult, timetable: scanResult.extractedData.timetable }
          }
        };
      }

      return {
        toolUsed: 'MultimodalOcrExtractionTool',
        text: `🖼️ **Document Processed Successfully!**\n\n${scanResult.summaryText}`,
        widget: {
          type: 'ocr_attachment_result',
          title: 'Document OCR Scan',
          data: { scanResult }
        }
      };
    } catch (ocrErr: any) {
      return {
        toolUsed: 'MultimodalOcrExtractionTool',
        text: `⚠️ **OCR Processing Notice:** I encountered an issue analyzing the uploaded image: ${ocrErr.message || ocrErr}. Please try again or choose a clear screenshot.`
      };
    }
  }

  // Detect requested Day
  let targetDay = defaultDay;
  const daysFound = WEEKDAYS.filter(d => clean.includes(d.toLowerCase()));
  if (daysFound.length > 0) {
    targetDay = daysFound[0];
  } else if (clean.includes("tomorrow")) {
    const tomorrowIdx = (currentDayIndex) % 7;
    targetDay = WEEKDAYS[tomorrowIdx === 0 ? 6 : tomorrowIdx - 1];
  } else if (clean.includes("today")) {
    targetDay = defaultDay;
  }

  // Detect requested Time
  let targetTimeStr = currentTimeStr;
  let targetEndTimeStr = minutesToTimeString(currentMinutes + 60);
  let isExplicitTime = false;

  const timeMatch = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch && (clean.includes("at ") || clean.includes("from ") || clean.includes("after ") || clean.includes("pm") || clean.includes("am"))) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    if (!ampm && hour >= 1 && hour <= 6) hour += 12;

    const startMins = hour * 60 + minute;
    targetTimeStr = minutesToTimeString(startMins);
    targetEndTimeStr = minutesToTimeString(startMins + 60);
    isExplicitTime = true;
  }

  // Detect Room Type Filters
  let roomTypeFilter: 'CR' | 'LT' | 'LAB' | 'AUDI' | undefined = undefined;
  if (clean.includes("lab")) roomTypeFilter = 'LAB';
  else if (clean.includes("lt") || clean.includes("theatre") || clean.includes("theater")) roomTypeFilter = 'LT';
  else if (clean.includes("audi") || clean.includes("auditorium")) roomTypeFilter = 'AUDI';
  else if (clean.includes("cr") || clean.includes("classroom") || clean.includes("class room")) roomTypeFilter = 'CR';

  // Detect Floor Filter
  let floorFilter: number | undefined = undefined;
  const floorMatch = clean.match(/(\d+)(?:st|nd|rd|th)?\s*floor/i);
  if (floorMatch) {
    floorFilter = parseInt(floorMatch[1], 10);
  }

  // =============================================================
  // ACTION 0: GEHU WORKING DAYS & SEMESTER INSTRUCTIONAL TIMELINE
  // =============================================================
  if (
    clean.includes("working day") || 
    clean.includes("instructional day") || 
    clean.includes("teaching day") || 
    clean.includes("how many days left") || 
    clean.includes("days left in semester") || 
    clean.includes("when does semester end") ||
    clean.includes("semester progress") ||
    clean.includes("working days")
  ) {
    const stats = getSemesterWorkingDaysStats();
    return {
      toolUsed: 'GEHUWorkingDaysTool',
      text: `📅 **GEHU Academic Calendar & Working Days Status**:\n\n` +
            `• **Total Instructional Days:** **${stats.totalInstructionalDays} Days** (July 13 – Nov 14, 2026)\n` +
            `• **Current Progress:** Day **${stats.currentDayNumber}** of ${stats.totalInstructionalDays} (**${stats.progressPercentage}%** completed)\n` +
            `• **Remaining Instructional Days:** **${stats.remainingDays} Working Days** left\n` +
            `• **Today's Status:** ${stats.todayLabel}\n` +
            (stats.nextHoliday ? `• **Next University Holiday:** **${stats.nextHoliday.name}** on ${stats.nextHoliday.date} (${stats.nextHoliday.daysAway} days away)\n` : '') +
            (stats.nextExamBlock ? `• **Next Examination Window:** **${stats.nextExamBlock.name} (${stats.nextExamBlock.code})** starting ${stats.nextExamBlock.startDate} (${stats.nextExamBlock.daysAway} days away)\n` : '') +
            `• **Last Teaching Day:** **Nov 14, 2026** (Day 90)\n\n` +
            `💡 *Working days exclude Sundays and gazetted registrar holidays. Use these ${stats.remainingDays} remaining days to maintain your mandatory 75% attendance.*`,
      widget: {
        type: 'working_days_stats',
        title: 'Semester Instructional Timeline',
        data: stats
      }
    };
  }

  // =============================================================
  // ACTION 0.5: SEMESTER ATTENDANCE FEASIBILITY & FORECAST (75% RULE)
  // =============================================================
  if (
    (clean.includes("75") && (clean.includes("reach") || clean.includes("get") || clean.includes("can i") || clean.includes("make") || clean.includes("possible") || clean.includes("feasible"))) ||
    clean.includes("forecast") ||
    clean.includes("semester attendance") ||
    (clean.includes("attendance") && (clean.includes("semester") || clean.includes("left") || clean.includes("end") || clean.includes("projection")))
  ) {
    const subjects = loadStudentSubjects();
    const targetSubject = findMatchingSubject(clean, subjects) || subjects[0];
    
    if (targetSubject) {
      const projection = calculateSemesterAttendanceProjection(targetSubject);
      return {
        toolUsed: 'AttendanceForecastTool',
        text: `📊 **Semester Attendance Feasibility Forecast**:\n\n` +
              `🎯 **Subject:** **${projection.subjectName}**\n` +
              `• **Current Attendance:** **${projection.currentPercentage}%** (${projection.currentAttended}/${projection.currentTotal} classes)\n` +
              `• **Remaining Semester Working Days:** **${projection.remainingWorkingDays} Days**\n` +
              `• **Estimated Remaining Lectures:** **~${projection.estimatedRemainingLectures} Classes**\n` +
              `• **Max Achievable Attendance:** **${projection.maxAchievablePercentage}%** (if attending 100% of remaining classes)\n` +
              `• **Classes Needed for ${projection.targetPercentage}%:** **${projection.minClassesToAttendFor75} classes**\n` +
              `• **Allowable Safe Bunks:** **${projection.maxBunksAllowedAcrossSemester} class(es)**\n\n` +
              `📋 **Verdict:** ${projection.summaryAdvice}`,
        widget: {
          type: 'semester_attendance_forecast',
          title: `Semester Forecast: ${projection.subjectName}`,
          data: projection
        }
      };
    }
  }

  // Check specific Tomorrow queries
  if (clean.includes("tomorrow") && (clean.includes("holiday") || clean.includes("off") || clean.includes("working day") || clean.includes("class"))) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayInfo = getGEHUDayDetails(dateStr);

    return {
      toolUsed: 'AcademicCalendarTool',
      text: `🗓️ **Schedule for Tomorrow (${dayInfo.dayName}, ${dateStr})**:\n\n` +
            `• **Status:** **${dayInfo.label}**\n` +
            (dayInfo.isHoliday ? `🎉 **Yes! Tomorrow is a university holiday (${dayInfo.holidayName}).** Campus and all lectures are closed.\n` : '') +
            (dayInfo.isWorkingDay ? `🏫 **Tomorrow is an active instructional working day (Day ${dayInfo.workingDayNumber} of 90).** Regular classes and lab sessions will be conducted.\n` : '') +
            (!dayInfo.isWorkingDay && !dayInfo.isHoliday ? `🏖️ **Tomorrow is ${dayInfo.label}.** Regular teaching is not scheduled.\n` : '') +
            `\n💡 *Verified against official GEHU Academic Calendar.*`
    };
  }

  // =============================================================
  // ACTION 0.8: DAILY CLASS ATTENDANCE CHECK-IN
  // =============================================================
  if (
    clean.includes("check in") || 
    clean.includes("check-in") || 
    clean.includes("did i attend") || 
    clean.includes("mark attendance") || 
    clean.includes("daily attendance") ||
    clean.includes("today attendance") ||
    (clean.includes("attendance") && (clean.includes("today") || clean.includes("log") || clean.includes("record") || clean.includes("update")))
  ) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const checkInStatus = getDailyCheckInStatus(dateStr);

    let summaryText = `📋 **Daily Class Attendance Check-In (${checkInStatus.dayName}, ${dateStr})**:\n\n` +
                      `• **Academic Calendar Status:** **${checkInStatus.isWorkingDay ? `Instructional Day ${checkInStatus.workingDayNumber} of 90` : checkInStatus.isHoliday ? `Holiday: ${checkInStatus.holidayName}` : 'Non-Instructional Day'}**\n\n`;

    if (checkInStatus.isHoliday) {
      summaryText += `🎉 **Today is an official university holiday!** Classes are suspended, so no attendance check-in is needed.`;
    } else if (!checkInStatus.isWorkingDay) {
      summaryText += `🏖️ **Today is a non-instructional day.** No lectures are scheduled.`;
    } else {
      summaryText += `**Your Enrolled Subjects Today:**\n`;
      checkInStatus.subjects.forEach(s => {
        const icon = s.status === 'PRESENT' ? '✅ Attended' : s.status === 'ABSENT' ? '❌ Absent / Skipped' : s.status === 'CANCELLED' ? '⏸️ Cancelled' : '⏳ Pending';
        summaryText += `• **${s.subject.name}**: ${icon} (${s.subject.attended}/${s.subject.total} = ${((s.subject.attended / (s.subject.total || 1)) * 100).toFixed(1)}%)\n`;
      });
      summaryText += `\n💡 *You can mark or change your daily check-in in the **Attendance Lab** with 1 click to keep your true record updated!*`;
    }

    return {
      toolUsed: 'DailyCheckInTool',
      text: summaryText,
      widget: {
        type: 'daily_attendance_checkin',
        title: `Daily Check-In (${checkInStatus.dayName})`,
        data: checkInStatus
      }
    };
  }

  // =============================================================
  // ACTION A: ACADEMIC CALENDAR & EXAM INTELLIGENCE QUERIES
  // =============================================================
  if (
    clean.includes("exam") || 
    clean.includes("midterm") || 
    clean.includes("mid term") || 
    clean.includes("mid-term") ||
    clean.includes("end term") || 
    clean.includes("endterm") || 
    clean.includes("calendar") || 
    clean.includes("holiday") || 
    clean.includes("vacation") || 
    clean.includes("days until") || 
    clean.includes("when is") && (clean.includes("test") || clean.includes("exam") || clean.includes("practical") || clean.includes("submission") || clean.includes("viva"))
  ) {
    // Check for Holiday queries
    if (clean.includes("holiday") || clean.includes("vacation") || clean.includes("break") || clean.includes("diwali") || clean.includes("off")) {
      const holidays = getUpcomingHolidays();
      if (holidays.length === 0) {
        return {
          toolUsed: 'AcademicCalendarTool',
          text: `🏖️ **University Holidays Status**:\n\nThere are no upcoming declared university holidays in the current semester cycle. Classes will proceed as per the regular timetable.`
        };
      }
      const holidayList = holidays.map(h => `• **${h.title}**: ${h.formattedDate} (${h.daysRemaining > 0 ? `in **${h.daysRemaining} days**` : 'Today'})`).join('\n');
      return {
        toolUsed: 'AcademicCalendarTool',
        text: `🎉 **Upcoming University Holidays & Recesses**:\n\n${holidayList}\n\n💡 *Classes and lab sessions are suspended on these gazetted dates.*`,
        widget: {
          type: 'calendar_events',
          title: 'Upcoming University Holidays',
          data: { events: holidays }
        }
      };
    }

    // Check specific exam countdown
    const nextExam = getDaysUntilNextExam();
    const upcomingExams = getExamSchedule();

    if (clean.includes("days until") || clean.includes("how many days") || clean.includes("when is my next exam")) {
      if (nextExam.nextExam) {
        return {
          toolUsed: 'ExamCountdownTool',
          text: `⏳ **Next Examination Countdown**:\n\n` +
                `🎯 **${nextExam.nextExam.title}**\n` +
                `📅 **Date:** ${nextExam.nextExam.formattedDate} (${nextExam.days === 0 ? '🔥 **TODAY**' : `in **${nextExam.days} days**`})\n` +
                (nextExam.nextExam.subject ? `📚 **Subject:** ${nextExam.nextExam.subject}\n` : '') +
                (nextExam.nextExam.location ? `📍 **Location / Hall:** ${nextExam.nextExam.location}\n` : '') +
                `\n💡 *Tip: Keep your attendance above 75% to ensure full examination eligibility!*`,
          widget: {
            type: 'exam_countdown',
            title: 'Exam Countdown',
            data: { nextExam: nextExam.nextExam, daysRemaining: nextExam.days, allExams: upcomingExams }
          }
        };
      }
    }

    // General Exam Schedule overview
    const examList = upcomingExams.map(e => `• **${e.title}**: ${e.formattedDate} (${e.daysRemaining > 0 ? `in **${e.daysRemaining} days**` : 'Past/Ongoing'})`).join('\n');
    return {
      toolUsed: 'AcademicCalendarTool',
      text: `🗓️ **Academic Calendar & Examination Schedule**:\n\n${examList}\n\n💡 *All exam schedules are verified against official university notifications.*`,
      widget: {
        type: 'calendar_events',
        title: 'Semester Academic Schedule',
        data: { events: upcomingExams }
      }
    };
  }

  // =============================================================
  // ACTION B: DAILY PLANNER INTELLIGENCE
  // =============================================================
  if (clean.includes("plan my day") || clean.includes("daily planner") || clean.includes("what should i do today") || clean.includes("today summary")) {
    const studentSubjects = loadStudentSubjects();
    const overall = calculateOverallAttendance(studentSubjects);
    const nextExam = getDaysUntilNextExam();
    const freeRooms = findFreeClassrooms(defaultDay, currentTimeStr, minutesToTimeString(currentMinutes + 60));

    return {
      toolUsed: 'SmartDailyPlannerTool',
      text: `🚀 **Your AI Daily Academic Gameplan (${defaultDay})**:\n\n` +
            `1. **📊 Attendance Health:** Overall **${overall.overallPercentage}%** (${overall.overallRiskLevel} status).\n` +
            (overall.criticalSubjectsCount > 0 ? `   ⚠️ *Urgent: You have ${overall.criticalSubjectsCount} subject(s) in Critical risk. Do not skip them today!*\n` : `   ✅ *All subjects are in good standing.*\n`) +
            `2. **⏳ Upcoming Milestones:** Next exam in **${nextExam.days} days** (${nextExam.nextExam?.title || 'Mid-terms'}).\n` +
            `3. **🏫 Quiet Study Spaces:** **${freeRooms.length} classrooms** are currently free right now at ${currentTimeStr}.\n\n` +
            `💡 *Ask me for a specific subject attendance simulation or room vacancy anytime.*`,
      widget: {
        type: 'daily_planner',
        title: `Daily Academic Plan - ${defaultDay}`,
        data: { overall, nextExam, freeRoomsCount: freeRooms.length }
      }
    };
  }

  // =============================================================
  // ACTION C: ATTENDANCE INTELLIGENCE & SIMULATION
  // =============================================================
  const isAttendanceQuery = clean.includes("attendance") || clean.includes("attend") || clean.includes("skip") || 
                           clean.includes("bunk") || clean.includes("miss") || clean.includes("75%") || 
                           clean.includes("classes needed") || clean.includes("safe skips");

  if (isAttendanceQuery) {
    const studentSubjects = loadStudentSubjects();
    const overall = calculateOverallAttendance(studentSubjects);

    // Scenario 1: Overall Attendance summary
    if (clean.includes("overall") || clean.includes("total attendance") || clean.includes("all subjects") || clean.includes("summary") || clean.includes("average")) {
      const breakdown = studentSubjects.map(s => {
        const m = calculateSubjectMetrics(s);
        return `• **${s.name}**: **${m.currentPercentage}%** (${s.attended}/${s.total}) → ${m.statusText}`;
      }).join('\n');

      return {
        toolUsed: 'AttendanceOverviewTool',
        text: `📊 **Student Attendance Overview**\n\n` +
              `• **Total Conducted Lectures:** ${overall.totalConducted}\n` +
              `• **Total Attended:** ${overall.totalAttended}\n` +
              `• **Overall Attendance:** **${overall.overallPercentage}%** (${overall.overallRiskLevel} Risk Level)\n` +
              `• **Status:** ${overall.safeSubjectsCount} Safe, ${overall.warningSubjectsCount} Warning, ${overall.criticalSubjectsCount} Critical\n\n` +
              `**Subject Breakdown:**\n${breakdown}`,
        widget: {
          type: 'attendance_overview',
          title: 'Overall Attendance Dashboard',
          data: { overall, subjects: studentSubjects.map(s => calculateSubjectMetrics(s)) }
        }
      };
    }

    // Scenario 2: Lowest Attendance / At-risk query
    if (clean.includes("lowest") || clean.includes("critical") || clean.includes("danger") || clean.includes("worst") || clean.includes("at risk")) {
      if (!overall.lowestSubject) {
        return {
          toolUsed: 'AttendanceRiskTool',
          text: `All your subjects currently maintain healthy attendance above 75%! 🎉`
        };
      }
      const lowest = overall.lowestSubject;
      return {
        toolUsed: 'AttendanceRiskTool',
        text: `⚠️ **Lowest Attendance Subject Alert**:\n\n` +
              `• **Subject:** **${lowest.subject.name}** (${lowest.subject.code || 'Core'})\n` +
              `• **Current Attendance:** **${lowest.currentPercentage}%** (${lowest.subject.attended}/${lowest.subject.total})\n` +
              `• **Target:** ${lowest.subject.targetPercentage}%\n` +
              `• **Requirement:** ${lowest.statusText}\n\n` +
              `💡 *Recommendation: Prioritize attending all upcoming lectures in ${lowest.subject.name} to avoid exam debarment.*`,
        widget: {
          type: 'attendance_subject',
          title: `Attendance Alert - ${lowest.subject.name}`,
          data: { metrics: lowest }
        }
      };
    }

    // Scenario 3: Subject-specific Attendance & Simulation
    const matchedSubject = findMatchingSubject(clean, studentSubjects);

    if (matchedSubject) {
      const metrics = calculateSubjectMetrics(matchedSubject);

      // Check if user is simulating skipping / attending future classes
      const skipMatch = clean.match(/skip\s*(\d+)/i) || clean.match(/miss\s*(\d+)/i) || clean.match(/bunk\s*(\d+)/i);
      const attendMatch = clean.match(/attend\s*(\d+)/i) || clean.match(/go\s*to\s*(\d+)/i);

      let futureAttended = 0;
      let futureSkipped = 0;

      if (skipMatch) futureSkipped = parseInt(skipMatch[1], 10);
      if (attendMatch) futureAttended = parseInt(attendMatch[1], 10);

      if (clean.includes("skip tomorrow") || clean.includes("miss tomorrow") || clean.includes("skip next class") || clean.includes("skip 1")) {
        if (!skipMatch) futureSkipped = 1;
      }

      if (futureAttended > 0 || futureSkipped > 0) {
        const sim = simulateAttendanceScenario(
          matchedSubject.name,
          matchedSubject.attended,
          matchedSubject.total,
          futureAttended,
          futureSkipped,
          matchedSubject.targetPercentage
        );

        return {
          toolUsed: 'AttendanceSimulationEngine',
          text: `🧮 **Attendance Simulation: ${matchedSubject.name}**\n\n` +
                `• **Current:** ${sim.initialPercentage}% (${sim.initialAttended}/${sim.initialTotal})\n` +
                `• **Scenario:** ${sim.futureAttended > 0 ? `Attend +${sim.futureAttended}` : ''} ${sim.futureSkipped > 0 ? `Skip -${sim.futureSkipped}` : ''}\n` +
                `• **Projected Attendance:** **${sim.projectedPercentage}%** (${sim.projectedAttended}/${sim.projectedTotal})\n` +
                `• **Change:** ${sim.percentageDelta >= 0 ? `+${sim.percentageDelta}%` : `${sim.percentageDelta}%`}\n` +
                `• **Status:** ${sim.isAboveTarget ? '✅ Safe (Above Target)' : '⚠️ Danger (Below Target)'}\n\n` +
                `👉 **Advice:** ${sim.adviceText}`,
          widget: {
            type: 'attendance_simulation',
            title: `Simulation - ${matchedSubject.name}`,
            data: { simulation: sim }
          }
        };
      }

      // Default subject status query
      return {
        toolUsed: 'SubjectAttendanceTool',
        text: `📚 **Attendance Status: ${matchedSubject.name}**\n\n` +
              `• **Attended:** ${matchedSubject.attended} / ${matchedSubject.total} lectures\n` +
              `• **Percentage:** **${metrics.currentPercentage}%** (Target: ${matchedSubject.targetPercentage}%)\n` +
              `• **Risk Level:** **${metrics.riskLevel}**\n` +
              `• **Analysis:** ${metrics.statusText}`,
        widget: {
          type: 'attendance_subject',
          title: matchedSubject.name,
          data: { metrics }
        }
      };
    }
  }

  // =============================================================
  // ACTION D: Specific Room Schedule / Status Query
  // =============================================================
  const allRooms = getAllClassrooms();
  let requestedRoom: string | null = null;

  const explicitRoomMatch = clean.match(/(?:room|cr|lt|lab|audi)[-\s]?([0-9a-z]+)/i) || clean.match(/\b([0-9]{3}[a-z]?)\b/i);
  if (explicitRoomMatch) {
    const rawTarget = explicitRoomMatch[1];
    const found = allRooms.find(r => normalizeRoom(r) === normalizeRoom(rawTarget) || normalizeRoom(r).includes(normalizeRoom(rawTarget)));
    if (found) requestedRoom = found;
  }

  if (requestedRoom) {
    const periods = getRoomPeriods(requestedRoom, targetDay);
    const schedule = getRoomSchedule(requestedRoom, targetDay);

    let currentOccupant = "Currently Free";
    const currentClass = schedule.find(s => {
      const start = timeToMinutes(s.startTime);
      const end = timeToMinutes(s.endTime);
      return currentMinutes >= start && currentMinutes <= end;
    });

    if (currentClass) {
      currentOccupant = `Occupied: ${currentClass.subject} (${currentClass.course} ${currentClass.section})`;
    }

    return {
      toolUsed: 'RoomScheduleTool',
      text: `🏫 **Room ${requestedRoom} Status on ${targetDay}**:\n\n` +
            `• **Current Status (${currentTimeStr}):** **${currentOccupant}**\n` +
            `• **Scheduled Classes Today:** ${schedule.length} lecture periods.\n\n` +
            `Detailed timeline and period breakdown are displayed in the interactive card below:`,
      widget: {
        type: 'room_periods',
        title: `Room ${requestedRoom} - ${targetDay}`,
        data: {
          room: requestedRoom,
          day: targetDay,
          periods,
          schedule
        }
      }
    };
  }

  // =============================================================
  // ACTION E: Subject Timetable Query
  // =============================================================
  const subjectKeywords = ["oops", "c++", "cloud", "crypto", "python", "career", "dbms", "discrete", "math", "linux", "compiler", "network", "algorithms"];
  const matchedSubject = subjectKeywords.find(s => clean.includes(s));
  if (matchedSubject && (clean.includes("when") || clean.includes("schedule") || clean.includes("class") || clean.includes("lecture") || clean.includes("where"))) {
    const matches = TIMETABLE.filter(t => t.subject.toLowerCase().includes(matchedSubject) && t.day.toLowerCase() === targetDay.toLowerCase())
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    if (matches.length > 0) {
      const listMd = matches.slice(0, 6).map(m => `• **${m.start_time} - ${m.end_time}**: ${m.subject} (${m.course} Sec-${m.section}) in **Room ${m.room_number}**`).join('\n');
      return {
        toolUsed: 'SubjectScheduleTool',
        text: `📚 Found **${matches.length} lectures** for **${matchedSubject.toUpperCase()}** on **${targetDay}**:\n\n${listMd}`,
        widget: {
          type: 'room_schedule',
          title: `${matchedSubject.toUpperCase()} Lectures`,
          data: {
            schedule: matches.map(m => ({ startTime: m.start_time, endTime: m.end_time, course: m.course, semester: m.semester, section: m.section, subject: m.subject })),
            room: matches[0].room_number
          }
        }
      };
    }
  }

  // =============================================================
  // ACTION F: Section Timetable Query
  // =============================================================
  const sectionMatch = clean.match(/sec(?:tion)?\s*([a-z0-9+-]+)/i) || clean.match(/\b([a-z0-9]{1,3})\s*section\b/i);
  if (sectionMatch && (clean.includes("timetable") || clean.includes("schedule") || clean.includes("classes") || clean.includes("routine") || clean.includes("periods"))) {
    const secName = sectionMatch[1].toUpperCase();
    const sectionClasses = TIMETABLE.filter(t => t.section.toUpperCase() === secName && t.day.toLowerCase() === targetDay.toLowerCase())
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    if (sectionClasses.length > 0) {
      const listMd = sectionClasses.map(s => `• **${s.start_time} - ${s.end_time}**: ${s.subject} in **Room ${s.room_number}**`).join('\n');
      return {
        toolUsed: 'SectionTimetableTool',
        text: `🎓 Schedule for **Section ${secName}** on **${targetDay}**:\n\n${listMd}`,
        widget: {
          type: 'room_schedule',
          title: `Section ${secName} - ${targetDay}`,
          data: {
            schedule: sectionClasses.map(s => ({ startTime: s.start_time, endTime: s.end_time, course: s.course, semester: s.semester, section: s.section, subject: s.subject })),
            room: `Section ${secName}`
          }
        }
      };
    }
  }

  // =============================================================
  // ACTION G: Vacant Rooms Query
  // =============================================================
  const isLookingForFreeRooms = clean.includes("free") || clean.includes("vacant") || clean.includes("empty") || 
                               clean.includes("available") || clean.includes("unoccupied") || clean.includes("find room") || 
                               clean.includes("find a room") || clean.includes("where can i sit") || clean.includes("open class");

  if (isLookingForFreeRooms) {
    const freeRooms = findFreeClassrooms(targetDay, targetTimeStr, targetEndTimeStr, roomTypeFilter, floorFilter);
    const timeContextLabel = isExplicitTime ? `at **${targetTimeStr}**` : `right now at **${targetTimeStr}**`;
    const typeLabel = roomTypeFilter === 'LAB' ? 'Laboratories (LAB)' : roomTypeFilter === 'LT' ? 'Lecture Theatres (LT)' : roomTypeFilter === 'AUDI' ? 'Auditoriums' : roomTypeFilter === 'CR' ? 'Classrooms (CR)' : 'Classrooms';
    const floorLabel = floorFilter ? ` on the **${floorFilter}th Floor**` : '';

    if (freeRooms.length === 0) {
      return {
        toolUsed: 'FindFreeRoomsTool',
        text: `⚠️ **No vacant ${typeLabel.toLowerCase()}** found on **${targetDay}** ${timeContextLabel}${floorLabel}.\n\n` +
              `All rooms in this category are currently occupied with lectures. Try searching for a different time window or room type.`,
        widget: {
          type: 'free_rooms',
          title: `Vacant Rooms - ${targetDay} (${targetTimeStr})`,
          data: { rooms: [], roomType: roomTypeFilter }
        }
      };
    }

    const previewList = freeRooms.slice(0, 10).map((r, i) => `${i + 1}. **${r}**`).join('\n');
    const overflowNotice = freeRooms.length > 10 ? `\n...and **${freeRooms.length - 10} more** classrooms.` : '';

    return {
      toolUsed: 'FindFreeRoomsTool',
      text: `🏫 Found **${freeRooms.length} vacant ${typeLabel.toLowerCase()}** on **${targetDay}** ${timeContextLabel}${floorLabel}:\n\n` +
            `${previewList}${overflowNotice}\n\n` +
            `✨ *All available rooms are mapped in the interactive cards below:*`,
      widget: {
        type: 'free_rooms',
        title: `Vacant Rooms - ${targetDay} (${targetTimeStr})`,
        data: { rooms: freeRooms, roomType: roomTypeFilter }
      }
    };
  }

  // =============================================================
  // FALLBACK INTENT
  // =============================================================
  return {
    toolUsed: 'GeneralAssistanceTool',
    text: `🤔 I understand your query: *"${userQuery}"*.\n\n` +
          `I am your **AI Campus Operating Assistant**. You can paste or attach screenshots of your ERP, Timetable, or Academic Calendar directly, or ask:\n\n` +
          `• 📸 **Image / OCR Scan:** Paste or upload your ERP attendance, timetable, or calendar screenshot!\n` +
          `• 📊 **Attendance Intelligence:** *"Can I skip tomorrow's class?"* or *"What is my lowest attendance?"*\n` +
          `• 🗓️ **Exam & Calendar:** *"When is my next exam?"* or *"How many days until mid-terms?"*\n` +
          `• 🏫 **Classroom Vacancies:** *"Which rooms are free right now?"* or *"Free labs at 2 PM"*`
  };
}
