import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Calendar,
  Filter,
  Download,
  FileText,
  AlertTriangle,
  Clock,
  DoorOpen,
  UserX,
  Search,
  BarChart3,
  ListFilter,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../../services/api';
import { InternalUser, SchoolClass, TenantSchool } from '../../types';
import { AttendanceMonitoringSection } from '../monitoring/AttendanceMonitoringSection';

interface KesiswaanViewProps {
  tenant?: TenantSchool | null;
  currentUser?: InternalUser | null;
}

export const KesiswaanView: React.FC<KesiswaanViewProps> = ({ tenant, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'discipline'>('monitoring');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  });
  const [records, setRecords] = useState<any[]>([]);
  const [bathroomOverdueList, setBathroomOverdueList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'alpha' | 'terlambat' | 'bathroom'>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await api.getMasterData();
      if (res.success && res.data?.kelas) {
        setClasses(res.data.kelas);
      }
    } catch (e) {
      console.warn('Gagal memuat kelas di kesiswaan:', e);
    }
  };

  useEffect(() => {
    loadDisciplineData();
  }, [selectedDate]);

  const loadDisciplineData = async () => {
    setIsLoading(true);
    try {
      const [presRes, bathRes] = await Promise.all([
        api.getPresensi(selectedDate),
        api.getBathroomHistory(selectedDate, undefined, true),
      ]);

      if (presRes.success) {
        setRecords(presRes.records || []);
      }
      if (bathRes.success) {
        setBathroomOverdueList(bathRes.history || []);
      }
    } catch (e) {
      console.error('Error load discipline data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const alphaStudents = records.filter((r) => r.status === 'alpha');
  const lateStudents = records.filter((r) => r.status === 'terlambat');

  const filteredItems = () => {
    let list: any[] = [];
    if (filterType === 'alpha') {
      list = alphaStudents.map((s) => ({ ...s, disciplineType: 'ALPHA' }));
    } else if (filterType === 'terlambat') {
      list = lateStudents.map((s) => ({ ...s, disciplineType: 'TERLAMBAT' }));
    } else if (filterType === 'bathroom') {
      list = bathroomOverdueList.map((b) => ({
        studentName: b.studentName,
        className: b.className,
        notes: `Izin ${b.type} durasi ${b.actualDurationMinutes || b.maxMinutes}+ mnt (Batas: ${b.maxMinutes} mnt)`,
        disciplineType: 'TOILET_OVERDUE',
        timeStr: b.timeOut ? b.timeOut.slice(11, 16) : '-',
      }));
    } else {
      // Gabungkan semua kasus kedisiplinan
      list = [
        ...alphaStudents.map((s) => ({ ...s, disciplineType: 'ALPHA' })),
        ...lateStudents.map((s) => ({ ...s, disciplineType: 'TERLAMBAT' })),
        ...bathroomOverdueList.map((b) => ({
          studentName: b.studentName,
          className: b.className,
          notes: `Izin ${b.type} lewat batas waktu (${b.actualDurationMinutes || b.maxMinutes} menit)`,
          disciplineType: 'TOILET_OVERDUE',
          timeStr: b.timeOut ? b.timeOut.slice(11, 16) : '-',
        })),
      ];
    }

    if (!searchQuery.trim()) return list;
    return list.filter(
      (item) =>
        item.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.className?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const displayList = filteredItems();

  const exportExcel = () => {
    if (displayList.length === 0) {
      alert('Tidak ada data kedisiplinan untuk diekspor.');
      return;
    }

    const exportRows = displayList.map((item, idx) => ({
      No: idx + 1,
      Tanggal: selectedDate,
      Nama_Siswa: item.studentName,
      Kelas: item.className,
      Kategori_Disiplin: item.disciplineType,
      Keterangan_Catatan: item.notes || item.status || '-',
      Waktu: item.recordedAt ? item.recordedAt.slice(11, 16) : item.timeStr || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kedisiplinan_Siswa');
    XLSX.writeFile(wb, `Laporan_Kedisiplinan_${selectedDate}.xlsx`);
  };

  // Unduh Berkas PDF Resmi (bukan langsung print)
  const exportPDF = () => {
    if (displayList.length === 0) {
      alert('Tidak ada data kedisiplinan untuk diunduh sebagai PDF.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Judul & Header Dokumen Resmi
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);
    doc.text('LAPORAN KEDISIPLINAN & KETERTIBAN SISWA', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Tanggal Pemantauan: ${selectedDate} | Waktu Unduh: ${new Date().toLocaleTimeString('id-ID')} WIB`, 14, 25);
    doc.text(
      `Filter Kategori: ${filterType.toUpperCase()} | Alpha: ${alphaStudents.length} • Terlambat: ${lateStudents.length} • Toilet Overdue: ${bathroomOverdueList.length}`,
      14,
      30
    );

    // Garis Pemisah
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(14, 33, 196, 33);

    // Format Data Baris Tabel
    const tableData = displayList.map((item, idx) => {
      const categoryLabel =
        item.disciplineType === 'ALPHA'
          ? 'Alpha'
          : item.disciplineType === 'TERLAMBAT'
          ? 'Terlambat'
          : 'Toilet Overdue';

      return [
        idx + 1,
        item.studentName || '-',
        item.className || '-',
        categoryLabel,
        item.notes || item.status || '-',
        item.recordedAt ? item.recordedAt.slice(11, 16) : item.timeStr || '-',
      ];
    });

    autoTable(doc, {
      startY: 37,
      head: [['No', 'Nama Siswa', 'Kelas', 'Kategori', 'Catatan / Durasi', 'Waktu']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229], // Indigo 600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 32 },
        4: { cellWidth: 55 },
        5: { cellWidth: 20, halign: 'center' },
      },
    });

    doc.save(`Laporan_Kedisiplinan_Siswa_${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            Pemantauan Kesiswaan & Kedisiplinan Siswa
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            Analisis grafik presensi per siswa dan per kelas, pemantauan alpha, keterlambatan, dan pelanggaran izin toilet
          </p>
        </div>
      </div>

      {/* Navigasi Sub-Tab Kesiswaan */}
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
          onClick={() => setActiveTab('discipline')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'discipline'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-700 hover:text-slate-900'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Pelanggaran Kedisiplinan & Toilet Overdue</span>
        </button>
      </div>

      {/* Tampilan Tab 1: Grafik & Monitoring Terpadu Kesiswaan */}
      {activeTab === 'monitoring' && (
        <AttendanceMonitoringSection
          tenant={tenant || null}
          currentUser={currentUser || null}
          classes={classes}
          defaultClassId="all"
          allowAllClasses={true}
          roleLabel="Kesiswaan"
        />
      )}

      {/* Tampilan Tab 2: Pelanggaran Kedisiplinan & Toilet Overdue */}
      {activeTab === 'discipline' && (
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
                onClick={exportExcel}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Excel</span>
              </button>

              <button
                onClick={exportPDF}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Unduh laporan kedisiplinan sebagai berkas PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Unduh PDF</span>
              </button>
            </div>
          </div>

      {/* 3 Kartu Fokus Kedisiplinan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterType(filterType === 'alpha' ? 'all' : 'alpha')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition shadow-xs ${
            filterType === 'alpha'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Siswa Alpha</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{alphaStudents.length}</div>
          <span className="text-[11px] text-slate-600 font-medium mt-1 block">Tidak hadir tanpa surat / keterangan</span>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'terlambat' ? 'all' : 'terlambat')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition shadow-xs ${
            filterType === 'terlambat'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Siswa Terlambat</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{lateStudents.length}</div>
          <span className="text-[11px] text-slate-600 font-medium mt-1 block">Melewati batas jam masuk sekolah</span>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'bathroom' ? 'all' : 'bathroom')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition shadow-xs ${
            filterType === 'bathroom'
              ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Toilet Lewat Waktu</span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 border border-orange-300 flex items-center justify-center">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{bathroomOverdueList.length}</div>
          <span className="text-[11px] text-slate-600 font-medium mt-1 block">Melewati durasi 5 / 10 menit</span>
        </div>
      </div>

      {/* Tabel Kedisiplinan Terpadu */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau kelas..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div className="text-xs text-slate-700 font-medium">
            Kategori Aktif: <b className="text-slate-950 font-bold uppercase">{filterType === 'all' ? 'Semua Kasus' : filterType}</b> ({displayList.length} catatan)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3">Kelas</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Rincian / Catatan</th>
                <th className="py-2.5 px-3">Waktu Terdata</th>
                <th className="py-2.5 px-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-700 font-semibold">
                    Tidak ada siswa dalam kategori kedisiplinan ini pada tanggal terpilih.
                  </td>
                </tr>
              ) : (
                displayList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-950">{item.studentName}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-indigo-950 font-bold">
                        {item.className}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.disciplineType === 'ALPHA'
                            ? 'bg-rose-50 text-rose-950 border border-rose-300'
                            : item.disciplineType === 'TERLAMBAT'
                            ? 'bg-amber-50 text-amber-950 border border-amber-300'
                            : 'bg-orange-50 text-orange-950 border border-orange-300'
                        }`}
                      >
                        {item.disciplineType === 'TOILET_OVERDUE' ? 'Izin Melewati Batas' : item.disciplineType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{item.notes || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800 font-bold">
                      {item.recordedAt ? `${item.recordedAt.slice(11, 16)} WIB` : item.timeStr ? `${item.timeStr} WIB` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => alert(`Panggilan atau pembinaan kedisiplinan tercatat untuk ${item.studentName} (${item.className})`)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold rounded-lg text-[11px] border border-indigo-300 transition cursor-pointer"
                      >
                        Catat Pembinaan
                      </button>
                    </td>
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
