import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  User,
  Users,
  Calendar,
  Clock,
  Download,
  FileText,
  Filter,
  CheckCircle,
  AlertTriangle,
  UserX,
  HeartPulse,
  FileQuestion,
  DoorOpen,
  TrendingUp,
  Search,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import * as XLSX from 'xlsx';
import { InternalUser, SchoolClass, Student, TenantSchool } from '../../types';
import { api } from '../../services/api';
import {
  generateClassMonitoringPDF,
  generateStudentMonitoringPDF,
} from '../../utils/monitoringPdf';

export type MonitoringScope = 'class' | 'student';
export type MonitoringTimeframe = 'daily' | 'weekly' | 'monthly';

export interface AttendanceMonitoringSectionProps {
  tenant: TenantSchool | null;
  currentUser: InternalUser | null;
  classes: SchoolClass[];
  defaultClassId?: string;
  allowAllClasses?: boolean;
  roleLabel?: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const STATUS_COLORS = {
  hadir: '#10b981',
  terlambat: '#f59e0b',
  sakit: '#3b82f6',
  izin: '#a855f7',
  alpha: '#f43f5e',
};

export const AttendanceMonitoringSection: React.FC<AttendanceMonitoringSectionProps> = ({
  tenant,
  currentUser,
  classes,
  defaultClassId,
  allowAllClasses = false,
  roleLabel = 'Wali Kelas',
}) => {
  const [scope, setScope] = useState<MonitoringScope>('class');
  const [timeframe, setTimeframe] = useState<MonitoringTimeframe>('daily');

  // Selected Class
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (defaultClassId) return defaultClassId;
    if (classes.length > 0) return allowAllClasses ? 'all' : classes[0].id;
    return allowAllClasses ? 'all' : '';
  });

  // Date filters
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1);

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [records, setRecords] = useState<any[]>([]);
  const [bathroomOverdue, setBathroomOverdue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // Sinkronisasi defaultClassId jika berubah
  useEffect(() => {
    if (defaultClassId && defaultClassId !== selectedClassId) {
      setSelectedClassId(defaultClassId);
    }
  }, [defaultClassId]);

  // Muat daftar master siswa
  useEffect(() => {
    loadMasterStudents();
  }, []);

  const loadMasterStudents = async () => {
    try {
      const res = await api.getMasterData();
      if (res.success && res.data?.siswa) {
        setStudents(res.data.siswa.filter((s: Student) => s.isActive));
      }
    } catch (e) {
      console.warn('Gagal memuat master siswa monitoring:', e);
    }
  };

  // Hitung rentang tanggal berdasarkan timeframe yang dipilih
  const dateRange = useMemo(() => {
    if (timeframe === 'daily') {
      return {
        startDate: selectedDate,
        endDate: selectedDate,
        label: selectedDate,
      };
    }

    if (timeframe === 'weekly') {
      // 4 Pekan dalam sebulan: Pekan 1 (1-7), Pekan 2 (8-14), Pekan 3 (15-21), Pekan 4 (22-akhir bulan)
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      let startDay = 1;
      let endDay = 7;
      if (selectedWeekNumber === 2) {
        startDay = 8;
        endDay = 14;
      } else if (selectedWeekNumber === 3) {
        startDay = 15;
        endDay = 21;
      } else if (selectedWeekNumber === 4) {
        startDay = 22;
        endDay = daysInMonth;
      }

      const pad = (n: number) => String(n).padStart(2, '0');
      const startStr = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(startDay)}`;
      const endStr = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(endDay)}`;

      return {
        startDate: startStr,
        endDate: endStr,
        label: `Pekan ${selectedWeekNumber} (${startDay} - ${endDay} ${MONTH_NAMES[selectedMonth]} ${selectedYear})`,
      };
    }

    // monthly
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${selectedYear}-${pad(selectedMonth + 1)}-01`;
    const endStr = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(daysInMonth)}`;

    return {
      startDate: startStr,
      endDate: endStr,
      label: `${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
    };
  }, [timeframe, selectedDate, selectedMonth, selectedYear, selectedWeekNumber]);

  // Muat data presensi dan pelanggaran toilet
  useEffect(() => {
    loadMonitoringData();
  }, [dateRange, selectedClassId, selectedStudentId, scope]);

  const loadMonitoringData = async () => {
    setIsLoading(true);
    try {
      const classQuery = selectedClassId === 'all' ? undefined : selectedClassId;
      const studentQuery = scope === 'student' && selectedStudentId ? selectedStudentId : undefined;

      const [presRes, bathRes] = await Promise.all([
        timeframe === 'daily'
          ? api.getPresensi(dateRange.startDate, classQuery)
          : api.getPresensiRange(dateRange.startDate, dateRange.endDate, classQuery, studentQuery),
        api.getBathroomHistory(undefined, classQuery, true).catch(() => ({ success: false, history: [] })),
      ]);

      if (presRes.success) {
        setRecords(presRes.records || presRes.presensi || []);
      }
      if (bathRes && bathRes.success) {
        setBathroomOverdue(bathRes.history || []);
      }
    } catch (e) {
      console.error('Error load monitoring attendance records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter daftar siswa sesuai kelas yang terpilih
  const availableStudentsForClass = useMemo(() => {
    if (selectedClassId === 'all' || !selectedClassId) {
      return students;
    }
    return students.filter((s) => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Pastikan ada student yang terpilih otomatis saat scope = student
  useEffect(() => {
    if (scope === 'student') {
      if (!selectedStudentId && availableStudentsForClass.length > 0) {
        setSelectedStudentId(availableStudentsForClass[0].id);
      } else if (
        selectedStudentId &&
        selectedClassId !== 'all' &&
        !availableStudentsForClass.some((s) => s.id === selectedStudentId)
      ) {
        setSelectedStudentId(availableStudentsForClass[0]?.id || '');
      }
    }
  }, [scope, selectedClassId, availableStudentsForClass, selectedStudentId]);

  const activeStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || availableStudentsForClass[0] || null;
  }, [students, selectedStudentId, availableStudentsForClass]);

  const activeClassObj = useMemo(() => {
    if (selectedClassId === 'all') return null;
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Filter records untuk siswa terpilih jika mode student
  const studentRecords = useMemo(() => {
    if (!activeStudent) return [];
    return records.filter((r) => r.studentId === activeStudent.id);
  }, [records, activeStudent]);

  // Statistik Agregat Kelas / Sekolah
  const classStats = useMemo(() => {
    const totalStudentsCount =
      selectedClassId === 'all'
        ? students.length
        : availableStudentsForClass.length || 1;

    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpha = 0;

    records.forEach((r) => {
      const st = (r.status || '').toLowerCase();
      if (st === 'hadir') hadir++;
      else if (st === 'terlambat') terlambat++;
      else if (st === 'sakit') sakit++;
      else if (st === 'izin') izin++;
      else if (st === 'alpha') alpha++;
    });

    const totalPresent = hadir + terlambat;
    const totalRecords = records.length || 1;
    const rate = Math.round((totalPresent / totalRecords) * 100);

    return {
      totalStudents: totalStudentsCount,
      hadir,
      terlambat,
      sakit,
      izin,
      alpha,
      totalPresent,
      totalEntries: records.length,
      attendanceRate: isNaN(rate) ? 0 : Math.min(100, rate),
    };
  }, [records, selectedClassId, students, availableStudentsForClass]);

  // Statistik untuk Siswa Terpilih
  const studentStats = useMemo(() => {
    if (!activeStudent) {
      return {
        totalDays: 0,
        hadir: 0,
        terlambat: 0,
        sakit: 0,
        izin: 0,
        alpha: 0,
        attendanceRate: 0,
        toiletOverdueCount: 0,
        totalLateMinutes: 0,
      };
    }

    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpha = 0;
    let totalLateMinutes = 0;

    studentRecords.forEach((r) => {
      const st = (r.status || '').toLowerCase();
      if (st === 'hadir') hadir++;
      else if (st === 'terlambat') {
        terlambat++;
        // Hitung perkiraan menit terlambat dari catatan atau waktu
        const match = (r.notes || '').match(/(\d+)\s*menit/i);
        if (match) {
          totalLateMinutes += parseInt(match[1], 10);
        } else {
          totalLateMinutes += 15; // default estimasi
        }
      } else if (st === 'sakit') sakit++;
      else if (st === 'izin') izin++;
      else if (st === 'alpha') alpha++;
    });

    const totalDays = studentRecords.length;
    const present = hadir + terlambat;
    const rate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

    const studentToiletOverdues = bathroomOverdue.filter(
      (b) => b.studentId === activeStudent.id || b.studentName === activeStudent.fullName
    );

    return {
      totalDays,
      hadir,
      terlambat,
      sakit,
      izin,
      alpha,
      attendanceRate: rate,
      toiletOverdueCount: studentToiletOverdues.length,
      totalLateMinutes,
    };
  }, [activeStudent, studentRecords, bathroomOverdue]);

  // Data Grafik: Batang Distribusi Status Kehadiran (Per Status: Hadir, Terlambat, Sakit, Izin, Alpha)
  const statusDistributionChartData = useMemo(() => {
    const stats = scope === 'student' ? studentStats : classStats;
    return [
      { name: 'Hadir', jumlah: stats.hadir, fill: STATUS_COLORS.hadir },
      { name: 'Terlambat', jumlah: stats.terlambat, fill: STATUS_COLORS.terlambat },
      { name: 'Sakit', jumlah: stats.sakit, fill: STATUS_COLORS.sakit },
      { name: 'Izin', jumlah: stats.izin, fill: STATUS_COLORS.izin },
      { name: 'Alpha', jumlah: stats.alpha, fill: STATUS_COLORS.alpha },
    ];
  }, [scope, studentStats, classStats]);

  // Data Grafik: Perbandingan Seluruh Kelas (Kesiswaan)
  const allClassesChartData = useMemo(() => {
    return classes.map((cls) => {
      const classRecs = records.filter((r) => r.classId === cls.id);
      const h = classRecs.filter((r) => r.status === 'hadir').length;
      const t = classRecs.filter((r) => r.status === 'terlambat').length;
      const s = classRecs.filter((r) => r.status === 'sakit').length;
      const i = classRecs.filter((r) => r.status === 'izin').length;
      const a = classRecs.filter((r) => r.status === 'alpha').length;
      const total = classRecs.length || 1;
      const rate = Math.round(((h + t) / total) * 100);
      return {
        name: cls.name,
        Hadir: h,
        Terlambat: t,
        Sakit: s,
        Izin: i,
        Alpha: a,
        Rate: rate,
      };
    });
  }, [classes, records]);

  // Data Grafik: Tren Kehadiran (%) & Keterlambatan seiring waktu
  const trendChartData = useMemo(() => {
    // Kelompokkan records per tanggal
    const datesMap = new Map<string, any>();

    const targetList = scope === 'student' ? studentRecords : records;

    targetList.forEach((r) => {
      const d = r.date || todayStr;
      if (!datesMap.has(d)) {
        datesMap.set(d, {
          date: d,
          shortDate: d.slice(5),
          hadir: 0,
          terlambat: 0,
          sakit: 0,
          izin: 0,
          alpha: 0,
          total: 0,
        });
      }
      const entry = datesMap.get(d);
      entry.total++;
      const st = (r.status || '').toLowerCase();
      if (st === 'hadir') entry.hadir++;
      else if (st === 'terlambat') entry.terlambat++;
      else if (st === 'sakit') entry.sakit++;
      else if (st === 'izin') entry.izin++;
      else if (st === 'alpha') entry.alpha++;
    });

    const sortedDates = Array.from(datesMap.keys()).sort();

    return sortedDates.map((d) => {
      const entry = datesMap.get(d);
      const rate = entry.total > 0 ? Math.round(((entry.hadir + entry.terlambat) / entry.total) * 100) : 0;
      return {
        date: d,
        displayDate: d.slice(5), // MM-DD
        tingkatKehadiran: rate,
        hadir: entry.hadir,
        terlambat: entry.terlambat,
        alpha: entry.alpha,
      };
    });
  }, [scope, studentRecords, records, todayStr]);

  // Data Donut/Pie Komposisi
  const pieData = useMemo(() => {
    const stats = scope === 'student' ? studentStats : classStats;
    return [
      { name: 'Hadir', value: stats.hadir, color: STATUS_COLORS.hadir },
      { name: 'Terlambat', value: stats.terlambat, color: STATUS_COLORS.terlambat },
      { name: 'Sakit', value: stats.sakit, color: STATUS_COLORS.sakit },
      { name: 'Izin', value: stats.izin, color: STATUS_COLORS.izin },
      { name: 'Alpha', value: stats.alpha, color: STATUS_COLORS.alpha },
    ].filter((item) => item.value > 0);
  }, [scope, studentStats, classStats]);

  // Rekapitulasi Siswa dalam Kelas untuk Tabel & PDF
  const studentSummaries = useMemo(() => {
    return availableStudentsForClass.map((std) => {
      const stdRecs = records.filter((r) => r.studentId === std.id);
      let h = 0;
      let t = 0;
      let s = 0;
      let i = 0;
      let a = 0;
      stdRecs.forEach((r) => {
        const st = (r.status || '').toLowerCase();
        if (st === 'hadir') h++;
        else if (st === 'terlambat') t++;
        else if (st === 'sakit') s++;
        else if (st === 'izin') i++;
        else if (st === 'alpha') a++;
      });
      const total = stdRecs.length || 1;
      const rate = Math.round(((h + t) / total) * 100);

      let note = 'Sangat Tertib';
      if (a >= 3) note = 'Peringatan: 3+ Alpha';
      else if (t >= 3) note = 'Pembinaan: Kerap Terlambat';
      else if (rate < 80) note = 'Perlu Perhatian';

      return {
        id: std.id,
        nis: std.nis,
        name: std.fullName,
        className: std.className || activeClassObj?.name || '-',
        hadir: h,
        terlambat: t,
        sakit: s,
        izin: i,
        alpha: a,
        rate,
        statusNote: note,
      };
    });
  }, [availableStudentsForClass, records, activeClassObj]);

  // Handle Unduh PDF Siswa
  const handleDownloadStudentPDF = () => {
    if (!activeStudent) {
      alert('Pilih siswa terlebih dahulu.');
      return;
    }

    const formattedRecords = studentRecords.map((r) => ({
      date: r.date,
      status: r.status,
      method: r.method,
      time: r.recordedAt ? r.recordedAt.slice(11, 16) : undefined,
      notes: r.notes,
      recordedBy: r.recordedByUserName,
    }));

    generateStudentMonitoringPDF({
      student: {
        id: activeStudent.id,
        fullName: activeStudent.fullName,
        nis: activeStudent.nis,
        nisn: activeStudent.nisn,
        className: activeStudent.className || activeClassObj?.name || 'VII-A',
        gender: activeStudent.gender,
      },
      timeframe,
      periodLabel: dateRange.label,
      stats: studentStats,
      records: formattedRecords,
      schoolInfo: {
        name: tenant?.name,
        npsn: tenant?.npsn,
        address: tenant?.address,
        phone: tenant?.phone,
      },
      signeeName: currentUser?.fullName || activeClassObj?.waliKelasName || 'Wali Kelas',
      signeeRole: roleLabel,
    });
  };

  // Handle Unduh PDF Kelas
  const handleDownloadClassPDF = () => {
    const classNameStr = activeClassObj ? activeClassObj.name : selectedClassId === 'all' ? 'Seluruh Kelas' : 'VII-A';
    const waliName = activeClassObj?.waliKelasName || currentUser?.fullName || 'Wali Kelas';

    generateClassMonitoringPDF({
      className: classNameStr,
      waliKelasName: waliName,
      timeframe,
      periodLabel: dateRange.label,
      stats: {
        totalStudents: classStats.totalStudents,
        hadir: classStats.hadir,
        terlambat: classStats.terlambat,
        sakit: classStats.sakit,
        izin: classStats.izin,
        alpha: classStats.alpha,
        attendanceRate: classStats.attendanceRate,
      },
      studentSummaries: studentSummaries,
      schoolInfo: {
        name: tenant?.name,
        npsn: tenant?.npsn,
        address: tenant?.address,
        phone: tenant?.phone,
      },
      signeeName: currentUser?.fullName || waliName,
      signeeRole: roleLabel,
    });
  };

  // Ekspor Excel
  const handleExportExcel = () => {
    if (scope === 'student') {
      if (!activeStudent || studentRecords.length === 0) {
        alert('Tidak ada riwayat presensi siswa untuk diekspor.');
        return;
      }
      const rows = studentRecords.map((r, i) => ({
        No: i + 1,
        NIS: activeStudent.nis,
        Nama: activeStudent.fullName,
        Kelas: activeStudent.className,
        Tanggal: r.date,
        Status: (r.status || '').toUpperCase(),
        Metode: r.method || 'manual',
        Waktu: r.recordedAt ? r.recordedAt.slice(11, 16) : '-',
        Petugas: r.recordedByUserName || '-',
        Catatan: r.notes || '-',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Presensi_${activeStudent.nis}`);
      XLSX.writeFile(wb, `Monitoring_Siswa_${activeStudent.fullName}_${dateRange.startDate}.xlsx`);
    } else {
      if (studentSummaries.length === 0) {
        alert('Tidak ada rekapitulasi kelas untuk diekspor.');
        return;
      }
      const rows = studentSummaries.map((s, i) => ({
        No: i + 1,
        NIS: s.nis,
        Nama_Siswa: s.name,
        Kelas: s.className,
        Hadir: s.hadir,
        Terlambat: s.terlambat,
        Sakit: s.sakit,
        Izin: s.izin,
        Alpha: s.alpha,
        Persentase_Kehadiran: `${s.rate}%`,
        Catatan_Kedisiplinan: s.statusNote,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Kelas');
      XLSX.writeFile(wb, `Monitoring_Kelas_${activeClassObj?.name || 'Semua'}_${dateRange.startDate}.xlsx`);
    }
  };

  const filteredStudentSummaries = studentSummaries.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.nis.includes(studentSearchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Panel Navigasi Filter & Kontrol Monitoring */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Monitoring Real-Time Multidevice</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Grafik & Pemantauan Presensi ({roleLabel})
            </h2>
            <p className="text-xs text-slate-700 font-medium mt-0.5">
              Pantau dinamika kehadiran siswa dan kelas secara harian, mingguan, serta bulanan lengkap dengan ekspor PDF resmi
            </p>
          </div>

          {/* Tombol Ekspor Berkas Resmi PDF & Excel */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={scope === 'student' ? handleDownloadStudentPDF : handleDownloadClassPDF}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-indigo-600/20"
              title="Unduh laporan monitoring sebagai berkas PDF resmi ber-KOP sekolah"
            >
              <FileText className="w-4 h-4" />
              <span>
                {scope === 'student' ? 'Unduh PDF Siswa' : 'Unduh PDF Kelas'}
              </span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
              title="Ekspor rekapitulasi data presensi ke Microsoft Excel"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* Baris Filter: Pilihan Scope (Kelas / Siswa) + Pilihan Timeframe (Hari / Pekan / Bulan) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          {/* 1. Scope Selector */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Bentuk Pemantauan
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setScope('class')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  scope === 'class'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Per Kelas</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('student')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  scope === 'student'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Per Siswa</span>
              </button>
            </div>
          </div>

          {/* 2. Timeframe Selector (Hari, Pekan, Bulan) */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Periode Waktu
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setTimeframe('daily')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeframe === 'daily'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Per Hari
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('weekly')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeframe === 'weekly'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Per Pekan
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('monthly')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeframe === 'monthly'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Per Bulan
              </button>
            </div>
          </div>

          {/* 3. Class Selector */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              Pilihan Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              {allowAllClasses && (
                <option value="all" className="bg-white text-slate-900">
                  -- Semua Kelas (Lintas Sekolah) --
                </option>
              )}
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-slate-900">
                  Kelas {c.name} {c.programName ? `(${c.programName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Date Filter Controls */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
              {timeframe === 'daily' ? 'Tanggal' : timeframe === 'weekly' ? 'Pekan Ke-' : 'Bulan'}
            </label>
            {timeframe === 'daily' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              />
            )}
            {timeframe === 'weekly' && (
              <select
                value={selectedWeekNumber}
                onChange={(e) => setSelectedWeekNumber(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              >
                <option value={1}>Pekan 1 (Tgl 1 - 7)</option>
                <option value={2}>Pekan 2 (Tgl 8 - 14)</option>
                <option value={3}>Pekan 3 (Tgl 15 - 21)</option>
                <option value={4}>Pekan 4 (Tgl 22 - Akhir)</option>
              </select>
            )}
            {timeframe === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m} {selectedYear}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Jika Scope = 'student', tampilkan Selector Siswa */}
        {scope === 'student' && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-indigo-950 uppercase mb-1">
                Pilih Siswa yang Dimonitor *
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-indigo-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
              >
                {availableStudentsForClass.length === 0 ? (
                  <option value="">Tidak ada siswa di kelas ini</option>
                ) : (
                  availableStudentsForClass.map((s) => (
                    <option key={s.id} value={s.id} className="text-slate-900">
                      {s.fullName} (NIS: {s.nis}) - Kelas {s.className || activeClassObj?.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {activeStudent && (
              <div className="sm:border-l sm:border-indigo-200 sm:pl-4 text-xs text-indigo-950 space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-700" />
                  <span>{activeStudent.fullName}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  NIS: <b>{activeStudent.nis}</b> | Kelas: <b>{activeStudent.className || activeClassObj?.name}</b>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ringkasan Indikator Kehadiran & Kedisiplinan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Tingkat Kehadiran */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase">
            <span>% Kehadiran</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {scope === 'student' ? `${studentStats.attendanceRate}%` : `${classStats.attendanceRate}%`}
          </div>
          <span className="text-[11px] text-slate-600 font-medium">
            {scope === 'student' ? `${studentStats.hadir + studentStats.terlambat} dari ${studentStats.totalDays} hari` : 'Rata-rata kelas'}
          </span>
        </div>

        {/* Card 2: Hadir Tepat Waktu */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase">
            <span>Hadir Tepat</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {scope === 'student' ? studentStats.hadir : classStats.hadir}
          </div>
          <span className="text-[11px] text-slate-600 font-medium">Sebelum batas waktu</span>
        </div>

        {/* Card 3: Terlambat */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase">
            <span>Terlambat</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {scope === 'student' ? studentStats.terlambat : classStats.terlambat}
          </div>
          <span className="text-[11px] text-slate-600 font-medium">
            {scope === 'student' ? `Total ~${studentStats.totalLateMinutes} mnt` : 'Lewat jam masuk'}
          </span>
        </div>

        {/* Card 4: Sakit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800 uppercase">
            <span>Sakit</span>
            <HeartPulse className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {scope === 'student' ? studentStats.sakit : classStats.sakit}
          </div>
          <span className="text-[11px] text-slate-600 font-medium">Keterangan surat</span>
        </div>

        {/* Card 5: Izin */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-purple-800 uppercase">
            <span>Izin</span>
            <FileQuestion className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {scope === 'student' ? studentStats.izin : classStats.izin}
          </div>
          <span className="text-[11px] text-slate-600 font-medium">Kepentingan keluarga</span>
        </div>

        {/* Card 6: Alpha / Disiplin */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-rose-800 uppercase">
            <span>Alpha</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {scope === 'student' ? studentStats.alpha : classStats.alpha}
          </div>
          <span className="text-[11px] text-slate-600 font-medium">
            {scope === 'student' && studentStats.toiletOverdueCount > 0
              ? `${studentStats.toiletOverdueCount}x Toilet Overdue`
              : 'Tanpa konfirmasi'}
          </span>
        </div>
      </div>

      {/* Visual Grafik Recharts: Distribusi + Tren + Komposisi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Grafik Batang Distribusi Kehadiran */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>
                  {scope === 'student'
                    ? `Distribusi Kehadiran: ${activeStudent?.fullName || 'Siswa'}`
                    : selectedClassId === 'all'
                    ? 'Perbandingan Kehadiran Antar Kelas'
                    : `Distribusi Presensi Kelas ${activeClassObj?.name || ''}`}
                </span>
              </h3>
              <p className="text-[11px] text-slate-600 font-medium">
                Periode: {dateRange.label}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {timeframe.toUpperCase()}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {selectedClassId === 'all' && scope === 'class' ? (
              allClassesChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                  Belum ada data presensi antar kelas pada rentang ini.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allClassesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="Hadir" fill={STATUS_COLORS.hadir} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Terlambat" fill={STATUS_COLORS.terlambat} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Alpha" fill={STATUS_COLORS.alpha} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : statusDistributionChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                Belum ada data presensi pada rentang ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistributionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Bar dataKey="jumlah" name="Jumlah" radius={[6, 6, 0, 0]}>
                    {statusDistributionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry as any).fill || '#4f46e5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Komposisi Donut / Pie */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <span>Komposisi Presensi</span>
            </h3>
            <p className="text-[11px] text-slate-600 font-medium">
              Persentase per kategori status
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <span className="text-xs text-slate-500 font-medium">Tidak ada data status</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} catatan`, 'Jumlah']}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700 pt-2 border-t border-slate-100">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.name}:</span>
                <span className="font-bold text-slate-900 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart 3: Tren Tingkat Kehadiran (%) Seiring Waktu */}
      {trendChartData.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Tren Tingkat Kehadiran (%) & Keterlambatan</span>
              </h3>
              <p className="text-[11px] text-slate-600 font-medium">
                Dinamika ketepatan waktu per tanggal pelaksanaan sekolah
              </p>
            </div>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="tingkatKehadiran"
                  name="% Kehadiran"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="terlambat"
                  name="Siswa Terlambat"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="alpha"
                  name="Siswa Alpha"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabel Rincian Rekapitulasi Sesuai Scope */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {scope === 'student'
                ? `Riwayat Catatan Presensi: ${activeStudent?.fullName || 'Siswa'}`
                : `Daftar Rekapitulasi Siswa Kelas ${activeClassObj?.name || 'Terpilih'}`}
            </h3>
            <p className="text-[11px] text-slate-600 font-medium">
              Data terverifikasi dan siap diunduh resmi sebagai dokumen PDF
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              placeholder="Cari nama atau NIS..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        </div>

        {/* Tabel Scope = 'class' */}
        {scope === 'class' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">NIS</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3 text-center text-emerald-800">Hadir</th>
                  <th className="py-2.5 px-3 text-center text-amber-800">Terlambat</th>
                  <th className="py-2.5 px-3 text-center text-blue-800">Sakit</th>
                  <th className="py-2.5 px-3 text-center text-purple-800">Izin</th>
                  <th className="py-2.5 px-3 text-center text-rose-800">Alpha</th>
                  <th className="py-2.5 px-3 text-center">% Hadir</th>
                  <th className="py-2.5 px-3">Status Disiplin</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudentSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-600 font-semibold">
                      Tidak ada catatan siswa ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredStudentSummaries.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-slate-600 font-semibold">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.nis}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-950">{s.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-indigo-950 font-bold">
                          {s.className}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-800 font-mono">{s.hadir}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-800 font-mono">{s.terlambat}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-blue-800">{s.sakit}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-purple-800">{s.izin}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-800 font-mono">{s.alpha}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-mono font-black px-2 py-0.5 rounded ${
                            s.rate >= 90
                              ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                              : s.rate >= 75
                              ? 'bg-amber-50 text-amber-950 border border-amber-300'
                              : 'bg-rose-50 text-rose-950 border border-rose-300'
                          }`}
                        >
                          {s.rate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[11px] font-bold ${
                            s.alpha > 0
                              ? 'text-rose-700'
                              : s.terlambat > 0
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {s.statusNote}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setScope('student');
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold rounded-lg text-[11px] border border-indigo-300 transition cursor-pointer"
                        >
                          Lihat Siswa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tabel Scope = 'student' */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Waktu Masuk</th>
                  <th className="py-2.5 px-3">Metode Presensi</th>
                  <th className="py-2.5 px-3">Catatan / Alasan</th>
                  <th className="py-2.5 px-3">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-600 font-semibold">
                      Belum ada catatan presensi untuk siswa ini pada periode {dateRange.label}.
                    </td>
                  </tr>
                ) : (
                  studentRecords.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-slate-600 font-semibold">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-950">{r.date}</td>
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
                      <td className="py-2.5 px-3 font-mono text-slate-800 font-bold">
                        {r.recordedAt ? `${r.recordedAt.slice(11, 16)} WIB` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono capitalize text-slate-700">{r.method || 'manual'}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{r.notes || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-700">{r.recordedByUserName || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
