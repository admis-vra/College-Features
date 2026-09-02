import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Search, 
  CheckCircle,
  Sparkles, 
  Menu, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  Paperclip, 
  Camera, 
  Cpu
} from 'lucide-react';
import { 
  findFreeClassrooms, 
  runAgenticAI, 
  AgentResponse, 
  WEEKDAYS 
} from './agent/agentEngine';
import {
  loadStudentSubjects,
  saveStudentSubjects,
  calculateSubjectMetrics,
  calculateOverallAttendance,
  AttendanceSubject,
  SubjectAttendanceMetrics
} from './engines/attendanceEngine';
import { ScannerVaultView } from './components/ScannerVaultView';
import { OCRDocType, fileToBase64 } from './engines/ocrEngine';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  imagePreview?: string;
  widget?: AgentResponse['widget'];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'scan' | 'attendance' | 'find'>('chat');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Attendance Lab States
  const [studentSubjects, setStudentSubjects] = useState<AttendanceSubject[]>(() => loadStudentSubjects());
  const [isEditingSubject, setIsEditingSubject] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<AttendanceSubject>({
    id: '',
    name: '',
    code: '',
    attended: 0,
    total: 0,
    targetPercentage: 75
  });

  // Calculate live overall attendance
  const overallMetrics = calculateOverallAttendance(studentSubjects);
  const subjectMetricsList: SubjectAttendanceMetrics[] = studentSubjects.map(s => calculateSubjectMetrics(s));

  // Persist subjects on change
  const updateSubjectsList = (newList: AttendanceSubject[]) => {
    setStudentSubjects(newList);
    saveStudentSubjects(newList);
  };

  // Quick manual attendance increment (+1 Present or +1 Absent) anytime!
  const handleQuickUpdate = (id: string, type: 'ATTENDED' | 'MISSED') => {
    const updated = studentSubjects.map(s => {
      if (s.id === id) {
        if (type === 'ATTENDED') {
          return { ...s, attended: s.attended + 1, total: s.total + 1 };
        } else {
          return { ...s, total: s.total + 1 };
        }
      }
      return s;
    });
    updateSubjectsList(updated);
  };

  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Hi! I'm your GEHU AI Campus Assistant.\n\nI provide instant classroom availability, attendance safety analytics, and multimodal OCR document extraction.\n\n💡 **Try asking or pasting a screenshot:**\n• \"What is my overall attendance?\"\n• \"Can I bunk my next class in C++?\"\n• \"How many classes to reach 75% in DBMS?\"\n• \"Which classrooms are free right now?\"\n• *Paste or upload an ERP screenshot anytime!*",
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [attachedImage, setAttachedImage] = useState<{ base64: string; docType: OCRDocType; name: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Manual Tab states (Vacant room finder)
  const [findDate, setFindDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [findStart, setFindStart] = useState('09:00 AM');
  const [findEnd, setFindEnd] = useState('10:00 AM');
  const [findType, setFindType] = useState<'ALL' | 'CR' | 'LT' | 'LAB'>('CR');
  const [findResults, setFindResults] = useState<string[]>([]);
  const [searchedFind, setSearchedFind] = useState(false);

  // Auto-scroll chat smoothly inside container
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Clipboard Paste Support for Screenshots in Chat
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (activeTab !== 'chat') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const base64 = await fileToBase64(blob);
            setAttachedImage({
              base64,
              docType: 'AUTO_DETECT',
              name: 'Pasted Screenshot.png'
            });
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  const getWeekday = (dateStr: string) => {
    if (!dateStr) return 'Monday';
    const date = new Date(dateStr);
    const day = date.getDay();
    return WEEKDAYS[day === 0 ? 6 : day - 1];
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

  // Chat Image File Picker
  const handleChatFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await fileToBase64(file);
    setAttachedImage({
      base64,
      docType: 'AUTO_DETECT',
      name: file.name
    });
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() && !attachedImage) return;

    const userText = inputVal || (attachedImage ? `Analyze and attach this document screenshot: ${attachedImage.name}` : '');
    const currentAttachment = attachedImage;

    setInputVal('');
    setAttachedImage(null);

    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      sender: 'user',
      text: userText,
      imagePreview: currentAttachment?.base64,
      timestamp: new Date()
    }]);

    setIsTyping(true);

    try {
      const agentResult = await runAgenticAI(
        userText,
        currentAttachment ? {
          dataUrl: currentAttachment.base64,
          docType: currentAttachment.docType,
          name: currentAttachment.name
        } : undefined
      );

      // Refresh student subjects if OCR updated them
      setStudentSubjects(loadStudentSubjects());

      const botMsgId = (Date.now() + 1).toString();
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: botMsgId,
        sender: 'bot',
        text: agentResult.text,
        timestamp: new Date(),
        widget: agentResult.widget
      }]);
    } catch (err: any) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `⚠️ An error occurred while processing your request: ${err.message || err}`,
        timestamp: new Date()
      }]);
    }
  };

  const handleSuggestionClick = (query: string) => {
    setInputVal(query);
  };

  const handleSaveSubjectModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject.name.trim()) return;

    if (editingSubject.id) {
      const updated = studentSubjects.map(s => s.id === editingSubject.id ? editingSubject : s);
      updateSubjectsList(updated);
    } else {
      const newSub: AttendanceSubject = {
        ...editingSubject,
        id: `sub_${Date.now()}`
      };
      updateSubjectsList([...studentSubjects, newSub]);
    }

    setIsEditingSubject(false);
  };

  const handleDeleteSubject = (id: string) => {
    const updated = studentSubjects.filter(s => s.id !== id);
    updateSubjectsList(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-base text-white tracking-tight">CampusOS</span>
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              AI v2.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Attendance Pill */}
          <button 
            onClick={() => setActiveTab('attendance')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs"
          >
            <div className={`w-2 h-2 rounded-full ${overallMetrics.overallPercentage >= 75 ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <strong className="text-white font-mono">{overallMetrics.overallPercentage}%</strong>
          </button>

          {/* Mobile Drawer Button */}
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle Navigation"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[57px] bottom-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 px-4 py-4 space-y-2 overflow-y-auto animate-fadeIn">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">
            Navigation Menu
          </div>
          {[
            { id: 'chat', label: 'AI Assistant', icon: Bot },
            { id: 'scan', label: 'Smart OCR Scanner', icon: Camera, badge: 'New' },
            { id: 'attendance', label: 'Attendance Lab', icon: TrendingUp },
            { id: 'find', label: 'Vacant Rooms', icon: Search }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setMobileDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900 bg-slate-900/60 border border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-500/30 text-indigo-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-64 xl:w-72 h-screen sticky top-0 flex-col justify-between border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-2xl p-4 shrink-0 select-none z-30 overflow-y-auto">
        {/* Brand & Links */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-white tracking-tight">CampusOS</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">GEHU Student Suite</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Features & Navigation
            </div>
            {[
              { id: 'chat', label: 'AI Assistant', icon: Bot },
              { id: 'scan', label: 'Smart OCR Scanner', icon: Camera, badge: 'New' },
              { id: 'attendance', label: 'Attendance Lab', icon: TrendingUp },
              { id: 'find', label: 'Vacant Rooms', icon: Search }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Widgets */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          {/* Quick Attendance Widget Card */}
          <div
            onClick={() => setActiveTab('attendance')}
            className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-slate-400">Total Attendance</span>
              <span className={`text-xs font-mono font-bold ${overallMetrics.overallPercentage >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                {overallMetrics.overallPercentage}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallMetrics.overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, overallMetrics.overallPercentage))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
              <span>{overallMetrics.overallPercentage >= 75 ? '🟢 Safe (≥75%)' : '🔴 Low Attendance'}</span>
              <span className="text-indigo-400 group-hover:underline">Manage →</span>
            </div>
          </div>

          {/* System Ready Tag */}
          <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              GEHU Engine Ready
            </span>
            <span className="font-mono">v2.0</span>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-4 sm:p-6 lg:p-8">
        
        {/* ======================================================== */}
        {/* TAB 1: AI CHAT ASSISTANT (PRIMARY INTERFACE) */}
        {/* ======================================================== */}
        {activeTab === 'chat' && (
          <div className="max-w-5xl mx-auto h-[calc(100dvh-5rem)] lg:h-[calc(100vh-4rem)] flex flex-col bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden animate-fadeIn">
            
            {/* Chat Top Banner */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Campus AI Operating Assistant
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </h2>
                  <p className="text-[11px] text-slate-400">Deterministic Schedule, Attendance & OCR Extraction Engine</p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('scan')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-200 text-xs font-semibold rounded-xl transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
                Open OCR Scanner Vault
              </button>
            </div>

            {/* Chat Message Scrollable Container */}
            <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${
                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800 text-indigo-400 border border-slate-700'
                  }`}>
                    {msg.sender === 'user' ? 'You' : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div className="space-y-3 max-w-2xl">
                    <div className={`p-4 rounded-3xl text-xs md:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-900/30'
                        : 'bg-slate-950/70 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                    }`}>
                      {/* Attached Image Preview in User Bubble */}
                      {msg.imagePreview && (
                        <div className="mb-3 rounded-2xl overflow-hidden border border-indigo-400/40 max-h-48 max-w-sm">
                          <img src={msg.imagePreview} alt="Uploaded screenshot" className="w-full object-cover" />
                        </div>
                      )}
                      
                      <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                    </div>

                    {/* Interactive Agent Widgets */}
                    {msg.widget && (
                      <div className="animate-fadeIn">
                        {/* Widget: OCR Attachment Result */}
                        {msg.widget.type === 'ocr_attachment_result' && (
                          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                Synchronized to Local Knowledge Base
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono">
                                Auto-Attached
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setActiveTab('attendance')}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30"
                              >
                                View in Attendance Lab →
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Widget: Free Rooms */}
                        {msg.widget.type === 'free_rooms' && (
                          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                              <Search className="w-3.5 h-3.5 text-indigo-400" />
                              {msg.widget.title}
                            </h4>
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                              {msg.widget.data.rooms.map((room: string, i: number) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-white">
                                  {room}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Widget: Semester Attendance Forecast */}
                        {msg.widget.type === 'semester_attendance_forecast' && (
                          <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/40 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-indigo-400" />
                                {msg.widget.data.subjectName}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                                msg.widget.data.is75Achievable ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {msg.widget.data.is75Achievable ? '75% Target Feasible' : 'Critical Margin'}
                              </span>
                            </div>

                            {/* Projection Metric Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                                <div className="text-[9px] text-slate-400 uppercase">Current</div>
                                <div className="text-xs font-bold text-white font-mono">{msg.widget.data.currentPercentage}%</div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                                <div className="text-[9px] text-slate-400 uppercase">Max Achievable</div>
                                <div className="text-xs font-bold text-indigo-300 font-mono">{msg.widget.data.maxAchievablePercentage}%</div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                                <div className="text-[9px] text-slate-400 uppercase">Must Attend</div>
                                <div className="text-xs font-bold text-emerald-400 font-mono">{msg.widget.data.minClassesToAttendFor75} classes</div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                                <div className="text-[9px] text-slate-400 uppercase">Safe Bunks Left</div>
                                <div className="text-xs font-bold text-amber-300 font-mono">{msg.widget.data.maxBunksAllowedAcrossSemester} classes</div>
                              </div>
                            </div>

                            <button
                              onClick={() => setActiveTab('attendance')}
                              className="w-full mt-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                            >
                              Manage Subject in Attendance Lab →
                            </button>
                          </div>
                        )}

                        {/* Widget: Daily Attendance Check-In in Chat */}
                        {msg.widget.type === 'daily_attendance_checkin' && (
                          <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/40 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                {msg.widget.title}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                {msg.widget.data.dayName}
                              </span>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {msg.widget.data.subjects.map((subItem: any, idx: number) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                                  <div className="font-semibold text-white truncate max-w-[180px]">{subItem.subject.name}</div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-400">{subItem.subject.attended}/{subItem.subject.total}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      subItem.status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                      subItem.status === 'ABSENT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                      subItem.status === 'CANCELLED' ? 'bg-slate-800 text-slate-300' : 'bg-amber-500/20 text-amber-300'
                                    }`}>
                                      {subItem.status === 'PRESENT' ? '✅ Attended' : subItem.status === 'ABSENT' ? '❌ Absent' : subItem.status === 'CANCELLED' ? '⏸️ Off' : '⏳ Pending'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => setActiveTab('attendance')}
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30"
                            >
                              Open Check-In Form in Attendance Lab →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 mr-auto items-center text-xs text-slate-400 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 w-fit animate-pulse">
                  <Cpu className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Agent is executing deterministic tools & querying database...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="px-4 sm:px-6 py-2.5 bg-slate-950/50 border-t border-slate-800/60 overflow-x-auto flex gap-2">
              {[
                "What is my overall attendance?",
                "Can I bunk class in C++?",
                "How many classes to reach 75% in DBMS?",
                "Which subject has my lowest attendance?",
                "Is any classroom empty right now?"
              ].map((sugg, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(sugg)}
                  className="px-3 py-1 bg-slate-800/60 hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-700/60 text-slate-300 text-xs rounded-full whitespace-nowrap transition-all"
                >
                  {sugg}
                </button>
              ))}
            </div>

            {/* Chat Input & Screenshot Attachment Bar */}
            <form onSubmit={handleChatSubmit} className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
              
              {/* Image Preview Chip if Attached */}
              {attachedImage && (
                <div className="flex items-center gap-3 p-2 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 w-fit animate-fadeIn">
                  <img src={attachedImage.base64} alt="preview" className="w-10 h-10 object-cover rounded-lg" />
                  <div className="text-xs">
                    <div className="font-semibold text-white truncate max-w-xs">{attachedImage.name}</div>
                    <div className="text-[10px] text-indigo-300">Ready for Multimodal OCR extraction</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={chatFileInputRef}
                  accept="image/*"
                  onChange={handleChatFileSelected}
                  className="hidden"
                />

                {/* Attach Screenshot Button */}
                <button
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700/80 transition-colors flex items-center justify-center"
                  title="Upload ERP / Timetable / Calendar Screenshot (or paste with Ctrl+V)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask anything or paste screenshot (e.g. 'Can I skip DBMS tomorrow?' or paste ERP image)..."
                  className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputVal.trim() && !attachedImage}
                  className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SMART OCR & DOCUMENT VAULT */}
        {/* ======================================================== */}
        {activeTab === 'scan' && (
          <ScannerVaultView 
            onSyncComplete={() => {
              setStudentSubjects(loadStudentSubjects());
            }} 
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {/* ======================================================== */}
        {/* TAB 3: ATTENDANCE LAB & SIMULATOR */}
        {/* ======================================================== */}
        {activeTab === 'attendance' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
            
            {/* Top Attendance Stats Card */}
            <div className="bg-gradient-to-br from-indigo-900/30 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase">
                  Attendance Health Center
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">Overall Attendance: {overallMetrics.overallPercentage}%</h2>
                <p className="text-xs md:text-sm text-slate-300">
                  {overallMetrics.totalAttended} attended out of {overallMetrics.totalConducted} conducted lectures across {studentSubjects.length} enrolled subjects.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('scan')}
                  className="px-4 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Import from ERP Screenshot
                </button>
                <button
                  onClick={() => {
                    setEditingSubject({ id: '', name: '', code: '', attended: 0, total: 0, targetPercentage: 75 });
                    setIsEditingSubject(true);
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Subject
                </button>
              </div>
            </div>

            {/* Subject Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {subjectMetricsList.map((m) => {
                const isSafe = m.riskLevel === 'SAFE';
                const isWarning = m.riskLevel === 'WARNING';
                return (
                  <div
                    key={m.subject.id}
                    className={`p-6 rounded-3xl border backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4 ${
                      isSafe ? 'bg-slate-900/80 border-slate-800' : isWarning ? 'bg-amber-950/20 border-amber-500/40' : 'bg-red-950/20 border-red-500/40'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-300">{m.subject.code || 'CORE'}</span>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          isSafe ? 'bg-emerald-500/20 text-emerald-300' : isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          {m.riskLevel}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">{m.subject.name}</h4>
                      
                      {/* Attendance Stats */}
                      <div className="flex items-center justify-between text-xs py-2 border-y border-slate-800">
                        <span className="text-slate-400">Attended / Conducted:</span>
                        <span className="font-mono font-bold text-white">{m.subject.attended} / {m.subject.total}</span>
                      </div>

                      <p className="text-xs text-slate-300">{m.statusText}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-2xl font-extrabold text-white font-mono">{m.currentPercentage}%</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSubject(m.subject);
                            setIsEditingSubject(true);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                          title="Edit Subject"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(m.subject.id)}
                          className="p-2 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-300 rounded-xl"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick 1-Click Update Anytime */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleQuickUpdate(m.subject.id, 'ATTENDED')}
                        className="flex-1 py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                        title="Attended lecture (+1 to attended, +1 to total)"
                      >
                        +1 Attended
                      </button>
                      <button
                        onClick={() => handleQuickUpdate(m.subject.id, 'MISSED')}
                        className="flex-1 py-1.5 px-2 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                        title="Missed lecture (+1 to total)"
                      >
                        +1 Missed
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: VACANT CLASSROOM FINDER */}
        {/* ======================================================== */}
        {activeTab === 'find' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" />
                Find Real-Time Vacant Classrooms & Labs
              </h2>

              <form onSubmit={handleFindSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400">Date</label>
                    <input
                      type="date"
                      value={findDate}
                      onChange={(e) => setFindDate(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Start Time</label>
                    <input
                      type="text"
                      value={findStart}
                      onChange={(e) => setFindStart(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">End Time</label>
                    <input
                      type="text"
                      value={findEnd}
                      onChange={(e) => setFindEnd(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Room Type</label>
                    <select
                      value={findType}
                      onChange={(e) => setFindType(e.target.value as any)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">All Rooms</option>
                      <option value="CR">Classrooms (CR)</option>
                      <option value="LT">Lecture Theatres (LT)</option>
                      <option value="LAB">Labs</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handleUseCurrentTime}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                  >
                    ⚡ Use Current Time Slot
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30"
                  >
                    Search Vacant Rooms
                  </button>
                </div>
              </form>

              {/* Vacant Rooms Results */}
              {searchedFind && (
                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-white">
                    Found {findResults.length} Available Rooms ({getWeekday(findDate)} {findStart} - {findEnd})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {findResults.map((r, i) => (
                      <div key={i} className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-center text-xs font-bold text-indigo-300">
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Edit/Add Subject Modal */}
      {isEditingSubject && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="text-lg font-bold text-white">
              {editingSubject.id ? 'Edit Subject Attendance' : 'Add Subject'}
            </h3>

            <form onSubmit={handleSaveSubjectModal} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400">Subject Name</label>
                <input
                  type="text"
                  required
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  placeholder="e.g. Database Management Systems"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Course Code (Optional)</label>
                <input
                  type="text"
                  value={editingSubject.code || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                  placeholder="e.g. TCS-401"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400">Attended Lectures</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingSubject.attended}
                    onChange={(e) => setEditingSubject({ ...editingSubject, attended: parseInt(e.target.value, 10) || 0 })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Total Lectures</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingSubject.total}
                    onChange={(e) => setEditingSubject({ ...editingSubject, total: parseInt(e.target.value, 10) || 0 })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSubject(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
