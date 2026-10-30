import React, { useState, useEffect, useRef } from 'react';
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
  Shield,
  ArrowLeft,
  RefreshCw,
  KeyRound,
  Database,
  Check,
} from 'lucide-react';
import { api, setSessionToken, clearSessionToken } from '../../services/api';
import { fetchPublicSchools, subscribeToSchoolsRealtime, PublicSchool } from '../../services/supabase';
import { TenantSchool } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface LoginSekolahProps {
  onLoginSuccess: (tenant: TenantSchool, user?: any, targetTab?: any) => void;
  onOpenSuperAdmin: () => void;
}

type LoginStep = 'school_login' | 'role_selection';

export const LoginSekolah: React.FC<LoginSekolahProps> = ({ onLoginSuccess, onOpenSuperAdmin }) => {
  const [step, setStep] = useState<LoginStep>('school_login');
  const [verifiedSchool, setVerifiedSchool] = useState<PublicSchool | null>(null);
  const [jwtToken, setJwtToken] = useState<string>('');

  // Step 1: School Login States
  const [schools, setSchools] = useState<PublicSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<PublicSchool | null>(null);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolPassword, setSchoolPassword] = useState('');
  const [showSchoolPassword, setShowSchoolPassword] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // General States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSchools(false);

    // Refetch otomatis tiap 15 detik sesuai spesifikasi Tahap 1
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadSchools(true);
      }
    }, 15000);

    // Berlangganan Supabase Realtime bila memungkinkan
    const unsubscribeRealtime = subscribeToSchoolsRealtime(() => {
      loadSchools(true);
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSchools(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);

    // Close dropdown on outside click
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      clearInterval(interval);
      if (unsubscribeRealtime) unsubscribeRealtime();
      window.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const loadSchools = async (isSilent: boolean = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const res = await fetchPublicSchools();
      if (res && res.success && Array.isArray(res.schools)) {
        setSchools(res.schools);
      } else if (res && !res.success && res.error && !isSilent) {
        setErrorMessage(res.error);
      }
      setHasLoadedOnce(true);
    } catch (e: any) {
      console.error('Gagal mengambil daftar sekolah dari Supabase:', e);
      if (!isSilent) {
        setErrorMessage(
          'Gagal terhubung ke server database Supabase. Periksa koneksi internet atau variabel lingkungan Vercel.'
        );
      }
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.nama.toLowerCase().includes(schoolQuery.toLowerCase()) ||
      s.kode.toLowerCase().includes(schoolQuery.toLowerCase())
  );

  const handleSelectSchool = (school: PublicSchool) => {
    setSelectedSchool(school);
    setSchoolQuery(school.nama);
    setShowDropdown(false);
    setErrorMessage('');
  };

  // Handler Step 1: Masuk Sekolah
  const handleSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Temukan sekolah dari pilihan atau teks yang diketik
    let target = selectedSchool;
    if (!target) {
      target =
        schools.find(
          (s) =>
            s.nama.toLowerCase() === schoolQuery.trim().toLowerCase() ||
            s.kode.toLowerCase() === schoolQuery.trim().toLowerCase()
        ) || null;
    }

    if (!target) {
      setErrorMessage('Pilih sekolah yang terdaftar pada daftar pilihan.');
      return;
    }

    if (!schoolPassword) {
      setErrorMessage('Masukkan sandi sekolah.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      // POST /api/school-login membandingkan password_hash (bcrypt) di server
      // dan mengembalikan signed JWT (jose, 12 jam)
      const res = await api.loginSchool(target.id, schoolPassword);
      if (res.success && res.token) {
        setSessionToken(res.token);
        setJwtToken(res.token);
        setVerifiedSchool(target);
        setStep('role_selection');
        setStatusMessage('Autentikasi sekolah berhasil via Supabase.');
      } else {
        setErrorMessage(res.error || 'Sandi sekolah tidak sesuai.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Gagal memverifikasi sandi sekolah. Pastikan server API aktif.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSchoolLogin = () => {
    clearSessionToken();
    setStep('school_login');
    setVerifiedSchool(null);
    setJwtToken('');
    setSchoolPassword('');
    setErrorMessage('');
  };

  const handleContinueAsPlaceholder = () => {
    if (!verifiedSchool) return;
    const dummyTenant: TenantSchool = {
      id: verifiedSchool.id,
      name: verifiedSchool.nama,
      code: verifiedSchool.kode,
      npsn: verifiedSchool.kode,
      isActive: verifiedSchool.status === 'aktif',
      createdAt: new Date().toISOString(),
    };
    onLoginSuccess(dummyTenant, { name: 'Admin Sekolah', role: 'admin' }, 'presensi');
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
          <p className="text-sm text-slate-600 mt-1.5 font-medium flex items-center justify-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pusat Data Sekolah Terpusat (Supabase Multi-Device)</span>
          </p>
        </div>

        {/* STEP 1: LOGIN SEKOLAH */}
        {step === 'school_login' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Langkah 1: Masuk Akun Sekolah</h2>
                <p className="text-xs text-slate-600 mt-1">
                  Pilih sekolah Anda dari Supabase dan masukkan sandi sekolah untuk membuka gerbang.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200">
                Tahap 1 dari 2
              </span>
            </div>

            {hasLoadedOnce && schools.length === 0 && !isLoading && (
              <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <School className="w-4 h-4 text-amber-700" />
                  <span>Belum Ada Sekolah Terdaftar</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Database Supabase saat ini belum memiliki sekolah aktif. Superadmin dapat mendaftarkan sekolah melalui tombol <strong>Superadmin</strong> di pojok kanan atas.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={onOpenSuperAdmin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Buka Akses Superadmin
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {statusMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">{statusMessage}</span>
              </div>
            )}

            <form onSubmit={handleSchoolSubmit} className="space-y-5">
              {/* Input & Search Sekolah */}
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Pilih Sekolah (Supabase View)
                  </label>
                  <button
                    type="button"
                    onClick={() => loadSchools(false)}
                    disabled={isRefreshing}
                    title="Muat ulang daftar sekolah dari Supabase"
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
                      setSelectedSchool(null);
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

                {/* Dropdown Suggestions from public_schools */}
                {showDropdown && filteredSchools.length > 0 && (
                  <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-300 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    <div className="p-2 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <span>Sekolah Terdaftar di Supabase</span>
                      <span className="text-[10px] text-slate-500 lowercase font-normal">{filteredSchools.length} sekolah</span>
                    </div>
                    {filteredSchools.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSchool(s)}
                        className={`w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/50 transition flex items-center justify-between group border-b border-slate-100 last:border-0 ${
                          selectedSchool?.id === s.id ? 'bg-indigo-50 font-bold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-2">
                            <span>{s.nama}</span>
                            {selectedSchool?.id === s.id && (
                              <Check className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                          </div>
                          <div className="text-xs text-slate-700 flex items-center gap-2 mt-0.5 font-medium">
                            <span>
                              Kode: <strong className="text-slate-950 font-bold">{s.kode}</strong>
                            </span>
                            <span>•</span>
                            <span className="capitalize text-emerald-700 font-semibold">{s.status || 'aktif'}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition transform group-hover:translate-x-0.5" />
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
                    placeholder="Masukkan sandi sekolah..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
                    disabled={isLoading}
                  />
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
                    <span>Memverifikasi Sandi di Server...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjut ke Langkah 2</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: PLACEHOLDER TAHAP 1 */}
        {step === 'role_selection' && verifiedSchool && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* School Info Header */}
            <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Sekolah Terverifikasi Server
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">{verifiedSchool.nama}</h2>
                <p className="text-xs text-slate-600 font-medium">
                  Kode Sekolah: <span className="font-bold text-slate-900">{verifiedSchool.kode}</span> • ID: <span className="font-mono text-[11px] text-slate-500">{verifiedSchool.id}</span>
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

            {/* Placeholder Notification Card as per Tahap 1 requirements */}
            <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 text-slate-800 space-y-4">
              <div className="flex items-center gap-2.5 text-indigo-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>Tahap 1 Selesai: Autentikasi Sekolah Supabase Berhasil</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Sekolah telah berhasil diverifikasi oleh serverless API menggunakan enkripsi <strong>bcrypt</strong> dan mendapatkan token JWT <strong>jose</strong> yang berlaku selama <strong>12 jam</strong>.
              </p>
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Status Token Sesi:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Aktif (12 Jam)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Sumber Data:</span>
                  <span className="font-mono text-slate-900 font-semibold">Supabase PostgreSQL (schools)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Penyimpanan Browser:</span>
                  <span className="font-bold text-slate-700">Bebas localStorage / IndexedDB</span>
                </div>
              </div>

              <div className="pt-2 text-xs text-indigo-900/80 italic">
                * Catatan: Sesuai instruksi instruksi Tahap 1, fitur pemilihan peran petugas/siswa/guru/kesiswaan dan presensi akan dihubungkan pada <strong>Tahap 2</strong>.
              </div>
            </div>

            {/* Actions for testing / flow */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleContinueAsPlaceholder}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Workspace (Tahap 1 Preview)</span>
              </button>
              <button
                type="button"
                onClick={handleBackToSchoolLogin}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-300 transition cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        )}

        {/* Footer info & Superadmin access */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 px-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Zona Waktu Asia/Jakarta (WIB) • Supabase PostgreSQL</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenSuperAdmin}
              className="hover:text-indigo-600 transition flex items-center gap-1 text-slate-600 font-semibold cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Akses Superadmin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
