import React, { useState, useEffect } from 'react';
import {
  School,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldAlert,
  CheckCircle2,
  Search,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  ScanLine,
  GraduationCap,
  Shield,
  Award,
  ArrowLeft,
  KeyRound,
  Check,
  RefreshCw,
} from 'lucide-react';
import { api, setSessionToken, clearSessionToken } from '../../services/api';
import { TenantSchool } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface LoginSekolahProps {
  onLoginSuccess: (tenant: TenantSchool, user?: any, targetTab?: any) => void;
  onOpenSuperAdmin: () => void;
}

type LoginStep = 'school_login' | 'role_selection';
type ActiveRoleTab = 'petugas' | 'wali_kelas' | 'kesiswaan' | 'kepsek' | 'admin';

export const LoginSekolah: React.FC<LoginSekolahProps> = ({ onLoginSuccess, onOpenSuperAdmin }) => {
  // Step State
  const [step, setStep] = useState<LoginStep>('school_login');
  const [verifiedTenant, setVerifiedTenant] = useState<TenantSchool | null>(null);
  const [classesList, setClassesList] = useState<any[]>([]);

  // Step 1: School Login States
  const [schools, setSchools] = useState<{ id: string; name: string; code: string; npsn: string; isActive: boolean }[]>([]);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolPassword, setSchoolPassword] = useState('');
  const [showSchoolPassword, setShowSchoolPassword] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Step 2: Role Selection States
  const [selectedRole, setSelectedRole] = useState<ActiveRoleTab>('petugas');
  // Petugas (Tanpa sandi)
  const [officerName, setOfficerName] = useState('Petugas Piket');
  // Wali Kelas (Pilih kelas & sandi)
  const [selectedClassId, setSelectedClassId] = useState('');
  const [waliTeacherName, setWaliTeacherName] = useState('');
  const [waliPassword, setWaliPassword] = useState('wali123');
  // Kesiswaan (Sandi)
  const [kesiswaanPassword, setKesiswaanPassword] = useState('kesiswaan123');
  // Kepala Sekolah (Sandi)
  const [kepsekPassword, setKepsekPassword] = useState('kepsek123');
  // Admin (Username & Sandi)
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [showRolePassword, setShowRolePassword] = useState(false);

  // General States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadSchools();

    // SINKRONISASI CEPAT ANTARPERANGKAT: Polling otomatis tiap 7 detik
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadSchools(true);
      }
    }, 7000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSchools(true);
      }
    };

    const handleOnline = () => {
      loadSchools(true);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const loadSchools = async (isSilent: boolean = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const res = await api.getSchools();
      if (res && res.success && Array.isArray(res.schools)) {
        setSchools(res.schools);
      }
    } catch (e: any) {
      if (!isSilent) {
        console.error('Gagal memuat daftar sekolah dari server:', e);
      }
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(schoolQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(schoolQuery.toLowerCase()) ||
      s.npsn.includes(schoolQuery)
  );

  // Handler Step 1: Masuk Sekolah
  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolQuery.trim()) {
      setErrorMessage('Pilih atau ketik nama/kode sekolah Anda.');
      return;
    }
    if (!schoolPassword) {
      setErrorMessage('Masukkan sandi sekolah.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.loginSchool(schoolQuery, schoolPassword);
      if (res.success && res.token) {
        setSessionToken(res.token);
        setVerifiedTenant(res.tenant);

        // Ambil daftar kelas sekolah untuk pilihan wali kelas
        try {
          const master = await api.getMasterData();
          if (master.success && master.data?.kelas) {
            setClassesList(master.data.kelas);
            if (master.data.kelas.length > 0) {
              setSelectedClassId(master.data.kelas[0].id);
            }
          }
        } catch (e) {
          // fallback jika offline
        }

        // Pindah ke Step 2: Pemilihan Peran
        setStep('role_selection');
      } else {
        setErrorMessage(res.error || 'Login sekolah gagal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Nama sekolah atau sandi sekolah tidak sesuai.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler Step 2: Masuk Peran (Role Login)
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedTenant) return;

    setErrorMessage('');
    setIsLoading(true);

    try {
      let payload: any = { role: selectedRole };

      if (selectedRole === 'petugas') {
        // Petugas presensi bebas sandi - cukup nama
        if (!officerName.trim()) {
          setErrorMessage('Masukkan nama petugas presensi.');
          setIsLoading(false);
          return;
        }
        payload = {
          role: 'petugas',
          name: officerName.trim(),
        };
      } else if (selectedRole === 'wali_kelas') {
        if (!selectedClassId) {
          setErrorMessage('Pilih kelas yang dituju.');
          setIsLoading(false);
          return;
        }
        if (!waliPassword) {
          setErrorMessage('Masukkan kata sandi wali kelas.');
          setIsLoading(false);
          return;
        }
        payload = {
          role: 'wali_kelas',
          classId: selectedClassId,
          password: waliPassword,
          name: waliTeacherName.trim() || undefined,
        };
      } else if (selectedRole === 'kesiswaan') {
        if (!kesiswaanPassword) {
          setErrorMessage('Masukkan kata sandi kesiswaan.');
          setIsLoading(false);
          return;
        }
        payload = {
          role: 'kesiswaan',
          password: kesiswaanPassword,
        };
      } else if (selectedRole === 'kepsek') {
        if (!kepsekPassword) {
          setErrorMessage('Masukkan kata sandi kepala sekolah.');
          setIsLoading(false);
          return;
        }
        payload = {
          role: 'kepala_sekolah',
          password: kepsekPassword,
        };
      } else if (selectedRole === 'admin') {
        if (!adminUsername.trim()) {
          setErrorMessage('Masukkan username administrator.');
          setIsLoading(false);
          return;
        }
        if (!adminPassword) {
          setErrorMessage('Masukkan kata sandi administrator.');
          setIsLoading(false);
          return;
        }
        payload = {
          role: 'admin',
          username: adminUsername.trim(),
          password: adminPassword,
        };
      }

      const res = await api.selectRole(payload);
      if (res.success) {
        onLoginSuccess(verifiedTenant, res.user, res.targetTab);
      } else {
        setErrorMessage(res.error || 'Autentikasi peran gagal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memverifikasi peran.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSchool = (school: { id: string; name: string; code: string }) => {
    setSchoolQuery(school.name);
    setShowDropdown(false);
    setErrorMessage('');
  };

  const handleBackToSchoolLogin = () => {
    clearSessionToken();
    setStep('school_login');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800">
      <div className="w-full max-w-2xl relative z-10">
        {/* Top utility row */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onOpenSuperAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-xs transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Superadmin</span>
          </button>
          <div className="flex items-center gap-2">
            <PWAInstallButton />
          </div>
        </div>

        {/* Header Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 mb-3 border border-indigo-500">
            <School className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Sistem Presensi Sekolah
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 font-medium">
            Multi-Tenant Platform Berbasis Google Drive & Google Sheets
          </p>
        </div>

        {/* STEP 1: LOGIN SEKOLAH */}
        {step === 'school_login' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Langkah 1: Masuk Akun Sekolah</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Pilih sekolah Anda dan masukkan sandi sekolah untuk membuka gerbang.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200">
                Tahap 1 dari 2
              </span>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSchoolSubmit} className="space-y-5">
              {/* Input Nama Sekolah */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Pilih atau Ketik Nama Sekolah
                  </label>
                  <button
                    type="button"
                    onClick={() => loadSchools(false)}
                    disabled={isRefreshing}
                    title="Muat ulang daftar sekolah dari server"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Muat ulang</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <School className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={schoolQuery}
                    onChange={(e) => {
                      setSchoolQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Ketik nama atau kode sekolah..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-4 h-4" />
                  </div>
                </div>

                {/* Dropdown Suggestions */}
                {showDropdown && filteredSchools.length > 0 && (
                  <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-300 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    <div className="p-2 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                      Sekolah Terdaftar
                    </div>
                    {filteredSchools.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSchool(s)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition flex items-center justify-between group border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                            {s.name}
                          </div>
                          <div className="text-xs text-slate-700 flex items-center gap-2 mt-0.5 font-medium">
                            <span>
                              Kode: <strong className="text-slate-950 font-bold">{s.code}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              NPSN: <strong className="text-slate-950 font-bold">{s.npsn || '-'}</strong>
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-600 transition transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input Sandi Sekolah */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Sandi Sekolah
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSchoolPassword(!showSchoolPassword)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    {showSchoolPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Sembunyikan
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Tampilkan
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSchoolPassword ? 'text' : 'password'}
                    value={schoolPassword}
                    onChange={(e) => setSchoolPassword(e.target.value)}
                    placeholder="Masukkan sandi sekolah (default: sekolah123)..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Demo Quick Chips */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-600 block mb-1.5 font-semibold">
                  Klik Cepat Demo (Sandi: sekolah123):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolQuery('SMP Negeri 1 Nusantara');
                      setSchoolPassword('sekolah123');
                      setShowDropdown(false);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-slate-200 transition font-medium cursor-pointer"
                  >
                    SMPN 1 Nusantara
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolQuery('SMA Negeri 2 Bangsa');
                      setSchoolPassword('sekolah123');
                      setShowDropdown(false);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-slate-200 transition font-medium cursor-pointer"
                  >
                    SMAN 2 Bangsa
                  </button>
                </div>
              </div>

              {/* Tombol Lanjut ke Pilihan Peran */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Sekolah...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjut Pilih Peran / Akun</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: PILIHAN PERAN / AKUN (PETUGAS PRESENSI, WALI KELAS, KESISWAAN, KEPSEK, ADMIN) */}
        {step === 'role_selection' && verifiedTenant && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* School Info Header with Back Button */}
            <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Sekolah Terverifikasi
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">{verifiedTenant.name}</h2>
                <p className="text-xs text-slate-600 font-medium">
                  Silakan pilih peran Anda untuk langsung masuk ke ruang kerja
                </p>
              </div>

              <button
                type="button"
                onClick={handleBackToSchoolLogin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition cursor-pointer self-start sm:self-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ganti Sekolah</span>
              </button>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Role Grid / Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('petugas');
                  setErrorMessage('');
                }}
                className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                  selectedRole === 'petugas'
                    ? 'bg-blue-50 border-blue-600 text-blue-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ScanLine className={`w-5 h-5 ${selectedRole === 'petugas' ? 'text-blue-600' : 'text-slate-500'}`} />
                <span className="text-xs font-bold leading-tight">Petugas Presensi</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                  Bebas Sandi
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('wali_kelas');
                  setErrorMessage('');
                }}
                className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                  selectedRole === 'wali_kelas'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <GraduationCap
                  className={`w-5 h-5 ${selectedRole === 'wali_kelas' ? 'text-emerald-600' : 'text-slate-500'}`}
                />
                <span className="text-xs font-bold leading-tight">Wali Kelas</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                  Pilih Kelas
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('kesiswaan');
                  setErrorMessage('');
                }}
                className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                  selectedRole === 'kesiswaan'
                    ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert
                  className={`w-5 h-5 ${selectedRole === 'kesiswaan' ? 'text-amber-600' : 'text-slate-500'}`}
                />
                <span className="text-xs font-bold leading-tight">Kesiswaan</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                  Disiplin
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('kepsek');
                  setErrorMessage('');
                }}
                className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                  selectedRole === 'kepsek'
                    ? 'bg-purple-50 border-purple-600 text-purple-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Award className={`w-5 h-5 ${selectedRole === 'kepsek' ? 'text-purple-600' : 'text-slate-500'}`} />
                <span className="text-xs font-bold leading-tight">Kepala Sekolah</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                  Monitoring
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  setErrorMessage('');
                }}
                className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 col-span-2 sm:col-span-1 ${
                  selectedRole === 'admin'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Shield className={`w-5 h-5 ${selectedRole === 'admin' ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className="text-xs font-bold leading-tight">Administrator</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                  Master Data
                </span>
              </button>
            </div>

            {/* Form Role Dinamis */}
            <form onSubmit={handleRoleSubmit} className="space-y-4">
              {/* Opsi 1: PETUGAS PRESENSI (BEBAS SANDI) */}
              {selectedRole === 'petugas' && (
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <ScanLine className="w-4 h-4 text-blue-600" />
                    <span>Petugas Presensi (Absen Barcode & RFID)</span>
                  </div>
                  <p className="text-xs text-blue-800">
                    Tidak memerlukan kata sandi. Siapapun guru atau staf piket boleh bertugas mencatat presensi siswa
                    cukup dengan memasukkan nama.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Petugas Piket / Presensi
                    </label>
                    <input
                      type="text"
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      placeholder="Contoh: Budi Santoso (Piket Gerbang)..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Opsi 2: WALI KELAS (PILIH KELAS & SANDI) */}
              {selectedRole === 'wali_kelas' && (
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <span>Wali Kelas — Masuk Langsung ke Kelas</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Pilih kelas yang Anda ampu dan masukkan kata sandi kelas untuk langsung melihat presensi kelas
                    tersebut.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Kelas</label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        {classesList.map((c) => (
                          <option key={c.id} value={c.id}>
                            Kelas {c.name} {c.waliKelasName ? `(${c.waliKelasName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Wali Kelas (Opsional)</label>
                      <input
                        type="text"
                        value={waliTeacherName}
                        onChange={(e) => setWaliTeacherName(e.target.value)}
                        placeholder="Nama guru wali kelas..."
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Kelas (Default: wali123)
                    </label>
                    <div className="relative">
                      <input
                        type={showRolePassword ? 'text' : 'password'}
                        value={waliPassword}
                        onChange={(e) => setWaliPassword(e.target.value)}
                        placeholder="Masukkan sandi wali kelas..."
                        className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRolePassword(!showRolePassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-800"
                      >
                        {showRolePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Opsi 3: KESISWAAN */}
              {selectedRole === 'kesiswaan' && (
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Tim Kesiswaan & Kedisiplinan Siswa</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Akses rekapitulasi Alpha lintas kelas, keterlambatan, dan pelanggaran batas durasi izin toilet.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Kesiswaan (Default: kesiswaan123)
                    </label>
                    <div className="relative">
                      <input
                        type={showRolePassword ? 'text' : 'password'}
                        value={kesiswaanPassword}
                        onChange={(e) => setKesiswaanPassword(e.target.value)}
                        placeholder="Masukkan sandi kesiswaan..."
                        className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRolePassword(!showRolePassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-800"
                      >
                        {showRolePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Opsi 4: KEPALA SEKOLAH */}
              {selectedRole === 'kepsek' && (
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-3">
                  <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                    <Award className="w-4 h-4 text-purple-600" />
                    <span>Kepala Sekolah (Monitoring Eksekutif)</span>
                  </div>
                  <p className="text-xs text-purple-800">
                    Pantau statistik kehadiran harian, grafik presensi, dan rekapitulasi performa sekolah.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Kepala Sekolah (Default: kepsek123)
                    </label>
                    <div className="relative">
                      <input
                        type={showRolePassword ? 'text' : 'password'}
                        value={kepsekPassword}
                        onChange={(e) => setKepsekPassword(e.target.value)}
                        placeholder="Masukkan sandi kepala sekolah..."
                        className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRolePassword(!showRolePassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-800"
                      >
                        {showRolePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Opsi 5: ADMINISTRATOR SEKOLAH */}
              {selectedRole === 'admin' && (
                <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span>Administrator Sekolah</span>
                  </div>
                  <p className="text-xs text-indigo-800">
                    Akses penuh master data, manajemen pengguna, pengaturan sandi peran, dan sinkronisasi Google Sheets.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Username Administrator (Default: admin)
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Masukkan username administrator..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 mb-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Administrator (Default: admin123)
                    </label>
                    <div className="relative">
                      <input
                        type={showRolePassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Masukkan sandi admin..."
                        className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRolePassword(!showRolePassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-800"
                      >
                        {showRolePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tombol Submit Masuk Peran */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Akses...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>
                      Masuk sebagai{' '}
                      {selectedRole === 'petugas'
                        ? 'Petugas Presensi'
                        : selectedRole === 'wali_kelas'
                        ? 'Wali Kelas'
                        : selectedRole === 'kesiswaan'
                        ? 'Kesiswaan'
                        : selectedRole === 'kepsek'
                        ? 'Kepala Sekolah'
                        : 'Administrator'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer info & Superadmin access */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 px-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Zona Waktu Asia/Jakarta (WIB)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenSuperAdmin}
              className="hover:text-indigo-600 transition flex items-center gap-1 text-slate-600 font-semibold cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Superadmin Tenant</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
