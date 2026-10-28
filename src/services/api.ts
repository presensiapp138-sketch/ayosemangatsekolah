/**
 * Layanan API Frontend untuk Sistem Presensi Sekolah Multi-Tenant
 */
import { handleLocalFallbackRequest } from './localFallbackDB';

const SESSION_TOKEN_KEY = 'school_attendance_session_token';
const SUPER_TOKEN_KEY = 'school_superadmin_session_token';

export const getSessionToken = (): string | null => {
  return localStorage.getItem(SESSION_TOKEN_KEY);
};

export const setSessionToken = (token: string) => {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
};

export const clearSessionToken = () => {
  localStorage.removeItem(SESSION_TOKEN_KEY);
};

export const getSuperToken = (): string | null => {
  return localStorage.getItem(SUPER_TOKEN_KEY);
};

export const setSuperToken = (token: string) => {
  localStorage.setItem(SUPER_TOKEN_KEY, token);
};

export const clearSuperToken = () => {
  localStorage.removeItem(SUPER_TOKEN_KEY);
};

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getSessionToken();
  const superToken = getSuperToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (endpoint.startsWith('/api/superadmin/')) {
    if (superToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${superToken}`);
    }
  } else if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(endpoint, {
      credentials: 'include',
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // Jika server mengembalikan 404/405 atau mengembalikan halaman HTML (Vercel SPA rewrite saat API serverless belum dikonfigurasi),
    // aktifkan engine fallback lokal agar aplikasi tidak pernah error!
    if ((response.status === 404 || response.status === 405 || !isJson) && endpoint.startsWith('/api/')) {
      return await handleLocalFallbackRequest(endpoint, options);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Terjadi kesalahan pada server (HTTP ${response.status})`;
      const err: any = new Error(errorMsg);
      err.data = data;
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (networkOrServerError: any) {
    // Jika koneksi gagal (misal server mati, offline, atau backend tidak tersedia di hosting static),
    // alihkan otomatis ke database lokal in-browser
    if (endpoint.startsWith('/api/')) {
      try {
        return await handleLocalFallbackRequest(endpoint, options);
      } catch (localErr: any) {
        throw localErr;
      }
    }
    throw networkOrServerError;
  }
}

export const api = {
  // Autentikasi Sekolah & Sesi
  getSchools: () => request('/api/auth/schools'),
  loginSchool: (schoolQuery: string, password: string) =>
    request('/api/auth/login-school', {
      method: 'POST',
      body: JSON.stringify({ schoolQuery, password }),
    }),
  loginSuperadmin: (superPassword: string, superEmailOrUsername: string = 'presensiapp138@gmail.com') =>
    request('/api/auth/superadmin-login', {
      method: 'POST',
      body: JSON.stringify({
        superPassword,
        superEmail: superEmailOrUsername,
        identifier: superEmailOrUsername,
        username: superEmailOrUsername,
      }),
    }),
  selectInternalUser: (username: string, pin?: string, password?: string) =>
    request('/api/auth/internal-user', {
      method: 'POST',
      body: JSON.stringify({ username, pin, password }),
    }),
  selectRole: (payload: { role: string; name?: string; classId?: string; password?: string; username?: string }) =>
    request('/api/auth/select-role', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getRolePasswords: () => request('/api/admin/role-passwords'),
  updateRolePasswords: (payload: { admin?: string; kesiswaan?: string; kepala_sekolah?: string; defaultWaliKelas?: string }) =>
    request('/api/admin/role-passwords', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => request('/api/auth/me'),
  logout: () => {
    clearSessionToken();
    return request('/api/auth/logout', { method: 'POST' });
  },

  // Dashboard
  getDashboardStats: (date?: string, sessionId?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (sessionId) params.append('sessionId', sessionId);
    return request(`/api/dashboard/stats?${params.toString()}`);
  },

  // Master Data & Program & Kelas & Sesi
  getMasterData: () => request('/api/master-data'),
  verifyWaliKelas: (classId: string, teacherName: string, password: string) =>
    request('/api/auth/verify-wali-kelas', {
      method: 'POST',
      body: JSON.stringify({ classId, teacherName, password }),
    }),
  createProgram: (payload: { name: string; code: string; description?: string }) =>
    request('/api/admin/programs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteProgram: (id: string) =>
    request(`/api/admin/programs/${id}`, {
      method: 'DELETE',
    }),
  createClass: (payload: {
    name: string;
    grade: number;
    programId?: string;
    waliKelasId?: string;
    waliKelasPassword?: string;
  }) =>
    request('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateClass: (
    id: string,
    payload: {
      name?: string;
      grade?: number;
      programId?: string;
      waliKelasId?: string;
      waliKelasPassword?: string;
    }
  ) =>
    request(`/api/admin/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteClass: (id: string) =>
    request(`/api/admin/classes/${id}`, {
      method: 'DELETE',
    }),
  createSession: (payload: {
    sessionName: string;
    entryStartTime?: string;
    entryLimitTime: string;
    lateLimitTime?: string;
    exitTime?: string;
    transitionTime?: string;
    operationalDays?: number[];
  }) =>
    request('/api/admin/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSession: (
    id: string,
    payload: {
      sessionName?: string;
      entryStartTime?: string;
      entryLimitTime?: string;
      lateLimitTime?: string;
      exitTime?: string;
      transitionTime?: string;
      operationalDays?: number[];
      isActive?: boolean;
    }
  ) =>
    request(`/api/admin/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteSession: (id: string) =>
    request(`/api/admin/sessions/${id}`, {
      method: 'DELETE',
    }),

  // Kelola Data Siswa (CRUD Persiswa & Sinkronisasi Database)
  createStudent: (payload: {
    nis: string;
    nisn?: string;
    fullName: string;
    gender: 'L' | 'P';
    classId: string;
    barcodeRfidCode?: string;
    parentPhone?: string;
    isActive?: boolean;
  }) =>
    request('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateStudent: (
    id: string,
    payload: {
      nis?: string;
      nisn?: string;
      fullName?: string;
      gender?: 'L' | 'P';
      classId?: string;
      barcodeRfidCode?: string;
      parentPhone?: string;
      isActive?: boolean;
    }
  ) =>
    request(`/api/admin/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteStudent: (id: string) =>
    request(`/api/admin/students/${id}`, {
      method: 'DELETE',
    }),
  importStudents: (students: any[]) =>
    request('/api/admin/students/import', {
      method: 'POST',
      body: JSON.stringify({ students }),
    }),

  // Presensi
  getPresensi: (
    dateOrParams?: string | { date?: string; startDate?: string; endDate?: string; classId?: string; studentId?: string; sessionId?: string },
    classId?: string,
    sessionId?: string
  ) => {
    const params = new URLSearchParams();
    if (typeof dateOrParams === 'string') {
      if (dateOrParams) params.append('date', dateOrParams);
      if (classId) params.append('classId', classId);
      if (sessionId) params.append('sessionId', sessionId);
    } else if (dateOrParams && typeof dateOrParams === 'object') {
      if (dateOrParams.date) params.append('date', dateOrParams.date);
      if (dateOrParams.startDate) params.append('startDate', dateOrParams.startDate);
      if (dateOrParams.endDate) params.append('endDate', dateOrParams.endDate);
      if (dateOrParams.classId) params.append('classId', dateOrParams.classId);
      if (dateOrParams.studentId) params.append('studentId', dateOrParams.studentId);
      if (dateOrParams.sessionId) params.append('sessionId', dateOrParams.sessionId);
    }
    return request(`/api/presensi?${params.toString()}`);
  },
  getPresensiRange: (startDate: string, endDate: string, classId?: string, studentId?: string) => {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    if (classId && classId !== 'all') params.append('classId', classId);
    if (studentId && studentId !== 'all') params.append('studentId', studentId);
    return request(`/api/presensi?${params.toString()}`);
  },
  recordPresensi: (payload: {
    studentId?: string;
    code?: string;
    status?: string;
    method: 'manual' | 'barcode' | 'rfid';
    notes?: string;
    date?: string;
    sessionId?: string;
  }) =>
    request('/api/presensi', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Izin Kamar Mandi
  getActiveBathroomPermits: () => request('/api/izin-kamar-mandi/active'),
  getBathroomHistory: (date?: string, classId?: string, overdueOnly?: boolean) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (classId) params.append('classId', classId);
    if (overdueOnly) params.append('overdueOnly', 'true');
    return request(`/api/izin-kamar-mandi/history?${params.toString()}`);
  },
  createBathroomPermit: (studentId: string, type: 'BAB' | 'BAK') =>
    request('/api/izin-kamar-mandi', {
      method: 'POST',
      body: JSON.stringify({ studentId, type }),
    }),
  returnBathroomPermit: (permitId: string) =>
    request(`/api/izin-kamar-mandi/${permitId}/return`, {
      method: 'POST',
    }),

  // Database Settings & Google Sheets
  getDatabaseSettings: () => request('/api/database/settings'),
  saveDatabaseConfig: (driveFolderId: string, spreadsheetId: string) =>
    request('/api/database/save-config', {
      method: 'POST',
      body: JSON.stringify({ driveFolderId, spreadsheetId }),
    }),
  testGoogleConnection: (payload: { driveFolderId?: string; spreadsheetId?: string; accessToken?: string }) =>
    request('/api/database/test-connection', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  initializeSheets: (spreadsheetId?: string, accessToken?: string) =>
    request('/api/database/initialize-sheets', {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId, accessToken }),
    }),
  syncDatabase: () =>
    request('/api/database/sync', {
      method: 'POST',
    }),

  // Cadangan & Pemulihan
  createBackup: () => request('/api/backup/create', { method: 'POST' }),
  getBackupList: () => request('/api/backup/list'),
  restoreBackup: (backupId: string) =>
    request('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backupId }),
    }),

  // Pengguna Internal
  createInternalUser: (user: {
    username: string;
    fullName: string;
    role: string;
    pin?: string;
    email?: string;
    assignedClassId?: string;
  }) =>
    request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    }),

  // Audit Log
  getAuditLogs: () => request('/api/admin/audit-logs'),

  // Superadmin
  // Pengaturan Peraturan Sekolah (Terisolasi per-Tenant)
  getSchoolRules: () => request('/api/admin/rules'),
  saveSchoolRules: (rules: any) =>
    request('/api/admin/rules', {
      method: 'POST',
      body: JSON.stringify(rules),
    }),

  // Superadmin
  getSuperadminTenants: (tokenOverride?: string) => {
    const superToken = (typeof tokenOverride === 'string' && tokenOverride.trim().length > 0)
      ? tokenOverride.trim()
      : getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken && typeof superToken === 'string') {
      headers['Authorization'] = `Bearer ${superToken}`;
    }
    return request('/api/superadmin/tenants', { headers });
  },
  createTenant: (payload: {
    name: string;
    code: string;
    email?: string;
    npsn?: string;
    password: string;
    address?: string;
    phone?: string;
    driveFolderId?: string;
    spreadsheetId?: string;
  }) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken && typeof superToken === 'string') {
      headers['Authorization'] = `Bearer ${superToken}`;
    }
    return request('/api/superadmin/tenants', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },
  updateTenant: (tenantId: string, payload: {
    name?: string;
    code?: string;
    email?: string;
    npsn?: string;
    address?: string;
    phone?: string;
    driveFolderId?: string;
    spreadsheetId?: string;
    newPassword?: string;
    isActive?: boolean;
  }) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken && typeof superToken === 'string') {
      headers['Authorization'] = `Bearer ${superToken}`;
    }
    return request(`/api/superadmin/tenants/${tenantId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
  },
  updateTenantStatus: (tenantId: string, isActive?: boolean, newPassword?: string) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken && typeof superToken === 'string') {
      headers['Authorization'] = `Bearer ${superToken}`;
    }
    return request(`/api/superadmin/tenants/${tenantId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isActive, newPassword }),
    });
  },
  verifySchoolEmail: (tenantId: string, isVerified: boolean = true) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken && typeof superToken === 'string') {
      headers['Authorization'] = `Bearer ${superToken}`;
    }
    return request(`/api/superadmin/tenants/${tenantId}/verify-email`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isVerified }),
    });
  },
  autoCreateGoogleDatabase: (tenantId: string, accessToken: string) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken && typeof superToken === 'string') {
      headers['Authorization'] = `Bearer ${superToken}`;
    }
    return request(`/api/superadmin/tenants/${tenantId}/auto-create-database`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ accessToken }),
    });
  },
  deleteTenant: (tenantId: string, accessToken?: string) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken && typeof superToken === 'string') {
      headers['Authorization'] = `Bearer ${superToken}`;
    }
    return request(`/api/superadmin/tenants/${tenantId}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ accessToken }),
    });
  },
  getSuperadminInfo: () => request('/api/superadmin/info'),
  changeSuperadminPassword: (currentPassword: string, newPassword?: string, newEmail?: string, newUsername?: string) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken && typeof superToken === 'string') {
      headers['Authorization'] = `Bearer ${superToken}`;
    }
    return request('/api/superadmin/change-password', {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentPassword, newPassword: newPassword || undefined, newEmail: newEmail || undefined, newUsername }),
    });
  },
  logoutSuperadmin: () => {
    clearSuperToken();
    return request('/api/auth/superadmin-logout', { method: 'POST' });
  },
  getSystemVersion: () => request('/api/system/version'),
  getSuperadminConfig: () => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken) headers['Authorization'] = `Bearer ${superToken}`;
    return request('/api/superadmin/config', { headers });
  },
  saveSuperadminConfig: (payload: {
    masterSpreadsheetId?: string;
    masterDriveFolderId?: string;
    globalRules?: any;
    broadcastNotice?: string;
  }) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken) headers['Authorization'] = `Bearer ${superToken}`;
    return request('/api/superadmin/config', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  getSuperadminRules: () => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken) headers['Authorization'] = `Bearer ${superToken}`;
    return request('/api/superadmin/rules', { headers });
  },

  saveSuperadminRules: (rules: any) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken) headers['Authorization'] = `Bearer ${superToken}`;
    return request('/api/superadmin/rules', {
      method: 'POST',
      headers,
      body: JSON.stringify(rules),
    });
  },
  // Otomatisasi Sesi Presensi Real-Time
  getCurrentSession: () => request('/api/presensi/current-session'),

  // Peringkat Kedisiplinan & Keterlambatan Siswa
  getDisciplineRankings: (params: {
    timeframe?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    classId?: string;
    searchQuery?: string;
    minRecords?: number;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.timeframe) searchParams.append('timeframe', params.timeframe);
    if (params.date) searchParams.append('date', params.date);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    if (params.classId) searchParams.append('classId', params.classId);
    if (params.searchQuery) searchParams.append('searchQuery', params.searchQuery);
    if (params.minRecords !== undefined) searchParams.append('minRecords', String(params.minRecords));
    return request(`/api/discipline/rankings?${searchParams.toString()}`);
  },

  // Pengaturan Aturan & Bobot Kedisiplinan Admin Sekolah
  getDisciplineSettings: () => request('/api/admin/discipline-settings'),
  saveDisciplineSettings: (payload: {
    bobotHadirTepatWaktu?: number;
    bobotTerlambat?: number;
    bobotSakit?: number;
    bobotIzin?: number;
    bobotAlpha?: number;
    penaltiToiletOverdue?: number;
    minimumPresensiHari?: number;
  }) =>
    request('/api/admin/discipline-settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Otomasi Pembuatan Database Master Superadmin (Drive Folder & Google Sheet)
  autoCreateMasterDatabase: (accessToken?: string, allowOfflineFallback: boolean = true) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken) headers['Authorization'] = `Bearer ${superToken}`;
    return request('/api/superadmin/auto-create-master-database', {
      method: 'POST',
      headers,
      body: JSON.stringify({ accessToken, allowOfflineFallback }),
    });
  },

  syncMasterSheet: (accessToken?: string, spreadsheetId?: string) => {
    const superToken = getSuperToken();
    const headers: Record<string, string> = {};
    if (superToken) headers['Authorization'] = `Bearer ${superToken}`;
    return request('/api/superadmin/sync-master-sheet', {
      method: 'POST',
      headers,
      body: JSON.stringify({ accessToken, spreadsheetId }),
    });
  },

  verifySchoolSession: () => request('/api/auth/verify-session'),
};
