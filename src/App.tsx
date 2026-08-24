import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Calendar, 
  Clock, 
  Search, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  SlidersHorizontal, 
  Compass, 
  MessageSquare, 
  Sparkles, 
  HelpCircle, 
  ChevronRight,
  Zap
} from 'lucide-react';
import { 
  getAllClassrooms, 
  findFreeClassrooms, 
  getRoomPeriods, 
  getRoomSchedule, 
  runAgenticAI,
  timeToMinutes,
  FreePeriod, 
  ClassSchedule,
  AgentResponse,
  WEEKDAYS
} from './agent/agentEngine';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  widget?: AgentResponse['widget'];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'find' | 'timeline' | 'schedule'>('chat');
  
  // Timetable lists
  const classrooms = getAllClassrooms();

  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Hi! I'm your GEHU Autonomous Classroom Agent.\n\nI run 100% in-browser with zero API keys or rate limits. You can ask me anything about classrooms, vacancies, or section routines:\n\n• \"Which classrooms (CR) are free right now?\"\n• \"What class is going on in room 124 right now?\"\n• \"Show me Section A's timetable on Monday.\"\n• \"Which CR rooms are free tomorrow at 10 AM?\"\n• \"Give me campus stats and total rooms.\"",
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Manual Tab states
  const [findDate, setFindDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [findStart, setFindStart] = useState('09:00 AM');
  const [findEnd, setFindEnd] = useState('10:00 AM');
  const [findType, setFindType] = useState<'ALL' | 'CR' | 'LT' | 'LAB'>('ALL');
  const [findResults, setFindResults] = useState<string[]>([]);
  const [searchedFind, setSearchedFind] = useState(false);

  // Timeline / Schedule states
  const [selectedRoom, setSelectedRoom] = useState(classrooms[0] || '');
  const [timelineDate, setTimelineDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [roomPeriods, setRoomPeriods] = useState<FreePeriod[]>([]);
  const [roomSchedule, setRoomSchedule] = useState<ClassSchedule[]>([]);

  // Auto-scroll chat smoothly inside container
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Set initial timeline views
  useEffect(() => {
    if (selectedRoom) {
      handleQueryRoomDetails();
    }
  }, [selectedRoom, timelineDate]);

  const getWeekday = (dateStr: string) => {
    if (!dateStr) return 'Monday';
    const date = new Date(dateStr);
    const day = date.getDay();
    return WEEKDAYS[day === 0 ? 6 : day - 1];
  };

  const handleQueryRoomDetails = () => {
    const day = getWeekday(timelineDate);
    const periods = getRoomPeriods(selectedRoom, day);
    const sched = getRoomSchedule(selectedRoom, day);
    setRoomPeriods(periods);
    setRoomSchedule(sched);
  };

  const handleUseCurrentTime = () => {
    const now = new Date();
    setFindDate(now.toISOString().split('T')[0]);
    
    let hours = now.getHours();
    let minutes = Math.round(now.getMinutes() / 5) * 5;
    if (minutes === 60) {
      minutes = 0;
      hours += 1;
    }
    
    const formatTime = (h: number, m: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      let displayHour = h > 12 ? h - 12 : h;
      if (displayHour === 0) displayHour = 12;
      return `${displayHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const startStr = formatTime(hours, minutes);
    const endStr = formatTime((hours + 1) % 24, minutes);

    setFindStart(startStr);
    setFindEnd(endStr);
  };

  const handleFindSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const day = getWeekday(findDate);
    const rooms = findFreeClassrooms(
      day, 
      findStart, 
      findEnd, 
      findType === 'ALL' ? undefined : findType
    );
    setFindResults(rooms);
    setSearchedFind(true);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal;
    setInputVal('');

    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    }]);

    setIsTyping(true);

    // Fast autonomous agent execution
    setTimeout(() => {
      const agentResult = runAgenticAI(userText);
      const botMsgId = (Date.now() + 1).toString();

      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: botMsgId,
        sender: 'bot',
        text: agentResult.text,
        timestamp: new Date(),
        widget: agentResult.widget
      }]);
    }, 150);
  };

  const handleSuggestionClick = (query: string) => {
    setInputVal(query);
  };

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      {/* Decorative Neon Glowing Backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className="w-80 bg-slate-900/60 backdrop-blur-md border-r border-slate-800/40 flex flex-col justify-between shrink-0 z-10 shadow-[8px_0_32px_-12px_rgba(0,0,0,0.5)]">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800/40 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/20 transform hover:scale-105 transition duration-300">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">GEHU ClassFinder</h1>
              <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 fill-indigo-400 text-indigo-400" /> Agentic AI Engine
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 border ${
                activeTab === 'chat' 
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-300 font-semibold shadow-inner' 
                  : 'border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-5 h-5 shrink-0" />
              <span>AI Agent Assistant</span>
              <span className="ml-auto text-[9px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">Active</span>
            </button>

            <button 
              onClick={() => setActiveTab('find')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 border ${
                activeTab === 'find' 
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-300 font-semibold shadow-inner' 
                  : 'border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
              }`}
            >
              <Search className="w-5 h-5 shrink-0" />
              <span>Find Vacant Rooms</span>
            </button>

            <button 
              onClick={() => setActiveTab('timeline')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 border ${
                activeTab === 'timeline' 
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-300 font-semibold shadow-inner' 
                  : 'border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
              }`}
            >
              <Clock className="w-5 h-5 shrink-0" />
              <span>Room Visual Timeline</span>
            </button>

            <button 
              onClick={() => setActiveTab('schedule')}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 border ${
                activeTab === 'schedule' 
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-300 font-semibold shadow-inner' 
                  : 'border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-5 h-5 shrink-0" />
              <span>Room Schedules</span>
            </button>
          </nav>
        </div>

        {/* Footer info card */}
        <div className="p-4 border-t border-slate-800/40 space-y-3">
          <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">100% Free & Autonomous</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Zero external API keys required. All entity resolution, intent mapping, and schedule analysis run on-device.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent z-10">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/40 flex items-center justify-between px-8 bg-slate-900/20 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-indigo-400 font-extrabold uppercase tracking-widest capitalize">{activeTab === 'chat' ? 'AI Assistant' : activeTab}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-wider uppercase rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Agent Active
            </div>
          </div>
        </header>

        {/* Panel Tabs Wrapper */}
        <div className={`flex-1 p-8 flex flex-col ${activeTab === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          
          {/* TAB 1: AI Chat Assistant */}
          {activeTab === 'chat' && (
            <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col rounded-3xl border border-slate-800/40 bg-slate-900/30 backdrop-blur-md shadow-[0_24px_64px_rgba(0,0,0,0.4)] overflow-hidden">
              {/* Chat Messages */}
              <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 border border-indigo-400/25">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    
                    <div className="space-y-3 max-w-[85%]">
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.sender === 'user' 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10 border border-indigo-500/20 font-medium' 
                          : 'bg-slate-900/80 border border-slate-850 rounded-tl-none text-slate-200 whitespace-pre-line shadow-[0_8px_24px_rgba(0,0,0,0.1)] font-medium'
                      }`}>
                        {msg.text}
                      </div>

                      {/* Widget rendering */}
                      {msg.widget && (
                        <div className="bg-slate-950/70 backdrop-blur rounded-2xl p-5 border border-slate-800/60 shadow-inner space-y-4">
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-850/60">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                            {msg.widget.title}
                          </h4>

                          {/* Free Rooms Widget */}
                          {msg.widget.type === 'free_rooms' && (
                            <div>
                              {msg.widget.data.rooms.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                                  {msg.widget.data.rooms.map((room: string, i: number) => {
                                    const type = room.toUpperCase().includes('LAB') ? 'LAB' : room.toUpperCase().includes('LT') ? 'LT' : room.toUpperCase().includes('AUDI') ? 'AUDI' : 'CR';
                                    return (
                                      <div key={i} className="bg-slate-900/60 border border-slate-800/60 px-3.5 py-3 rounded-xl flex items-center justify-between hover:scale-[1.02] hover:border-slate-700/50 hover:bg-slate-900 transition-all duration-200 shadow-sm">
                                        <span className="font-bold text-slate-200 text-xs">{room}</span>
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wide ${
                                          type === 'LAB' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' : 
                                          type === 'LT' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 
                                          type === 'AUDI' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25' :
                                          'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                        }`}>{type}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-rose-400 font-semibold flex items-center gap-2">
                                  <XCircle className="w-4 h-4" /> No vacant classrooms found for this block.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Room Periods Widget */}
                          {msg.widget.type === 'room_periods' && (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {msg.widget.data.periods.map((p: FreePeriod, i: number) => (
                                <div key={i} className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-xs transition-all border ${
                                  p.status === 'FREE' 
                                    ? 'bg-emerald-950/20 border-emerald-500/15 text-emerald-300' 
                                    : 'bg-rose-950/20 border-rose-500/15 text-rose-300'
                                }`}>
                                  <div>
                                    <span className="font-black text-sm block">{p.start} - {p.end}</span>
                                    {p.subject && <div className="text-[10px] text-slate-400 mt-1 font-semibold">{p.subject} ({p.course})</div>}
                                  </div>
                                  <span className={`font-black text-[9px] tracking-widest uppercase px-2 py-1 rounded-md ${
                                    p.status === 'FREE' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                  }`}>{p.status}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Room Schedule & Section Schedule Widget */}
                          {(msg.widget.type === 'room_schedule' || msg.widget.type === 'section_schedule') && (
                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                              {msg.widget.data.schedule.length > 0 ? (
                                msg.widget.data.schedule.map((s: ClassSchedule, i: number) => (
                                  <div key={i} className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl text-xs space-y-1.5">
                                    <div className="flex justify-between font-black text-slate-200 text-sm">
                                      <span>{s.startTime} - {s.endTime}</span>
                                      <span className="text-indigo-400 font-bold">{s.course}</span>
                                    </div>
                                    <div className="text-slate-400 text-[11px] font-semibold">{s.subject} {s.section ? `(Sec: ${s.section}, Sem: ${s.semester})` : ''}</div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" /> No classes scheduled.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Current Status Card Widget */}
                          {msg.widget.type === 'current_status' && (
                            <div className="bg-slate-900/80 border border-indigo-500/30 p-4 rounded-xl space-y-2 shadow-lg">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-300">Active Session</span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">In Progress</span>
                              </div>
                              <div className="font-extrabold text-sm text-slate-100">{msg.widget.data.subject}</div>
                              <div className="text-xs text-indigo-400 font-semibold">{msg.widget.data.course} • Section {msg.widget.data.section} (Sem {msg.widget.data.semester})</div>
                              <div className="text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-800">
                                Lecture Window: <strong>{msg.widget.data.startTime} - {msg.widget.data.endTime}</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-4 items-center text-slate-400 text-xs italic pl-2">
                    <Bot className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span>Agent analyzing timetable graph...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-800/40 bg-slate-900/60 backdrop-blur-md shrink-0">
                {/* Suggestions panel */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button 
                    onClick={() => handleSuggestionClick("Which classrooms are free right now?")}
                    className="text-xs font-semibold bg-slate-800/40 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80 px-3.5 py-1.5 rounded-xl transition duration-200"
                  >
                    🏫 Free Classrooms right now?
                  </button>
                  <button 
                    onClick={() => handleSuggestionClick("What class is going on in room 124 right now?")}
                    className="text-xs font-semibold bg-slate-800/40 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80 px-3.5 py-1.5 rounded-xl transition duration-200"
                  >
                    🔍 What class in 124 right now?
                  </button>
                  <button 
                    onClick={() => handleSuggestionClick("Show me Section A's timetable on Monday")}
                    className="text-xs font-semibold bg-slate-800/40 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80 px-3.5 py-1.5 rounded-xl transition duration-200"
                  >
                    🎓 Section A Routine
                  </button>
                  <button 
                    onClick={() => handleSuggestionClick("Campus stats and total rooms")}
                    className="text-xs font-semibold bg-slate-800/40 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80 px-3.5 py-1.5 rounded-xl transition duration-200"
                  >
                    📊 Campus Stats
                  </button>
                </div>

                <form onSubmit={handleChatSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Ask any question about rooms, classes, or sections..."
                    className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-650 transition shadow-inner font-medium"
                  />
                  <button 
                    type="submit"
                    className="bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 rounded-xl transition duration-300 flex items-center justify-center shadow-lg shadow-indigo-500/15 border border-indigo-400/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Find Vacant Classrooms */}
          {activeTab === 'find' && (
            <div className="max-w-4xl w-full mx-auto space-y-6">
              <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/40 rounded-3xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.37)]">
                <h2 className="text-lg font-extrabold mb-5 flex items-center gap-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-400 animate-pulse" />
                  Query Preferences
                </h2>

                <form onSubmit={handleFindSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Date select */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Date</label>
                      <input 
                        type="date" 
                        value={findDate}
                        onChange={(e) => setFindDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition shadow-inner font-medium"
                        required
                      />
                    </div>

                    {/* Start Time Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Start Time</label>
                      <select 
                        value={findStart}
                        onChange={(e) => setFindStart(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition shadow-inner font-semibold cursor-pointer"
                      >
                        {hoursList.flatMap(h => minutesList.flatMap(m => ['AM', 'PM'].map(ampm => {
                          const val = `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
                          return <option key={val} value={val}>{val}</option>;
                        })))}
                      </select>
                    </div>

                    {/* End Time Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">End Time</label>
                      <select 
                        value={findEnd}
                        onChange={(e) => setFindEnd(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition shadow-inner font-semibold cursor-pointer"
                      >
                        {hoursList.flatMap(h => minutesList.flatMap(m => ['AM', 'PM'].map(ampm => {
                          const val = `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
                          return <option key={val} value={val}>{val}</option>;
                        })))}
                      </select>
                    </div>
                  </div>

                  {/* Room Type Selector */}
                  <div className="pt-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 block px-1">Filter Room Type</label>
                    <div className="flex flex-wrap gap-2.5">
                      {(['ALL', 'CR', 'LT', 'LAB'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFindType(t)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition duration-300 border ${
                            findType === t 
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/15 border-indigo-400/20' 
                              : 'bg-slate-950/80 border-slate-800/80 hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {t === 'ALL' ? 'All Layouts' : t === 'CR' ? 'Classrooms (CR)' : t === 'LT' ? 'Lecture Theatres (LT)' : 'Laboratories (LAB)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={handleUseCurrentTime}
                      className="px-5 py-3.5 border border-slate-850 hover:bg-slate-800/30 rounded-xl text-sm font-bold transition duration-200"
                    >
                      Use Current Time
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold py-3.5 rounded-xl transition duration-300 shadow-lg shadow-indigo-500/15 border border-indigo-400/20"
                    >
                      Search Classrooms
                    </button>
                  </div>
                </form>
              </div>

              {/* Find results view */}
              {searchedFind && (
                <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/40 rounded-3xl p-6 shadow-xl space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
                    <h3 className="font-extrabold text-slate-200 text-sm tracking-wide">
                      Results for {getWeekday(findDate)} ({findStart} - {findEnd})
                    </h3>
                    <span className="text-xs bg-indigo-500/15 text-indigo-300 font-black px-3.5 py-1.5 rounded-full border border-indigo-500/20">
                      {findResults.length} Room{findResults.length !== 1 ? 's' : ''} Vacant
                    </span>
                  </div>

                  {findResults.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {findResults.map((room, i) => {
                        const type = room.toUpperCase().includes('LAB') ? 'LAB' : room.toUpperCase().includes('LT') ? 'LT' : room.toUpperCase().includes('AUDI') ? 'AUDI' : 'CR';
                        return (
                          <div key={i} className="bg-slate-950/60 border border-slate-800/50 hover:border-indigo-500/30 p-4 rounded-2xl hover:scale-[1.03] transition-all duration-300 flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/15">
                                <MapPin className="w-4.5 h-4.5 text-indigo-400" />
                              </div>
                              <span className="font-extrabold text-slate-200 text-sm">{room}</span>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest ${
                              type === 'LAB' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' : 
                              type === 'LT' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 
                              type === 'AUDI' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25' :
                              'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            }`}>{type === 'LAB' ? 'LAB' : type === 'LT' ? 'L. Theatre' : type === 'AUDI' ? 'Audi' : 'Classroom'}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-slate-950/20 rounded-2xl border border-dashed border-slate-800">
                      <HelpCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm font-semibold">No classrooms are vacant for the selected preferences.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Visual Timeline */}
          {activeTab === 'timeline' && (
            <div className="max-w-4xl w-full mx-auto space-y-6">
              {/* Select Options card */}
              <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/40 rounded-3xl p-6 shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Classroom</label>
                    <select
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition shadow-inner font-semibold cursor-pointer"
                    >
                      {classrooms.map(room => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Date</label>
                    <input 
                      type="date" 
                      value={timelineDate}
                      onChange={(e) => setTimelineDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition shadow-inner font-semibold cursor-pointer"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Timeline Horizontal Bar Visual */}
              <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/40 rounded-3xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.37)] space-y-6">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-200 mb-1 tracking-wide">{selectedRoom} Timeline</h3>
                  <p className="text-xs text-slate-400 font-semibold">Visual occupancy block breakdown from 8:00 AM to 5:00 PM on {getWeekday(timelineDate)}</p>
                </div>

                {/* Timeline Horizontal Bar */}
                <div className="space-y-4">
                  <div className="h-12 w-full bg-slate-950/80 rounded-2xl overflow-hidden flex border border-slate-850 shadow-inner p-1">
                    {roomPeriods.map((p, i) => {
                      const startMin = (timeToMinutes(p.start) || 8*60);
                      const endMin = (timeToMinutes(p.end) || 17*60);
                      const widthPercent = Math.max(5, ((endMin - startMin) / (17 * 60 - 8 * 60)) * 100);
                      
                      return (
                        <div 
                          key={i}
                          style={{ width: `${widthPercent}%` }}
                          className={`h-full flex items-center justify-center text-[10px] font-black rounded-lg transition-all duration-300 relative group cursor-pointer ${
                            p.status === 'FREE' 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 hover:bg-emerald-500/25 mx-0.5' 
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/10 hover:bg-rose-500/25 mx-0.5'
                          }`}
                        >
                          <span className="truncate px-1.5 tracking-wider uppercase">{p.status}</span>
                          
                          {/* Tooltip detail block */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 w-52 bg-slate-950 border border-slate-800 p-3 rounded-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 z-50 shadow-2xl">
                            <div className="font-extrabold text-slate-200 text-xs">{p.start} - {p.end}</div>
                            <div className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mt-1">{p.status}</div>
                            {p.subject && (
                              <div className="mt-2 pt-2 border-t border-slate-850 text-[10px] text-slate-400 leading-normal font-medium">
                                <strong>{p.subject}</strong>
                                <div className="text-[9px] text-slate-500 mt-0.5 font-semibold">{p.course}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Horizontal labels for hours */}
                  <div className="flex justify-between text-[10px] text-slate-500 font-black px-2 uppercase tracking-widest">
                    <span>8:00 AM</span>
                    <span>10:00 AM</span>
                    <span>12:00 PM</span>
                    <span>2:00 PM</span>
                    <span>4:00 PM</span>
                    <span>5:00 PM</span>
                  </div>
                </div>

                {/* Period Cards details list */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Block Details</h4>
                  {roomPeriods.map((p, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                        p.status === 'FREE' 
                          ? 'bg-emerald-950/10 border-emerald-500/10 hover:border-emerald-500/20 text-emerald-400' 
                          : 'bg-slate-950/60 border-slate-850 hover:border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          p.status === 'FREE' ? 'bg-emerald-500/10 border-emerald-500/15' : 'bg-slate-800/40 border-slate-800'
                        }`}>
                          <Clock className={`w-4.5 h-4.5 ${p.status === 'FREE' ? 'text-emerald-400' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <span className="font-extrabold block text-sm leading-tight">{p.start} - {p.end}</span>
                          {p.subject && (
                            <span className="text-[11px] text-slate-400 block mt-1 font-semibold">
                              {p.subject} <span className="text-slate-650">•</span> {p.course}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider border ${
                        p.status === 'FREE' 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                      }`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Room Schedules List */}
          {activeTab === 'schedule' && (
            <div className="max-w-4xl w-full mx-auto space-y-6">
              {/* Select Options card */}
              <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/40 rounded-3xl p-6 shadow-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Classroom</label>
                    <select
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition shadow-inner font-semibold cursor-pointer"
                    >
                      {classrooms.map(room => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Date</label>
                    <input 
                      type="date" 
                      value={timelineDate}
                      onChange={(e) => setTimelineDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition shadow-inner font-semibold cursor-pointer"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Schedule listing */}
              <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/40 rounded-3xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.37)] space-y-5">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-200 mb-1 tracking-wide">{selectedRoom} Scheduled Classes</h3>
                  <p className="text-xs text-slate-400 font-semibold font-medium">Timetable list for {getWeekday(timelineDate)}</p>
                </div>

                {roomSchedule.length > 0 ? (
                  <div className="space-y-3.5">
                    {roomSchedule.map((s, i) => (
                      <div key={i} className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl hover:border-indigo-500/20 hover:scale-[1.01] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10.5 h-10.5 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/15">
                            <BookOpen className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-200 text-sm leading-tight">{s.subject}</h4>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500 text-[11px] mt-1.5 font-semibold">
                              <span>Course: <strong className="text-slate-400">{s.course}</strong></span>
                              <span>•</span>
                              <span>Sem: <strong className="text-slate-400">{s.semester}</strong></span>
                              <span>•</span>
                              <span>Sec: <strong className="text-slate-400">{s.section}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-indigo-600/10 border border-indigo-500/15 text-indigo-400 px-4 py-2.5 rounded-xl text-center shrink-0 self-start md:self-center shadow-sm">
                          <span className="text-[9px] uppercase font-black tracking-widest block">Lecture Timing</span>
                          <span className="font-black text-sm block mt-0.5">{s.startTime} - {s.endTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-950/20 rounded-2xl border border-dashed border-slate-800">
                    <CheckCircle className="w-12 h-12 text-emerald-500/60 mx-auto mb-3 animate-pulse" />
                    <p className="text-slate-200 font-extrabold mb-1">No Classes Scheduled</p>
                    <p className="text-slate-500 text-xs font-semibold">This classroom is completely vacant the entire day.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
