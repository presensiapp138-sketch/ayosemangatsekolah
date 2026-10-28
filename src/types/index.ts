/**
 * Definisi Tipe Data Sistem Presensi Sekolah Multi-Tenant
 */

export type UserRole = 'superadmin' | 'admin' | 'petugas' | 'wali_kelas' | 'kesiswaan' | 'kepala_sekolah';

export type AttendanceStatus = 'hadir' | 'terlambat' | 'sakit' | 'izin' | 'alpha';

export type AttendanceMethod = 'manual' | 'barcode' | 'rfid';

export type BathroomPermitType = 'BAB' | 'BAK'; // BAB maks 10 menit, BAK maks 5 menit

export interface TenantSchool {
  id: string;
  name: string;
  code: string;
  npsn: string;
  email?: string;
  databaseEmail?: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string;
  emailVerifiedBy?: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  driveFolderId?: string;
  spreadsheetId?: string;
  lastSyncTime?: string;
  syncStatus?: 'connected' | 'disconnected' | 'error' | 'pending';
  syncErrorMessage?: string;
  createdAt: string;
}

export interface InternalUser {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string;
  assignedClassId?: string; // Khusus Wali Kelas
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AcademicYear {
  id: string;
  tenantId: string;
  name: string; // e.g. "2026/2027"
  isActive: boolean;
}

export interface AcademicSemester {
  id: string;
  tenantId: string;
  academicYearId: string;
  name: 'Ganjil' | 'Genap';
  isActive: boolean;
}

export interface SchoolProgram {
  id: string;
  tenantId: string;
  name: string; // e.g. "Reguler", "Tahfidz", "IPA", "IPS"
  code: string; // e.g. "REG", "TFZ", "IPA"
  description?: string;
  isActive: boolean;
}

export interface SchoolClass {
  id: string;
  tenantId: string;
  academicYearId: string;
  programId?: string;
  programName?: string;
  name: string; // e.g. "VII-A"
  grade: number; // e.g. 7
  waliKelasId?: string;
  waliKelasName?: string;
  waliKelasPassword?: string; // Sandi khusus kelas/wali kelas yang diatur Admin
  isActive: boolean;
}

export interface Student {
  id: string;
  tenantId: string;
  nis: string;
  nisn?: string;
  fullName: string;
  gender: 'L' | 'P';
  classId: string;
  className?: string;
  academicYearId: string;
  barcodeRfidCode?: string;
  parentPhone?: string;
  programName?: string;
  isActive: boolean;
}

export interface Teacher {
  id: string;
  tenantId: string;
  nip?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

export interface AttendanceSchedule {
  id: string;
  tenantId: string;
  sessionName: string; // "Pagi", "Siang"
  entryStartTime: string; // "06:30" - jam presensi dimulai
  entryLimitTime: string; // "07:00" - batas tepat waktu
  lateLimitTime: string; // "07:30" - batas terlambat sebelum terhitung alpha
  exitTime: string; // "14:00" - jam pulang
  transitionTime?: string; // "12:30" - jam perpindahan sesi
  operationalDays: number[]; // 1=Senin, 2=Selasa, dst
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  sessionId: string;
  studentId: string;
  studentName?: string;
  classId: string;
  className?: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  recordedAt: string; // ISO string (Asia/Jakarta)
  recordedByUserId: string;
  recordedByUserName: string;
  notes?: string;
  history?: AttendanceHistoryItem[];
}

export interface AttendanceHistoryItem {
  timestamp: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  changedByUserId: string;
  changedByUserName: string;
  reason?: string;
}

export interface BathroomPermit {
  id: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  type: BathroomPermitType;
  maxMinutes: number; // 10 untuk BAB, 5 untuk BAK
  timeOut: string; // ISO string
  timeIn?: string; // ISO string jika sudah kembali
  actualDurationMinutes?: number;
  isReturned: boolean;
  isOverdue: boolean;
  recordedByUserId: string;
  recordedByUserName: string;
  confirmedByUserId?: string;
  confirmedByUserName?: string;
}

export interface BathroomSettings {
  maxBabMinutes: number; // default 10
  maxBakMinutes: number; // default 5
  maxConcurrentPerClass: number; // default 2
  maxPermitsPerStudentPerDay: number; // default 2
}

export interface FaceDatabaseItem {
  id: string;
  tenantId: string;
  personType: 'siswa' | 'guru' | 'admin' | 'kepala_sekolah';
  personId: string;
  personName: string;
  faceEmbedding: string;
  registeredAt: string;
  registeredByUserId: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  timestamp: string;
  action: string;
  module: string;
  userId: string;
  userName: string;
  details: string;
  ipAddress?: string;
}

export interface SchoolDatabaseConfig {
  tenantId: string;
  driveFolderId: string;
  spreadsheetId: string;
  googleAuthMode: 'oauth' | 'service_account';
  isConnected: boolean;
  isValidated: boolean;
  lastValidatedAt?: string;
  lastSyncAt?: string;
  statusMessage?: string;
  sheetStructureValidation: {
    sheetName: string;
    exists: boolean;
    columnsValid: boolean;
  }[];
}

export interface SessionStatItem {
  sessionId: string;
  sessionName: string;
  entryStartTime?: string;
  entryLimitTime?: string;
  lateLimitTime?: string;
  transitionTime?: string;
  totalStudents: number;
  hadirCount: number;
  terlambatCount: number;
  sakitCount: number;
  izinCount: number;
  alphaCount: number;
  attendanceRate: number;
  tepatWaktuPercentage?: number;
  terlambatPercentage?: number;
  sakitPercentage?: number;
  izinPercentage?: number;
  alphaPercentage?: number;
}

export interface ClassStatItem {
  classId: string;
  className: string;
  totalStudents: number;
  hadirCount: number;
  terlambatCount: number;
  sakitCount: number;
  izinCount: number;
  alphaCount: number;
  attendanceRate: number;
}

export interface DashboardStats {
  totalActiveStudents: number;
  hadirCount: number;
  hadirPercentage: number;
  tepatWaktuPercentage?: number;
  terlambatCount: number;
  terlambatPercentage: number;
  sakitCount: number;
  sakitPercentage?: number;
  izinCount: number;
  izinPercentage?: number;
  alphaCount: number;
  alphaPercentage?: number;
  activeBathroomPermits: number;
  overdueBathroomPermits: number;
  lastUpdated: string;
  sessionStats?: SessionStatItem[];
  classBreakdown?: ClassStatItem[];
}

export interface SessionData {
  token: string;
  tenant: TenantSchool;
  user?: InternalUser;
}

export interface GlobalSuperadminRules {
  toleransiKeterlambatanMenit: number;
  jamMasukMaksimal: string;
  jamPulang: string;
  izinKamarMandiMaksimalMenit: number;
  maksimalIzinPerHari: number;
  maksimalIzinSerentakPerKelas: number;
  kebijakanUmum?: string;
  pesanPengumuman?: string;
  allowSundayAttendance?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MasterConfigData {
  configVersion: number;
  lastSyncTime: string;
  masterSpreadsheetId?: string;
  masterDriveFolderId?: string;
  googleDriveConnected?: boolean;
  googleSheetsConnected?: boolean;
  driveFolderUrl?: string;
  spreadsheetUrl?: string;
  totalTenants?: number;
  activeTenants?: number;
  globalRules?: GlobalSuperadminRules;
  broadcastNotice?: string;
  changeHistory?: Array<{
    id: string;
    timestamp: string;
    action: string;
    detail: string;
    by: string;
  }>;
}
