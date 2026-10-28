import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  Key,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Search,
  Lock,
} from 'lucide-react';
import { InternalUser, SchoolClass, UserRole } from '../../types';
import { api } from '../../services/api';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('petugas');
  const [pin, setPin] = useState('123456');
  const [email, setEmail] = useState('');
  const [assignedClassId, setAssignedClassId] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Kata sandi peran yang diatur admin
  const [rolePasswords, setRolePasswords] = useState({
    admin: 'admin123',
    kesiswaan: 'kesiswaan123',
    kepala_sekolah: 'kepsek123',
    defaultWaliKelas: 'wali123',
  });
  const [isSavingPasswords, setIsSavingPasswords] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const [meRes, masterRes, pwdRes] = await Promise.all([
        api.getMe(),
        api.getMasterData(),
        api.getRolePasswords().catch(() => ({ success: false })),
      ]);
      if (meRes.success) {
        setUsers(meRes.availableInternalUsers || []);
      }
      if (masterRes.success && masterRes.data) {
        setClasses(masterRes.data.kelas || []);
      }
      if (pwdRes && pwdRes.success && pwdRes.passwords) {
        setRolePasswords(pwdRes.passwords);
      }
    } catch (e) {
      console.error('Error load users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRolePasswords = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPasswords(true);
    setPasswordFeedback(null);
    try {
      const res = await api.updateRolePasswords(rolePasswords);
      if (res.success) {
        setPasswordFeedback('Kata sandi peran sekolah berhasil diperbarui!');
        setTimeout(() => setPasswordFeedback(null), 3500);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan kata sandi peran.');
    } finally {
      setIsSavingPasswords(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName) {
      setFeedback({ text: 'Username dan nama lengkap wajib diisi.', isError: true });
      return;
    }

    try {
      const res = await api.createInternalUser({
        username,
        fullName,
        role,
        pin,
        email: email || undefined,
        assignedClassId: role === 'wali_kelas' ? assignedClassId : undefined,
      });

      if (res.success) {
        setFeedback({ text: `Pengguna internal ${fullName} berhasil ditambahkan.`, isError: false });
        setShowAddModal(false);
        setUsername('');
        setFullName('');
        setPin('123456');
        setEmail('');
        loadUserData();
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Gagal menambahkan pengguna.', isError: true });
    }
  };

  const filteredUsers = users.filter((u) =>
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'admin':
        return <span className="bg-indigo-50 text-indigo-950 border border-indigo-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Admin Sekolah</span>;
      case 'petugas':
        return <span className="bg-blue-50 text-blue-950 border border-blue-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Petugas Presensi</span>;
      case 'wali_kelas':
        return <span className="bg-emerald-50 text-emerald-950 border border-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Wali Kelas</span>;
      case 'kesiswaan':
        return <span className="bg-amber-50 text-amber-950 border border-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Kesiswaan</span>;
      case 'kepala_sekolah':
        return <span className="bg-purple-50 text-purple-950 border border-purple-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Kepala Sekolah</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 border border-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold">{r}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Pengelolaan Akun Pengguna Internal Sekolah
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            Admin, Petugas Presensi, Wali Kelas, Kesiswaan, dan Kepala Sekolah dengan hak akses terisolasi
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Akun Pengguna</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${feedback.isError ? 'bg-rose-50 text-rose-950 border border-rose-300' : 'bg-emerald-50 text-emerald-950 border border-emerald-300'}`}>
          {feedback.isError ? <AlertCircle className="w-4 h-4 text-rose-700" /> : <CheckCircle className="w-4 h-4 text-emerald-700" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tabel Pengguna Internal */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pengguna berdasarkan nama atau username..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Nama Lengkap</th>
                <th className="py-2.5 px-3">Username / ID</th>
                <th className="py-2.5 px-3">Peran Akses</th>
                <th className="py-2.5 px-3">Kelas Binaan</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-700 font-semibold">
                    Tidak ada akun pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const assigned = classes.find((c) => c.id === u.assignedClassId);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-950">{u.fullName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-950">@{u.username}</td>
                      <td className="py-2.5 px-3">{getRoleLabel(u.role)}</td>
                      <td className="py-2.5 px-3">
                        {assigned ? (
                          <span className="font-mono bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-indigo-950 font-bold">
                            Kelas {assigned.name}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-semibold">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-50 text-emerald-950 border border-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                          Aktif
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kartu Pengaturan Kata Sandi Peran (Diatur oleh Administrator) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              Pengaturan Kata Sandi Peran (Role Access Passwords)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Admin mengatur sandi login untuk Wali Kelas, Kesiswaan, Kepala Sekolah, dan Administrator.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900">
              <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Keamanan Aktif: Begitu sandi peran diperbarui di sini, sandi default sebelumnya otomatis TIDAK BERLAKU LAGI.</span>
            </div>
          </div>
          {passwordFeedback && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-xl flex items-center gap-1.5 animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              {passwordFeedback}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveRolePasswords} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-slate-800 font-bold">Sandi Administrator</label>
              <input
                type="text"
                value={rolePasswords.admin}
                onChange={(e) => setRolePasswords({ ...rolePasswords, admin: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="admin123"
              />
              <span className="text-[10px] text-slate-500 block">Akses penuh sistem</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-slate-800 font-bold">Sandi Kesiswaan</label>
              <input
                type="text"
                value={rolePasswords.kesiswaan}
                onChange={(e) => setRolePasswords({ ...rolePasswords, kesiswaan: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-600"
                placeholder="kesiswaan123"
              />
              <span className="text-[10px] text-slate-500 block">Kedisiplinan & Alpha</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-slate-800 font-bold">Sandi Kepala Sekolah</label>
              <input
                type="text"
                value={rolePasswords.kepala_sekolah}
                onChange={(e) => setRolePasswords({ ...rolePasswords, kepala_sekolah: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="kepsek123"
              />
              <span className="text-[10px] text-slate-500 block">Dashboard monitoring</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <label className="block text-slate-800 font-bold">Sandi Default Wali Kelas</label>
              <input
                type="text"
                value={rolePasswords.defaultWaliKelas}
                onChange={(e) => setRolePasswords({ ...rolePasswords, defaultWaliKelas: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="wali123"
              />
              <span className="text-[10px] text-slate-500 block">Masuk ke ruang kelas</span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSavingPasswords}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSavingPasswords ? 'Menyimpan Sandi Peran...' : 'Simpan Pembaruan Sandi Peran'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Tambah Pengguna */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 mb-4">Tambah Akun Pengguna Internal</h3>
            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Username / ID *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: petugas2"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-800 font-bold mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Rian Pratama, S.Pd."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-800 font-bold mb-1">Peran Pengguna *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                >
                  <option value="petugas">Petugas Presensi</option>
                  <option value="wali_kelas">Wali Kelas</option>
                  <option value="kesiswaan">Kesiswaan</option>
                  <option value="kepala_sekolah">Kepala Sekolah</option>
                  <option value="admin">Administrator Sekolah</option>
                </select>
              </div>

              {role === 'wali_kelas' && (
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Kelas yang Ditugaskan *</label>
                  <select
                    value={assignedClassId}
                    onChange={(e) => setAssignedClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-800 font-bold mb-1">PIN Pribadi (6 Digit)</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Email Internal (Opsional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@sekolah.sch.id"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
