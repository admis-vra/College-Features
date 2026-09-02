import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  FileText, 
  Calendar, 
  CheckCircle, 
  RefreshCw, 
  Cpu, 
  Check, 
  Zap,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  Database,
  Trash2,
  Edit3,
  Plus,
  X
} from 'lucide-react';
import { 
  extractDocumentFromImage, 
  getSamplePreset, 
  fileToBase64, 
  OCRScanResult, 
  OCRDocType 
} from '../engines/ocrEngine';
import { 
  saveStudentSubjects 
} from '../engines/attendanceEngine';
import { 
  mergeImportedEvents 
} from '../engines/academicCalendarEngine';
import {
  db,
  getStorageQuotaInfo,
  StorageQuotaInfo
} from '../storage/db';

interface ScannerVaultViewProps {
  onSyncComplete?: (type: OCRDocType, summary: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const ScannerVaultView: React.FC<ScannerVaultViewProps> = ({ onSyncComplete }) => {
  const [selectedDocType, setSelectedDocType] = useState<OCRDocType>('AUTO_DETECT');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<OCRScanResult | null>(null);
  const [activeSyncSuccess, setActiveSyncSuccess] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<StorageQuotaInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subject Table Refinement & Cleaning States
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSubjectData, setEditSubjectData] = useState<{ name: string; code: string; attended: number; total: number }>({
    name: '',
    code: '',
    attended: 0,
    total: 0
  });

  const handleDeleteSubjectRow = (index: number) => {
    if (!scanResult || !scanResult.extractedData.subjects) return;
    const updated = scanResult.extractedData.subjects.filter((_, idx) => idx !== index);
    const totalAtt = updated.reduce((a, b) => a + b.attended, 0);
    const totalCond = updated.reduce((a, b) => a + b.total, 0);
    const pct = totalCond > 0 ? ((totalAtt / totalCond) * 100).toFixed(1) : '0';

    setScanResult({
      ...scanResult,
      summaryText: `Extracted ${updated.length} subjects with ${pct}% overall attendance from ERP dashboard screenshot.`,
      extractedData: {
        ...scanResult.extractedData,
        subjects: updated
      }
    });
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleStartEdit = (index: number, sub: any) => {
    setEditingIndex(index);
    setEditSubjectData({
      name: sub.name,
      code: sub.code || 'CORE',
      attended: sub.attended,
      total: sub.total
    });
  };

  const handleSaveEdit = (index: number) => {
    if (!scanResult || !scanResult.extractedData.subjects) return;
    const updated = [...scanResult.extractedData.subjects];
    updated[index] = {
      ...updated[index],
      name: editSubjectData.name.trim() || updated[index].name,
      code: editSubjectData.code.trim() || updated[index].code,
      attended: Math.max(0, editSubjectData.attended),
      total: Math.max(1, editSubjectData.total)
    };
    const totalAtt = updated.reduce((a, b) => a + b.attended, 0);
    const totalCond = updated.reduce((a, b) => a + b.total, 0);
    const pct = totalCond > 0 ? ((totalAtt / totalCond) * 100).toFixed(1) : '0';

    setScanResult({
      ...scanResult,
      summaryText: `Extracted ${updated.length} subjects with ${pct}% overall attendance from ERP dashboard screenshot.`,
      extractedData: {
        ...scanResult.extractedData,
        subjects: updated
      }
    });
    setEditingIndex(null);
  };

  const handleAddSubjectRow = () => {
    if (!scanResult) return;
    const currentList = scanResult.extractedData.subjects || [];
    const newSubject = {
      id: `manual_ocr_${Date.now()}`,
      name: 'New Core Subject',
      code: `TCS-${100 + currentList.length + 1}`,
      attended: 10,
      total: 12,
      targetPercentage: 75
    };
    const updated = [...currentList, newSubject];
    const totalAtt = updated.reduce((a, b) => a + b.attended, 0);
    const totalCond = updated.reduce((a, b) => a + b.total, 0);
    const pct = totalCond > 0 ? ((totalAtt / totalCond) * 100).toFixed(1) : '0';

    setScanResult({
      ...scanResult,
      summaryText: `Extracted ${updated.length} subjects with ${pct}% overall attendance from ERP dashboard screenshot.`,
      extractedData: {
        ...scanResult.extractedData,
        subjects: updated
      }
    });
  };

  useEffect(() => {
    getStorageQuotaInfo().then(setStorageQuota);
  }, [scanResult]);

  // Handle local image file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setPreviewImage(base64);
      processImage(base64);
    } catch (err) {
      console.error('File load error:', err);
    }
  };

