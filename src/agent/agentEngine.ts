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

export interface AgentResponse {
  text: string;
  widget?: {
    type: 'free_rooms' | 'room_periods' | 'room_schedule' | 'section_schedule' | 'current_status';
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
        if (roomType === 'CR' && !rawUpper.includes('CR') && !rawUpper.includes('CLASS')) return;
        if (roomType === 'LT' && !rawUpper.includes('LT') && !rawUpper.includes('LECTURE')) return;
        if (roomType === 'LAB' && !rawUpper.includes('LAB') && !rawUpper.includes('WORKSHOP')) return;
        if (roomType === 'AUDI' && !rawUpper.includes('AUDI')) return;
      }
      if (floor !== undefined) {
        const floorMatch = rawRoom.match(/^(\d)/);
        if (floorMatch && parseInt(floorMatch[1], 10) !== floor) return;
      }
      freeRooms.push(rawRoom);
    }
  });

  return freeRooms.sort((a, b) => normalizeRoom(a).localeCompare(normalizeRoom(b)));
}

export function getRoomPeriods(room: string, day: string): FreePeriod[] {
  const normTarget = normalizeRoom(room);
  const roomEntries = TIMETABLE.filter(e => normalizeRoom(e.room_number) === normTarget && e.day.toLowerCase() === day.toLowerCase());
  
  if (roomEntries.length === 0) {
    return [{ start: minutesToTimeString(COLLEGE_START_MINUTES), end: minutesToTimeString(COLLEGE_END_MINUTES), status: 'FREE' }];
  }

  const sorted = roomEntries.map(e => ({
    start: timeToMinutes(e.start_time),
    end: timeToMinutes(e.end_time),
    subject: e.subject,
    course: `${e.course} (Sem ${e.semester}, Sec ${e.section})`
  })).sort((a, b) => a.start - b.start);

  const periods: FreePeriod[] = [];
  let current = COLLEGE_START_MINUTES;

  sorted.forEach(entry => {
    if (current < entry.start) {
      periods.push({
        start: minutesToTimeString(current),
        end: minutesToTimeString(entry.start),
        status: 'FREE'
      });
    }
    periods.push({
      start: minutesToTimeString(entry.start),
      end: minutesToTimeString(entry.end),
      status: 'OCCUPIED',
      subject: entry.subject,
      course: entry.course
    });
    current = Math.max(current, entry.end);
  });

  if (current < COLLEGE_END_MINUTES) {
    periods.push({
      start: minutesToTimeString(current),
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
    .map(e => ({
      startTime: e.start_time,
      endTime: e.end_time,
      course: e.course,
      semester: e.semester,
      section: e.section,
      subject: e.subject
    }))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

// -------------------------------------------------------------
// AGENT TOOLS & INTENT ENGINE (100% In-Browser Autonomous AI)
// -------------------------------------------------------------

export function runAgenticAI(userQuery: string): AgentResponse {
  const clean = userQuery.toLowerCase().trim();
  const now = new Date();
  const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const systemDay = WEEKDAYS[currentDayIndex];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeStr = minutesToTimeString(currentMinutes);

  // 1. Resolve Day
  let targetDay = systemDay;
  if (clean.includes("tomorrow")) {
    targetDay = WEEKDAYS[(currentDayIndex + 1) % 7];
  } else if (clean.includes("yesterday")) {
    targetDay = WEEKDAYS[(currentDayIndex + 6) % 7];
  } else {
    for (const d of WEEKDAYS) {
      if (clean.includes(d.toLowerCase())) {
        targetDay = d;
        break;
      }
    }
  }

  // 2. Resolve Time
  let targetTimeMinutes = currentMinutes;
  let isExplicitTime = false;
  const timeMatch = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch && (timeMatch[3] || clean.includes("at " + timeMatch[0]) || clean.includes("from " + timeMatch[0]) || clean.includes(":") || clean.includes("o'clock"))) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
    if (hour > 0 && hour <= 24) {
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      targetTimeMinutes = hour * 60 + minute;
      isExplicitTime = true;
    }
  }

  // Helper time string
  const targetTimeStr = minutesToTimeString(targetTimeMinutes);
  const targetEndTimeStr = minutesToTimeString(targetTimeMinutes + 55);

  // 3. Resolve Target Room if mentioned
  let targetRoom: string | undefined = undefined;
  const allRooms = getAllClassrooms();
  
  // Direct match room numbers like 124, 206, 009, 529, 302
  for (const r of allRooms) {
    const norm = normalizeRoom(r).toLowerCase();
    const raw = r.toLowerCase();
    const digitsOnly = r.match(/\d+/)?.[0];
    
    if (clean.includes(raw) || clean.includes(norm)) {
      targetRoom = r;
      break;
    } else if (digitsOnly && new RegExp(`\\b(room|cr|lt|lab)?\\s*${digitsOnly}\\b`, 'i').test(clean)) {
      targetRoom = r;
      break;
    }
  }

  // 4. Resolve Room Types
  let roomTypeFilter: 'CR' | 'LT' | 'LAB' | 'AUDI' | undefined = undefined;
  if (clean.includes("lab") || clean.includes("labs") || clean.includes("practical") || clean.includes("workshop")) {
    roomTypeFilter = 'LAB';
  } else if (clean.includes("lecture") || clean.includes("lt") || clean.includes("lts") || clean.includes("theatre")) {
    roomTypeFilter = 'LT';
  } else if (clean.includes("audi") || clean.includes("auditorium")) {
    roomTypeFilter = 'AUDI';
  } else if (clean.includes("classroom") || clean.includes("cr") || clean.includes("crs")) {
    roomTypeFilter = 'CR';
  }

  // 5. Resolve Floor filters
  let floorFilter: number | undefined = undefined;
  const floorMatch = clean.match(/(\d)(?:st|nd|rd|th)?\s*floor/i);
  if (floorMatch) {
    floorFilter = parseInt(floorMatch[1], 10);
  }

  // -------------------------------------------------------------
  // AGENT TOOL EXECUTION ROUTING
  // -------------------------------------------------------------

  // ACTION A: "What class is going on in room X right now / at time Y?"
  if (targetRoom && (clean.includes("which class") || clean.includes("what class") || clean.includes("who is in") || clean.includes("status of") || clean.includes("is occupied"))) {
    const schedules = getRoomSchedule(targetRoom, targetDay);
    const activeClass = schedules.find(s => {
      const start = timeToMinutes(s.startTime);
      const end = timeToMinutes(s.endTime);
      return isOverlapping(targetTimeMinutes, targetTimeMinutes + 1, start, end);
    });

    if (activeClass) {
      return {
        toolUsed: 'InspectRoomActivityTool',
        text: `📍 **Room ${targetRoom}** is currently **OCCUPIED** on ${targetDay} at ${targetTimeStr}.\n\n` +
              `📚 **Current Lecture:** ${activeClass.subject}\n` +
              `🎓 **Course & Batch:** ${activeClass.course} (Semester ${activeClass.semester}, Section ${activeClass.section})\n` +
              `⏰ **Timing:** ${activeClass.startTime} - ${activeClass.endTime}\n\n` +
              `💡 *The room will be free once this lecture concludes at ${activeClass.endTime}.*`,
        widget: {
          type: 'current_status',
          title: `${targetRoom} Live Status`,
          data: activeClass
        }
      };
    } else {
      // Find next scheduled class
      const futureClasses = schedules.filter(s => timeToMinutes(s.startTime) > targetTimeMinutes);
      let nextClassNotice = "No more classes scheduled today!";
      if (futureClasses.length > 0) {
        nextClassNotice = `The next lecture is **${futureClasses[0].subject}** (${futureClasses[0].course}) at **${futureClasses[0].startTime}**.`;
      }

      return {
        toolUsed: 'InspectRoomActivityTool',
        text: `🟢 **Room ${targetRoom}** is completely **VACANT / FREE** on ${targetDay} at ${targetTimeStr}!\n\n` +
              `⏳ ${nextClassNotice}\n\n` +
              `✨ *You can safely utilize this room for self-study or group discussion.*`,
        widget: {
          type: 'room_periods',
          title: `${targetRoom} Availability`,
          data: { periods: getRoomPeriods(targetRoom, targetDay), room: targetRoom }
        }
      };
    }
  }

  // ACTION B: Specific Room Schedule / Timetable query
  if (targetRoom && (clean.includes("schedule") || clean.includes("classes") || clean.includes("timetable") || clean.includes("lectures") || clean.includes("routine"))) {
    const schedule = getRoomSchedule(targetRoom, targetDay);
    if (schedule.length === 0) {
      return {
        toolUsed: 'RoomScheduleTool',
        text: `✨ **Room ${targetRoom}** has **no scheduled classes** on **${targetDay}**.\n\nIt is available throughout the entire college hours (08:00 AM - 05:00 PM).`,
        widget: {
          type: 'room_schedule',
          title: `${targetRoom} - ${targetDay}`,
          data: { schedule: [], room: targetRoom }
        }
      };
    }

    const classListMd = schedule.map((s, i) => `${i + 1}. **${s.startTime} - ${s.endTime}**: ${s.subject} (${s.course}, Sec ${s.section}, Sem ${s.semester})`).join('\n');
    return {
      toolUsed: 'RoomScheduleTool',
      text: `📅 Here is the complete schedule for **Room ${targetRoom}** on **${targetDay}** (${schedule.length} lecture blocks scheduled):\n\n${classListMd}\n\n💡 *Check the schedule card below for more details.*`,
      widget: {
        type: 'room_schedule',
        title: `${targetRoom} Schedule (${targetDay})`,
        data: { schedule, room: targetRoom }
      }
    };
  }

  // ACTION C: Specific Room Timeline / Vacancy periods query
  if (targetRoom) {
    const periods = getRoomPeriods(targetRoom, targetDay);
    const freeSlots = periods.filter(p => p.status === 'FREE');
    const freeSlotsText = freeSlots.map(p => `• **${p.start} - ${p.end}** (Free)`).join('\n');

    return {
      toolUsed: 'RoomTimelineTool',
      text: `🕒 Here is the availability breakdown for **Room ${targetRoom}** on **${targetDay}**:\n\n` +
            `**Free Slots Available:**\n${freeSlotsText || '• No free slots today'}\n\n` +
            `💡 *Hover or tap on the timeline blocks below to see subject details.*`,
      widget: {
        type: 'room_periods',
        title: `${targetRoom} Availability Timeline`,
        data: { periods, room: targetRoom }
      }
    };
  }

  // ACTION D: Subject / Professor / Course lecture location query (e.g. "where is python class?", "cryptography lecture")
  const allSubjects = Array.from(new Set(TIMETABLE.map(t => t.subject)));
  const matchedSubject = allSubjects.find(sub => clean.includes(sub.toLowerCase()) || clean.includes(sub.toLowerCase().replace(/[^a-z0-9]/g, "")));
  
  if (matchedSubject && (clean.includes("where") || clean.includes("when") || clean.includes("which room") || clean.includes("timing") || clean.includes("subject"))) {
    const matches = TIMETABLE.filter(t => t.subject.toLowerCase() === matchedSubject.toLowerCase() && t.day.toLowerCase() === targetDay.toLowerCase());
    
    if (matches.length > 0) {
      const listMd = matches.map(m => `• **${m.start_time} - ${m.end_time}** in **Room ${m.room_number}** (${m.course} Sem ${m.semester}, Sec ${m.section})`).join('\n');
      return {
        toolUsed: 'SubjectLocatorTool',
        text: `📖 Lectures for **${matchedSubject}** on **${targetDay}**:\n\n${listMd}`,
        widget: {
          type: 'room_schedule',
          title: `${matchedSubject} Lectures`,
          data: {
            schedule: matches.map(m => ({ startTime: m.start_time, endTime: m.end_time, course: m.course, semester: m.semester, section: m.section, subject: m.subject })),
            room: matches[0].room_number
          }
        }
      };
    }
  }

  // ACTION E: Section Timetable Query (e.g., "Section A schedule", "B.Tech CSE Sem 3 Sec B")
  const sectionMatch = clean.match(/sec(?:tion)?\s*([a-z0-9+-]+)/i) || clean.match(/\b([a-z0-9]{1,3})\s*section\b/i);
  if (sectionMatch && (clean.includes("timetable") || clean.includes("schedule") || clean.includes("classes") || clean.includes("routine"))) {
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

  // ACTION F: Campus Statistics / Overview
  if (clean.includes("how many classrooms") || clean.includes("stats") || clean.includes("total rooms") || clean.includes("campus overview")) {
    const totalRooms = allRooms.length;
    const labs = allRooms.filter(r => r.toUpperCase().includes("LAB")).length;
    const lts = allRooms.filter(r => r.toUpperCase().includes("LT")).length;
    const crs = totalRooms - labs - lts;
    const freeRightNow = findFreeClassrooms(targetDay, currentTimeStr, minutesToTimeString(currentMinutes + 50));

    return {
      toolUsed: 'CampusAnalyticsTool',
      text: `📊 **GEHU Classroom Finder Statistics**:\n\n` +
            `• **Total Classrooms Tracked:** ${totalRooms}\n` +
            `• **Lecture Theatres (LT):** ${lts}\n` +
            `• **Laboratories (LAB):** ${labs}\n` +
            `• **Classrooms (CR):** ${crs}\n` +
            `• **Currently Free Right Now (${targetDay} ${currentTimeStr}):** **${freeRightNow.length}** rooms available.\n\n` +
            `💡 *Type 'Which rooms are free right now?' to view all of them.*`,
      widget: {
        type: 'free_rooms',
        title: `Campus Live Vacancy`,
        data: { rooms: freeRightNow }
      }
    };
  }

  // ACTION G: Default / General Free Rooms Finder Tool (Vacant Rooms)
  const freeRooms = findFreeClassrooms(targetDay, targetTimeStr, targetEndTimeStr, roomTypeFilter, floorFilter);
  const timeContextLabel = isExplicitTime ? `at **${targetTimeStr}**` : `right now at **${targetTimeStr}**`;
  const typeLabel = roomTypeFilter === 'LAB' ? 'Laboratories (LAB)' : roomTypeFilter === 'LT' ? 'Lecture Theatres (LT)' : roomTypeFilter === 'CR' ? 'Classrooms (CR)' : 'Classrooms';
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
