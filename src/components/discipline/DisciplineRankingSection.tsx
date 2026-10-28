import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  AlertTriangle,
  Award,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  Sparkles,
  Users,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { InternalUser, SchoolClass, TenantSchool } from '../../types';
import { api } from '../../services/api';
import {
  exportDisciplineToExcel,
  exportDisciplineToPDF,
  DisciplineStudentRankingItem,
} from '../../utils/disciplineExport';

export type DisciplineTimeframe = 'daily' | 'weekly' | 'monthly' | 'semester' | 'custom';
export type DisciplineRankingTab = 'disciplined' | 'late';

export interface DisciplineRankingSectionProps {
  tenant: TenantSchool | null;
  currentUser: InternalUser | null;
  classes: SchoolClass[];
  defaultClassId?: string;
  allowAllClasses?: boolean;
  roleLabel?: string;
  compactMode?: boolean; // If true, simplified view for Dashboard
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const DisciplineRankingSection: React.FC<DisciplineRankingSectionProps> = ({
  tenant,
  currentUser,
  classes,
  defaultClassId,
  allowAllClasses = false,
  roleLabel = 'Wali Kelas',
  compactMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<DisciplineRankingTab>('disciplined');
  const [timeframe, setTimeframe] = useState<DisciplineTimeframe>('monthly');

  // Selected Class (Jika Wali Kelas -> hanya kelas binaan)
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (defaultClassId) return defaultClassId;
    if (classes.length > 0) return allowAllClasses ? 'all' : classes[0].id;
    return allowAllClasses ? 'all' : '';
  });

  // Date Filters
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(1);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(() => {
    const m = new Date().getMonth();
    return m >= 6 ? 1 : 2; // Semester 1: Juli - Des, Semester 2: Jan - Juni
  });
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Data rankings from backend
  const [rankings, setRankings] = useState<DisciplineStudentRankingItem[]>([]);
  const [summary, setSummary] = useState<{
    totalEvaluated: number;
    averageScore: number;
    totalLate: number;
    totalHadir: number;
  }>({
    totalEvaluated: 0,
    averageScore: 0,
    totalLate: 0,
    totalHadir: 0,
  });