  // Drag and drop handler
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const base64 = await fileToBase64(file);
      setPreviewImage(base64);
      processImage(base64);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Run OCR Pipeline
  const processImage = async (base64: string) => {
    setIsScanning(true);
    setScanProgress('Analyzing image layout & optical text recognition...');
    setActiveSyncSuccess(null);

    try {
      const result = await extractDocumentFromImage(base64, selectedDocType);
      setScanResult(result);
      await db.addScanToVault(result, base64);
      setIsScanning(false);
      setScanProgress('');
    } catch (err: any) {
      console.error('Scan processing error:', err);
      setIsScanning(false);
      setScanProgress('Error processing image. Please try again.');
    }
  };

  // Load 1-Click Test Demo Preset
  const handleLoadPreset = (type: 'ERP_ATTENDANCE' | 'ACADEMIC_CALENDAR' | 'TIMETABLE') => {
    setIsScanning(true);
    setScanProgress(`Loading high-accuracy ${type.replace('_', ' ')} vision sample...`);
    setActiveSyncSuccess(null);

    setTimeout(() => {
      const preset = getSamplePreset(type);
      setScanResult(preset);
      setIsScanning(false);
      setScanProgress('');
    }, 450);
  };

  // Save / Sync to Local Agent Knowledge Base
  const handleSyncToKnowledgeBase = () => {
    if (!scanResult) return;

    if (scanResult.docType === 'ERP_ATTENDANCE' && scanResult.extractedData.subjects) {
      saveStudentSubjects(scanResult.extractedData.subjects);
      setActiveSyncSuccess(`Successfully attached ${scanResult.extractedData.subjects.length} ERP subjects to live attendance engine!`);
      if (onSyncComplete) onSyncComplete('ERP_ATTENDANCE', scanResult.summaryText);
    } else if (scanResult.docType === 'ACADEMIC_CALENDAR' && scanResult.extractedData.calendarEvents) {
      mergeImportedEvents(scanResult.extractedData.calendarEvents, false);
      setActiveSyncSuccess(`Successfully merged ${scanResult.extractedData.calendarEvents.length} calendar events into your semester schedule!`);
      if (onSyncComplete) onSyncComplete('ACADEMIC_CALENDAR', scanResult.summaryText);
    } else if (scanResult.docType === 'TIMETABLE' && scanResult.extractedData.timetable) {
      setActiveSyncSuccess(`Successfully loaded ${scanResult.extractedData.timetable.length} periods into weekly timetable.`);
      if (onSyncComplete) onSyncComplete('TIMETABLE', scanResult.summaryText);
    } else {
      setActiveSyncSuccess('Data attached to AI Agent context.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Multimodal Vision & OCR Agent
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              Screenshot & Document AI Vault
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
              Upload or paste screenshots of your <strong className="text-indigo-300">ERP Attendance</strong> dashboard. Our autonomous OCR engine parses subjects, attended/conducted counts, and percentages so you can review, edit, and sync immediately.
            </p>
            {storageQuota && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>IndexedDB Engine: <strong className="text-white font-mono">{storageQuota.usageFormatted}</strong> used of <strong className="text-emerald-300 font-mono">{storageQuota.quotaFormatted}</strong> available</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleLoadPreset('ERP_ATTENDANCE')}
              className="px-4 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Load Sample ERP Attendance
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload Dropzone & Extracted Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Dropzone & Category Filter (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              Upload Document / Screenshot
            </h3>

            {/* Target Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400">Document Target</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'AUTO_DETECT', label: 'Auto-Detect' },
                  { id: 'ERP_ATTENDANCE', label: 'ERP Attendance' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedDocType(opt.id as OCRDocType)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all text-left ${
                      selectedDocType === opt.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-400/70 bg-indigo-950/20 hover:bg-indigo-950/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {previewImage ? (
                <div className="space-y-2">
                  <img src={previewImage} alt="Uploaded preview" className="max-h-32 rounded-xl object-contain mx-auto border border-indigo-500/40" />
                  <p className="text-xs text-indigo-300 font-semibold">Click or drop to replace image</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform mb-4 shadow-lg shadow-indigo-500/10">
                    <Upload className="w-7 h-7" />
                  </div>

                  <p className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors">
                    Drop screenshot here or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
                    Supports PNG, JPG, JPEG, or WebP screenshots from university portals & noticeboards.
                  </p>
                </>
              )}
            </div>

            {/* Quick Tips */}
            <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50 space-y-2">
              <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                OCR Power Tips:
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Capture clear screenshots with subject names and numbers visible.</li>
                <li>You can also paste images directly in the <strong>AI Chat tab (Ctrl+V)</strong>!</li>
                <li>Extracted data is deterministic and processed instantly in your browser.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Scan & Extracted Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {isScanning && (
            <div className="bg-slate-900/90 border border-indigo-500/40 rounded-3xl p-10 backdrop-blur-xl flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
              <div className="relative">
                <RefreshCw className="w-12 h-12 text-indigo-400 animate-spin" />
                <Cpu className="w-6 h-6 text-indigo-200 absolute inset-0 m-auto" />
              </div>
              <h4 className="text-lg font-bold text-white">Extracting Academic Data...</h4>
              <p className="text-xs text-indigo-300">{scanProgress}</p>
            </div>
          )}

          {!isScanning && scanResult && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-fadeIn">
              
              {/* Scan Status Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase">
                      {scanResult.docType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {scanResult.processingTimeMs}ms
                    </span>
                    <span className="text-xs text-indigo-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {scanResult.confidence}% confidence
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">Extracted Intelligence Summary</h3>
                  <p className="text-xs text-slate-300">{scanResult.summaryText}</p>
                </div>

                <button
                  onClick={handleSyncToKnowledgeBase}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 justify-center hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  <Check className="w-4 h-4" />
                  Attach & Sync to AI Agent
                </button>
              </div>

              {/* Sync Success Feedback */}
              {activeSyncSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3 animate-fadeIn">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{activeSyncSuccess}</span>
                </div>
              )}

              {/* Extracted ERP Subjects Table */}
              {scanResult.extractedData.subjects && scanResult.extractedData.subjects.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      Extracted ERP Subjects ({scanResult.extractedData.subjects.length})
                    </h4>
                    <button
                      onClick={handleAddSubjectRow}
                      className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Subject
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">Subject Name</th>
                          <th className="p-3">Code</th>
                          <th className="p-3 text-center">Attended / Total</th>
                          <th className="p-3 text-center">Current %</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        {scanResult.extractedData.subjects.map((sub, idx) => {
                          const isEditingThis = editingIndex === idx;
                          const pct = sub.total > 0 ? ((sub.attended / sub.total) * 100).toFixed(1) : '0';
                          const isSafe = parseFloat(pct) >= 75;

                          if (isEditingThis) {
                            return (
                              <tr key={sub.id || idx} className="bg-indigo-950/30">
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={editSubjectData.name}
                                    onChange={(e) => setEditSubjectData({ ...editSubjectData, name: e.target.value })}
                                    className="w-full bg-slate-900 border border-indigo-500/60 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                                    placeholder="Subject Name"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="text"
                                    value={editSubjectData.code}
                                    onChange={(e) => setEditSubjectData({ ...editSubjectData, code: e.target.value })}
                                    className="w-20 bg-slate-900 border border-indigo-500/60 rounded-lg px-2 py-1 text-xs text-indigo-300 font-mono focus:outline-none"
                                    placeholder="Code"
                                  />
                                </td>
                                <td className="p-2.5 text-center">
                                  <div className="inline-flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={editSubjectData.attended}
                                      onChange={(e) => setEditSubjectData({ ...editSubjectData, attended: parseInt(e.target.value, 10) || 0 })}
                                      className="w-14 bg-slate-900 border border-indigo-500/60 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono text-center focus:outline-none"
                                    />
                                    <span>/</span>
                                    <input
                                      type="number"
                                      value={editSubjectData.total}
                                      onChange={(e) => setEditSubjectData({ ...editSubjectData, total: parseInt(e.target.value, 10) || 0 })}
                                      className="w-14 bg-slate-900 border border-indigo-500/60 rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:outline-none"
                                    />
                                  </div>
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-xs text-indigo-300">
                                  {editSubjectData.total > 0 ? ((editSubjectData.attended / editSubjectData.total) * 100).toFixed(1) : '0'}%
                                </td>
                                <td className="p-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleSaveEdit(idx)}
                                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                      title="Save row"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingIndex(null)}
                                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={sub.id || idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-3 font-medium text-white">{sub.name}</td>
                              <td className="p-3 font-mono text-indigo-300">{sub.code || 'CORE'}</td>
                              <td className="p-3 text-center font-mono">
                                <span className="text-emerald-400 font-semibold">{sub.attended}</span> / {sub.total}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-md font-bold ${
                                  isSafe ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                  {pct}%
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleStartEdit(idx, sub)}
                                    className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                    title="Edit subject row"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubjectRow(idx)}
                                    className="p-1.5 bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-lg transition-colors"
                                    title="Delete invalid subject row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Extracted Academic Calendar Events */}
              {scanResult.extractedData.calendarEvents && scanResult.extractedData.calendarEvents.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    Extracted Academic Events ({scanResult.extractedData.calendarEvents.length})
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {scanResult.extractedData.calendarEvents.map((evt, idx) => (
                      <div key={evt.id || idx} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 hover:border-purple-500/40 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            evt.type === 'EXAM' ? 'bg-red-500/20 text-red-300' :
                            evt.type === 'MIDTERM' ? 'bg-amber-500/20 text-amber-300' :
                            evt.type === 'HOLIDAY' ? 'bg-emerald-500/20 text-emerald-300' :
                            'bg-indigo-500/20 text-indigo-300'
                          }`}>
                            {evt.type}
                          </span>
                          <span className="text-[11px] font-mono text-purple-300">{evt.date}</span>
                        </div>
                        <h5 className="text-xs font-bold text-white line-clamp-1">{evt.title}</h5>
                        {evt.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">{evt.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Timetable Slots */}
              {scanResult.extractedData.timetable && scanResult.extractedData.timetable.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Extracted Scheduled Slots ({scanResult.extractedData.timetable.length})
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {scanResult.extractedData.timetable.map((slot, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-indigo-300 font-semibold">
                          <span>{slot.day}</span>
                          <span>{slot.start_time} - {slot.end_time}</span>
                        </div>
                        <h5 className="text-xs font-bold text-white">{slot.subject}</h5>
                        <p className="text-[11px] text-slate-400">Room: <strong className="text-slate-200">{slot.room_number}</strong></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isScanning && !scanResult && (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-3 text-slate-500">
              <ImageIcon className="w-12 h-12 stroke-1 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">No document scanned yet</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Upload your ERP attendance screenshot, academic calendar, or click one of the quick test presets above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
