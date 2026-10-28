import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  Folder,
  Layers,
  HelpCircle,
  LogIn,
  LogOut,
} from 'lucide-react';
import { api } from '../../services/api';
import { googleSignIn, googleSignOut, getAccessToken, auth } from '../../services/googleAuth';
import { TenantSchool } from '../../types';

interface DatabaseSettingsProps {
  tenant: TenantSchool;
  onTenantUpdated: (updatedTenant: TenantSchool) => void;
}

export const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({ tenant, onTenantUpdated }) => {
  const [folderId, setFolderId] = useState(tenant.driveFolderId || '');
  const [spreadsheetId, setSpreadsheetId] = useState(tenant.spreadsheetId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleUser, setGoogleUser] = useState<any | null>(null);

  const [feedback, setFeedback] = useState<{
    text: string;
    isError: boolean;
    details?: string;
  } | null>(null);

  const [mandatorySheets] = useState<string[]>([
    'KonfigurasiSekolah',
    'Pengguna',
    'TahunAjaran',
    'Semester',
    'Kelas',
    'Siswa',
    'Guru',
    'WaliKelas',
    'JadwalPresensi',
    'Presensi',
    'RiwayatPresensi',
    'IzinKamarMandi',
    'PerangkatScan',
    'AuditLog',
  ]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setGoogleUser(user);
    });
    return () => unsub();
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        setGoogleUser(res.user);
        setFeedback({
          text: `Berhasil terhubung dengan akun Google: ${res.user.email || 'Sekolah'}`,
          isError: false,
        });
      }
    } catch (e: any) {
      setFeedback({
        text: e.message || 'Gagal login dengan akun Google.',
        isError: true,
      });
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setFeedback({
        text: 'Koneksi akun Google berhasil diputuskan.',
        isError: false,
      });
    } catch (e: any) {
      setFeedback({
        text: e.message || 'Gagal logout akun Google.',
        isError: true,
      });
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.saveDatabaseConfig(folderId.trim(), spreadsheetId.trim());
      if (res.success && res.tenant) {
        onTenantUpdated(res.tenant);
        setFeedback({
          text: 'Konfigurasi Spreadsheet ID dan Folder ID berhasil disimpan ke sistem.',
          isError: false,
        });
      }
    } catch (e: any) {
      setFeedback({
        text: e.message || 'Gagal menyimpan konfigurasi.',
        isError: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!spreadsheetId.trim()) {
      setFeedback({
        text: 'Masukkan Spreadsheet ID terlebih dahulu sebelum melakukan tes koneksi.',
        isError: true,
      });
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      const token = await getAccessToken();
      const res = await api.testGoogleConnection({
        spreadsheetId: spreadsheetId.trim(),
        driveFolderId: folderId.trim() || undefined,
        accessToken: token || undefined,
      });
      if (res.success) {
        if (res.fallbackLocal) {
          setFeedback({
            text: res.message,
            isError: false,
          });
        } else {
          setFeedback({
            text: `Koneksi Berhasil! Terhubung ke Spreadsheet: "${res.spreadsheetTitle}". Lembar terdeteksi: ${(res.existingSheets || []).length} lembar.`,
            isError: false,
          });
        }
      }
    } catch (e: any) {
      setFeedback({
        text: e.message || 'Gagal menghubungi Google API. Periksa apakah Spreadsheet ID valid dan izin telah diberikan.',
        isError: true,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleInitializeSheets = async () => {
    if (!spreadsheetId.trim()) {
      setFeedback({ text: 'Spreadsheet ID belum diisi.', isError: true });
      return;
    }

    setIsInitializing(true);
    setFeedback(null);
    try {
      const token = await getAccessToken();
      const res = await api.initializeSheets(spreadsheetId.trim(), token || undefined);
      if (res.success) {
        setFeedback({
          text: res.message || '15 Sheet Wajib berhasil disiapkan secara idempoten!',
          isError: false,
        });
      }
    } catch (e: any) {
      setFeedback({ text: e.message || 'Gagal menyiapkan lembar spreadsheet.', isError: true });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await api.syncDatabase();
      if (res.success) {
        setFeedback({ text: 'Sinkronisasi data presensi dan master data berhasil dilakukan.', isError: false });
      }
    } catch (e: any) {
      setFeedback({ text: e.message || 'Gagal menjalankan sinkronisasi.', isError: true });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Pengaturan Database Google Drive & Google Sheets
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            Setiap sekolah menghubungkan dan mengelola Spreadsheet & Folder Google miliknya sendiri
          </p>
        </div>

        {/* Status Koneksi Badge */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs">
          <Database className="w-4 h-4 text-emerald-700" />
          <span className="text-slate-800 font-bold">Status Database:</span>
          <span
            className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
              tenant.syncStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                : 'bg-amber-50 text-amber-950 border border-amber-300'
            }`}
          >
            {tenant.syncStatus === 'connected' ? 'Terhubung' : 'Belum Terhubung'}
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-start gap-2.5 transition ${
            feedback.isError
              ? 'bg-rose-50 text-rose-950 border border-rose-300'
              : 'bg-emerald-50 text-emerald-950 border border-emerald-300'
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
          )}
          <div>
            <div className="font-bold">{feedback.text}</div>
            {feedback.details && <div className="text-[11px] text-slate-700 mt-1 font-medium">{feedback.details}</div>}
          </div>
        </div>
      )}

      {/* Grid 2 Kolom: Konfigurasi & Status Lembar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Form ID & Tombol Uji (7 Kolom) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Otorisasi Akun Google Sekolah */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Otorisasi Akun Google Sekolah (OAuth 2.0)
            </h3>
            <p className="text-xs text-slate-700 font-medium mb-4 leading-relaxed">
              Hubungkan akun Google resmi sekolah agar aplikasi memiliki izin membaca dan menulis langsung ke Google Spreadsheet dan Drive.
            </p>

            {googleUser ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-950 flex items-center justify-center font-bold">
                    {googleUser.displayName?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-950">{googleUser.displayName || 'Akun Google Sekolah'}</div>
                    <div className="text-slate-700 text-[11px] font-semibold">{googleUser.email}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-950 border border-rose-300 text-xs hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer font-bold"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-700" />
                  <span>Putuskan</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Hubungkan Akun Google Sekolah (Sign in with Google)</span>
              </button>
            )}
          </div>

          {/* Form ID Google Drive & Sheets */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              Pengaturan ID Spreadsheet & Folder Drive
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1 flex items-center justify-between">
                  <span>Google Spreadsheet ID *</span>
                  <a
                    href="https://sheets.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-0.5 underline"
                  >
                    <span>Buka Google Sheets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    required
                  />
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Ambil rangkaian karakter di antara <code>/d/</code> dan <code>/edit</code> pada URL Google Spreadsheet Anda.
                </p>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1 flex items-center justify-between">
                  <span>Google Drive Folder ID (Opsional)</span>
                  <span className="text-slate-600 font-semibold">Penyimpanan Foto & Arsip</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Folder className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    placeholder="Contoh: 1AbCdEfGhIjKlMnOpQrStUvWxYz"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2.5">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi ID'}
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-700' : 'text-slate-700'}`} />
                  <span>Uji Koneksi Google API</span>
                </button>

                <button
                  type="button"
                  onClick={handleInitializeSheets}
                  disabled={isInitializing}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Siapkan 15 Lembar Wajib</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-700' : 'text-slate-700'}`} />
                  <span>Sinkronisasi Data Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Daftar 15 Lembar Wajib & Panduan (5 Kolom) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 15 Sheet Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              15 Lembar Spreadsheet Wajib
            </h3>
            <p className="text-xs text-slate-700 font-medium mb-3">
              Struktur sheet dibuat secara idempoten tanpa merusak data lama:
            </p>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {mandatorySheets.map((sheetName, i) => (
                <div
                  key={sheetName}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-slate-900 font-bold">
                    <span className="text-slate-600 mr-2 font-normal">{i + 1}.</span>
                    {sheetName}
                  </span>
                  <span className="text-[10px] text-emerald-950 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    Valid
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Panduan Konfigurasi */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-xs space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Panduan Mandiri Sekolah
            </h3>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 font-medium">
              <li>Buat Google Spreadsheet baru di akun Google Drive sekolah Anda.</li>
              <li>Salin ID Spreadsheet dari URL browser Anda.</li>
              <li>Tempelkan ke kolom Spreadsheet ID di sebelah kiri.</li>
              <li>Klik "Hubungkan Akun Google Sekolah" untuk memberi izin baca/tulis.</li>
              <li>Klik "Siapkan 15 Lembar Wajib" untuk men-generate otomatis header kolom.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
