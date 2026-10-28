import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Clock,
  Shield,
  RefreshCw,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs();
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (e) {
      console.error('Error load audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchModule = selectedModule === 'all' || log.module === selectedModule;
    return matchSearch && matchModule;
  });

  const exportLogsExcel = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada log untuk diekspor.');
      return;
    }

    const rows = filteredLogs.map((l, idx) => ({
      No: idx + 1,
      Waktu_WIB: l.timestamp ? new Date(l.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-',
      Modul: l.module,
      Aksi: l.action,
      Pengguna: l.userName,
      Rincian_Aktivitas: l.details,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit_Log');
    XLSX.writeFile(wb, `Audit_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Log Aktivitas & Jejak Audit (Audit Trail)
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            Pencatatan kronologis aktivitas login, perubahan presensi, data master, dan sinkronisasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer"
            title="Muat Ulang Log"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-700' : 'text-slate-700'}`} />
          </button>
          <button
            onClick={exportLogsExcel}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Log</span>
          </button>
        </div>
      </div>

      {/* Filter and Table */}
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
              placeholder="Cari rincian aktivitas atau pengguna..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-600" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-transparent text-slate-900 font-bold focus:outline-none text-xs cursor-pointer"
            >
              <option value="all" className="bg-white text-slate-900">Semua Modul</option>
              <option value="Autentikasi" className="bg-white text-slate-900">Autentikasi</option>
              <option value="Presensi" className="bg-white text-slate-900">Presensi</option>
              <option value="Izin Kamar Mandi" className="bg-white text-slate-900">Izin Kamar Mandi</option>
              <option value="Pengaturan" className="bg-white text-slate-900">Pengaturan</option>
              <option value="Cadangan" className="bg-white text-slate-900">Cadangan</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Waktu (WIB)</th>
                <th className="py-2.5 px-3">Modul</th>
                <th className="py-2.5 px-3">Aksi</th>
                <th className="py-2.5 px-3">Pelaku / Pengguna</th>
                <th className="py-2.5 px-3">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-700 font-semibold">
                    Belum ada log aktivitas tercatat.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-800 font-bold whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleTimeString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      WIB
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[10px] text-indigo-950 font-bold">
                        {l.module}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-950">{l.action}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-semibold">{l.userName}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{l.details}</td>
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
