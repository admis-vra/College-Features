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

const COLLEGE_START_MINUTES = 8 * 60; // 8:00 AM
const COLLEGE_END_MINUTES = 17 * 60;   // 5:00 PM
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Normalize room number format
export function normalizeRoom(room: string): string {
  if (!room) return "";
  let r = room.trim().toUpperCase();
  r = r.replace(/\s+/g, "");
  r = r.replace(/[-()]/g, "");

  // Match digit+letters e.g. 124LT, 406CR
  const stdMatch = r.match(/^(\d+)([A-Z]+)$/);
  if (stdMatch) return stdMatch[1] + stdMatch[2];

  // Match letters+digit e.g. CR406, LT124
  const revMatch = r.match(/^([A-Z]+)(\d+)$/);
  if (revMatch) return revMatch[2] + revMatch[1];

  // Match descriptive floor rooms
  const floorMatch = r.match(/(\d+)(?:RD|TH|ST|ND)?FLOOR/);
  if (floorMatch) {
    const floor = floorMatch[1];
    const base = r.replace(/\d+(?:RD|TH|ST|ND)?FLOOR/, '');
    return floor + base;
  }

  return r;
}

// Convert 12h/24h string to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toUpperCase().replace(/\s+/g, "");
  
  // 12-hour AM/PM match
  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const ampm = match12[3];
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  // 24-hour match
  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);
    return hour * 60 + minute;
  }

  return 0;
}

// Format minutes from midnight to 12-hour string
export function minutesToTimeString(minutes: number): string {
  let hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  const minStr = min.toString().padStart(2, '0');
  return `${hour}:${minStr} ${ampm}`;
}

// Check if two time intervals overlap
export function isOverlapping(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && e1 > s2;
}

// Load typed entries
export const TIMETABLE: TimetableEntry[] = (rawTimetable as TimetableEntry[]).map(e => ({
  ...e,
  day: e.day.trim().charAt(0).toUpperCase() + e.day.trim().slice(1).toLowerCase()
}));

// Get list of unique classrooms (using original raw display names)
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

// Find free classrooms for a day and time interval
export function findFreeClassrooms(day: string, startTimeStr: string, endTimeStr: string, roomType?: 'CR' | 'LT' | 'LAB'): string[] {
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
      // Filter by type if requested
      if (roomType) {
        const rawUpper = rawRoom.toUpperCase();
        if (roomType === 'CR' && !rawUpper.includes('CR') && !rawUpper.includes('CLASS')) return;
        if (roomType === 'LT' && !rawUpper.includes('LT') && !rawUpper.includes('LECTURE')) return;
        if (roomType === 'LAB' && !rawUpper.includes('LAB') && !rawUpper.includes('WORKSHOP')) return;
      }
      freeRooms.push(rawRoom);
    }
  });

  return freeRooms.sort((a, b) => normalizeRoom(a).localeCompare(normalizeRoom(b)));
}

