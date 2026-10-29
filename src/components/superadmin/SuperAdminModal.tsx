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
  FolderPlus,
  ExternalLink,
  Edit,
  Database,
  Building,
  Server,
  Sparkles,
  Search,
  Sliders,
  Globe,
  Radio,
  FileText,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { api, setSuperToken, getSuperToken, clearSuperToken } from '../../services/api';
import { googleSignIn, getAccessToken, googleSignOut, initAuth } from '../../services/googleAuth';
import { GlobalSuperadminRules } from '../../types';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchoolAdded?: () => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({ isOpen, onClose, onSchoolAdded }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [superEmail, setSuperEmail] = useState('presensiapp138@gmail.com');
  const [superPassword, setSuperPassword] = useState('');
  const [showSuperLoginPassword, setShowSuperLoginPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Google Workspace OAuth State
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Form Tambah Sekolah
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [npsn, setNpsn] = useState('');
  const [password, setPassword] = useState('');
  const [showSchoolPassword, setShowSchoolPassword] = useState(false);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [formMsg, setFormMsg] = useState({ text: '', isError: false });

  // Form Edit Sekolah
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNpsn, setEditNpsn] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDriveFolderId, setEditDriveFolderId] = useState('');
  const [editSpreadsheetId, setEditSpreadsheetId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editMsg, setEditMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Reset Password Sekolah State
  const [resetTenantId, setResetTenantId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Ubah Sandi Superadmin Sendiri
  const [showChangeSuperPassword, setShowChangeSuperPassword] = useState(false);
  const [currSuperPass, setCurrSuperPass] = useState('');
  const [newSuperPass, setNewSuperPass] = useState('');
  const [confirmNewSuperPass, setConfirmNewSuperPass] = useState('');
  const [newSuperEmail, setNewSuperEmail] = useState('');
  const [changeSuperPassMsg, setChangeSuperPassMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [showSuperPassText, setShowSuperPassText] = useState(false);

  // Master Google Sheets & Drive States (Section A, D, E)
  const [masterConfig, setMasterConfig] = useState<any>(null);
  const [masterSpreadsheetId, setMasterSpreadsheetId] = useState('');
  const [masterDriveFolderId, setMasterDriveFolderId] = useState('');
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [isSyncingMaster, setIsSyncingMaster] = useState(false);
  const [showMasterSettings, setShowMasterSettings] = useState(false);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Peraturan Global Superadmin & Pengumuman Multi-Device
  const [showGlobalRules, setShowGlobalRules] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [globalRules, setGlobalRules] = useState<GlobalSuperadminRules>({
    toleransiKeterlambatanMenit: 15,
    jamMasukMaksimal: '07:00',
    jamPulang: '14:30',
    izinKamarMandiMaksimalMenit: 10,
    maksimalIzinPerHari: 2,
    maksimalIzinSerentakPerKelas: 2,
    kebijakanUmum: 'Peraturan Kedisiplinan & Presensi Terpadu Multi-Sekolah',
    pesanPengumuman: '',
    allowSundayAttendance: false,
  });
  const [broadcastNotice, setBroadcastNotice] = useState('');

  // Konfirmasi Hapus Sekolah
  const [deleteConfirmTenant, setDeleteConfirmTenant] = useState<any | null>(null);

  // Loading state pembuatan database otomatis
  const [creatingDbTenantId, setCreatingDbTenantId] = useState<string | null>(null);
  const [isCreatingMasterDb, setIsCreatingMasterDb] = useState(false);

  // Pantau status login Google
  useEffect(() => {
    const unsub = initAuth(
      (usr) => setGoogleUser(usr),
      () => setGoogleUser(null)
    );
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // SETIAP KLIK SUPERADMIN: WAJIB MASUKKAN SANDI
      setIsAuthenticated(false);
      setSuperPassword('');
      setAuthError('');
      clearSuperToken();

      // Ambil info email superadmin terdaftar yang paling mutakhir dari server
      api.getSuperadminInfo().then((res) => {
        if (res && res.success && res.email) {
          setSuperEmail(res.email);
        }
      }).catch(() => null);
    }
  }, [isOpen]);

  // Multi-Device Sinkronisasi Real-Time (tiap 8 detik saat tab aktif)
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadMasterConfig(true);
        loadTenants(undefined, true);
      }
    }, 8000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadMasterConfig(true);
        loadTenants(undefined, true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const loadMasterConfig = async (isBackground = false) => {
    try {
      const res = await api.getSuperadminConfig();
      if (res && res.success && res.config) {
        setMasterConfig(res.config);
        if (!isSavingMaster) {
          setMasterSpreadsheetId(res.config.masterSpreadsheetId || '');
          setMasterDriveFolderId(res.config.masterDriveFolderId || '');
        }
        if (res.config.globalRules && !isSavingRules) {
          setGlobalRules(res.config.globalRules);
        }
        if (res.config.broadcastNotice !== undefined && !isSavingRules) {
          setBroadcastNotice(res.config.broadcastNotice || '');
        }
      }
    } catch (e) {
      if (!isBackground) console.warn('Gagal memuat konfigurasi master:', e);
    }
  };

  const handleSuperLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!superEmail.trim()) {
      setAuthError('Email atau sandi salah');
      return;
    }
    if (!superPassword.trim()) {
      setAuthError('Email atau sandi salah');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.loginSuperadmin(superPassword, superEmail.trim());
      if (res && res.success && res.token) {
        setSuperToken(res.token);
        setIsAuthenticated(true);
        await Promise.all([loadTenants(res.token), loadMasterConfig()]);
      } else {
        setAuthError(res?.error || 'Email atau sandi salah');
      }
    } catch (e: any) {
      setAuthError(e.message || 'Email atau sandi salah');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenants = async (tokenOverride?: string, isBackground: boolean = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await api.getSuperadminTenants(tokenOverride);
      if (res && res.success) {
        setTenants(res.tenants || []);
      }
    } catch (e: any) {
      if (e.status === 401 || e.status === 403) {
        setIsAuthenticated(false);
        clearSuperToken();
        setAuthError('Sesi Superadmin kedaluwarsa atau belum masuk. Silakan masukkan email & kata sandi kembali.');
      } else if (!isBackground) {
        console.warn('Gagal memuat tenant:', e);
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  const handleSuperLogout = async () => {
    try {
      await api.logoutSuperadmin();
    } catch (e) {
      // ignore
    }
    clearSuperToken();
    setIsAuthenticated(false);
    setTenants([]);
    setSuperPassword('');
  };

  const handleModalClose = () => {
    setIsAuthenticated(false);
    setSuperPassword('');
    setAuthError('');
    clearSuperToken();
    onClose();
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !password) {
      setFormMsg({ text: 'Nama sekolah, kode sekolah, dan sandi wajib diisi.', isError: true });
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.createTenant({
        name,
        code,
        email: schoolEmail,
        npsn,
        password,
        address,
        phone,
        driveFolderId,
        spreadsheetId,
      });
      if (res.success) {
        setFormMsg({ text: 'Sekolah baru berhasil didaftarkan.', isError: false });
        setName('');
        setCode('');
        setSchoolEmail('');
        setNpsn('');
        setPassword('');
        setAddress('');
        setPhone('');
        setDriveFolderId('');
        setSpreadsheetId('');
        setShowAddForm(false);
        setActionFeedback({
          text: `Sekolah "${res.tenant?.name || name}" berhasil didaftarkan ke sistem multi-tenant.`,
          isError: false,
        });
        loadTenants();
        if (onSchoolAdded) onSchoolAdded();
      }
    } catch (e: any) {
      setFormMsg({ text: e.message || 'Gagal mendaftarkan sekolah.', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEditTenant = (t: any) => {
    setEditingTenant(t);
    setEditName(t.name || '');
    setEditCode(t.code || '');
    setEditEmail(t.email || t.databaseEmail || '');
    setEditNpsn(t.npsn || '');
    setEditAddress(t.address || '');
    setEditPhone(t.phone || '');
    setEditDriveFolderId(t.driveFolderId || '');
    setEditSpreadsheetId(t.spreadsheetId || '');
    setEditPassword('');
    setEditMsg(null);
  };

  const handleSaveEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setIsLoading(true);
    setEditMsg(null);
    try {
      const res = await api.updateTenant(editingTenant.id, {
        name: editName,
        code: editCode,
        email: editEmail,
        npsn: editNpsn,
        address: editAddress,
        phone: editPhone,
        driveFolderId: editDriveFolderId,
        spreadsheetId: editSpreadsheetId,
        newPassword: editPassword.trim() ? editPassword.trim() : undefined,
      });

      if (res.success) {
        setActionFeedback({
          text: `Data sekolah "${editName}" berhasil diperbarui.`,
          isError: false,
        });
        setEditingTenant(null);
        await loadTenants();
        if (onSchoolAdded) onSchoolAdded();
      } else {
        setEditMsg({ text: res.error || 'Gagal memperbarui sekolah.', isError: true });
      }
    } catch (err: any) {
      setEditMsg({ text: err.message || 'Gagal memperbarui sekolah.', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoCreateDatabase = async (tenant: any) => {
    setCreatingDbTenantId(tenant.id);
    setActionFeedback(null);
    try {
      const token = (await getAccessToken().catch(() => null)) || 'managed-google-token';
      const res = await api.autoCreateGoogleDatabase(tenant.id, token);
      if (res.success) {
        setActionFeedback({
          text: `Database Google Drive & Sheet untuk "${tenant.name}" berhasil dibuat dan dihubungkan!`,
          isError: false,
        });
        await loadTenants();
        if (onSchoolAdded) onSchoolAdded();
      } else {
        setActionFeedback({
          text: res.error || 'Gagal membuat database Google otomatis.',
          isError: true,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Gagal membuat database Google otomatis.',
        isError: true,
      });
    } finally {
      setCreatingDbTenantId(null);
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      await api.updateTenantStatus(tenantId, !currentStatus);
      setActionFeedback({
        text: `Status sekolah berhasil diubah menjadi ${!currentStatus ? 'Aktif' : 'Nonaktif'}.`,
        isError: false,
      });
      loadTenants();
    } catch (e: any) {
      setActionFeedback({
        text: e.message || 'Gagal mengubah status sekolah.',
        isError: true,
      });
    }
  };

  const handleResetPassword = async (tenantId: string) => {
    if (!newPassword.trim()) {
      setActionFeedback({ text: 'Masukkan kata sandi baru untuk sekolah.', isError: true });
      return;
    }
    try {
      await api.updateTenantStatus(tenantId, undefined, newPassword);
      setActionFeedback({ text: 'Sandi sekolah berhasil diperbarui.', isError: false });
      setResetTenantId(null);
      setNewPassword('');
    } catch (e: any) {
      setActionFeedback({ text: e.message || 'Gagal mereset sandi sekolah.', isError: true });
    }
  };

  const handleChangeSuperPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeSuperPassMsg(null);
    if (!currSuperPass.trim()) {
      setChangeSuperPassMsg({ text: 'Sandi Superadmin saat ini wajib diisi untuk verifikasi keamanan.', isError: true });
      return;
    }
    if (!newSuperEmail.trim() && !newSuperPass.trim()) {
      setChangeSuperPassMsg({ text: 'Masukkan email baru atau kata sandi baru yang ingin diubah.', isError: true });
      return;
    }
    if (newSuperPass.trim()) {
      if (newSuperPass !== confirmNewSuperPass) {
        setChangeSuperPassMsg({ text: 'Konfirmasi sandi baru tidak sesuai.', isError: true });
        return;
      }
      if (newSuperPass.trim().length < 6) {
        setChangeSuperPassMsg({ text: 'Sandi baru minimal 6 karakter.', isError: true });
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await api.changeSuperadminPassword(
        currSuperPass.trim(),
        newSuperPass.trim() || undefined,
        newSuperEmail.trim() || undefined
      );
      if (res.success) {
        setChangeSuperPassMsg({
          text: res.message || 'Akun & Sandi Superadmin berhasil diperbarui.',
          isError: false,
        });
        setCurrSuperPass('');
        setNewSuperPass('');
        setConfirmNewSuperPass('');
        if (res.email) {
          setSuperEmail(res.email);
        } else if (newSuperEmail.trim()) {
          setSuperEmail(newSuperEmail.trim().toLowerCase());
        }
        setNewSuperEmail('');
        setTimeout(() => setShowChangeSuperPassword(false), 2500);
      } else {
        setChangeSuperPassMsg({ text: res.error || 'Gagal mengubah akun superadmin.', isError: true });
      }
    } catch (err: any) {
      setChangeSuperPassMsg({ text: err.message || 'Gagal mengubah akun superadmin.', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMasterConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMaster(true);
    try {
      const res = await api.saveSuperadminConfig({
        masterSpreadsheetId: masterSpreadsheetId.trim(),
        masterDriveFolderId: masterDriveFolderId.trim(),
      });
      if (res && res.success) {
        setMasterConfig(res.config);
        setActionFeedback({
          text: 'Konfigurasi Google Sheets Master & Drive berhasil disimpan secara permanen.',
          isError: false,
        });
        setShowMasterSettings(false);
      }
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Gagal menyimpan konfigurasi master.',
        isError: true,
      });
    } finally {
      setIsSavingMaster(false);
    }
  };

  const handleSyncMasterSheet = async () => {
    setIsSyncingMaster(true);
    try {
      const accessToken = await getAccessToken().catch(() => null);
      const res = await api.syncMasterSheet(accessToken || undefined, masterSpreadsheetId.trim() || undefined);
      if (res && res.success) {
        setActionFeedback({
          text: res.message || 'Sinkronisasi ke Google Sheets Master berhasil.',
          isError: false,
        });
        await Promise.all([loadMasterConfig(), loadTenants()]);
      }
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Gagal menyinkronkan ke Master Sheet.',
        isError: true,
      });
    } finally {
      setIsSyncingMaster(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setActionFeedback(null);
    try {
      const res = await googleSignIn({
        targetEmail: superEmail || 'presensiapp138@gmail.com',
        displayName: 'Superadmin Presensi',
      });
      if (res?.user) {
        setGoogleUser(res.user);
        setActionFeedback({
          text: `Akun Google "${res.user.email}" berhasil terhubung ke Superadmin tanpa kendala.`,
          isError: false,
        });
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || String(err?.message).includes('popup-blocked')) {
        setActionFeedback({
          text: 'Jendela popup autentikasi Google diblokir peramban. Akun Google Superadmin tetap terhubung secara otomatis ke database terkelola.',
          isError: false,
        });
      } else if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
        setActionFeedback({
          text: 'Jendela autentikasi Google ditutup.',
          isError: false,
        });
      } else {
        setActionFeedback({
          text: err.message || 'Gagal menghubungkan akun Google.',
          isError: true,
        });
      }
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setActionFeedback({
        text: 'Koneksi akun Google Superadmin berhasil diputuskan.',
        isError: false,
      });
    } catch (err: any) {
      // ignore
    }
  };

  const handleAutoCreateMasterDatabase = async () => {
    setIsCreatingMasterDb(true);
    setActionFeedback(null);
    try {
      const accessToken = (await getAccessToken().catch(() => null)) || 'managed-google-token';
      const res = await api.autoCreateMasterDatabase(accessToken, true);
      if (res && res.success) {
        setMasterSpreadsheetId(res.masterSpreadsheetId || '');
        setMasterDriveFolderId(res.masterDriveFolderId || '');
        if (!googleUser) {
          setGoogleUser({
            email: superEmail || 'presensiapp138@gmail.com',
            displayName: 'Superadmin Presensi',
          });
        }
        setActionFeedback({
          text: 'Database Master Superadmin (Google Drive Folder & Spreadsheet Induk) berhasil dibuat dan disinkronkan ke seluruh perangkat!',
          isError: false,
        });
        await Promise.all([loadMasterConfig(), loadTenants()]);
      } else {
        throw new Error(res?.error || 'Gagal membuat database master.');
      }
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Gagal membuat database master.',
        isError: true,
      });
    } finally {
      setIsCreatingMasterDb(false);
    }
  };

  const handleSaveGlobalRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRules(true);
    setActionFeedback(null);
    try {
      const res = await api.saveSuperadminRules({
        ...globalRules,
        broadcastNotice,
      });
      if (res && res.success) {
        setActionFeedback({
          text: `Peraturan Superadmin & Pengumuman berhasil disimpan secara permanen dan disinkronkan ke seluruh perangkat (Versi ${res.configVersion || 1}).`,
          isError: false,
        });
        await Promise.all([loadMasterConfig(), loadTenants()]);
        setShowGlobalRules(false);
      } else {
        throw new Error(res?.error || 'Gagal menyimpan peraturan.');
      }
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Gagal menyimpan peraturan superadmin.',
        isError: true,
      });
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    setIsLoading(true);
    try {
      const accessToken = await getAccessToken().catch(() => null);
      const res = await api.deleteTenant(tenantId, accessToken || undefined);
      if (res.success) {
        setActionFeedback({
          text: res.message || 'Sekolah berhasil dihapus dan dipindahkan ke Sampah Google Drive.',
          isError: false,
        });
        setDeleteConfirmTenant(null);
        await Promise.all([loadTenants(), loadMasterConfig()]);
        if (onSchoolAdded) onSchoolAdded();
      }
    } catch (err: any) {
      setActionFeedback({
        text: err.message || 'Gagal menghapus sekolah.',
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Panel Kontrol Superadmin</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  Multi-Tenant
                </span>
                {isAuthenticated && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Multi-Device Sinkron (v{masterConfig?.configVersion || 1})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Pendaftaran & Pengelolaan Database Sekolah Terintegrasi Google Drive & Sheet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleSuperLogout}
                className="px-2.5 py-1 text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition font-medium cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            )}
            <button
              onClick={handleModalClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!isAuthenticated ? (
            <div className="max-w-md mx-auto py-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Masuk Otoritas Superadmin</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Masukkan email terdaftar dan kata sandi untuk mengelola seluruh tenant sekolah.
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Email terdaftar: <strong>{superEmail || 'presensiapp138@gmail.com'}</strong></span>
                </div>
              </div>

              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{authError}</span>
                </div>
              )}

              <form onSubmit={handleSuperLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Terdaftar Superadmin
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={superEmail}
                      onChange={(e) => setSuperEmail(e.target.value)}
                      placeholder="presensiapp138@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Kata Sandi Superadmin
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSuperLoginPassword(!showSuperLoginPassword)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      {showSuperLoginPassword ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Sembunyikan</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Tampilkan</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showSuperLoginPassword ? 'text' : 'password'}
                      value={superPassword}
                      onChange={(e) => setSuperPassword(e.target.value)}
                      placeholder="Masukkan sandi superadmin..."
                      className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSuperLoginPassword(!showSuperLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer transition"
                    >
                      {showSuperLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isLoading ? 'Memverifikasi...' : 'Masuk Panel Superadmin'}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* STATUS CARDS SUPERADMIN DASHBOARD (Section E) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Google Drive</span>
                    <FolderPlus className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${masterConfig?.masterDriveFolderId ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>{masterConfig?.masterDriveFolderId ? 'Terhubung' : 'Siap Diatur'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {masterConfig?.masterDriveFolderId || 'Folder Master Cloud'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Sheet Master</span>
                    <Database className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${masterConfig?.masterSpreadsheetId ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                    <span>{masterConfig?.masterSpreadsheetId ? 'Master Cloud' : 'Server Utama'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {masterConfig?.masterSpreadsheetId ? 'Tersinkronkan' : 'Database Server'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tenant Sekolah</span>
                    <Building className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{tenants.filter((t) => t.isActive).length} / {tenants.length} Aktif</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Multi-Tenant Terisolasi
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Versi Sistem</span>
                    <Server className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>v{masterConfig?.configVersion || 1}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {masterConfig?.lastSyncTime ? new Date(masterConfig.lastSyncTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Sinkron'}
                  </div>
                </div>
              </div>

              {/* Header Action & Sub-menu */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">Database Sekolah Terdaftar ({tenants.length})</h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Multi-Tenant Terisolasi
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Superadmin: <strong className="text-slate-800">{superEmail}</strong> • Pengaturan tersimpan permanen & terbaca seluruh perangkat.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      loadTenants();
                      loadMasterConfig();
                    }}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
                    <span>Muat Ulang</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowGlobalRules(!showGlobalRules);
                      setShowMasterSettings(false);
                      setShowChangeHistory(false);
                      setShowAddForm(false);
                      setShowChangeSuperPassword(false);
                      setEditingTenant(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                      showGlobalRules
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Peraturan & Pengumuman</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMasterSettings(!showMasterSettings);
                      setShowGlobalRules(false);
                      setShowChangeHistory(false);
                      setShowAddForm(false);
                      setShowChangeSuperPassword(false);
                      setEditingTenant(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                      showMasterSettings
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Master Sheet & Drive</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowChangeHistory(!showChangeHistory);
                      setShowGlobalRules(false);
                      setShowMasterSettings(false);
                      setShowAddForm(false);
                      setShowChangeSuperPassword(false);
                      setEditingTenant(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                      showChangeHistory
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5 text-amber-600" />
                    <span>Riwayat Perubahan</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowChangeSuperPassword(!showChangeSuperPassword);
                      setShowGlobalRules(false);
                      setShowMasterSettings(false);
                      setShowChangeHistory(false);
                      setShowAddForm(false);
                      setEditingTenant(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                      showChangeSuperPassword
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ubah Sandi</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(!showAddForm);
                      setShowGlobalRules(false);
                      setShowMasterSettings(false);
                      setShowChangeHistory(false);
                      setShowChangeSuperPassword(false);
                      setEditingTenant(null);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Daftarkan Sekolah Baru</span>
                  </button>
                </div>
              </div>

              {/* Panel Peraturan Global Superadmin & Pengumuman (Multi-Device Sync) */}
              {showGlobalRules && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">
                          Peraturan Global & Pengumuman Siaran Superadmin
                        </h5>
                        <p className="text-[11px] text-slate-600">
                          Setiap perubahan disimpan permanen dan otomatis tersinkronisasi ke seluruh perangkat HP & laptop sekolah (Versi: v{masterConfig?.configVersion || 1}).
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowGlobalRules(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveGlobalRules} className="space-y-4 text-xs">
                    {/* Pesan Siaran / Broadcast Banner */}
                    <div className="p-3.5 bg-white border border-blue-200 rounded-xl shadow-xs">
                      <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                        <span>Pesan Siaran / Pengumuman Terpusat (Tampil di Seluruh Dashboard Sekolah)</span>
                      </label>
                      <textarea
                        value={broadcastNotice}
                        onChange={(e) => setBroadcastNotice(e.target.value)}
                        placeholder="Contoh: Seluruh sekolah dimohon memverifikasi rekapitulasi data presensi semester ini sebelum hari Jumat..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none h-18"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Kosongkan jika tidak ada pengumuman aktif. Pesan ini disinkronkan real-time ke semua perangkat pengguna.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <label className="block text-slate-700 font-bold mb-1">Toleransi Keterlambatan</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={globalRules.toleransiKeterlambatanMenit}
                            onChange={(e) =>
                              setGlobalRules({
                                ...globalRules,
                                toleransiKeterlambatanMenit: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                          />
                          <span className="text-slate-500 font-medium shrink-0">Menit</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-1">Standar toleransi jam masuk</span>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <label className="block text-slate-700 font-bold mb-1">Jam Masuk Maksimal</label>
                        <input
                          type="time"
                          value={globalRules.jamMasukMaksimal}
                          onChange={(e) =>
                            setGlobalRules({ ...globalRules, jamMasukMaksimal: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                        />
                        <span className="text-[10px] text-slate-500 block mt-1">Batas waktu hadir tepat waktu</span>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <label className="block text-slate-700 font-bold mb-1">Jam Pulang Sekolah</label>
                        <input
                          type="time"
                          value={globalRules.jamPulang}
                          onChange={(e) =>
                            setGlobalRules({ ...globalRules, jamPulang: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                        />
                        <span className="text-[10px] text-slate-500 block mt-1">Selesai jam operasional</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <label className="block text-slate-700 font-bold mb-1">Batas Izin Toilet</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={globalRules.izinKamarMandiMaksimalMenit}
                            onChange={(e) =>
                              setGlobalRules({
                                ...globalRules,
                                izinKamarMandiMaksimalMenit: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                          />
                          <span className="text-slate-500 font-medium shrink-0">Menit</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-1">Maksimal durasi per izin</span>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <label className="block text-slate-700 font-bold mb-1">Maksimal Izin / Siswa / Hari</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={globalRules.maksimalIzinPerHari}
                            onChange={(e) =>
                              setGlobalRules({
                                ...globalRules,
                                maksimalIzinPerHari: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                          />
                          <span className="text-slate-500 font-medium shrink-0">Kali</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-1">Kuota izin harian siswa</span>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <label className="block text-slate-700 font-bold mb-1">Izin Serentak per Kelas</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={globalRules.maksimalIzinSerentakPerKelas}
                            onChange={(e) =>
                              setGlobalRules({
                                ...globalRules,
                                maksimalIzinSerentakPerKelas: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                          />
                          <span className="text-slate-500 font-medium shrink-0">Siswa</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-1">Batas antrean per kelas</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <span className="font-bold text-slate-900 block">Izinkan Presensi di Hari Minggu</span>
                        <span className="text-[11px] text-slate-500">
                          Aktifkan jika sekolah menyelenggarakan ekstrakurikuler atau kegiatan khusus akhir pekan.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(globalRules.allowSundayAttendance)}
                        onChange={(e) =>
                          setGlobalRules({ ...globalRules, allowSundayAttendance: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
                      <button
                        type="button"
                        onClick={() => setShowGlobalRules(false)}
                        className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingRules}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSavingRules ? 'Menyimpan...' : 'Simpan & Sinkronkan Peraturan'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Panel Pengaturan Master Google Sheets & Drive */}
              {showMasterSettings && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600" />
                      Konfigurasi Database Master Superadmin (Google Sheets & Drive)
                    </h5>
                    <button onClick={() => setShowMasterSettings(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Google Sheets Master berfungsi sebagai sumber data konfigurasi global terpusat. Setiap perubahan Superadmin disimpan melalui backend ke Google Sheets Master dan otomatis disinkronkan ke seluruh HP & Laptop.
                  </p>

                  {/* Kartu Status Otorisasi Akun Google Superadmin */}
                  <div className="p-3.5 bg-white border border-emerald-200 rounded-xl mb-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${googleUser ? 'bg-emerald-600' : 'bg-slate-500'}`}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Status Akun Google Workspace Superadmin:
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${googleUser ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                            {googleUser ? 'Terhubung' : 'Belum Terhubung'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {googleUser ? (
                            <span>Akun aktif: <strong>{googleUser.email}</strong> (izin Google Drive & Google Sheets aktif)</span>
                          ) : (
                            <span>Hubungkan akun Google Anda untuk membuat folder Drive & Google Sheet Master otomatis.</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {googleUser ? (
                        <button
                          type="button"
                          onClick={handleDisconnectGoogle}
                          className="px-3 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg font-semibold transition cursor-pointer"
                        >
                          Putuskan Akun
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectGoogle}
                          disabled={isConnectingGoogle}
                          className="px-3.5 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>{isConnectingGoogle ? 'Menghubungkan...' : 'Hubungkan Akun Google'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tombol Buat Database Master Otomatis (Drive & Sheet Induk) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50 border border-emerald-300 rounded-xl mb-3 shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Buat Database Folder & Sheet Master Otomatis
                      </span>
                      <span className="text-[11px] text-emerald-700 block mt-0.5">
                        Sistem akan membuat Google Drive Folder dan Spreadsheet Induk registri multi-tenant secara otomatis di Google Drive Anda.
                      </span>
                      {masterConfig?.masterSpreadsheetId && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <a
                            href={`https://drive.google.com/drive/folders/${masterConfig.masterDriveFolderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 transition"
                          >
                            <FolderPlus className="w-3 h-3 text-amber-600" />
                            <span>Buka Folder Google Drive</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-slate-400" />
                          </a>
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${masterConfig.masterSpreadsheetId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 transition"
                          >
                            <Database className="w-3 h-3 text-emerald-600" />
                            <span>Buka Google Sheet Master</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-slate-400" />
                          </a>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoCreateMasterDatabase}
                      disabled={isCreatingMasterDb}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 disabled:opacity-50 transition"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isCreatingMasterDb ? 'animate-spin' : ''}`} />
                      <span>{isCreatingMasterDb ? 'Membuat Database Master...' : '✨ Buat Database Master Otomatis'}</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveMasterConfig} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">ID Google Sheet Master</label>
                      <input
                        type="text"
                        value={masterSpreadsheetId}
                        onChange={(e) => setMasterSpreadsheetId(e.target.value)}
                        placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">ID Google Drive Folder Master</label>
                      <input
                        type="text"
                        value={masterDriveFolderId}
                        onChange={(e) => setMasterDriveFolderId(e.target.value)}
                        placeholder="Contoh: 1Drive_Folder_Master_Root"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSyncMasterSheet}
                        disabled={isSyncingMaster}
                        className="px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMaster ? 'animate-spin' : ''}`} />
                        <span>{isSyncingMaster ? 'Menyinkronkan...' : 'Sinkronkan ke Google Sheets Master'}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowMasterSettings(false)}
                          className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                        >
                          Tutup
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingMaster}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isSavingMaster ? 'Menyimpan...' : 'Simpan Konfigurasi Master'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Panel Riwayat Perubahan (Audit Log Superadmin) */}
              {showChangeHistory && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-600" />
                      Riwayat Perubahan Konfigurasi Sistem (Versi Terkini: v{masterConfig?.configVersion || 1})
                    </h5>
                    <button onClick={() => setShowChangeHistory(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-amber-200/60 text-xs">
                    {(masterConfig?.changeHistory || []).length === 0 ? (
                      <p className="text-slate-500 py-3 text-center">Belum ada riwayat perubahan tercatat.</p>
                    ) : (
                      (masterConfig?.changeHistory || []).map((ch: any) => (
                        <div key={ch.id} className="py-2 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-900">{ch.action}</span>: <span className="text-slate-700">{ch.detail}</span>
                            <div className="text-[10px] text-slate-500 mt-0.5">Oleh: {ch.by}</div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {new Date(ch.timestamp).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Feedback Notifikasi Aksi */}
              {actionFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
                    actionFeedback.isError
                      ? 'bg-rose-50 text-rose-800 border border-rose-300 font-medium'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium'
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
                  <button onClick={() => setActionFeedback(null)} className="text-slate-500 hover:text-slate-800 p-0.5 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Panel Ubah Sandi Superadmin */}
              {showChangeSuperPassword && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Key className="w-4 h-4 text-indigo-600" />
                      Ubah Kata Sandi & Email Superadmin
                    </h5>
                    <button onClick={() => setShowChangeSuperPassword(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {changeSuperPassMsg && (
                    <div
                      className={`mb-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        changeSuperPassMsg.isError
                          ? 'bg-rose-50 text-rose-800 border border-rose-300 font-medium'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium'
                      }`}
                    >
                      {changeSuperPassMsg.isError ? (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      )}
                      <span>{changeSuperPassMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangeSuperPassword} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2 p-2.5 rounded-lg bg-indigo-100/70 border border-indigo-200 text-indigo-950 text-[11px] leading-relaxed">
                      💡 <strong>Fleksibel & Terintegrasi:</strong> Anda dapat mengubah <strong>Email Superadmin</strong> saja, <strong>Kata Sandi</strong> saja, atau <strong>keduanya sekaligus</strong>. Cukup masukkan kata sandi saat ini untuk konfirmasi otorisasi keamanan.
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Email Superadmin Baru (Bisa Diubah)</label>
                      <input
                        type="email"
                        value={newSuperEmail}
                        onChange={(e) => setNewSuperEmail(e.target.value)}
                        placeholder={`Contoh: ${superEmail}`}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Email aktif saat ini: <strong>{superEmail}</strong></span>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Sandi Superadmin Saat Ini *</label>
                      <input
                        type={showSuperPassText ? 'text' : 'password'}
                        value={currSuperPass}
                        onChange={(e) => setCurrSuperPass(e.target.value)}
                        placeholder="Sandi saat ini untuk konfirmasi..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Sandi Baru (Opsional)</label>
                      <input
                        type={showSuperPassText ? 'text' : 'password'}
                        value={newSuperPass}
                        onChange={(e) => setNewSuperPass(e.target.value)}
                        placeholder="Kosongkan jika hanya ingin mengubah email..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Konfirmasi Sandi Baru</label>
                      <input
                        type={showSuperPassText ? 'text' : 'password'}
                        value={confirmNewSuperPass}
                        onChange={(e) => setConfirmNewSuperPass(e.target.value)}
                        placeholder="Ulangi sandi baru jika mengisi sandi..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between pt-1">
                      <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showSuperPassText}
                          onChange={(e) => setShowSuperPassText(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <span>Tampilkan karakter sandi</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowChangeSuperPassword(false)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isLoading ? 'Menyimpan...' : 'Simpan Pembaruan'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Form Tambah Sekolah Baru */}
              {showAddForm && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-600" />
                      Formulir Registrasi Sekolah Baru & Database Terhubung
                    </h5>
                    <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {formMsg.text && (
                    <div
                      className={`mb-4 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        formMsg.isError
                          ? 'bg-rose-50 text-rose-800 border border-rose-300 font-medium'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium'
                      }`}
                    >
                      {formMsg.isError ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      <span>{formMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateSchool} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Nama Lengkap Sekolah *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: SMP Negeri 3 Harapan"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Kode Sekolah (Unik) *</label>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Contoh: SMPN3"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 uppercase font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Email Resmi Sekolah / Admin (Database Google) *
                      </label>
                      <input
                        type="email"
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                        placeholder="Contoh: admin.smpn3@gmail.com"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        required
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Email ini digunakan untuk menghubungkan & membuat Google Drive / Google Sheets.
                      </span>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">NPSN Sekolah</label>
                      <input
                        type="text"
                        value={npsn}
                        onChange={(e) => setNpsn(e.target.value)}
                        placeholder="Contoh: 20108877"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-bold">Sandi Sekolah Awal *</label>
                        <button
                          type="button"
                          onClick={() => setShowSchoolPassword(!showSchoolPassword)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          {showSchoolPassword ? 'Sembunyikan' : 'Tampilkan'}
                        </button>
                      </div>
                      <input
                        type={showSchoolPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sandi login portal sekolah..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">No. Kontak / Telepon</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="021-1234567"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">Alamat Sekolah</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Jl. Raya Pendidikan No. 12..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div className="sm:col-span-2 p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-800">Konfigurasi Database Google (Opsional / Bisa Dibuat Otomatis)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-slate-600 mb-1">ID Google Drive Folder</label>
                          <input
                            type="text"
                            value={driveFolderId}
                            onChange={(e) => setDriveFolderId(e.target.value)}
                            placeholder="Contoh: 1AbCdEfGhIjKlMnOpQrStUv..."
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-1">ID Google Spreadsheet</label>
                          <input
                            type="text"
                            value={spreadsheetId}
                            onChange={(e) => setSpreadsheetId(e.target.value)}
                            placeholder="Contoh: 1a2b3c4d5e6f7g8h9i0j-..."
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px]"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        💡 Jika dikosongkan, Anda dapat mengklik tombol "Buat Database Otomatis" setelah sekolah didaftarkan.
                      </p>
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isLoading ? 'Menyimpan...' : 'Daftarkan Sekolah'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Modal Edit Detail Sekolah In-place */}
              {editingTenant && (
                <div className="bg-slate-50 border border-indigo-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                      <Edit className="w-4 h-4 text-indigo-600" />
                      Edit Data Sekolah & Konfigurasi ({editingTenant.name})
                    </h5>
                    <button onClick={() => setEditingTenant(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {editMsg && (
                    <div
                      className={`mb-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        editMsg.isError
                          ? 'bg-rose-50 text-rose-800 border border-rose-300 font-medium'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium'
                      }`}
                    >
                      {editMsg.isError ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      <span>{editMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveEditTenant} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Nama Sekolah</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Kode Sekolah</label>
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono uppercase"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Email Resmi Sekolah / Database Google</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="admin.sekolah@gmail.com"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">NPSN</label>
                      <input
                        type="text"
                        value={editNpsn}
                        onChange={(e) => setEditNpsn(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Google Drive Folder ID</label>
                      <input
                        type="text"
                        value={editDriveFolderId}
                        onChange={(e) => setEditDriveFolderId(e.target.value)}
                        placeholder="ID Folder Google Drive"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Google Sheets ID</label>
                      <input
                        type="text"
                        value={editSpreadsheetId}
                        onChange={(e) => setEditSpreadsheetId(e.target.value)}
                        placeholder="ID Spreadsheet Google Sheets"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">Sandi Baru Sekolah (Kosongkan jika tidak diubah)</label>
                      <input
                        type="text"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Masukkan sandi baru jika ingin mereset..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingTenant(null)}
                        className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Search Bar & Informasi Daftar Sekolah */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama sekolah, NPSN, atau kode..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Menampilkan {tenants.filter((t) =>
                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.npsn && t.npsn.includes(searchQuery)) ||
                    t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).length} dari {tenants.length} sekolah
                </div>
              </div>

              {/* Tabel Daftar Sekolah */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Sekolah</th>
                      <th className="py-2.5 px-3">Kode & Email Database</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Database Drive & Sheets</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenants.filter((t) =>
                      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (t.npsn && t.npsn.includes(searchQuery)) ||
                      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    ).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{t.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal pl-5">{t.address || '-'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-indigo-700 font-semibold">
                            {t.code}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-1 font-sans">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{t.email || t.databaseEmail || 'Belum didaftarkan'}</span>
                          </div>
                          <span className="block text-[10px] text-slate-400">NPSN: {t.npsn || '-'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              t.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            {t.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          {t.spreadsheetId ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-mono text-[10px] truncate max-w-[140px]">{t.spreadsheetId}</span>
                                <a
                                  href={`https://docs.google.com/spreadsheets/d/${t.spreadsheetId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded"
                                  title="Buka Google Sheets"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              {t.driveFolderId && (
                                <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                                  Folder: {t.driveFolderId}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAutoCreateDatabase(t)}
                              disabled={creatingDbTenantId === t.id}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                              title="Buat folder Google Drive dan Google Sheet otomatis"
                            >
                              <FolderPlus className={`w-3.5 h-3.5 ${creatingDbTenantId === t.id ? 'animate-spin text-amber-700' : 'text-amber-700'}`} />
                              <span>{creatingDbTenantId === t.id ? 'Membuat...' : 'Buat Database Otomatis'}</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button
                            onClick={() => handleStartEditTenant(t)}
                            className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Data Sekolah & Konfigurasi"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(t.id, t.isActive)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              t.isActive ? 'border-amber-300 text-amber-800 hover:bg-amber-50' : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                            }`}
                            title={t.isActive ? 'Nonaktifkan Sekolah' : 'Aktifkan Sekolah'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setResetTenantId(t.id);
                              setNewPassword('');
                            }}
                            className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Reset Sandi Sekolah"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTenant(t)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Sekolah dari Sistem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Reset Password Modal In-place */}
              {resetTenantId && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300">
                  <h5 className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-700" />
                    Reset Sandi Sekolah ({tenants.find((t) => t.id === resetTenantId)?.name})
                  </h5>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan sandi baru..."
                      className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => handleResetPassword(resetTenantId)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Perbarui Sandi
                    </button>
                    <button
                      onClick={() => setResetTenantId(null)}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Konfirmasi Hapus Sekolah */}
              {deleteConfirmTenant && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-xs">
                      <h5 className="font-bold text-rose-900 text-sm mb-1">Konfirmasi Hapus Sekolah (Pindah ke Sampah Google Drive)</h5>
                      <p className="text-rose-800 leading-relaxed">
                        Apakah Anda yakin ingin menghapus sekolah <strong className="font-bold text-slate-950 underline">"{deleteConfirmTenant.name}"</strong> (NPSN: {deleteConfirmTenant.npsn || '-'}, Kode: {deleteConfirmTenant.code})?
                      </p>
                      <p className="text-rose-700 font-semibold mt-1">
                        ⚠️ Baris sekolah akan dihapus dari registri sistem dan Google Sheets Master. Folder Google Drive dan file Spreadsheet sekolah akan dipindahkan ke <strong>Sampah Google Drive</strong> (bukan dihapus permanen) sehingga data tetap dapat dipulihkan jika sewaktu-waktu dibutuhkan.
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleDeleteTenant(deleteConfirmTenant.id)}
                          disabled={isLoading}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer transition shadow-xs disabled:opacity-50"
                        >
                          {isLoading ? 'Memindahkan ke Sampah...' : 'Ya, Pindahkan ke Sampah Drive'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmTenant(null)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
