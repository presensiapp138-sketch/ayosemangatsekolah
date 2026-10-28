import React, { useState, useEffect } from 'react';
import { School, Database, User as UserIcon, LogOut, ChevronDown, RefreshCw, Clock, Shield, Lock, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { TenantSchool, InternalUser } from '../../types';
import { api } from '../../services/api';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface NavbarProps {
  tenant: TenantSchool;
  currentUser: InternalUser | null;
  onUserChanged: (user: InternalUser) => void;
  onLogout: () => void;
  availableUsers: { id: string; username: string; fullName: string; role: string }[];
  onOpenDatabaseSettings: () => void;
  onMenuToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tenant,
  currentUser,
  onUserChanged,
  onLogout,
  availableUsers,
  onOpenDatabaseSettings,
  onMenuToggle,
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(tenant.syncStatus || 'disconnected');

  // Modal Autentikasi Perpindahan ke Administrator
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState('admin');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');
  const [isAdminAuthenticating, setIsAdminAuthenticating] = useState(false);

  // Format jam WIB Asia/Jakarta
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
      setCurrentTime(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectUser = async (userItem: { id?: string; username: string; role: string }) => {
    // Jika beralih ke Administrator, harus memasukkan username dan kata sandi
    if (userItem.role === 'admin') {
      setAdminUsernameInput(userItem.username || 'admin');
      setAdminPasswordInput('');
      setAdminAuthError('');
      setShowAdminAuthModal(true);
      setShowUserDropdown(false);
      return;
    }

    try {
      const res = await api.selectInternalUser(userItem.username);
      if (res.success && res.user) {
        onUserChanged(res.user);
        setShowUserDropdown(false);
      }
    } catch (e: any) {
      alert(e.message || 'Gagal beralih pengguna internal');
    }
  };

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsernameInput.trim()) {
      setAdminAuthError('Username administrator wajib diisi.');
      return;
    }
    if (!adminPasswordInput) {
      setAdminAuthError('Kata sandi administrator wajib diisi.');
      return;
    }

    setIsAdminAuthenticating(true);
    setAdminAuthError('');

    try {
      const res = await api.selectRole({
        role: 'admin',
        username: adminUsernameInput.trim(),
        password: adminPasswordInput,
      });

      if (res.success && res.user) {
        onUserChanged(res.user);
        setShowAdminAuthModal(false);
        setAdminPasswordInput('');
        setShowUserDropdown(false);
      } else {
        setAdminAuthError(res.error || 'Autentikasi administrator gagal.');
      }
    } catch (err: any) {
      setAdminAuthError(err.message || 'Username atau kata sandi administrator salah.');
    } finally {
      setIsAdminAuthenticating(false);
    }
  };

  const handleQuickSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncDatabase();
      if (res.success) {
        setSyncStatus('connected');
      }
    } catch (e: any) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-indigo-50 text-indigo-950 border border-indigo-300 text-[10px] px-1.5 py-0.5 rounded font-bold">Admin Sekolah</span>;
      case 'petugas':
        return <span className="bg-blue-50 text-blue-950 border border-blue-300 text-[10px] px-1.5 py-0.5 rounded font-bold">Petugas Piket</span>;
      case 'wali_kelas':
        return <span className="bg-emerald-50 text-emerald-950 border border-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold">Wali Kelas</span>;
      case 'kesiswaan':
        return <span className="bg-amber-50 text-amber-950 border border-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold">Kesiswaan</span>;
      case 'kepala_sekolah':
        return <span className="bg-purple-50 text-purple-950 border border-purple-300 text-[10px] px-1.5 py-0.5 rounded font-bold">Kepala Sekolah</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 border border-slate-300 text-[10px] px-1.5 py-0.5 rounded font-bold">Pengguna</span>;
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Sisi Kiri: Menu Toggle & Identitas Sekolah */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate max-w-[180px] sm:max-w-xs">
                  {tenant.name}
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-300 font-bold">
                  {tenant.code}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  <span className="font-mono text-slate-900 font-bold">{currentTime || '--:--:--'} WIB</span>
                </span>
                <span>•</span>
                <span className="hidden sm:inline font-semibold">NPSN: {tenant.npsn || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: PWA Install, Status Google Sheets & User Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tombol Pasang Aplikasi PWA / iOS */}
          <PWAInstallButton />

          {/* Status Google Sheets */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs">
            <Database className="w-4 h-4 text-emerald-700" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-800 font-bold">Google Sheets:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${syncStatus === 'connected' ? 'bg-emerald-50 text-emerald-950 border border-emerald-300' : 'bg-amber-50 text-amber-950 border border-amber-300'}`}>
                  {syncStatus === 'connected' ? 'Terhubung' : 'Lokal / Pending'}
                </span>
              </div>
            </div>
            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              title="Sinkronisasi Data"
              className="ml-1 p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={onOpenDatabaseSettings}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 ml-1 underline cursor-pointer font-medium"
            >
              Atur
            </button>
          </div>

          {/* User Internal Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 transition text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                {currentUser?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser?.fullName || 'Pilih Pengguna'}
                </div>
                <div className="mt-0.5">
                  {getRoleBadge(currentUser?.role)}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-600 ml-0.5" />
            </button>

            {/* Dropdown Akun Internal */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-700">
                    Beralih Akun Internal
                  </div>
                  <div className="text-xs text-slate-900 font-bold mt-0.5">
                    {tenant.name}
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {currentUser?.role !== 'admin' && (
                    <button
                      onClick={() => {
                        setAdminUsernameInput('admin');
                        setAdminPasswordInput('');
                        setAdminAuthError('');
                        setShowAdminAuthModal(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2 text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 transition font-bold border-b border-slate-100 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="leading-tight text-indigo-950">Beralih ke Administrator</div>
                        <div className="text-[10px] text-slate-500 font-normal">Perlu Username & Sandi</div>
                      </div>
                    </button>
                  )}
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${currentUser?.id === u.id ? 'bg-indigo-50/80 text-indigo-950 font-bold' : 'text-slate-800'}`}
                    >
                      <div>
                        <div className="font-bold text-slate-950">{u.fullName}</div>
                        <div className="text-[11px] text-slate-700 font-mono font-semibold">@{u.username}</div>
                      </div>
                      <div>{getRoleBadge(u.role)}</div>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 mt-1 pt-1 px-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Keluar dari Sekolah</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Autentikasi Perpindahan ke Administrator */}
      {showAdminAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-indigo-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Autentikasi Administrator</h3>
                  <p className="text-[11px] text-slate-600">Perpindahan ke hak akses Administrator Sekolah</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminAuthModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Modal */}
            <form onSubmit={handleAdminAuthSubmit} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Untuk beralih ke peran <strong className="text-slate-900">Administrator</strong>, Anda wajib memasukkan <strong>Username</strong> dan <strong>Kata Sandi</strong> Administrator sekolah.
              </p>

              {adminAuthError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{adminAuthError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Username Administrator *
                </label>
                <input
                  type="text"
                  value={adminUsernameInput}
                  onChange={(e) => setAdminUsernameInput(e.target.value)}
                  placeholder="Contoh: admin"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Kata Sandi Administrator *
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Masukkan sandi administrator..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Sandi default sistem: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">admin123</code></p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAdminAuthModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAdminAuthenticating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isAdminAuthenticating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Masuk Administrator</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