// Get free and occupied periods for a room on a given day
export function getRoomPeriods(room: string, day: string): FreePeriod[] {
  const normTarget = normalizeRoom(room);
  const roomEntries = TIMETABLE.filter(e => normalizeRoom(e.room_number) === normTarget && e.day.toLowerCase() === day.toLowerCase());
  
  if (roomEntries.length === 0) {
    return [{ start: minutesToTimeString(COLLEGE_START_MINUTES), end: minutesToTimeString(COLLEGE_END_MINUTES), status: 'FREE' }];
  }

  // Sort by start time
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

// Get classroom schedule
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

// NLP Natural Language Assistant Query Parser
export interface ParsedNLPResult {
  day: string;
  timeStr: string;
  queryType: 'FREE_ROOMS' | 'ROOM_PERIODS' | 'ROOM_SCHEDULE' | 'UNKNOWN';
  targetRoom?: string;
  roomType?: 'CR' | 'LT' | 'LAB';
  explanation: string;
}

export function parseNaturalLanguageQuery(text: string, currentDayOverride?: string, currentTimeOverride?: string): ParsedNLPResult {
  const cleanText = text.toLowerCase().trim();
  
  // Resolve current system day and time
  const now = new Date();
  let resolvedDay = currentDayOverride || WEEKDAYS[now.getDay() === 0 ? 6 : now.getDay() - 1]; // getDay is 0 (Sunday) to 6 (Saturday)
  let minutesNow = now.getHours() * 60 + now.getMinutes();
  
  if (currentTimeOverride) {
    minutesNow = timeToMinutes(currentTimeOverride);
  }
  
  let resolvedTime = minutesToTimeString(minutesNow);
  
  // Simple explanation notes
  let explanation = `Using current day (${resolvedDay}) and time (${resolvedTime})`;

  // Extract explicit day if mentioned
  for (const day of WEEKDAYS) {
    if (cleanText.includes(day.toLowerCase())) {
      resolvedDay = day;
      explanation = `Detected day: ${day}`;
      break;
    }
  }

  // Handle "tomorrow"
  if (cleanText.includes("tomorrow")) {
    const todayIndex = WEEKDAYS.indexOf(resolvedDay);
    const tomorrowIndex = (todayIndex + 1) % 7;
    resolvedDay = WEEKDAYS[tomorrowIndex];
    explanation = `Detected "tomorrow" -> ${resolvedDay}`;
  }

  // Extract explicit time if matching (e.g. 10:00 AM, 3:30 PM, 2 PM, 14:00)
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi;

  // Let's look for explicit hour and ampm
  const matches = [...cleanText.matchAll(timeRegex)];
  for (const m of matches) {
    const hour = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3] ? m[3].toUpperCase() : null;

    // Validate matches to avoid picking up random numbers like "124" (room numbers)
    if (hour > 0 && hour <= 24) {
      if (ampm || cleanText.includes("o'clock") || m[0].includes(":") || cleanText.includes("at " + m[0]) || cleanText.includes("from " + m[0])) {
        let finalHour = hour;
        if (ampm === 'PM' && hour !== 12) finalHour += 12;
        if (ampm === 'AM' && hour === 12) finalHour = 0;
        resolvedTime = minutesToTimeString(finalHour * 60 + minute);
        explanation += `, Detected time: ${resolvedTime}`;
        break;
      }
    }
  }

  // Detect Room Type Filters
  let roomType: 'CR' | 'LT' | 'LAB' | undefined = undefined;
  if (cleanText.includes("lab") || cleanText.includes("labs") || cleanText.includes("laboratory")) {
    roomType = 'LAB';
  } else if (cleanText.includes("lecture") || cleanText.includes("lt") || cleanText.includes("lts")) {
    roomType = 'LT';
  } else if (cleanText.includes("classroom") || cleanText.includes("classrooms") || cleanText.includes("cr") || cleanText.includes("crs")) {
    roomType = 'CR';
  }

  // Detect if checking a specific room
  let targetRoom: string | undefined = undefined;
  const allRooms = getAllClassrooms();
  for (const room of allRooms) {
    const norm = normalizeRoom(room);
    if (cleanText.includes(room.toLowerCase()) || cleanText.includes(norm.toLowerCase())) {
      targetRoom = room;
      break;
    }
  }

  // Determine queryType
  let queryType: 'FREE_ROOMS' | 'ROOM_PERIODS' | 'ROOM_SCHEDULE' | 'UNKNOWN' = 'FREE_ROOMS';
  
  if (targetRoom) {
    if (cleanText.includes("schedule") || cleanText.includes("classes") || cleanText.includes("lectures") || cleanText.includes("timetable")) {
      queryType = 'ROOM_SCHEDULE';
    } else {
      queryType = 'ROOM_PERIODS';
    }
  } else if (cleanText.includes("empty") || cleanText.includes("free") || cleanText.includes("vacant") || cleanText.includes("available")) {
    queryType = 'FREE_ROOMS';
  } else {
    // Default to free rooms list
    queryType = 'FREE_ROOMS';
  }

  return {
    day: resolvedDay,
    timeStr: resolvedTime,
    queryType,
    targetRoom,
    roomType,
    explanation
  };
}

export async function queryServerlessChat(userMessage: string, contextData: string, localApiKey?: string): Promise<string> {
  // If a local API Key is provided, call OpenRouter directly from the browser (bypasses serverless proxy)
  if (localApiKey) {
    const systemPrompt = `You are an intelligent, helpful university AI agent. 
Your goal is to help the user with questions regarding classroom availability, timetables, and general campus room information.

To help you answer accurately, here is the relevant schedule context retrieved from the local database:
${contextData}

Instructions:
1. Always base your vacancy and schedule answers strictly on the context provided above.
2. Be friendly, conversational, and direct.
3. If the context does not contain enough info or the user asks a general question, answer to the best of your general knowledge but mention the limitations.`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/vanshnegi1584-glitch/CLASSROOM-FINDER",
          "X-Title": "Classroom Finder AI Agent"
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else {
        if (data.error && data.error.message) {
          return `⚠️ API Error: ${data.error.message}`;
        }
        return "⚠️ Unable to get a response from OpenRouter. Please check your API Key.";
      }
    } catch (error: any) {
      return `⚠️ Network Error: ${error.message || error}`;
    }
  }

  // Otherwise, route through the serverless function (for production deployment)
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: userMessage,
        context: contextData
      })
    });

    const data = await response.json();
    if (data.content) {
      return data.content;
    } else {
      return `⚠️ Error: ${data.error || 'Unable to get response from serverless function'}`;
    }
  } catch (error: any) {
    return `⚠️ Network Error: ${error.message || error}`;
  }
}
