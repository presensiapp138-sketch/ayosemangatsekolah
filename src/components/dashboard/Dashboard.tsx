import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  HeartPulse,
  FileQuestion,
  UserX,
  DoorOpen,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Database,
  Calendar,
  Layers,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Activity,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { DashboardStats, TenantSchool } from '../../types';
import { api } from '../../services/api';

interface DashboardProps {
  tenant: TenantSchool;
  onNavigateTab: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ tenant, onNavigateTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentList, setRecentList] = useState<any[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([
    { id: 'sch-pagi', sessionName: 'Pagi', entryStartTime: '06:30', entryLimitTime: '07:00' },
    { id: 'sch-siang', sessionName: 'Siang', entryStartTime: '12:30', entryLimitTime: '13:00' },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  });
  const [selectedSession, setSelectedSession] = useState('sch-pagi');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sessionChartView, setSessionChartView] = useState<'rate' | 'breakdown'>('rate');

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate, selectedSession]);

  // Real-time multi-device sync: perbarui data dashboard tiap 3 detik tanpa mengganggu tampilan
  useEffect(() => {
    const syncTimer = setInterval(() => {
      api
        .getDashboardStats(selectedDate, selectedSession)
        .then((res) => {
          if (res.success) {
            setStats(res.stats);
            setRecentList(res.recentAttendance || []);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(syncTimer);
  }, [selectedDate, selectedSession]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDashboardStats(selectedDate, selectedSession);
      if (res.success) {
        setStats(res.stats);
        setRecentList(res.recentAttendance || []);
        if (res.sessions && res.sessions.length > 0) {
          setSessionsList(res.sessions);
        }
      }
    } catch (e: any) {
      console.error('Error load dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecent = recentList.filter((item) => {
    const matchSearch =
      item.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.className?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hadir':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">Hadir</span>;
      case 'terlambat':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">Terlambat</span>;
      case 'sakit':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">Sakit</span>;
      case 'izin':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">Izin</span>;
      case 'alpha':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">Alpha</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  const currentSessionObj = sessionsList.find((s) => s.id === selectedSession);
  const currentSessionName = currentSessionObj ? currentSessionObj.sessionName : (selectedSession === 'sch-pagi' ? 'Pagi' : 'Siang');

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Presensi Sekolah
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time
            </span>
          </div>
          <p className="text-xs text-slate-700 font-semibold mt-0.5">
            {tenant.name} — Pemantauan kehadiran aktual terintegrasi Google Sheets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold focus:outline-none text-xs"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="bg-transparent text-slate-900 focus:outline-none text-xs cursor-pointer font-bold"
            >
              {sessionsList.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-slate-900">
                  Sesi {s.sessionName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 transition shadow-2xs cursor-pointer"
            title="Segarkan Data Real-time"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Peringatan Izin Kamar Mandi Terlambat Jika Ada */}
      {stats && stats.overdueBathroomPermits > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Peringatan: {stats.overdueBathroomPermits} Siswa Melewati Batas Waktu Izin Kamar Mandi!
              </div>
              <div className="text-xs text-amber-900 font-medium mt-0.5">
                Segera konfirmasi atau tindak lanjuti siswa yang belum kembali ke ruang kelas.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('izin_kamar_mandi')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
          >
            Buka Menu Izin
          </button>
        </div>
      )}

      {/* Grid 8 Kartu Statistik Utama */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Siswa Aktif */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 transition hover:border-slate-300 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Siswa</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {isLoading ? '...' : stats?.totalActiveStudents ?? 0}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block font-medium">Siswa aktif terdaftar</span>
        </div>

        {/* Hadir */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 transition hover:border-slate-300 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Hadir</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-300">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-2 font-mono">
            <span>{isLoading ? '...' : stats?.hadirCount ?? 0}</span>
            <span className="text-xs font-bold text-emerald-700">({stats?.hadirPercentage ?? 0}%)</span>
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block font-medium">Tepat waktu</span>
        </div>

        {/* Terlambat */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 transition hover:border-slate-300 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Terlambat</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-2 font-mono">
            <span>{isLoading ? '...' : stats?.terlambatCount ?? 0}</span>
            <span className="text-xs font-bold text-amber-800">({stats?.terlambatPercentage ?? 0}%)</span>
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block font-medium">Melewati batas jam masuk</span>
        </div>

        {/* Sakit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 transition hover:border-slate-300 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Sakit</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-300">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {isLoading ? '...' : stats?.sakitCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block font-medium">Surat / keterangan sakit</span>
        </div>

        {/* Izin */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 transition hover:border-slate-300 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Izin</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-300">
              <FileQuestion className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {isLoading ? '...' : stats?.izinCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block font-medium">Izin keperluan keluarga/dll</span>
        </div>

        {/* Alpha */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 transition hover:border-slate-300 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Alpha</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-300">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {isLoading ? '...' : stats?.alphaCount ?? 0}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block font-medium">Tanpa keterangan terhitung</span>
        </div>

        {/* Siswa Sedang Izin Kamar Mandi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 transition hover:border-slate-300 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Izin Toilet Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-300">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {isLoading ? '...' : stats?.activeBathroomPermits ?? 0}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block font-medium">Sedang di luar kelas</span>
        </div>

        {/* Melewati Batas Waktu Izin */}
        <div className={`rounded-2xl p-4 transition border shadow-xs ${stats && stats.overdueBathroomPermits > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${stats && stats.overdueBathroomPermits > 0 ? 'text-rose-800' : 'text-slate-700'}`}>
              Toilet Terlambat
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${stats && stats.overdueBathroomPermits > 0 ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight font-mono ${stats && stats.overdueBathroomPermits > 0 ? 'text-rose-800' : 'text-slate-900'}`}>
            {isLoading ? '...' : stats?.overdueBathroomPermits ?? 0}
          </div>
          <span className="text-[11px] text-slate-600 mt-1 block font-medium">Melewati batas BAB/BAK</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SEKSI VISUALISASI DATA RECHARTS: KEHADIRAN BERDASARKAN SESI */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
        {/* Header Seksi & Pemilih Sesi Cepat */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Visualisasi Persentase Kehadiran Real-time Berdasarkan Sesi
                </h3>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  Grafik analisis distribusi kehadiran siswa per sesi dan per kelas (Diperbarui: {stats?.lastUpdated ? stats.lastUpdated.slice(11, 16) : '-'} WIB)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Session Selector Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Sesi Aktif:
            </span>
            {sessionsList.map((s) => {
              const isSelected = selectedSession === s.id;
              const sessionStat = (stats?.sessionStats || []).find((ss) => ss.sessionId === s.id);
              const rate = sessionStat ? sessionStat.attendanceRate : (isSelected ? (stats?.hadirPercentage ?? 0) : 0);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                  }`}
                >
                  <span>Sesi {s.sessionName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      isSelected
                        ? 'bg-indigo-900 text-white'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    {rate}% Hadir
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 Kolom Grafik Utama */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Donut Chart Komposisi Sesi Terpilih (5 kolom) */}
          <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Komposisi Sesi {currentSessionName}
                  </h4>
                </div>
                <span className="text-[11px] text-slate-700 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {stats?.totalActiveStudents ?? 0} Siswa
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3 font-medium">
                Persentase status presensi pada {selectedDate}
              </p>

              {/* Container Donut Chart Recharts */}
              <div className="relative h-60 w-full flex items-center justify-center">
                {(() => {
                  const pieData = [
                    {
                      name: 'Hadir Tepat Waktu',
                      value: stats?.hadirCount ?? 0,
                      percentage: stats?.tepatWaktuPercentage ?? 0,
                      color: '#10b981',
                    },
                    {
                      name: 'Terlambat',
                      value: stats?.terlambatCount ?? 0,
                      percentage: stats?.terlambatPercentage ?? 0,
                      color: '#f59e0b',
                    },
                    {
                      name: 'Sakit',
                      value: stats?.sakitCount ?? 0,
                      percentage: stats?.sakitPercentage ?? 0,
                      color: '#3b82f6',
                    },
                    {
                      name: 'Izin',
                      value: stats?.izinCount ?? 0,
                      percentage: stats?.izinPercentage ?? 0,
                      color: '#8b5cf6',
                    },
                    {
                      name: 'Alpha / Belum Scan',
                      value: stats?.alphaCount ?? 0,
                      percentage: stats?.alphaPercentage ?? 0,
                      color: '#f43f5e',
                    },
                  ];

                  const totalCount = pieData.reduce((acc, curr) => acc + curr.value, 0);
                  const chartData = totalCount > 0 ? pieData : [{ name: 'Belum Ada Data', value: 1, percentage: 0, color: '#cbd5e1' }];

                  return (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            stroke="#ffffff"
                            strokeWidth={2}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                if (d.name === 'Belum Ada Data') {
                                  return (
                                    <div className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-md text-xs text-slate-700 font-medium">
                                      Belum ada siswa terdata
                                    </div>
                                  );
                                }
                                return (
                                  <div className="bg-white p-3 rounded-xl border-2 border-slate-200 shadow-lg text-xs space-y-1 text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                      <span className="font-bold text-slate-900">{d.name}</span>
                                    </div>
                                    <div className="text-slate-700 flex justify-between gap-4 font-medium">
                                      <span>Jumlah:</span>
                                      <span className="font-mono font-bold text-slate-900">{d.value} Siswa</span>
                                    </div>
                                    <div className="text-slate-700 flex justify-between gap-4 font-medium">
                                      <span>Persentase:</span>
                                      <span className="font-mono font-bold text-indigo-700">{d.percentage}%</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Teks di tengah Donut Chart */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                          {stats?.hadirPercentage ?? 0}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          Tingkat Hadir
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Legend / Breakdown List Minimalis */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-800 truncate text-[11px] font-semibold">Tepat Waktu</span>
                </div>
                <span className="font-mono font-bold text-emerald-800 ml-1 text-xs">
                  {stats?.tepatWaktuPercentage ?? 0}%
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-800 truncate text-[11px] font-semibold">Terlambat</span>
                </div>
                <span className="font-mono font-bold text-amber-800 ml-1 text-xs">
                  {stats?.terlambatPercentage ?? 0}%
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-slate-800 truncate text-[11px] font-semibold">Sakit</span>
                </div>
                <span className="font-mono font-bold text-blue-800 ml-1 text-xs">
                  {stats?.sakitPercentage ?? 0}%
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-slate-800 truncate text-[11px] font-semibold">Izin</span>
                </div>
                <span className="font-mono font-bold text-purple-800 ml-1 text-xs">
                  {stats?.izinPercentage ?? 0}%
                </span>
              </div>

              <div className="col-span-2 flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-slate-800 truncate text-[11px] font-semibold">Alpha / Belum Terdata</span>
                </div>
                <span className="font-mono font-bold text-rose-800 ml-1 text-xs">
                  {stats?.alphaPercentage ?? 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Bar Chart Perbandingan Antar Sesi (7 kolom) */}
          <div className="lg:col-span-7 bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Perbandingan Persentase Kehadiran Antar Sesi
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    Komparasi kehadiran aktual seluruh sesi presensi hari ini
                  </p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 self-start sm:self-auto shadow-2xs">
                  <button
                    onClick={() => setSessionChartView('rate')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      sessionChartView === 'rate'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Tingkat Hadir (%)
                  </button>
                  <button
                    onClick={() => setSessionChartView('breakdown')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      sessionChartView === 'breakdown'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Detail Status
                  </button>
                </div>
              </div>

              {/* Container Bar Chart Recharts */}
              <div className="h-60 w-full">
                {(() => {
                  const sessionStatsList = stats?.sessionStats || [];
                  const barData = sessionStatsList.length > 0
                    ? sessionStatsList.map((s) => ({
                        sessionId: s.sessionId,
                        name: `Sesi ${s.sessionName}`,
                        rawName: s.sessionName,
                        attendanceRate: s.attendanceRate,
                        tepatWaktuRate: s.tepatWaktuPercentage ?? 0,
                        terlambatRate: s.terlambatPercentage ?? 0,
                        sakitRate: s.sakitPercentage ?? 0,
                        izinRate: s.izinPercentage ?? 0,
                        alphaRate: s.alphaPercentage ?? 0,
                        hadirCount: s.hadirCount,
                        terlambatCount: s.terlambatCount,
                        sakitCount: s.sakitCount,
                        izinCount: s.izinCount,
                        alphaCount: s.alphaCount,
                        totalStudents: s.totalStudents,
                        entryStartTime: s.entryStartTime,
                        entryLimitTime: s.entryLimitTime,
                        transitionTime: s.transitionTime,
                      }))
                    : [
                        {
                          sessionId: 'sch-pagi',
                          name: 'Sesi Pagi',
                          rawName: 'Pagi',
                          attendanceRate: stats?.hadirPercentage ?? 0,
                          tepatWaktuRate: stats?.tepatWaktuPercentage ?? 0,
                          terlambatRate: stats?.terlambatPercentage ?? 0,
                          sakitRate: stats?.sakitPercentage ?? 0,
                          izinRate: stats?.izinPercentage ?? 0,
                          alphaRate: stats?.alphaPercentage ?? 0,
                          hadirCount: stats?.hadirCount ?? 0,
                          terlambatCount: stats?.terlambatCount ?? 0,
                          sakitCount: stats?.sakitCount ?? 0,
                          izinCount: stats?.izinCount ?? 0,
                          alphaCount: stats?.alphaCount ?? 0,
                          totalStudents: stats?.totalActiveStudents ?? 0,
                          entryStartTime: '06:30',
                          entryLimitTime: '07:00',
                          transitionTime: '12:30',
                        },
                      ];

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        margin={{ top: 12, right: 16, left: -20, bottom: 4 }}
                        onClick={(state: any) => {
                          if (state && state.activePayload && state.activePayload.length) {
                            const clickedId = state.activePayload[0].payload.sessionId;
                            if (clickedId) setSelectedSession(clickedId);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: '#94a3b8' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          unit="%"
                          tick={{ fill: '#0f172a', fontSize: 10, fontWeight: 600 }}
                          axisLine={{ stroke: '#94a3b8' }}
                          tickLine={false}
                        />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-white p-3.5 rounded-xl border-2 border-slate-200 shadow-xl text-xs space-y-2 min-w-[210px] text-slate-900">
                                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                    <span className="font-extrabold text-slate-900">{item.name}</span>
                                    <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                      {item.attendanceRate}% Hadir
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-700 font-medium">
                                    Jam Masuk: <span className="font-mono text-slate-900 font-bold">{item.entryStartTime || '06:30'} - {item.entryLimitTime || '07:00'}</span>
                                  </div>
                                  {item.transitionTime && (
                                    <div className="text-[11px] text-slate-700 font-medium">
                                      Perpindahan Sesi: <span className="font-mono text-indigo-800 font-bold">{item.transitionTime}</span>
                                    </div>
                                  )}
                                  <div className="pt-1.5 border-t border-slate-200 space-y-1 text-[11px]">
                                    <div className="flex justify-between text-emerald-800">
                                      <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Tepat Waktu:
                                      </span>
                                      <span className="font-mono font-bold">{item.hadirCount} ({item.tepatWaktuRate}%)</span>
                                    </div>
                                    <div className="flex justify-between text-amber-800">
                                      <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Terlambat:
                                      </span>
                                      <span className="font-mono font-bold">{item.terlambatCount} ({item.terlambatRate}%)</span>
                                    </div>
                                    <div className="flex justify-between text-blue-800">
                                      <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-blue-500" /> Sakit:
                                      </span>
                                      <span className="font-mono font-bold">{item.sakitCount} ({item.sakitRate}%)</span>
                                    </div>
                                    <div className="flex justify-between text-purple-800">
                                      <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-purple-500" /> Izin:
                                      </span>
                                      <span className="font-mono font-bold">{item.izinCount} ({item.izinRate}%)</span>
                                    </div>
                                    <div className="flex justify-between text-rose-800">
                                      <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Alpha / Belum:
                                      </span>
                                      <span className="font-mono font-bold">{item.alphaCount} ({item.alphaRate}%)</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {sessionChartView === 'rate' ? (
                          <Bar
                            dataKey="attendanceRate"
                            name="Tingkat Kehadiran (%)"
                            fill="#6366f1"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={55}
                          />
                        ) : (
                          <>
                            <Bar dataKey="tepatWaktuRate" name="Tepat Waktu (%)" stackId="a" fill="#10b981" />
                            <Bar dataKey="terlambatRate" name="Terlambat (%)" stackId="a" fill="#f59e0b" />
                            <Bar dataKey="sakitRate" name="Sakit (%)" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="izinRate" name="Izin (%)" stackId="a" fill="#8b5cf6" />
                            <Bar dataKey="alphaRate" name="Alpha (%)" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

            {/* Session Info Chips Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-200">
              {(stats?.sessionStats || []).map((ss) => {
                const isCurrent = selectedSession === ss.sessionId;
                return (
                  <div
                    key={ss.sessionId}
                    onClick={() => setSelectedSession(ss.sessionId)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200'
                        : 'bg-white border-slate-300 hover:border-slate-400 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">Sesi {ss.sessionName}</span>
                      <span className="text-[10px] font-mono font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                        {ss.attendanceRate}% Hadir
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-700">
                      <span>Jam Masuk: <strong className="text-slate-900">{ss.entryStartTime || '06:30'} - {ss.entryLimitTime || '07:00'}</strong></span>
                      {ss.transitionTime && (
                        <span className="text-indigo-800 font-bold">Pindah: {ss.transitionTime}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bar Chart 3: Distribusi Kehadiran Per Kelas pada Sesi Terpilih */}
        {stats?.classBreakdown && stats.classBreakdown.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Persentase Kehadiran Tiap Kelas — Sesi {currentSessionName}
                </h4>
                <p className="text-xs text-slate-600 font-medium">
                  Perbandingan tingkat kehadiran aktual antar rombongan belajar kelas
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg">
                {stats.classBreakdown.length} Kelas Terdaftar
              </span>
            </div>

            <div className="h-52 w-full bg-slate-50 rounded-2xl p-3 border border-slate-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.classBreakdown}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                  <XAxis
                    dataKey="className"
                    tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#94a3b8' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fill: '#0f172a', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#94a3b8' }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl border-2 border-slate-200 shadow-xl text-xs space-y-1 min-w-[180px] text-slate-900">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                              <span className="font-bold text-slate-900">Kelas {item.className}</span>
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] border border-indigo-200">
                                {item.attendanceRate}%
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-700 pt-0.5 font-medium">
                              <span>Hadir / Terlambat:</span>
                              <span className="font-mono font-bold text-slate-900">{item.hadirCount + item.terlambatCount} / {item.totalStudents} siswa</span>
                            </div>
                            <div className="flex justify-between text-slate-600 text-[11px] font-medium">
                              <span>Sakit / Izin / Alpha:</span>
                              <span className="font-mono text-slate-800 font-bold">{item.sakitCount}S / {item.izinCount}I / {item.alphaCount}A</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="attendanceRate"
                    name="Tingkat Kehadiran (%)"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Tabel Aktivitas Presensi Terbaru */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Aktivitas Presensi Terbaru</h3>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">Catatan kehadiran dan perubahan status langsung</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa atau kelas..."
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600 w-44 sm:w-56"
              />
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-600" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none text-xs cursor-pointer"
              >
                <option value="all" className="bg-white text-slate-900">Semua Status</option>
                <option value="hadir" className="bg-white text-slate-900">Hadir</option>
                <option value="terlambat" className="bg-white text-slate-900">Terlambat</option>
                <option value="sakit" className="bg-white text-slate-900">Sakit</option>
                <option value="izin" className="bg-white text-slate-900">Izin</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Petugas / Perekam</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-700 font-semibold">
                    Belum ada data transaksi presensi untuk kriteria yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredRecent.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.studentName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-indigo-700 font-bold">
                        {item.className}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {item.recordedAt ? item.recordedAt.slice(11, 16) : '-'} WIB
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 capitalize font-mono font-semibold text-slate-700">
                      {item.method}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {item.recordedByUserName || 'Sistem'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic">
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
