import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Search,
  Download,
  Printer,
  CheckCircle,
  Clock,
  HeartPulse,
  FileQuestion,
  UserX,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InternalUser, SchoolClass, TenantSchool } from '../../types';
import { api } from '../../services/api';
import { AttendanceMonitoringSection } from '../monitoring/AttendanceMonitoringSection';
import { generateClassMonitoringPDF } from '../../utils/monitoringPdf';
import { BarChart3, ListFilter } from 'lucide-react';

interface WaliKelasViewProps {
  currentUser: InternalUser | null;
  tenant?: TenantSchool | null;
}

export const WaliKelasView: React.FC<WaliKelasViewProps> = ({ currentUser, tenant }) => {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'daily'>('monitoring');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [targetClass, setTargetClass] = useState<SchoolClass | null>(null);
  const [isClassVerified, setIsClassVerified] = useState<boolean>(false);
  const [teacherNameInput, setTeacherNameInput] = useState(currentUser?.fullName || '');
  const [classPasswordInput, setClassPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  });
  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadClassInfo();
  }, [currentUser]);

  useEffect(() => {
    if (targetClass && isClassVerified) {
      loadAttendance();
    }
  }, [targetClass, selectedDate, isClassVerified]);

  const loadClassInfo = async () => {
    try {
      const res = await api.getMasterData();
      if (res.success && res.data) {
        const allClasses: SchoolClass[] = res.data.kelas || [];
        setClasses(allClasses);

        // Jika user adalah admin, otomatis terverifikasi ke kelas pertama
        if (currentUser?.role === 'admin') {
          setTargetClass(allClasses[0] || null);
          setIsClassVerified(true);
        } else if (currentUser?.assignedClassId) {
          const assigned = allClasses.find((c) => c.id === currentUser.assignedClassId);
          if (assigned) {
            setTargetClass(assigned);
            setIsClassVerified(true);
            sessionStorage.setItem(`wali_verified_${assigned.id}`, assigned.id);
          }
        }
      }
    } catch (e) {
      console.error('Error load class for wali kelas:', e);
    }
  };

  const handleVerifyClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClass) {
      setVerifyError('Silakan pilih kelas terlebih dahulu.');
      return;
    }
    if (!classPasswordInput) {
      setVerifyError('Masukkan kata sandi kelas.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    try {
      const res = await api.verifyWaliKelas(targetClass.id, teacherNameInput, classPasswordInput);
      if (res.success) {
        sessionStorage.setItem(`wali_verified_${targetClass.id}`, targetClass.id);
        setIsClassVerified(true);
        setClassPasswordInput('');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Kata sandi kelas salah.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSwitchClass = () => {
    if (currentUser?.role !== 'admin') {
      setIsClassVerified(false);
    }
  };

  const loadAttendance = async () => {
    if (!targetClass) return;
    setIsLoading(true);
    try {
      const res = await api.getPresensi(selectedDate, targetClass.id);
      if (res.success) {
        setRecords(res.records || []);
      }
    } catch (e) {
      console.error('Error load attendance for wali kelas:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Hitung ringkasan kelas
  const summary = {
    total: records.length,
    hadir: records.filter((r) => r.status === 'hadir').length,
    terlambat: records.filter((r) => r.status === 'terlambat').length,
    sakit: records.filter((r) => r.status === 'sakit').length,
    izin: records.filter((r) => r.status === 'izin').length,
    alpha: records.filter((r) => r.status === 'alpha').length,
  };

  const filteredRecords = records.filter((r) =>
    r.studentName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportExcel = () => {
    if (records.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const exportRows = records.map((r, i) => ({
      No: i + 1,
      Nama_Siswa: r.studentName,
      Kelas: r.className,
      Tanggal: r.date,
      Status: r.status.toUpperCase(),
      Metode: r.method,
      Waktu_Catat: r.recordedAt ? r.recordedAt.slice(11, 16) : '-',
      Perekam: r.recordedByUserName || '-',
      Catatan: r.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Presensi_${targetClass?.name}`);
    XLSX.writeFile(wb, `Rekap_Presensi_${targetClass?.name}_${selectedDate}.xlsx`);
  };

  const exportPDFDaily = () => {
    if (records.length === 0) {
      alert('Tidak ada data untuk diunduh sebagai PDF.');
      return;
    }

    const studentSummaries = records.map((r) => ({
      nis: r.studentNis || r.studentId || '-',
      name: r.studentName || '-',
      hadir: r.status === 'hadir' ? 1 : 0,
      terlambat: r.status === 'terlambat' ? 1 : 0,
      sakit: r.status === 'sakit' ? 1 : 0,
      izin: r.status === 'izin' ? 1 : 0,
      alpha: r.status === 'alpha' ? 1 : 0,
      rate: r.status === 'hadir' || r.status === 'terlambat' ? 100 : 0,
      statusNote: r.notes || (r.status === 'hadir' ? 'Tepat Waktu' : r.status),
    }));

    generateClassMonitoringPDF({
      className: targetClass?.name || 'VII-A',
      waliKelasName: targetClass?.waliKelasName || teacherNameInput || 'Wali Kelas',
      timeframe: 'daily',
      periodLabel: selectedDate,
      stats: {
        totalStudents: records.length,
        hadir: summary.hadir,
        terlambat: summary.terlambat,
        sakit: summary.sakit,
        izin: summary.izin,
        alpha: summary.alpha,
        attendanceRate: records.length > 0 ? Math.round(((summary.hadir + summary.terlambat) / records.length) * 100) : 0,
      },
      studentSummaries,
      schoolInfo: {
        name: tenant?.name,
        npsn: tenant?.npsn,
        address: tenant?.address,
        phone: tenant?.phone,
      },
      signeeName: targetClass?.waliKelasName || teacherNameInput || 'Wali Kelas',
      signeeRole: 'Wali Kelas',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Tampilan Gate Verifikasi Sandi Kelas Wali Kelas jika belum terverifikasi
  if (!isClassVerified) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <div className="bg-white border border-slate-300 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Verifikasi Akses Wali Kelas</h2>
            <p className="text-xs text-slate-700 font-medium">
              Pilih kelas binaan dan masukkan kata sandi kelas yang telah diatur oleh Admin Sekolah
            </p>
          </div>

          {verifyError && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 font-bold flex items-center gap-2">
              <UserX className="w-4 h-4 shrink-0 text-rose-700" />
              <span>{verifyError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyClass} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-800 mb-1.5">
                Pilih Kelas yang Dituju *
              </label>
              <select
                value={targetClass?.id || ''}
                onChange={(e) => {
                  const found = classes.find((c) => c.id === e.target.value);
                  setTargetClass(found || null);
                  if (found?.waliKelasName) {
                    setTeacherNameInput(found.waliKelasName);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                required
              >
                <option value="" className="bg-white text-slate-900">-- Pilih Kelas --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-slate-900">
                    Kelas {c.name} {c.programName ? `(${c.programName})` : ''} - Wali: {c.waliKelasName || 'Belum diatur'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-800 mb-1.5">
                Nama Wali Kelas / Guru
              </label>
              <input
                type="text"
                value={teacherNameInput}
                onChange={(e) => setTeacherNameInput(e.target.value)}
                placeholder="Nama lengkap wali kelas..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-800 mb-1.5">
                Kata Sandi Kelas *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={classPasswordInput}
                  onChange={(e) => setClassPasswordInput(e.target.value)}
                  placeholder="Masukkan sandi kelas (default: wali123)..."
                  className="w-full pl-3.5 pr-20 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-xs text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
              <p className="text-xs text-slate-700 font-medium mt-1">
                Kata sandi diatur oleh Admin Sekolah di Data Master &gt; Kelas. (Default awal: <code className="text-indigo-700 font-bold bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200">wali123</code>)
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isVerifying ? 'Memverifikasi...' : 'Buka & Masuk ke Kelas'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Wali Kelas */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-950 border border-emerald-300">
              Akses Terverifikasi
            </span>
            <span className="text-xs text-slate-700 font-medium">
              Program: {targetClass?.programName || 'Reguler'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-1">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Rekapitulasi & Monitoring Kelas {targetClass?.name}
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            Wali Kelas: <span className="font-bold text-slate-950">{targetClass?.waliKelasName || teacherNameInput || 'Wali Kelas'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tombol Ganti / Pindah Kelas */}
          <button
            onClick={handleSwitchClass}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition cursor-pointer"
          >
            Pindah Kelas
          </button>

          {/* Jika Admin yang membuka, izinkan ganti kelas langsung */}
          {currentUser?.role === 'admin' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <select
                value={targetClass?.id || ''}
                onChange={(e) => {
                  const found = classes.find((c) => c.id === e.target.value);
                  if (found) setTargetClass(found);
                }}
                className="bg-transparent text-slate-900 font-bold focus:outline-none text-xs cursor-pointer"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-slate-900">
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Navigasi Sub-Tab Wali Kelas */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('monitoring')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'monitoring'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-700 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Grafik & Monitoring (Per Siswa & Per Kelas)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'daily'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-700 hover:text-slate-900'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Rekapitulasi Harian Tanggal Tertentu</span>
        </button>
      </div>

      {/* Tampilan Tab 1: Grafik & Monitoring Terpadu */}
      {activeTab === 'monitoring' && (
        <AttendanceMonitoringSection
          tenant={tenant || null}
          currentUser={currentUser}
          classes={classes}
          defaultClassId={targetClass?.id}
          allowAllClasses={currentUser?.role === 'admin'}
          roleLabel="Wali Kelas"
        />
      )}

      {/* Tampilan Tab 2: Rincian Presensi Harian Tertentu */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none text-xs cursor-pointer"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={exportPDFDaily}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Unduh laporan presensi tanggal ini sebagai PDF resmi"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PDF Hari Ini</span>
              </button>

              <button
                onClick={exportExcel}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Excel</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                <span>Cetak Rekap</span>
              </button>
            </div>
          </div>

      {/* Ringkasan Kehadiran Kelas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center shadow-xs">
          <span className="text-xs font-bold uppercase text-emerald-800">Hadir</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{summary.hadir}</div>
          <span className="text-[11px] text-slate-600 font-medium">Tepat waktu</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center shadow-xs">
          <span className="text-xs font-bold uppercase text-amber-800">Terlambat</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{summary.terlambat}</div>
          <span className="text-[11px] text-slate-600 font-medium">Lewat batas waktu</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center shadow-xs">
          <span className="text-xs font-bold uppercase text-blue-800">Sakit</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{summary.sakit}</div>
          <span className="text-[11px] text-slate-600 font-medium">Keterangan sakit</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center shadow-xs">
          <span className="text-xs font-bold uppercase text-purple-800">Izin</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{summary.izin}</div>
          <span className="text-[11px] text-slate-600 font-medium">Keperluan keluarga</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center shadow-xs">
          <span className="text-xs font-bold uppercase text-rose-800">Alpha</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{summary.alpha}</div>
          <span className="text-[11px] text-slate-600 font-medium">Tanpa keterangan</span>
        </div>
      </div>

      {/* Tabel Rincian Siswa Kelas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa dalam kelas..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div className="text-xs text-slate-700 font-medium">
            Total Siswa di Kelas: <b className="text-slate-950 font-bold">{records.length}</b> anak
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Metode Presensi</th>
                <th className="py-2.5 px-3">Waktu Masuk</th>
                <th className="py-2.5 px-3">Petugas</th>
                <th className="py-2.5 px-3">Catatan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-700 font-semibold">
                    Tidak ada catatan siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, i) => (
                  <tr key={r.studentId} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">{i + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-950">{r.studentName}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'hadir'
                            ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                            : r.status === 'terlambat'
                            ? 'bg-amber-50 text-amber-950 border border-amber-300'
                            : r.status === 'sakit'
                            ? 'bg-blue-50 text-blue-950 border border-blue-300'
                            : r.status === 'izin'
                            ? 'bg-purple-50 text-purple-950 border border-purple-300'
                            : 'bg-rose-50 text-rose-950 border border-rose-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 capitalize font-mono text-slate-700 font-semibold">{r.method || 'manual'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800 font-bold">
                      {r.recordedAt ? `${r.recordedAt.slice(11, 16)} WIB` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{r.recordedByUserName || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-700 italic">{r.notes || '-'}</td>
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
  );
};
