import React, { useState, useEffect } from 'react';
import {
  DoorOpen,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Timer,
  UserCheck,
  Check,
  Filter,
  Download,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';
import { playSuccessChime, playWarningChime } from '../../services/audio';

export const IzinKamarMandi: React.FC = () => {
  const [activePermits, setActivePermits] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Tab View: Izin Aktif vs Riwayat
  const [currentSubTab, setCurrentSubTab] = useState<'active' | 'history'>('active');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyFilterOverdue, setHistoryFilterOverdue] = useState(false);

  // Live timer tick setiap detik
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadStudents();
    loadActivePermits();
  }, []);

  // Multi-device real-time sync (sinkronisasi langsung lintas perangkat tiap 3 detik)
  useEffect(() => {
    const syncTimer = setInterval(() => {
      if (currentSubTab === 'active') {
        loadActivePermits(true);
      }
    }, 3000);
    return () => clearInterval(syncTimer);
  }, [currentSubTab]);

  useEffect(() => {
    if (currentSubTab === 'history') {
      loadHistory();
    }
  }, [currentSubTab, historyFilterOverdue]);

  const loadStudents = async () => {
    try {
      const res = await api.getMasterData();
      if (res.success && res.data) {
        setStudents(res.data.siswa || []);
      }
    } catch (e) {
      console.error('Error load students for bathroom:', e);
    }
  };

  const loadActivePermits = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await api.getActiveBathroomPermits();
      if (res.success) {
        // Filter ketat: siswa yang telah berstatus kembali tidak akan muncul lagi
        const activeOnly = (res.permits || []).filter((p: any) => !p.isReturned && !p.timeIn);
        setActivePermits(activeOnly);
      }
    } catch (e: any) {
      console.error('Error load active permits:', e);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBathroomHistory(undefined, undefined, historyFilterOverdue);
      if (res.success) {
        setHistoryList(res.history || []);
      }
    } catch (e: any) {
      console.error('Error load history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter pencarian nama siswa lintas kelas
  const matchedStudents = searchStudentQuery.trim()
    ? students
        .filter((s) => s.fullName.toLowerCase().includes(searchStudentQuery.toLowerCase()) && s.isActive)
        .slice(0, 8)
    : [];

  const handleCreatePermit = async (type: 'BAB' | 'BAK') => {
    if (!selectedStudent) {
      setFeedbackMsg({ text: 'Cari dan pilih siswa terlebih dahulu.', isError: true });
      return;
    }

    try {
      const res = await api.createBathroomPermit(selectedStudent.id, type);
      if (res.success) {
        playSuccessChime();
        setFeedbackMsg({ text: res.message, isError: false });
        setSelectedStudent(null);
        setSearchStudentQuery('');
        loadActivePermits();
      }
    } catch (err: any) {
      playWarningChime();
      setFeedbackMsg({ text: err.message || 'Gagal membuat izin kamar mandi.', isError: true });
    }
  };

  const handleConfirmReturn = async (permitId: string) => {
    // 1. Optimistic UI update: langsung hapus dari daftar izin aktif seketika
    setActivePermits((prev) => prev.filter((p) => p.id !== permitId));

    try {
      const res = await api.returnBathroomPermit(permitId);
      if (res.success) {
        playSuccessChime();
        setFeedbackMsg({ text: res.message, isError: false });
        loadActivePermits(true);
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Gagal mengonfirmasi kembali.', isError: true });
      loadActivePermits(true);
    }
  };

  const exportHistoryExcel = () => {
    if (historyList.length === 0) {
      setFeedbackMsg({ text: 'Tidak ada data riwayat untuk diekspor.', isError: true });
      return;
    }

    const exportData = historyList.map((h, idx) => ({
      No: idx + 1,
      Tanggal: h.date,
      Nama_Siswa: h.studentName,
      Kelas: h.className,
      Jenis_Izin: h.type,
      Batas_Waktu_Menit: h.maxMinutes,
      Waktu_Keluar: h.timeOut ? h.timeOut.slice(11, 19) : '-',
      Waktu_Kembali: h.timeIn ? h.timeIn.slice(11, 19) : 'Belum Kembali',
      Durasi_Menit: h.actualDurationMinutes ?? '-',
      Status_Terlambat: h.isOverdue ? 'TERLAMBAT' : 'TEPAT WAKTU',
      Petugas_Pencatat: h.recordedByUserName || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat_Izin_Kamar_Mandi');
    XLSX.writeFile(wb, `Laporan_Izin_Kamar_Mandi_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-indigo-600" />
            Manajemen Izin Kamar Mandi (Toilet)
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            BAB (maks 10 menit) • BAK (maks 5 menit) • Maks 2 siswa per-kelas • Timer otomatis akurat
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-300">
          <button
            onClick={() => setCurrentSubTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              currentSubTab === 'active'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-800 hover:text-slate-950 hover:bg-slate-200'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Izin Aktif ({activePermits.length})</span>
          </button>
          <button
            onClick={() => setCurrentSubTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              currentSubTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-800 hover:text-slate-950 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Izin</span>
          </button>
        </div>
      </div>

      {/* Alert Feedback */}
      {feedbackMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition ${feedbackMsg.isError ? 'bg-rose-50 text-rose-950 border border-rose-300' : 'bg-emerald-50 text-emerald-950 border border-emerald-300'}`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" /> : <Check className="w-4 h-4 shrink-0 text-emerald-700" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-600 hover:text-slate-900 text-xs font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {currentSubTab === 'active' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Pembuatan Izin Baru (5 Kolom) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Pencatatan Izin Keluar Kelas
              </h3>
              <p className="text-xs text-slate-700 font-medium mb-4">
                Ketik nama siswa tanpa perlu memilih kelas terlebih dahulu.
              </p>

              {/* Pencarian Siswa Langsung */}
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={searchStudentQuery}
                    onChange={(e) => {
                      setSearchStudentQuery(e.target.value);
                      setSelectedStudent(null);
                    }}
                    placeholder="Ketik nama siswa..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                {/* Hasil Autocomplete Siswa */}
                {matchedStudents.length > 0 && !selectedStudent && (
                  <div className="bg-white border border-slate-300 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-lg max-h-48 overflow-y-auto">
                    {matchedStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          setSearchStudentQuery(s.fullName);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition flex items-center justify-between text-slate-800 cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-950">{s.fullName}</div>
                          <div className="text-[11px] text-slate-700 font-semibold">NIS: {s.nis}</div>
                        </div>
                        <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded text-[10px] text-indigo-950 font-bold border border-indigo-200">
                          {s.className}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Detail Siswa Terpilih */}
                {selectedStudent && (
                  <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
                    <div className="font-bold text-slate-900 text-sm">{selectedStudent.fullName}</div>
                    <div className="text-slate-600 text-xs mt-0.5">
                      Kelas: <span className="font-semibold text-slate-800">{selectedStudent.className}</span> • NIS:{' '}
                      <span className="font-mono">{selectedStudent.nis}</span>
                    </div>
                  </div>
                )}

                {/* Tombol Pilihan Jenis Izin */}
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCreatePermit('BAK')}
                    disabled={!selectedStudent}
                    className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex flex-col items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    <span>Izin BAK</span>
                    <span className="text-[10px] font-normal opacity-90">Maks. 5 Menit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreatePermit('BAB')}
                    disabled={!selectedStudent}
                    className="py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition flex flex-col items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    <span>Izin BAB</span>
                    <span className="text-[10px] font-normal opacity-90">Maks. 10 Menit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Daftar Izin Aktif & Countdown Timer (7 Kolom) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Timer className="w-4 h-4 text-indigo-600" />
                  Siswa Sedang Izin di Luar Kelas ({activePermits.length})
                </h3>
                <button
                  onClick={() => loadActivePermits()}
                  className="text-xs text-indigo-600 hover:text-indigo-700 transition cursor-pointer font-medium"
                >
                  Segarkan
                </button>
              </div>

              {activePermits.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60 mb-2" />
                  <p className="text-xs font-medium text-slate-600">Tidak ada siswa yang sedang izin kamar mandi.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Seluruh siswa berada di dalam kelas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activePermits.map((permit) => {
                    const outTime = new Date(permit.timeOut).getTime();
                    const elapsedMs = Math.max(0, currentTime - outTime);
                    const totalSecs = Math.floor(elapsedMs / 1000);
                    const mins = Math.floor(totalSecs / 60);
                    const secs = totalSecs % 60;
                    const maxSecs = permit.maxMinutes * 60;
                    const isOverdue = totalSecs > maxSecs;
                    const remainingSecs = Math.max(0, maxSecs - totalSecs);
                    const remMins = Math.floor(remainingSecs / 60);
                    const remSecs = remainingSecs % 60;

                    return (
                      <div
                        key={permit.id}
                        className={`p-4 rounded-xl border transition shadow-xs ${
                          isOverdue
                            ? 'bg-rose-50 border-rose-300 text-rose-900'
                            : 'bg-slate-50/70 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{permit.studentName}</span>
                              <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded text-[10px] text-indigo-700 border border-indigo-100">
                                {permit.className}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  permit.type === 'BAB'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                                }`}
                              >
                                Izin {permit.type}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                              <span>Keluar: {permit.timeOut.slice(11, 16)} WIB</span>
                              <span>•</span>
                              <span>Batas: {permit.maxMinutes} menit</span>
                            </div>
                          </div>

                          {/* Live Countdown & Confirm Return Button */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div
                                className={`text-base font-mono font-bold ${
                                  isOverdue ? 'text-rose-600 animate-pulse' : 'text-emerald-600'
                                }`}
                              >
                                {isOverdue
                                  ? `+${mins}:${secs < 10 ? '0' : ''}${secs}`
                                  : `${remMins}:${remSecs < 10 ? '0' : ''}${remSecs}`}
                              </div>
                              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                {isOverdue ? 'TERLAMBAT' : 'Sisa Waktu'}
                              </span>
                            </div>

                            <button
                              onClick={() => handleConfirmReturn(permit.id)}
                              title="Konfirmasi Siswa Kembali"
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Check className="w-4 h-4" />
                              <span>Kembali</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Tab Riwayat Izin Kamar Mandi */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Riwayat Izin Kamar Mandi</h3>
              <p className="text-xs text-slate-500">Arsip data durasi keluar kelas dan kedisiplinan</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={historyFilterOverdue}
                  onChange={(e) => setHistoryFilterOverdue(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Hanya yang Terlambat</span>
              </label>

              <button
                onClick={exportHistoryExcel}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Jenis</th>
                  <th className="py-2.5 px-3">Waktu Keluar</th>
                  <th className="py-2.5 px-3">Waktu Kembali</th>
                  <th className="py-2.5 px-3">Durasi</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Belum ada riwayat izin kamar mandi.
                    </td>
                  </tr>
                ) : (
                  historyList.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-600">{h.date}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{h.studentName}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-700 border border-indigo-100">
                          {h.className}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{h.type}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{h.timeOut?.slice(11, 16)} WIB</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {h.timeIn ? `${h.timeIn.slice(11, 16)} WIB` : <span className="text-amber-600 italic">Belum</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {h.actualDurationMinutes ? `${h.actualDurationMinutes} menit` : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {h.isOverdue ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Terlambat
                          </span>
                        ) : h.isReturned ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                            Tepat Waktu
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{h.recordedByUserName || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
