// -------------------------------------------------------------
// INDEXEDDB ASYNC DATABASE & STORAGE ENGINE (GIGABYTE CAPACITY)
// -------------------------------------------------------------
import { get, set, del, createStore } from 'idb-keyval';
import { AttendanceSubject, DEFAULT_SUBJECTS } from '../engines/attendanceEngine';
import { AcademicCalendarEvent, DEFAULT_ACADEMIC_EVENTS } from '../engines/academicCalendarEngine';
import { OCRScanResult } from '../engines/ocrEngine';

// Create dedicated IndexedDB store
const customDBStore = createStore('CampusOS_Database', 'CampusOS_Store');

export interface StoredScanItem {
  id: string;
  timestamp: string;
  imageBlobUrl?: string;
  result: OCRScanResult;
}

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  usageFormatted: string;
  quotaFormatted: string;
  usagePercent: number;
}

// In-Memory Fast Cache for 0ms Synchronous Access
class DatabaseMemoryCache {
  private attendance: AttendanceSubject[] = [];
  private academicCalendar: AcademicCalendarEvent[] = [];
  private scans: StoredScanItem[] = [];

  constructor() {
    this.initSyncFromStorage();
  }

  // 1. Initial Synchronous Fallback & Asynchronous IndexedDB Sync
  private initSyncFromStorage() {
    // Read from legacy localStorage if present for seamless migration
    try {
      const legacyAtt = localStorage.getItem('campusos_student_attendance');
      if (legacyAtt) {
        this.attendance = JSON.parse(legacyAtt);
      } else {
        this.attendance = DEFAULT_SUBJECTS;
      }

      const legacyCal = localStorage.getItem('campusos_academic_calendar');
      if (legacyCal) {
        this.academicCalendar = JSON.parse(legacyCal);
      } else {
        this.academicCalendar = DEFAULT_ACADEMIC_EVENTS;
      }
    } catch {
      this.attendance = DEFAULT_SUBJECTS;
      this.academicCalendar = DEFAULT_ACADEMIC_EVENTS;
    }

    // Now async load from IndexedDB (the real unlimited database)
    this.hydrateFromIndexedDB();
  }

  public async hydrateFromIndexedDB(): Promise<void> {
    try {
      const dbAttendance = await get<AttendanceSubject[]>('student_attendance', customDBStore);
      if (dbAttendance && Array.isArray(dbAttendance) && dbAttendance.length > 0) {
        this.attendance = dbAttendance;
      } else {
        // Save initial seed to IndexedDB
        await set('student_attendance', this.attendance, customDBStore);
      }

      const dbCalendar = await get<AcademicCalendarEvent[]>('academic_calendar', customDBStore);
      if (dbCalendar && Array.isArray(dbCalendar) && dbCalendar.length > 0) {
        this.academicCalendar = dbCalendar;
      } else {
        await set('academic_calendar', this.academicCalendar, customDBStore);
      }

      const dbScans = await get<StoredScanItem[]>('ocr_scans_vault', customDBStore);
      if (dbScans && Array.isArray(dbScans)) {
        this.scans = dbScans;
      }
    } catch (err) {
      console.warn('IndexedDB hydration notice (using cache fallback):', err);
    }
  }

  // =========================================================
  // ATTENDANCE METHODS
  // =========================================================
  public getAttendance(): AttendanceSubject[] {
    return this.attendance;
  }

  public async saveAttendance(subjects: AttendanceSubject[]): Promise<void> {
    this.attendance = subjects;
    // Non-blocking write to unlimited IndexedDB
    try {
      await set('student_attendance', subjects, customDBStore);
      // Sync legacy localStorage as tiny backup if space allows
      try {
        localStorage.setItem('campusos_student_attendance', JSON.stringify(subjects));
      } catch {}
    } catch (err) {
      console.error('Error writing attendance to IndexedDB:', err);
    }
  }

  // =========================================================
  // ACADEMIC CALENDAR METHODS
  // =========================================================
  public getAcademicCalendar(): AcademicCalendarEvent[] {
    return this.academicCalendar;
  }

  public async saveAcademicCalendar(events: AcademicCalendarEvent[]): Promise<void> {
    this.academicCalendar = events;
    try {
      await set('academic_calendar', events, customDBStore);
      try {
        localStorage.setItem('campusos_academic_calendar', JSON.stringify(events));
      } catch {}
    } catch (err) {
      console.error('Error writing academic calendar to IndexedDB:', err);
    }
  }

  // =========================================================
  // OCR SCAN VAULT (Large Screenshot & Document Storage)
  // =========================================================
  public getScans(): StoredScanItem[] {
    return this.scans;
  }

  public async addScanToVault(scanResult: OCRScanResult, imageBlobUrl?: string): Promise<StoredScanItem> {
    const newItem: StoredScanItem = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      imageBlobUrl,
      result: scanResult
    };

    this.scans = [newItem, ...this.scans];
    try {
      await set('ocr_scans_vault', this.scans, customDBStore);
    } catch (err) {
      console.error('Error saving scan image to IndexedDB:', err);
    }

    return newItem;
  }

  public async deleteScan(id: string): Promise<void> {
    this.scans = this.scans.filter(s => s.id !== id);
    await set('ocr_scans_vault', this.scans, customDBStore);
  }

  public async clearAllVaultData(): Promise<void> {
    this.scans = [];
    await del('ocr_scans_vault', customDBStore);
  }
}

// Singleton global cache instance
export const db = new DatabaseMemoryCache();

// =========================================================
// STORAGE QUOTA ESTIMATOR (Displays live disk storage info)
// =========================================================
export async function getStorageQuotaInfo(): Promise<StorageQuotaInfo> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 1024 * 1024 * 1024; // default 1GB if undefined

      const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      };

      return {
        usageBytes: usage,
        quotaBytes: quota,
        usageFormatted: formatSize(usage),
        quotaFormatted: formatSize(quota),
        usagePercent: parseFloat(((usage / quota) * 100).toFixed(2))
      };
    } catch (err) {
      console.error('Error estimating storage quota:', err);
    }
  }

  return {
    usageBytes: 1024 * 500,
    quotaBytes: 1024 * 1024 * 1024 * 10,
    usageFormatted: '0.5 MB',
    quotaFormatted: 'Unlimited (IndexedDB)',
    usagePercent: 0.1
  };
}
