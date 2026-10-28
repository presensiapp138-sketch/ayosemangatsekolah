import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle,
  Clock,
  HeartPulse,
  FileQuestion,
  UserX,
  History,
  Save,
  Check,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { SchoolClass, Student } from '../../types';
import { api } from '../../services/api';

export const PresensiManual: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  });
  const [selectedSession, setSelectedSession] = useState('sch-pagi');
  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Status Change Modal
  const [activeModalStudent, setActiveModalStudent] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('hadir');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadAttendanceRecords();
  }, [selectedClassId, selectedDate, selectedSession]);

  const loadClasses = async () => {
    try {
      const res = await api.getMasterData();
      if (res.success && res.data) {
        setClasses(res.data.kelas || []);
      }
    } catch (e: any) {
      console.error('Error load classes:', e);
    }
  };

  const loadAttendanceRecords = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPresensi(
        selectedDate,
        selectedClassId === 'all' ? undefined : selectedClassId,
        selectedSession
      );
      if (res.success) {
        setRecords(res.records || []);
      }
    } catch (e: any) {
      console.error('Error load attendance:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStatus = async (item: any, newStatus: string) => {
    setSavingId(item.studentId);
    setFeedbackMsg(null);
    try {
      const res = await api.recordPresensi({
        studentId: item.studentId,
        status: newStatus,
        method: 'manual',
        notes: `Presensi manual diubah ke ${newStatus.toUpperCase()}`,
        date: selectedDate,
        sessionId: selectedSession,
      });

      if (res.success) {
        setFeedbackMsg({ text: `Presensi ${item.studentName} disimpan sebagai ${newStatus.toUpperCase()}`, isError: false });
        loadAttendanceRecords();
      }
    } catch (e: any) {
      setFeedbackMsg({ text: e.message || 'Gagal menyimpan status.', isError: true });
    } finally {
      setSavingId(null);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalStudent) return;

    setSavingId(activeModalStudent.studentId);
    try {
      const res = await api.recordPresensi({
        studentId: activeModalStudent.studentId,
        status: targetStatus,
        method: 'manual',
        notes,
        date: selectedDate,
        sessionId: selectedSession,
      });

      if (res.success) {
        setFeedbackMsg({ text: `Status ${activeModalStudent.studentName} berhasil diperbarui.`, isError: false });
        setActiveModalStudent(null);
        setNotes('');
        loadAttendanceRecords();
      }
    } catch (e: any) {
      setFeedbackMsg({ text: e.message || 'Gagal memperbarui presensi.', isError: true });
    } finally {
      setSavingId(null);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const filteredRecords = records.filter((r) =>
    r.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.className?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            Presensi Manual Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan langsung per-kelas dengan validasi status dan riwayat perubahan
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pilih Tanggal */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold focus:outline-none text-xs"
            />
          </div>

          {/* Pilih Kelas */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold focus:outline-none text-xs cursor-pointer"
            >
              <option value="all" className="bg-white text-slate-900">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-slate-900">
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 transition ${feedbackMsg.isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {feedbackMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> : <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search & Counter Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span>Menampilkan <b className="text-slate-800">{filteredRecords.length}</b> siswa</span>
            <span>•</span>
            <span className="text-[11px] text-slate-400">Siswa tanpa presensi terhitung otomatis sebagai Alpha</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Status Presensi (Dropdown)</th>
                <th className="py-3 px-4">Waktu / Perekam</th>
                <th className="py-3 px-4 text-right">Keterangan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <div className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-1" />
                    <div>Memuat data presensi...</div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ditemukan siswa yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const currentStatus = item.status || 'alpha';
                  return (
                    <tr key={item.studentId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{item.studentName}</div>
                        {item.notes && (
                          <div className="text-[11px] text-amber-700 italic mt-0.5">{item.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-indigo-700 font-medium">
                          {item.className}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {/* Status Dropdown - Default Alpha */}
                        <div className="flex items-center gap-2">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleQuickStatus(item, e.target.value)}
                            disabled={savingId === item.studentId}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-600 transition shadow-2xs ${
                              currentStatus === 'hadir'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : currentStatus === 'terlambat'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : currentStatus === 'sakit'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : currentStatus === 'izin'
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="alpha" className="bg-white text-rose-700 font-bold">Alpha (Default)</option>
                            <option value="hadir" className="bg-white text-emerald-700 font-bold">Hadir</option>
                            <option value="terlambat" className="bg-white text-amber-700 font-bold">Terlambat</option>
                            <option value="sakit" className="bg-white text-blue-700 font-bold">Sakit</option>
                            <option value="izin" className="bg-white text-purple-700 font-bold">Izin</option>
                          </select>
                          {savingId === item.studentId && (
                            <span className="text-[10px] text-indigo-700 font-bold animate-pulse">Menyimpan...</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {item.recordedAt ? (
                          <>
                            <span className="font-mono text-slate-900 font-bold">{item.recordedAt.slice(11, 16)} WIB</span>
                            <span className="block text-[10px] text-slate-500 font-medium">{item.recordedByUserName || 'Petugas'}</span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic text-[11px] font-medium">Belum diabsen (Default Alpha)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setActiveModalStudent(item);
                            setTargetStatus(item.status || 'alpha');
                            setNotes(item.notes || '');
                          }}
                          className="px-2.5 py-1 text-[11px] rounded-lg bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 transition cursor-pointer inline-flex items-center gap-1 shadow-2xs font-medium"
                        >
                          <History className="w-3 h-3" />
                          <span>Ubah / Alasan</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ubah Status & Catat Alasan */}
      {activeModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Ubah Status Presensi
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {activeModalStudent.studentName} ({activeModalStudent.className})
            </p>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
                  Status Baru
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['hadir', 'terlambat', 'sakit', 'izin', 'alpha'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTargetStatus(st)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold uppercase transition border cursor-pointer ${
                        targetStatus === st
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
                  Alasan / Keterangan Perubahan
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Surat keterangan dokter terlampir..."
                  rows={3}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Tampilkan Riwayat Lama jika ada */}
              {activeModalStudent.history && activeModalStudent.history.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-2">Riwayat Perubahan Terakhir:</span>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto text-[11px]">
                    {activeModalStudent.history.map((h: any, i: number) => (
                      <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                        <div className="flex justify-between font-mono text-[10px] text-slate-500">
                          <span>{h.previousStatus?.toUpperCase()} &rarr; {h.newStatus?.toUpperCase()}</span>
                          <span>{h.timestamp?.slice(11, 16)}</span>
                        </div>
                        <div className="text-slate-600 mt-0.5">{h.reason} ({h.changedByUserName})</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveModalStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingId === activeModalStudent.studentId}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
