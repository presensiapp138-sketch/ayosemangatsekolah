import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Plus,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Key,
  Power,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Edit,
  Database,
  Building,
  Server,
  Search,
  Check,
  ShieldAlert,
  LogOut,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api, setSuperToken, getSuperToken, clearSuperToken } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchoolAdded?: () => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({ isOpen, onClose, onSchoolAdded }) => {
  // Setup & Auth States
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [dbStatus, setDbStatus] = useState<{
    configured: boolean;
    tablesExist: boolean;
    hasSuperadmin: boolean;
    totalSchools: number;
    message?: string;
  } | null>(null);

  // Initial Setup Form States
  const [setupToken, setSetupToken] = useState('');
  const [setupEmail, setSetupEmail] = useState('presensiapp138@gmail.com');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupNama, setSetupNama] = useState('Super Administrator');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');

  // Login States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentSuperUser, setCurrentSuperUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState('presensiapp138@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Active Tab for Superadmin Dashboard
  const [activeTab, setActiveTab] = useState<'schools' | 'database_info'>('schools');

  // Schools Management States
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Form Tambah Sekolah
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchoolNama, setNewSchoolNama] = useState('');
  const [newSchoolKode, setNewSchoolKode] = useState('');
  const [newSchoolPassword, setNewSchoolPassword] = useState('');
  const [showNewSchoolPassword, setShowNewSchoolPassword] = useState(false);
  const [isSubmittingSchool, setIsSubmittingSchool] = useState(false);
  const [addSchoolError, setAddSchoolError] = useState('');

  // Form Edit Sekolah
  const [editingSchool, setEditingSchool] = useState<any | null>(null);
  const [editSchoolNama, setEditSchoolNama] = useState('');
  const [editSchoolKode, setEditSchoolKode] = useState('');
  const [editSchoolStatus, setEditSchoolStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [editSchoolPassword, setEditSchoolPassword] = useState('');
  const [showEditSchoolPassword, setShowEditSchoolPassword] = useState(false);
  const [isUpdatingSchool, setIsUpdatingSchool] = useState(false);
  const [editSchoolError, setEditSchoolError] = useState('');

  // Delete Confirmation State
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkStatusAndSession();
    }
  }, [isOpen]);

  const checkStatusAndSession = async () => {
    setCheckingStatus(true);
    setSetupError('');
    setLoginError('');

    try {
      // 1. Cek status database dari server /api/setup
      const statusRes = await api.getSetupStatus();
      setDbStatus(statusRes);

      // 2. Cek apakah ada sesi Supabase Auth yang tersimpan
      if (supabase && isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const token = sessionData.session.access_token;
          setSuperToken(token);
          setIsAuthenticated(true);
          setCurrentSuperUser(sessionData.session.user);
          loadSchools(token);
          setCheckingStatus(false);
          return;
        }
      }

      // 3. Fallback periksa token lokal
      const localToken = getSuperToken();
      if (localToken) {
        setIsAuthenticated(true);
        loadSchools(localToken);
      }
    } catch (err: any) {
      console.warn('Check setup status warning:', err);
      setDbStatus({
        configured: false,
        tablesExist: false,
        hasSuperadmin: false,
        totalSchools: 0,
        message: err.message,
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleRunSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupToken.trim()) {
      setSetupError('SETUP_TOKEN wajib diisi sesuai environment variable server.');
      return;
    }
    if (!setupEmail.trim() || !setupPassword) {
      setSetupError('Email dan Kata Sandi Superadmin wajib diisi.');
      return;
    }

    setSetupLoading(true);
    setSetupError('');
    setSetupSuccess('');

    try {
      const res = await api.runSetup(
        {
          email: setupEmail.trim().toLowerCase(),
          password: setupPassword,
          nama: setupNama.trim() || 'Super Administrator',
        },
        setupToken.trim()
      );

      if (res.success) {
        setSetupSuccess('Setup database berhasil! Akun Superadmin telah didaftarkan ke Supabase.');
        setLoginEmail(setupEmail);
        setLoginPassword(setupPassword);

        // Perbarui status database
        const statusRes = await api.getSetupStatus();
        setDbStatus(statusRes);

        // Lakukan auto-login jika Supabase terkonfigurasi
        if (supabase && isSupabaseConfigured) {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: setupEmail.trim().toLowerCase(),
            password: setupPassword,
          });

          if (!authErr && authData?.session) {
            setSuperToken(authData.session.access_token);
            setIsAuthenticated(true);
            setCurrentSuperUser(authData.session.user);
            loadSchools(authData.session.access_token);
          }
        }
      } else {
        setSetupError(res.error || 'Setup gagal dilakukan.');
      }
    } catch (err: any) {
      setSetupError(err.message || 'Terjadi kesalahan saat memanggil /api/setup.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Email dan kata sandi wajib diisi.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      let authToken = '';

      // 1. Login via Supabase Auth jika client terkonfigurasi
      if (supabase && isSupabaseConfigured) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        });

        if (authErr) {
          throw new Error(authErr.message || 'Email atau kata sandi tidak cocok di Supabase Auth.');
        }

        if (!authData?.session) {
          throw new Error('Sesi autentikasi tidak berhasil dibuat.');
        }

        authToken = authData.session.access_token;
        setCurrentSuperUser(authData.session.user);
      } else {
        // Fallback login server superadmin
        const res = await api.loginSuperadmin(loginPassword, loginEmail.trim().toLowerCase());
        if (!res.success || !res.token) {
          throw new Error(res.error || 'Email atau kata sandi salah.');
        }
        authToken = res.token;
      }

      setSuperToken(authToken);
      setIsAuthenticated(true);
      await loadSchools(authToken);
    } catch (err: any) {
      setLoginError(err.message || 'Gagal masuk akun Superadmin.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    clearSuperToken();
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => null);
    }
    setIsAuthenticated(false);
    setCurrentSuperUser(null);
    setSchools([]);
  };

  const loadSchools = async (token?: string) => {
    setIsLoadingSchools(true);
    setActionFeedback(null);
    try {
      const activeToken = token || getSuperToken() || '';
      const res = await api.getAllSchools(activeToken);
      if (res.success && Array.isArray(res.schools)) {
        setSchools(res.schools);
      } else if (res.error) {
        setActionFeedback({ text: res.error, isError: true });
      }
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Gagal memuat data sekolah dari server.',
        isError: true,
      });
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolNama.trim()) {
      setAddSchoolError('Nama sekolah wajib diisi.');
      return;
    }
    if (!newSchoolKode.trim()) {
      setAddSchoolError('Kode sekolah wajib diisi.');
      return;
    }
    if (!newSchoolPassword || newSchoolPassword.length < 6) {
      setAddSchoolError('Sandi sekolah minimal 6 karakter.');
      return;
    }

    setIsSubmittingSchool(true);
    setAddSchoolError('');

    try {
      const token = getSuperToken() || '';
      const res = await api.createSchool(
        {
          nama: newSchoolNama.trim(),
          kode: newSchoolKode.trim().toUpperCase(),
          password: newSchoolPassword,
        },
        token
      );

      if (res.success) {
        setShowAddModal(false);
        setNewSchoolNama('');
        setNewSchoolKode('');
        setNewSchoolPassword('');
        setActionFeedback({
          text: `Sekolah "${res.school?.nama || newSchoolNama}" berhasil ditambahkan ke Supabase!`,
          isError: false,
        });
        await loadSchools(token);
        if (onSchoolAdded) onSchoolAdded();
      } else {
        setAddSchoolError(res.error || 'Gagal menambahkan sekolah.');
      }
    } catch (err: any) {
      setAddSchoolError(err.message || 'Terjadi kesalahan saat menambah sekolah.');
    } finally {
      setIsSubmittingSchool(false);
    }
  };

  const handleOpenEdit = (school: any) => {
    setEditingSchool(school);
    setEditSchoolNama(school.nama);
    setEditSchoolKode(school.kode);
    setEditSchoolStatus(school.status || 'aktif');
    setEditSchoolPassword('');
    setEditSchoolError('');
  };

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;

    if (!editSchoolNama.trim()) {
      setEditSchoolError('Nama sekolah tidak boleh kosong.');
      return;
    }
    if (!editSchoolKode.trim()) {
      setEditSchoolError('Kode sekolah tidak boleh kosong.');
      return;
    }

    setIsUpdatingSchool(true);
    setEditSchoolError('');

    try {
      const token = getSuperToken() || '';
      const res = await api.updateSchool(
        editingSchool.id,
        {
          nama: editSchoolNama.trim(),
          kode: editSchoolKode.trim().toUpperCase(),
          status: editSchoolStatus,
          password: editSchoolPassword.trim() || undefined,
        },
        token
      );

      if (res.success) {
        setEditingSchool(null);
        setActionFeedback({
          text: `Data sekolah "${editSchoolNama}" berhasil diperbarui.`,
          isError: false,
        });
        await loadSchools(token);
        if (onSchoolAdded) onSchoolAdded();
      } else {
        setEditSchoolError(res.error || 'Gagal memperbarui sekolah.');
      }
    } catch (err: any) {
      setEditSchoolError(err.message || 'Terjadi kesalahan saat memperbarui sekolah.');
    } finally {
      setIsUpdatingSchool(false);
    }
  };

  const handleToggleStatus = async (school: any) => {
    const newStatus = school.status === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      const token = getSuperToken() || '';
      const res = await api.toggleSchoolStatus(school.id, newStatus, token);
      if (res.success) {
        setActionFeedback({
          text: `Status sekolah "${school.nama}" diubah menjadi ${newStatus}.`,
          isError: false,
        });
        await loadSchools(token);
        if (onSchoolAdded) onSchoolAdded();
      }
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Gagal mengubah status sekolah.',
        isError: true,
      });
    }
  };

  const handleDeleteSchool = async (id: string) => {
    setIsDeleting(true);
    try {
      const token = getSuperToken() || '';
      const res = await api.deleteSchool(id, token);
      if (res.success) {
        setDeletingSchoolId(null);
        setActionFeedback({
          text: 'Sekolah berhasil dihapus dari database Supabase.',
          isError: false,
        });
        await loadSchools(token);
        if (onSchoolAdded) onSchoolAdded();
      } else {
        setActionFeedback({ text: res.error || 'Gagal menghapus sekolah.', isError: true });
      }
    } catch (err: any) {
      setActionFeedback({ text: err.message || 'Gagal menghapus sekolah.', isError: true });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const filteredSchools = schools.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2 text-white">
                Pusat Kendali Super Administrator
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/40">
                  Supabase Multi-Device
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pusat data sekolah terisolasi, sinkron real-time antar browser & perangkat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {checkingStatus ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600">
                Memeriksa status database Supabase...
              </p>
            </div>
          ) : !dbStatus?.hasSuperadmin && !isAuthenticated ? (
            /* ========================================================================= */
            /* FORM SETUP AWAL SUPABASE (HANYA MUNCUL JIKA BELUM ADA SUPERADMIN)        */
            /* ========================================================================= */
            <div className="max-w-xl mx-auto py-2">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 mb-3">
                  <Database className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Setup Awal Database Supabase</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Belum ada akun Superadmin terdaftar. Jalankan inisialisasi tabel (schools, profiles, RLS, view public_schools) dan buat akun Superadmin pertama.
                </p>
              </div>

              {setupError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{setupError}</span>
                </div>
              )}

              {setupSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{setupSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRunSetup} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Token Otorisasi Server (SETUP_TOKEN) *
                  </label>
                  <input
                    type="password"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    placeholder="Masukkan token dari env SETUP_TOKEN..."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nilai rahasia yang sama dengan environment variable <code>SETUP_TOKEN</code> di Vercel/server.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Superadmin *
                    </label>
                    <input
                      type="email"
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      placeholder="admin@sekolah.id"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      value={setupNama}
                      onChange={(e) => setSetupNama(e.target.value)}
                      placeholder="Super Administrator"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Kata Sandi Superadmin *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword(!showSetupPassword)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showSetupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showSetupPassword ? 'Sembunyikan' : 'Lihat'}
                    </button>
                  </div>
                  <input
                    type={showSetupPassword ? 'text' : 'password'}
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={setupLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {setupLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menjalankan Setup Database...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Jalankan Setup & Buat Akun Superadmin</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : !isAuthenticated ? (
            /* ========================================================================= */
            /* FORM LOGIN SUPERADMIN (EMAIL + SANDI SUPABASE AUTH)                       */
            /* ========================================================================= */
            <div className="max-w-md mx-auto py-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 mb-3">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Login Super Administrator</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Masuk menggunakan akun Superadmin terdaftar di Supabase Auth
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Superadmin
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@sekolah.id"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showLoginPassword ? 'Sembunyikan' : 'Lihat'}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Masuk ke Dashboard Superadmin</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ========================================================================= */
            /* DASHBOARD SUPERADMIN TERAUTENTIKASI (MANAJEMEN SEKOLAH DI SUPABASE)       */
            /* ========================================================================= */
            <div className="space-y-5">
              {/* Top Bar Status Superadmin */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    SA
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{currentSuperUser?.user_metadata?.nama || currentSuperUser?.email || 'Super Administrator'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        Supabase Terhubung
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Pusat data sekolah terdaftar: <strong>{schools.length} Sekolah</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => loadSchools()}
                    disabled={isLoadingSchools}
                    title="Segarkan data sekolah dari Supabase"
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSchools ? 'animate-spin' : ''}`} />
                    <span>Segarkan</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {actionFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 ${
                    actionFeedback.isError
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {actionFeedback.isError ? (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    )}
                    <span>{actionFeedback.text}</span>
                  </div>
                  <button
                    onClick={() => setActionFeedback(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Toolbar & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau kode sekolah..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Sekolah Baru</span>
                </button>
              </div>

              {/* Tabel Daftar Sekolah */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Nama Sekolah</th>
                        <th className="py-3 px-4">Kode Unik</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Terdaftar</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingSchools ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                            Memuat daftar sekolah dari Supabase...
                          </td>
                        </tr>
                      ) : filteredSchools.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500">
                            <Building className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                            <div className="font-semibold text-slate-700">
                              {searchQuery ? 'Tidak ada sekolah yang cocok dengan pencarian.' : 'Belum ada sekolah terdaftar di Supabase.'}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Klik tombol "Tambah Sekolah Baru" untuk mendaftarkan sekolah pertama Anda.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredSchools.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0">
                                  {s.nama?.charAt(0) || 'S'}
                                </div>
                                <span>{s.nama}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                                {s.kode}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  s.status === 'aktif'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    s.status === 'aktif' ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                                {s.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                              {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(s)}
                                  title={s.status === 'aktif' ? 'Nonaktifkan Sekolah' : 'Aktifkan Sekolah'}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer text-xs ${
                                    s.status === 'aktif'
                                      ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                      : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(s)}
                                  title="Edit Data Sekolah"
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer text-xs"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingSchoolId(s.id)}
                                  title="Hapus Sekolah"
                                  className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition cursor-pointer text-xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Pusat Data: Supabase PostgreSQL (Multi-Device Sync)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL TAMBAH SEKOLAH BARU                                                 */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Tambah Sekolah Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addSchoolError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                {addSchoolError}
              </div>
            )}

            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Sekolah *
                </label>
                <input
                  type="text"
                  value={newSchoolNama}
                  onChange={(e) => setNewSchoolNama(e.target.value)}
                  placeholder="Contoh: SMP Negeri 1 Jakarta"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kode Sekolah (Unik) *
                </label>
                <input
                  type="text"
                  value={newSchoolKode}
                  onChange={(e) => setNewSchoolKode(e.target.value.toUpperCase())}
                  placeholder="Contoh: SMPN1JKT"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden uppercase"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Digunakan siswa/guru untuk pencarian cepat di halaman login.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Sandi Masuk Sekolah *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewSchoolPassword(!showNewSchoolPassword)}
                    className="text-[11px] text-indigo-600 font-semibold"
                  >
                    {showNewSchoolPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
                <input
                  type={showNewSchoolPassword ? 'text' : 'password'}
                  value={newSchoolPassword}
                  onChange={(e) => setNewSchoolPassword(e.target.value)}
                  placeholder="Minimal 6 karakter..."
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sandi ini di-hash dengan bcryptjs di server sebelum disimpan ke Supabase.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSchool}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isSubmittingSchool ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan ke Supabase</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDIT DATA SEKOLAH                                                   */}
      {/* ========================================================================= */}
      {editingSchool && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-600" />
                Edit Data Sekolah
              </h3>
              <button
                onClick={() => setEditingSchool(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editSchoolError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                {editSchoolError}
              </div>
            )}

            <form onSubmit={handleUpdateSchool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Sekolah *
                </label>
                <input
                  type="text"
                  value={editSchoolNama}
                  onChange={(e) => setEditSchoolNama(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kode Sekolah *
                </label>
                <input
                  type="text"
                  value={editSchoolKode}
                  onChange={(e) => setEditSchoolKode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status Sekolah
                </label>
                <select
                  value={editSchoolStatus}
                  onChange={(e) => setEditSchoolStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                  <option value="aktif">Aktif (Dapat diakses di login)</option>
                  <option value="nonaktif">Nonaktif (Akses ditutup)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ubah Sandi Baru (Opsional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditSchoolPassword(!showEditSchoolPassword)}
                    className="text-[11px] text-indigo-600 font-semibold"
                  >
                    {showEditSchoolPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
                <input
                  type={showEditSchoolPassword ? 'text' : 'password'}
                  value={editSchoolPassword}
                  onChange={(e) => setEditSchoolPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengubah sandi..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSchool}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isUpdatingSchool ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Perbarui Data</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KONFIRMASI HAPUS SEKOLAH                                                  */}
      {/* ========================================================================= */}
      {deletingSchoolId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Hapus Sekolah?</h3>
            <p className="text-xs text-slate-600 mb-5">
              Tindakan ini akan menghapus data sekolah dari database Supabase secara permanen.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingSchoolId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteSchool(deletingSchoolId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
