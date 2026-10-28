import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldAlert,
  Database,
  Archive,
} from 'lucide-react';
import { api } from '../../services/api';

export const BackupRestore: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const res = await api.getBackupList();
      if (res.success) {
        setBackups(res.backups || []);
      }
    } catch (e) {
      console.error('Error load backups:', e);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setFeedback(null);
    try {
      const res = await api.createBackup();
      if (res.success) {
        setFeedback({ text: 'Cadangan database sekolah berhasil dibuat dan disimpan.', isError: false });
        loadBackups();
      }
    } catch (e: any) {
      setFeedback({ text: e.message || 'Gagal membuat cadangan.', isError: true });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    setIsRestoring(true);
    setFeedback(null);
    try {
      const res = await api.restoreBackup(backupId);
      if (res.success) {
        setFeedback({ text: 'Pemulihan data sekolah berhasil dilakukan.', isError: false });
        setConfirmRestoreId(null);
      }
    } catch (e: any) {
      setFeedback({ text: e.message || 'Gagal memulihkan cadangan.', isError: true });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            Pencadangan & Pemulihan Data Sekolah
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            Buat snapshot lengkap database sekolah dan pulihkan data secara aman
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={isBackingUp}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
        >
          <Archive className="w-4 h-4" />
          <span>{isBackingUp ? 'Membuat Cadangan...' : 'Buat Cadangan Sekarang'}</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 transition ${feedback.isError ? 'bg-rose-50 text-rose-950 border border-rose-300' : 'bg-emerald-50 text-emerald-950 border border-emerald-300'}`}>
          {feedback.isError ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" /> : <CheckCircle className="w-4 h-4 shrink-0 text-emerald-700" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Daftar Snapshot Cadangan */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Riwayat Snapshot Cadangan Sekolah</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">ID Cadangan</th>
                <th className="py-2.5 px-3">Waktu Pencadangan</th>
                <th className="py-2.5 px-3">Ringkasan Data</th>
                <th className="py-2.5 px-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-700 font-semibold">
                    Belum ada riwayat snapshot cadangan. Klik "Buat Cadangan Sekarang" untuk mencadangkan data.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-950">{b.id}</td>
                    <td className="py-3 px-3 font-mono text-slate-800 font-semibold">
                      {new Date(b.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {b.summary ? (
                        <span>
                          {b.summary.totalSiswa} Siswa • {b.summary.totalKelas} Kelas • {b.summary.totalPresensi} Presensi
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setConfirmRestoreId(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold transition cursor-pointer"
                      >
                        Pulihkan Data
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfirmasi Pemulihan Data */}
      {confirmRestoreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-2 border-rose-400 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6 text-rose-700" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-2">Konfirmasi Pemulihan Database</h3>
            <p className="text-xs text-slate-700 leading-relaxed mb-4 font-medium">
              Apakah Anda yakin ingin memulihkan data dari snapshot <b className="text-slate-950 font-bold">{confirmRestoreId}</b>? Tindakan ini akan mengembalikan seluruh data siswa, presensi, dan konfigurasi ke tanggal snapshot tersebut.
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmRestoreId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleRestore(confirmRestoreId)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition shadow-xs"
              >
                {isRestoring ? 'Memulihkan...' : 'Ya, Pulihkan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
