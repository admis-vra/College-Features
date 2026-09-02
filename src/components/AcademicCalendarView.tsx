import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  Plus, 
  Trash2, 
  BookOpen, 
  Coffee, 
  Flame, 
  Search
} from 'lucide-react';
import { 
  loadAcademicCalendar, 
  saveAcademicCalendar, 
  getAllEnrichedEvents, 
  getDaysUntilNextExam, 
  getUpcomingHolidays,
  getSemesterWorkingDaysStats,
  AcademicCalendarEvent, 
  CalendarEventType
} from '../engines/academicCalendarEngine';

interface AcademicCalendarViewProps {
  onOpenScanner?: () => void;
}

export const AcademicCalendarView: React.FC<AcademicCalendarViewProps> = ({ onOpenScanner }) => {
  const [events, setEvents] = useState<AcademicCalendarEvent[]>(() => loadAcademicCalendar());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CalendarEventType>('ALL');
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<AcademicCalendarEvent>>({
    title: '',
    type: 'MIDTERM',
    date: new Date().toISOString().split('T')[0],
    subject: '',
    location: '',
    description: ''
  });

  const enrichedEvents = getAllEnrichedEvents();
  const nextExamInfo = getDaysUntilNextExam();
  const upcomingHolidays = getUpcomingHolidays();
  const workingDaysStats = getSemesterWorkingDaysStats();

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title?.trim() || !newEvent.date) return;

    const eventToAdd: AcademicCalendarEvent = {
      id: `evt_${Date.now()}`,
      title: newEvent.title.trim(),
      type: (newEvent.type as CalendarEventType) || 'EVENT',
      date: newEvent.date,
      subject: newEvent.subject?.trim(),
      location: newEvent.location?.trim(),
      description: newEvent.description?.trim()
    };

    const updated = [...events, eventToAdd];
    setEvents(updated);
    saveAcademicCalendar(updated);
    setIsAddingEvent(false);
    setNewEvent({
      title: '',
      type: 'MIDTERM',
      date: new Date().toISOString().split('T')[0],
      subject: '',
      location: '',
      description: ''
    });
  };

  const handleDeleteEvent = (id: string) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    saveAcademicCalendar(updated);
  };

  // Filtered display list
  const filteredEvents = enrichedEvents.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (e.subject && e.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Official GEHU Academic Calendar 90-Day Instructional Progress Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Official GEHU Instructional Timeline</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  90 Working Days
                </span>
              </div>
              <p className="text-xs text-slate-400">Semester Cycle: July 13 – November 14, 2026 (Excludes Sundays & Gazetted Holidays)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              Today: <strong className="text-indigo-300">{workingDaysStats.todayLabel}</strong>
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 shadow-md shadow-indigo-500/30"
              style={{ width: `${workingDaysStats.progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
            <span>Day 1 (July 13 Commencement)</span>
            <span className="text-white font-bold bg-indigo-600/30 px-2 py-0.5 rounded-md border border-indigo-500/40">
              Instructional Day {workingDaysStats.currentDayNumber} of 90 ({workingDaysStats.progressPercentage}% Completed)
            </span>
            <span>Day 90 (Nov 14 Final Teaching Day)</span>
          </div>
        </div>

        {/* 4 Stats Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Completed</span>
            <strong className="text-sm font-mono font-bold text-white">{workingDaysStats.completedDays} Days</strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Remaining Classes</span>
            <strong className="text-sm font-mono font-bold text-emerald-400">{workingDaysStats.remainingDays} Working Days</strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Next Holiday</span>
            <strong className="text-xs font-semibold text-amber-300 truncate block">
              {workingDaysStats.nextHoliday ? `${workingDaysStats.nextHoliday.name} (${workingDaysStats.nextHoliday.daysAway}d)` : 'None'}
            </strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Next Exam Window</span>
            <strong className="text-xs font-semibold text-indigo-300 truncate block">
              {workingDaysStats.nextExamBlock ? `${workingDaysStats.nextExamBlock.code} (${workingDaysStats.nextExamBlock.daysAway}d)` : 'ESET Exams'}
            </strong>
          </div>
        </div>
      </div>

      {/* Top Banner & Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Next Exam Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Semester Milestone Tracker
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              {nextExamInfo.nextExam ? nextExamInfo.nextExam.title : 'All Milestones Completed'}
            </h2>
            <p className="text-sm text-slate-300">
              {nextExamInfo.nextExam?.description || 'Your academic calendar is fully synced with university examinations.'}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800">
            {nextExamInfo.nextExam && (
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-center">
                  <div className="text-2xl font-black text-indigo-300 font-mono">
                    {nextExamInfo.days === 0 ? 'TODAY' : `${nextExamInfo.days}d`}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Remaining</div>
                </div>
                <div className="text-xs text-slate-400">
                  <div>Date: <strong className="text-white">{nextExamInfo.nextExam.formattedDate}</strong></div>
                  {nextExamInfo.nextExam.location && (
                    <div>Hall: <strong className="text-indigo-300">{nextExamInfo.nextExam.location}</strong></div>
                  )}
                </div>
              </div>
            )}

            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                className="ml-auto px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Scan Calendar Screenshot
              </button>
            )}
          </div>
        </div>

        {/* Holidays & Recess Widget */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                Upcoming Holidays
              </span>
              <span className="text-xs text-emerald-400 font-bold">{upcomingHolidays.length} declared</span>
            </div>
            <h3 className="text-lg font-bold text-white">University Breaks</h3>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-48 pr-1">
            {upcomingHolidays.length > 0 ? (
              upcomingHolidays.map((h, i) => (
                <div key={h.id || i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span>{h.title}</span>
                    <span className="text-emerald-400 text-[11px] font-mono">{h.formattedDate}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{h.daysRemaining > 0 ? `in ${h.daysRemaining} days` : 'Today'}</div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No declared holidays in the immediate schedule.</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar & Event Filters */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exams, subjects, holidays..."
            className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Type Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'MIDTERM', label: 'Mid-Terms' },
            { id: 'EXAM', label: 'End-Terms' },
            { id: 'SUBMISSION', label: 'Submissions' },
            { id: 'HOLIDAY', label: 'Holidays' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                typeFilter === tab.id
                  ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={() => setIsAddingEvent(true)}
            className="ml-auto sm:ml-2 px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>
        </div>
      </div>

      {/* Add Event Modal */}
      {isAddingEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-400" />
              Add Academic Event
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400">Event / Exam Title</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g. Mid-Term: Database Systems"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400">Category</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as CalendarEventType })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MIDTERM">Mid-Term Exam</option>
                    <option value="EXAM">End-Term Exam</option>
                    <option value="SUBMISSION">Lab / Project Submission</option>
                    <option value="HOLIDAY">Holiday / Break</option>
                    <option value="EVENT">Campus Event</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Date</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Subject (Optional)</label>
                <input
                  type="text"
                  value={newEvent.subject}
                  onChange={(e) => setNewEvent({ ...newEvent, subject: e.target.value })}
                  placeholder="e.g. DBMS (TCS-401)"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Description</label>
                <textarea
                  rows={2}
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Units, syllabus, or instructions..."
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvents.map((evt) => {
          const isExam = evt.type === 'EXAM' || evt.type === 'MIDTERM';
          const isHoliday = evt.type === 'HOLIDAY';

          return (
            <div
              key={evt.id}
              className={`p-6 rounded-3xl border backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4 transition-all hover:scale-[1.02] ${
                evt.isToday
                  ? 'bg-amber-950/30 border-amber-500/50 shadow-amber-900/20 ring-1 ring-amber-500/30'
                  : isExam
                  ? 'bg-slate-900/80 border-indigo-500/30 hover:border-indigo-400/50'
                  : isHoliday
                  ? 'bg-slate-900/80 border-emerald-500/30 hover:border-emerald-400/50'
                  : 'bg-slate-900/80 border-purple-500/30 hover:border-purple-400/50'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    evt.type === 'EXAM' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                    evt.type === 'MIDTERM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    evt.type === 'HOLIDAY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {evt.type}
                  </span>

                  <span className={`text-xs font-mono font-bold ${
                    evt.isPast ? 'text-slate-500' : evt.daysRemaining <= 7 ? 'text-amber-400' : 'text-indigo-300'
                  }`}>
                    {evt.isPast ? 'Past Event' : evt.daysRemaining === 0 ? '🔥 TODAY' : `in ${evt.daysRemaining} days`}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white leading-snug">{evt.title}</h4>

                {evt.subject && (
                  <div className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    {evt.subject}
                  </div>
                )}

                {evt.description && (
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{evt.description}</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                  {evt.formattedDate}
                </div>

                <button
                  onClick={() => handleDeleteEvent(evt.id)}
                  className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Delete event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