  // Hitung rentang tanggal efektif
  const dateRange = useMemo(() => {
    if (timeframe === 'daily') {
      return {
        startDate: selectedDate,
        endDate: selectedDate,
        label: `Hari ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date(selectedDate + 'T00:00:00'))}`,
      };
    }
    if (timeframe === 'weekly') {
      const year = selectedYear;
      const month = selectedMonth;
      // Perkiraan pekan 1-4
      const startDay = (selectedWeekNumber - 1) * 7 + 1;
      const endDay = Math.min(new Date(year, month + 1, 0).getDate(), selectedWeekNumber * 7);
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      return {
        startDate: startStr,
        endDate: endStr,
        label: `Pekan ke-${selectedWeekNumber} (${startDay} - ${endDay} ${MONTH_NAMES[month]} ${year})`,
      };
    }
    if (timeframe === 'monthly') {
      const year = selectedYear;
      const month = selectedMonth;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        startDate: startStr,
        endDate: endStr,
        label: `Bulan ${MONTH_NAMES[month]} ${year}`,
      };
    }
    if (timeframe === 'semester') {
      const year = selectedYear;
      if (selectedSemester === 1) {
        return {
          startDate: `${year}-07-01`,
          endDate: `${year}-12-31`,
          label: `Semester 1 Ganjil (${year})`,
        };
      } else {
        return {
          startDate: `${year}-01-01`,
          endDate: `${year}-06-30`,
          label: `Semester 2 Genap (${year})`,
        };
      }
    }
    // custom
    return {
      startDate: customStartDate,
      endDate: customEndDate,
      label: `Rentang ${customStartDate} s/d ${customEndDate}`,
    };
  }, [timeframe, selectedDate, selectedYear, selectedMonth, selectedWeekNumber, selectedSemester, customStartDate, customEndDate]);

  // Label nama kelas aktif
  const currentClassName = useMemo(() => {
    if (selectedClassId === 'all') return 'Seluruh Kelas';
    const found = classes.find((c) => c.id === selectedClassId);
    return found ? found.name : 'Semua Kelas';
  }, [selectedClassId, classes]);

  // Ambil data peringkat dari backend
  const fetchRankings = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.getDisciplineRankings({
        timeframe,
        date: timeframe === 'daily' ? selectedDate : undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        classId: selectedClassId,
        searchQuery: searchQuery.trim(),
      });

      if (res && res.success) {
        setRankings(res.rankings || []);
        if (res.summary) {
          setSummary(res.summary);
        } else {
          const list: DisciplineStudentRankingItem[] = res.rankings || [];
          const avg = list.length > 0 ? list.reduce((a, b) => a + b.disciplineScore, 0) / list.length : 0;
          const late = list.reduce((a, b) => a + b.terlambatCount, 0);
          const hadir = list.reduce((a, b) => a + b.hadirCount, 0);
          setSummary({
            totalEvaluated: list.length,
            averageScore: Math.round(avg * 10) / 10,
            totalLate: late,
            totalHadir: hadir,
          });
        }
      } else {
        setErrorMessage(res?.error || 'Gagal memuat data peringkat kedisiplinan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengambil data peringkat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [timeframe, dateRange.startDate, dateRange.endDate, selectedClassId]);

  // Filter pencarian nama siswa di client
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return rankings;
    const q = searchQuery.toLowerCase().trim();
    return rankings.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.nis.toLowerCase().includes(q) ||
        (item.nisn && item.nisn.includes(q)) ||
        item.className.toLowerCase().includes(q)
    );
  }, [rankings, searchQuery]);

  // Daftar yang diurutkan sesuai tab
  const displayList = useMemo(() => {
    const list = [...filteredList];
    if (activeTab === 'late') {
      // Urutkan terbanyak terlambat
      return list.sort((a, b) => {
        if (b.terlambatCount !== a.terlambatCount) {
          return b.terlambatCount - a.terlambatCount;
        }
        return a.timelinessRate - b.timelinessRate;
      });
    }
    // Urutkan paling disiplin
    return list.sort((a, b) => {
      if (b.disciplineScore !== a.disciplineScore) {
        return b.disciplineScore - a.disciplineScore;
      }
      return b.timelinessRate - a.timelinessRate;
    });
  }, [filteredList, activeTab]);

  // Top 1 Paling Disiplin & Top 1 Terbanyak Terlambat
  const topDisciplined = useMemo(() => {
    if (rankings.length === 0) return null;
    const sorted = [...rankings].sort((a, b) => b.disciplineScore - a.disciplineScore || b.timelinessRate - a.timelinessRate);
    return sorted[0];
  }, [rankings]);

  const topLate = useMemo(() => {
    if (rankings.length === 0) return null;
    const sorted = [...rankings].sort((a, b) => b.terlambatCount - a.terlambatCount || a.timelinessRate - b.timelinessRate);
    if (sorted[0].terlambatCount === 0) return null;
    return sorted[0];
  }, [rankings]);

  // Handler Download Excel
  const handleDownloadExcel = () => {
    exportDisciplineToExcel({
      schoolName: tenant?.name || 'Sekolah Terintegrasi',
      npsn: tenant?.npsn || '-',
      reportTitle: activeTab === 'late'
        ? 'LAPORAN PERINGKAT SISWA TERBANYAK TERLAMBAT'
        : 'LAPORAN PERINGKAT KEDISIPLINAN SISWA',
      periodLabel: dateRange.label,
      className: currentClassName,
      rankings: displayList,
      rankingType: activeTab,
    });
  };

  // Handler Download PDF
  const handleDownloadPDF = () => {
    exportDisciplineToPDF({
      schoolName: tenant?.name || 'Sekolah Terintegrasi',
      npsn: tenant?.npsn || '-',
      address: tenant?.address || 'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi',
      phone: tenant?.phone || '-',
      reportTitle: activeTab === 'late'
        ? 'LAPORAN REKAPITULASI SISWA TERBANYAK TERLAMBAT'
        : 'LAPORAN RESMI PERINGKAT KEDISIPLINAN SISWA',
      periodLabel: dateRange.label,
      className: currentClassName,
      rankings: displayList,
      rankingType: activeTab,
      signedByName: currentUser?.fullName || (roleLabel === 'Wali Kelas' ? `Wali Kelas ${currentClassName}` : 'Tim Kesiswaan Sekolah'),
      signedByRole: currentUser?.role === 'wali_kelas' ? `Wali Kelas ${currentClassName}` : (roleLabel || 'Penanggung Jawab Presensi'),
    });
  };

  return (
    <div className="space-y-4">
      {/* ===================== KARTU HIGHLIGHT UTAMA (TOP 1 DISIPLIN & TOP 1 TERLAMBAT) ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Kartu Juara 1 Terdisiplin */}
        <div className="bg-gradient-to-br from-amber-50 to-emerald-50/50 border border-amber-200/80 rounded-xl p-4 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <Trophy className="w-16 h-16 text-amber-600" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
              <Trophy className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Peringkat 1 Paling Disiplin
            </span>
          </div>
          {topDisciplined ? (
            <div>
              <div className="text-base font-extrabold text-slate-900 truncate">
                {topDisciplined.fullName}
              </div>
              <div className="text-xs text-slate-600 font-medium mb-2">
                Kelas: {topDisciplined.className} • NIS: {topDisciplined.nis || '-'}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-amber-200/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Skor Disiplin</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {topDisciplined.disciplineScore} / 100
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Ketepatan Waktu</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {topDisciplined.timelinessRate}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Hadir Tepat</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {topDisciplined.hadirCount}x
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3 italic">
              Belum ada data presensi pada periode ini.
            </div>
          )}
        </div>

        {/* Kartu Peringkat 1 Terbanyak Terlambat */}
        <div className="bg-gradient-to-br from-rose-50 to-orange-50/50 border border-rose-200/80 rounded-xl p-4 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-15">
            <AlertTriangle className="w-16 h-16 text-rose-600" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-rose-500 text-white shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
              Peringkat 1 Terbanyak Terlambat
            </span>
          </div>
          {topLate && topLate.terlambatCount > 0 ? (
            <div>
              <div className="text-base font-extrabold text-slate-900 truncate">
                {topLate.fullName}
              </div>
              <div className="text-xs text-slate-600 font-medium mb-2">
                Kelas: {topLate.className} • NIS: {topLate.nis || '-'}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-rose-200/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Terlambat</span>
                  <span className="font-bold text-rose-700 text-sm">
                    {topLate.terlambatCount} Kali
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Ketepatan Waktu</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {topLate.timelinessRate}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Skor Disiplin</span>
                  <span className="font-bold text-amber-700 text-sm">
                    {topLate.disciplineScore}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-emerald-700 font-medium py-3 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Nol Keterlambatan pada periode ini! Luar biasa.
            </div>
          )}
        </div>

        {/* Kartu Rata-rata Kedisiplinan */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Rata-Rata Skor Kedisiplinan</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-900">
            {summary.averageScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Berdasarkan bobot ketepatan waktu, izin, & presensi
          </p>
        </div>

        {/* Kartu Total Siswa Dievaluasi */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Siswa Terdaftar & Terpantau</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.totalEvaluated} <span className="text-xs font-normal text-slate-400">Siswa</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {currentClassName} • {dateRange.label}
          </p>
        </div>
      </div>

      {/* ===================== KONTROL FILTER & NAVIGASI TAB ===================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        {/* Baris Tab & Tombol Ekspor */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('disciplined')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'disciplined'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Peringkat Paling Disiplin
            </button>
            <button
              onClick={() => setActiveTab('late')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'late'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Peringkat Terbanyak Terlambat
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRankings}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={displayList.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Download Excel (.xlsx)
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={displayList.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Baris Filter Rentang Waktu, Kelas, dan Pencarian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Pilihan Periode / Timeframe */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Periode Waktu</label>
            <div className="relative">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as DisciplineTimeframe)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 appearance-none pr-7 cursor-pointer"
              >
                <option value="daily">Harian (Per Hari)</option>
                <option value="weekly">Mingguan (Per Pekan)</option>
                <option value="monthly">Bulanan (Per Bulan)</option>
                <option value="semester">Semester (Ganjil / Genap)</option>
                <option value="custom">Rentang Tanggal Kustom</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Sub Filter Sesuai Timeframe */}
          {timeframe === 'daily' && (
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}

          {timeframe === 'weekly' && (
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Pekan & Bulan</label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={selectedWeekNumber}
                  onChange={(e) => setSelectedWeekNumber(Number(e.target.value))}
                  className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
                >
                  <option value={1}>Pekan 1</option>
                  <option value={2}>Pekan 2</option>
                  <option value={3}>Pekan 3</option>
                  <option value={4}>Pekan 4</option>
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>{name.slice(0, 3)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {timeframe === 'monthly' && (
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Pilih Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name} {selectedYear}
                  </option>
                ))}
              </select>
            </div>
          )}

          {timeframe === 'semester' && (
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Pilih Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value) as 1 | 2)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
              >
                <option value={1}>Semester 1 (Ganjil - Juli s/d Des)</option>
                <option value={2}>Semester 2 (Genap - Jan s/d Juni)</option>
              </select>
            </div>
          )}

          {timeframe === 'custom' && (
            <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          )}

          {/* Filter Kelas */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Filter Kelas</label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={!allowAllClasses && Boolean(defaultClassId)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-indigo-600 appearance-none pr-7 disabled:opacity-75 cursor-pointer"
              >
                {allowAllClasses && <option value="all">Semua Kelas</option>}
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Pencarian Nama Siswa / NIS */}
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-slate-500 font-semibold mb-1">Cari Nama Siswa / NIS</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama atau NIS siswa..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===================== TABEL PERINGKAT UTAMA ===================== */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeTab === 'disciplined' ? (
              <Trophy className="w-4 h-4 text-amber-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )}
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              {activeTab === 'disciplined'
                ? `Tabel Peringkat Kedisiplinan Siswa (${currentClassName})`
                : `Tabel Peringkat Siswa Terbanyak Terlambat (${currentClassName})`}
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {displayList.length} Siswa Terdaftar
          </span>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3 text-center w-14">Rank</th>
                <th className="py-2.5 px-3">Nama Lengkap</th>
                <th className="py-2.5 px-3 text-center">Kelas</th>
                <th className="py-2.5 px-2 text-center text-emerald-700 font-bold" title="Hadir Tepat Waktu">Hadir (H)</th>
                <th className="py-2.5 px-2 text-center text-amber-700 font-bold" title="Terlambat Masuk">Terlambat (T)</th>
                <th className="py-2.5 px-2 text-center text-blue-700">Sakit (S)</th>
                <th className="py-2.5 px-2 text-center text-purple-700">Izin (I)</th>
                <th className="py-2.5 px-2 text-center text-rose-700">Alpha (A)</th>
                <th className="py-2.5 px-3 text-center">Ketepatan</th>
                <th className="py-2.5 px-3 text-center">Skor Disiplin</th>
                <th className="py-2.5 px-3 text-center">Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-indigo-600" />
                    Menghitung skor dan peringkat kedisiplinan...
                  </td>
                </tr>
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                    Tidak ada catatan presensi yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                displayList.map((item, idx) => {
                  const displayRank = activeTab === 'late'
                    ? (item.lateRank !== undefined ? (item.isLateTied ? `${item.lateRank}=` : `${item.lateRank}`) : `${idx + 1}`)
                    : (item.isTied ? `${item.rank}=` : `${item.rank}`);

                  const rankNum = activeTab === 'late' ? (item.lateRank || idx + 1) : item.rank;

                  return (
                    <tr
                      key={item.studentId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        rankNum === 1
                          ? (activeTab === 'disciplined' ? 'bg-amber-50/40 font-medium' : 'bg-rose-50/40 font-medium')
                          : ''
                      }`}
                    >
                      {/* Peringkat Badge */}
                      <td className="py-2.5 px-3 text-center">
                        {rankNum === 1 ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs shadow-xs ${
                            activeTab === 'disciplined'
                              ? 'bg-amber-500 text-white'
                              : 'bg-rose-600 text-white'
                          }`}>
                            1
                          </span>
                        ) : rankNum === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-bold text-xs">
                            2
                          </span>
                        ) : rankNum === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/80 text-white font-bold text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-500 font-semibold">{displayRank}</span>
                        )}
                      </td>

                      {/* Nama Siswa */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[200px]">
                          {item.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          NIS: {item.nis || '-'}
                        </div>
                      </td>

                      {/* Kelas */}
                      <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                        {item.className}
                      </td>

                      {/* Hadir Tepat */}
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-600">
                        {item.hadirCount}
                      </td>

                      {/* Terlambat */}
                      <td className={`py-2.5 px-2 text-center font-bold ${item.terlambatCount > 0 ? 'text-amber-600 bg-amber-50/60 rounded' : 'text-slate-400'}`}>
                        {item.terlambatCount}
                      </td>

                      {/* Sakit */}
                      <td className="py-2.5 px-2 text-center text-blue-600">
                        {item.sakitCount}
                      </td>

                      {/* Izin */}
                      <td className="py-2.5 px-2 text-center text-purple-600">
                        {item.izinCount}
                      </td>

                      {/* Alpha */}
                      <td className={`py-2.5 px-2 text-center font-bold ${item.alphaCount > 0 ? 'text-rose-600 bg-rose-50/60 rounded' : 'text-slate-400'}`}>
                        {item.alphaCount}
                      </td>

                      {/* Ketepatan Waktu */}
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                        {item.timelinessRate}%
                      </td>

                      {/* Skor Disiplin */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-extrabold text-xs ${
                          item.disciplineScore >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.disciplineScore >= 75
                            ? 'bg-blue-100 text-blue-800'
                            : item.disciplineScore >= 60
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.disciplineScore}
                        </span>
                      </td>

                      {/* Predikat */}
                      <td className="py-2.5 px-3 text-center text-[11px] font-medium text-slate-700">
                        {item.predikat}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
