import React, { useState, useEffect } from 'react';
import {
  Database,
  Building,
  GraduationCap,
  Users,
  Clock,
  Plus,
  Upload,
  Download,
  Search,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash,
  KeyRound,
  Layers,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';
import { SchoolProgram, SchoolClass } from '../../types';

export const MasterData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'siswa' | 'kelas' | 'program' | 'guru' | 'jadwal' | 'peraturan'>('kelas');
  const [masterData, setMasterData] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Peraturan Presensi Sekolah Terisolasi
  const [rules, setRules] = useState({
    toleransiKeterlambatanMenit: 15,
    jamMasukMaksimal: '07:00',
    jamPulang: '14:30',
    izinKamarMandiMaksimalMenit: 10,
    maksimalIzinPerHari: 2,
    maksimalIzinSerentakPerKelas: 2,
    sanksiKeterlambatan: 'Teguran lisan untuk 1-3 kali terlambat, pemanggilan orang tua untuk >3 kali terlambat.',
    catatanPeraturan: 'Semua siswa wajib melakukan presensi kartu/barcode sebelum jam 07:00 WIB.',
    updatedAt: '',
  });
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Modal Tambah Siswa
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newNis, setNewNis] = useState('');
  const [newNisn, setNewNisn] = useState('');
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'L' | 'P'>('L');
  const [newClassId, setNewClassId] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');

  // Modal Edit Siswa
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentNis, setEditStudentNis] = useState('');
  const [editStudentNisn, setEditStudentNisn] = useState('');
  const [editStudentGender, setEditStudentGender] = useState<'L' | 'P'>('L');
  const [editStudentClassId, setEditStudentClassId] = useState('');
  const [editStudentBarcode, setEditStudentBarcode] = useState('');
  const [editStudentParentPhone, setEditStudentParentPhone] = useState('');
  const [editStudentIsActive, setEditStudentIsActive] = useState(true);

  // Modal Konfirmasi Hapus Data
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'siswa' | 'kelas' | 'program' | 'sesi';
    id: string;
    name: string;
    description?: string;
  } | null>(null);

  // Modal Tambah Program
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramCode, setNewProgramCode] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');

  // Modal Tambah Kelas & Atur Sandi
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<number>(7);
  const [newClassProgramId, setNewClassProgramId] = useState<string>('');
  const [newClassWaliId, setNewClassWaliId] = useState<string>('');
  const [newClassPassword, setNewClassPassword] = useState('wali123');

  // Modal Edit Kelas
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassGrade, setEditClassGrade] = useState<number>(7);
  const [editClassProgramId, setEditClassProgramId] = useState<string>('');
  const [editClassWaliId, setEditClassWaliId] = useState<string>('');
  const [editClassPassword, setEditClassPassword] = useState('');

  // Modal Tambah Sesi Presensi Manual
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionStart, setNewSessionStart] = useState('06:30');
  const [newSessionLimit, setNewSessionLimit] = useState('07:00');
  const [newSessionLateLimit, setNewSessionLateLimit] = useState('07:30');
  const [newSessionTransition, setNewSessionTransition] = useState('12:30');
  const [newSessionExit, setNewSessionExit] = useState('14:00');

  // Modal Edit Sesi Presensi
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [editSessionStart, setEditSessionStart] = useState('06:30');
  const [editSessionLimit, setEditSessionLimit] = useState('07:00');
  const [editSessionLateLimit, setEditSessionLateLimit] = useState('07:30');
  const [editSessionTransition, setEditSessionTransition] = useState('12:30');
  const [editSessionExit, setEditSessionExit] = useState('14:00');

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMasterData();
      if (res.success && res.data) {
        setMasterData(res.data);
        if (res.data.kelas?.length > 0 && !newClassId) {
          setNewClassId(res.data.kelas[0].id);
        }
      }
      // Muat peraturan sekolah terisolasi
      const rulesRes = await api.getSchoolRules().catch(() => null);
      if (rulesRes?.success && rulesRes.rules) {
        setRules((prev) => ({ ...prev, ...rulesRes.rules }));
      }
    } catch (e: any) {
      console.error('Error load master data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRules(true);
    try {
      const res = await api.saveSchoolRules(rules);
      if (res.success) {
        showToast('Peraturan tata tertib presensi sekolah berhasil disimpan secara persisten!');
        if (res.rules) setRules(res.rules);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan peraturan sekolah.', true);
    } finally {
      setIsSavingRules(false);
    }
  };

  // ====================== PROGRAM HANDLERS ======================
  const handleAddProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgramName || !newProgramCode) {
      showToast('Nama dan kode program wajib diisi.', true);
      return;
    }
    try {
      const res = await api.createProgram({
        name: newProgramName.trim(),
        code: newProgramCode.trim().toUpperCase(),
        description: newProgramDesc.trim(),
      });
      if (res.success) {
        showToast(`Program ${newProgramName} berhasil ditambahkan.`);
        setShowAddProgram(false);
        setNewProgramName('');
        setNewProgramCode('');
        setNewProgramDesc('');
        loadMasterData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan program.', true);
    }
  };

  const handleDeleteProgram = (programId: string, programName: string) => {
    setItemToDelete({
      type: 'program',
      id: programId,
      name: programName,
      description: 'Kelas yang sebelumnya terdaftar pada program ini akan dialihkan ke program Reguler.',
    });
  };

  // ====================== KELAS HANDLERS ======================
  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) {
      showToast('Nama kelas wajib diisi.', true);
      return;
    }
    try {
      const res = await api.createClass({
        name: newClassName.trim(),
        grade: Number(newClassGrade),
        programId: newClassProgramId || undefined,
        waliKelasId: newClassWaliId || undefined,
        waliKelasPassword: newClassPassword.trim() || 'wali123',
      });
      if (res.success) {
        showToast(`Kelas ${newClassName} berhasil dibuat dengan sandi wali kelas.`);
        setShowAddClass(false);
        setNewClassName('');
        setNewClassGrade(7);
        setNewClassProgramId('');
        setNewClassWaliId('');
        setNewClassPassword('wali123');
        loadMasterData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan kelas.', true);
    }
  };

  const handleUpdateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    try {
      const res = await api.updateClass(editingClass.id, {
        name: editClassName.trim(),
        grade: Number(editClassGrade),
        programId: editClassProgramId || undefined,
        waliKelasId: editClassWaliId || undefined,
        waliKelasPassword: editClassPassword.trim() || undefined,
      });
      if (res.success) {
        showToast(`Kelas ${editClassName} dan kata sandi berhasil diperbarui.`);
        setEditingClass(null);
        loadMasterData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui kelas.', true);
    }
  };

  const handleDeleteClass = (classId: string, className: string) => {
    setItemToDelete({
      type: 'kelas',
      id: classId,
      name: className,
      description: 'Menghapus rombongan belajar kelas. Pastikan tidak ada siswa aktif di kelas ini sebelum menghapus.',
    });
  };

  // ====================== SESI PRESENSI HANDLERS ======================
  const handleAddSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName || !newSessionLimit) {
      showToast('Nama sesi dan batas waktu presensi wajib diisi.', true);
      return;
    }
    try {
      const res = await api.createSession({
        sessionName: newSessionName.trim(),
        entryStartTime: newSessionStart,
        entryLimitTime: newSessionLimit,
        lateLimitTime: newSessionLateLimit,
        transitionTime: newSessionTransition,
        exitTime: newSessionExit,
        operationalDays: [1, 2, 3, 4, 5],
      });
      if (res.success) {
        showToast(`Sesi presensi "${newSessionName}" berhasil ditambahkan.`);
        setShowAddSession(false);
        setNewSessionName('');
        loadMasterData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menambah sesi.', true);
    }
  };

  const handleOpenEditSession = (session: any) => {
    setEditingSession(session);
    setEditSessionName(session.sessionName || '');
    setEditSessionStart(session.entryStartTime || '06:30');
    setEditSessionLimit(session.entryLimitTime || '07:00');
    setEditSessionLateLimit(session.lateLimitTime || '07:30');
    setEditSessionTransition(session.transitionTime || session.exitTime || '12:30');
    setEditSessionExit(session.exitTime || '14:00');
  };

  const handleEditSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    try {
      const res = await api.updateSession(editingSession.id, {
        sessionName: editSessionName.trim(),
        entryStartTime: editSessionStart,
        entryLimitTime: editSessionLimit,
        lateLimitTime: editSessionLateLimit,
        transitionTime: editSessionTransition,
        exitTime: editSessionExit,
      });
      if (res.success) {
        showToast(`Pengaturan jam sesi "${editSessionName}" berhasil diperbarui.`);
        setEditingSession(null);
        loadMasterData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui pengaturan sesi.', true);
    }
  };

  const handleDeleteSession = (sessionId: string, sessionName: string) => {
    setItemToDelete({
      type: 'sesi',
      id: sessionId,
      name: sessionName,
      description: 'Menghapus jadwal sesi presensi operasional.',
    });
  };

  // ====================== EXECUTE DELETE HANDLER ======================
  const handleExecuteDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'siswa') {
        const res = await api.deleteStudent(itemToDelete.id);
        if (res.success) {
          showToast(`Data siswa "${itemToDelete.name}" berhasil dihapus.`);
          loadMasterData();
        }
      } else if (itemToDelete.type === 'kelas') {
        const res = await api.deleteClass(itemToDelete.id);
        if (res.success) {
          showToast(`Kelas "${itemToDelete.name}" berhasil dihapus.`);
          loadMasterData();
        }
      } else if (itemToDelete.type === 'program') {
        const res = await api.deleteProgram(itemToDelete.id);
        if (res.success) {
          showToast(`Program "${itemToDelete.name}" berhasil dihapus.`);
          loadMasterData();
        }
      } else if (itemToDelete.type === 'sesi') {
        const res = await api.deleteSession(itemToDelete.id);
        if (res.success) {
          showToast(`Sesi presensi "${itemToDelete.name}" berhasil dihapus.`);
          loadMasterData();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus data.', true);
    } finally {
      setItemToDelete(null);
    }
  };

  // ====================== SISWA EXPORT / IMPORT ======================
  const handleExportStudentsExcel = () => {
    const students = masterData?.siswa || [];
    if (students.length === 0) {
      alert('Tidak ada data siswa untuk diekspor.');
      return;
    }

    const rows = students.map((s: any, idx: number) => ({
      No: idx + 1,
      NIS: s.nis,
      NISN: s.nisn || '',
      Nama_Lengkap: s.fullName,
      Jenis_Kelamin: s.gender,
      Kelas: s.className || '',
      Kode_Barcode_RFID: s.barcodeRfidCode || '',
      Status_Aktif: s.isActive ? 'AKTIF' : 'NONAKTIF',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Siswa');
    XLSX.writeFile(wb, `Data_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImportStudentsExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          showToast('File Excel kosong atau format tidak sesuai.', true);
          return;
        }

        const classes = masterData?.kelas || [];
        const studentsToImport: any[] = [];

        data.forEach((row, i) => {
          const nis = String(row.NIS || row.nis || row.Nis || `26${100 + i}`).trim();
          const fullName = String(row.Nama_Lengkap || row.nama || row.Nama || row.NAMA || '').trim();
          const className = String(row.Kelas || row.kelas || 'VII-A').trim();
          const gender = row.Jenis_Kelamin === 'P' || row.gender === 'P' ? 'P' : 'L';
          const barcode = String(row.Kode_Barcode_RFID || row.barcode || `CARD-${nis}`).trim();
          const parentPhone = String(row.No_HP_Ortu || row.phone || row.telepon || '').trim();

          if (fullName) {
            const matchedClass = classes.find((c: any) => c.name.toLowerCase() === className.toLowerCase()) || classes[0];
            studentsToImport.push({
              nis,
              nisn: row.NISN ? String(row.NISN).trim() : undefined,
              fullName,
              gender,
              classId: matchedClass?.id || 'cls-7a',
              className: matchedClass?.name || 'VII-A',
              barcodeRfidCode: barcode,
              parentPhone: parentPhone || undefined,
            });
          }
        });

        if (studentsToImport.length === 0) {
          showToast('Tidak ada data siswa yang valid dalam file Excel.', true);
          return;
        }

        const res = await api.importStudents(studentsToImport);
        if (res.success) {
          showToast(`Berhasil mengimpor dan menyinkronkan ${studentsToImport.length} data siswa ke database.`);
          loadMasterData();
        }
      } catch (err: any) {
        showToast('Gagal memproses file Excel: ' + (err.message || 'Format tidak valid'), true);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNis.trim() || !newName.trim() || !newClassId) {
      showToast('NIS, Nama Lengkap Siswa, dan Kelas wajib diisi.', true);
      return;
    }

    try {
      const res = await api.createStudent({
        nis: newNis.trim(),
        nisn: newNisn.trim() || undefined,
        fullName: newName.trim(),
        gender: newGender,
        classId: newClassId,
        barcodeRfidCode: newBarcode.trim() || `CARD-${newNis.trim()}`,
        parentPhone: newParentPhone.trim() || undefined,
      });

      if (res.success) {
        showToast(`Siswa "${newName}" berhasil ditambahkan ke database.`);
        setShowAddStudent(false);
        setNewNis('');
        setNewNisn('');
        setNewName('');
        setNewBarcode('');
        setNewParentPhone('');
        loadMasterData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan data siswa.', true);
    }
  };

  const handleEditStudentOpen = (student: any) => {
    setEditingStudent(student);
    setEditStudentName(student.fullName || '');
    setEditStudentNis(student.nis || '');
    setEditStudentNisn(student.nisn || '');
    setEditStudentGender(student.gender || 'L');
    setEditStudentClassId(student.classId || (masterData?.kelas?.[0]?.id || ''));
    setEditStudentBarcode(student.barcodeRfidCode || '');
    setEditStudentParentPhone(student.parentPhone || '');
    setEditStudentIsActive(student.isActive !== false);
  };

  const handleUpdateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editStudentName.trim() || !editStudentNis.trim() || !editStudentClassId) {
      showToast('Nama Lengkap, NIS, dan Kelas tidak boleh kosong.', true);
      return;
    }

    try {
      const res = await api.updateStudent(editingStudent.id, {
        fullName: editStudentName.trim(),
        nis: editStudentNis.trim(),
        nisn: editStudentNisn.trim(),
        gender: editStudentGender,
        classId: editStudentClassId,
        barcodeRfidCode: editStudentBarcode.trim(),
        parentPhone: editStudentParentPhone.trim(),
        isActive: editStudentIsActive,
      });

      if (res.success) {
        showToast(`Data siswa "${editStudentName}" berhasil diperbarui dan tersimpan di database.`);
        setEditingStudent(null);
        loadMasterData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui data siswa.', true);
    }
  };

  const handleDeleteStudentOpen = (student: any) => {
    setItemToDelete({
      type: 'siswa',
      id: student.id,
      name: student.fullName,
      description: `Siswa kelas ${student.className || '-'} dengan NIS ${student.nis}. Tindakan ini akan menghapus data siswa dari sistem.`,
    });
  };

  const filteredStudents = (masterData?.siswa || []).filter((s: any) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery) ||
    s.className?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const programs: SchoolProgram[] = masterData?.program || [];
  const classesList: SchoolClass[] = masterData?.kelas || [];
  const teachersList = masterData?.guru || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Pengelolaan Data Master Sekolah
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola Program Sekolah, Kelas, Siswa, Guru, dan Sesi Presensi Mandiri
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('kelas')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              activeTab === 'kelas' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Kelas & Sandi ({classesList.length})
          </button>
          <button
            onClick={() => setActiveTab('program')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              activeTab === 'program' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Program / Jurusan ({programs.length})
          </button>
          <button
            onClick={() => setActiveTab('siswa')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              activeTab === 'siswa' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Siswa ({masterData?.siswa?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('guru')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              activeTab === 'guru' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Guru & Wali ({teachersList.length})
          </button>
          <button
            onClick={() => setActiveTab('jadwal')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              activeTab === 'jadwal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Sesi Presensi ({masterData?.jadwalPresensi?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('peraturan')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              activeTab === 'peraturan' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Peraturan & Tata Tertib
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 transition ${feedback.isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {feedback.isError ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> : <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ===================== TAB KELAS ===================== */}
      {activeTab === 'kelas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                Daftar Kelas, Klasifikasi Program & Sandi Wali Kelas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin dapat menambah/menghapus kelas, mengklasifikasikan kelas ke dalam program, dan mengatur sandi akses wali kelas
              </p>
            </div>

            <button
              onClick={() => setShowAddClass(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classesList.map((c: any) => {
              const studentCount = (masterData?.siswa || []).filter((s: any) => s.classId === c.id).length;
              return (
                <div key={c.id} className="bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-2xl p-4.5 space-y-3 transition shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-lg font-bold text-slate-900 tracking-tight">Kelas {c.name}</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Tingkat: <span className="font-semibold text-slate-800">{c.grade}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                      {c.programName || 'Reguler'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Wali Kelas:</span>
                      <b className="text-slate-800">{c.waliKelasName || 'Belum Ditugaskan'}</b>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Sandi Kelas:</span>
                      <span className="font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-amber-800 font-semibold flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-600" />
                        {c.waliKelasPassword || 'wali123'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-100">
                      <span>Jumlah Siswa:</span>
                      <b className="text-emerald-700">{studentCount} anak</b>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/80">
                    <button
                      onClick={() => {
                        setEditingClass(c);
                        setEditClassName(c.name);
                        setEditClassGrade(c.grade);
                        setEditClassProgramId(c.programId || '');
                        setEditClassWaliId(c.waliKelasId || '');
                        setEditClassPassword(c.waliKelasPassword || 'wali123');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-indigo-700 text-xs font-medium border border-slate-200 flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Ubah / Sandi</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClass(c.id, c.name)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== TAB PROGRAM SEKOLAH ===================== */}
      {activeTab === 'program' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Klasifikasi Program Sekolah / Jurusan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola program belajar sekolah (misal: Reguler, Tahfidz, Peminatan Sains, Olahraga) untuk mengelompokkan kelas
              </p>
            </div>

            <button
              onClick={() => setShowAddProgram(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Program Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {programs.map((prog) => {
              const matchedClasses = classesList.filter((c) => c.programId === prog.id);
              return (
                <div key={prog.id} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {prog.code}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1.5">{prog.name}</h4>
                    </div>
                    {programs.length > 1 && (
                      <button
                        onClick={() => handleDeleteProgram(prog.id, prog.name)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                        title="Hapus Program"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                    {prog.description || 'Tidak ada deskripsi program.'}
                  </p>

                  <div className="pt-2 border-t border-slate-200 text-xs flex justify-between items-center text-slate-500">
                    <span>Kelas yang tergabung:</span>
                    <span className="font-semibold text-slate-800">
                      {matchedClasses.length > 0 ? matchedClasses.map((c) => c.name).join(', ') : 'Belum ada'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== TAB SISWA ===================== */}
      {activeTab === 'siswa' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa berdasarkan NIS atau Nama..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Impor Excel</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleImportStudentsExcel} className="hidden" />
              </label>

              <button
                onClick={handleExportStudentsExcel}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Siswa</span>
              </button>

              <button
                onClick={() => setShowAddStudent(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Siswa</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">NIS / NISN</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">L/P</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Kode Barcode / RFID</th>
                  <th className="py-2.5 px-3">No. HP Ortu</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada data siswa ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono">
                        <span className="text-slate-900 font-semibold">{s.nis}</span>
                        {s.nisn && <span className="block text-[10px] text-slate-400">{s.nisn}</span>}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{s.fullName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">{s.gender}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-indigo-700 font-medium">
                          {s.className}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {s.barcodeRfidCode ? (
                          <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-emerald-800 font-medium">
                            {s.barcodeRfidCode}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {s.parentPhone || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {s.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditStudentOpen(s)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition cursor-pointer text-[11px] font-medium shadow-2xs"
                            title="Edit Data Siswa & Kode Kartu"
                          >
                            <Edit className="w-3 h-3 text-indigo-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudentOpen(s)}
                            className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                            title="Hapus Siswa"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB GURU ===================== */}
      {activeTab === 'guru' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daftar Tenaga Pendidik & Wali Kelas</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daftar guru terdaftar yang dapat ditugaskan sebagai wali rombongan belajar</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">NIP</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">No. Telepon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachersList.map((g: any) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{g.fullName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{g.nip || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{g.email || '-'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{g.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB SESI PRESENSI ===================== */}
      {activeTab === 'jadwal' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Jadwal & Sesi Presensi Operasional
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin sekolah dapat menambah, mengedit jam presensi dimulai, batas hadir/terlambat, perpindahan sesi, dan jam selesai
              </p>
            </div>

            <button
              onClick={() => setShowAddSession(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sesi Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(masterData?.jadwalPresensi || []).map((j: any) => (
              <div key={j.id} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between font-bold text-base text-slate-900">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Sesi: {j.sessionName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                      Aktif
                    </span>
                    <button
                      onClick={() => handleOpenEditSession(j)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 text-xs font-medium flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      title="Ubah Pengaturan Jam Sesi"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit Jam</span>
                    </button>
                    {(masterData?.jadwalPresensi?.length || 0) > 1 && (
                      <button
                        onClick={() => handleDeleteSession(j.id, j.sessionName)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                        title="Hapus Sesi"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-700 space-y-2 pt-2.5 border-t border-slate-200">
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="text-slate-600">1. Jam Presensi Dimulai:</span>
                    <b className="font-mono text-indigo-700 font-bold">{j.entryStartTime} WIB</b>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="text-slate-600">2. Batas Tepat Waktu (Hadir):</span>
                    <b className="font-mono text-emerald-700 font-bold">{j.entryLimitTime} WIB</b>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="text-slate-600">3. Batas Terlambat (Sebelum Alpha):</span>
                    <b className="font-mono text-amber-700 font-bold">{j.lateLimitTime} WIB</b>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="text-slate-600">4. Jam Perpindahan Sesi:</span>
                    <b className="font-mono text-indigo-600 font-bold">{j.transitionTime || j.exitTime || '12:30'} WIB</b>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="text-slate-600">5. Jam Selesai / Pulang:</span>
                    <b className="font-mono text-slate-800 font-bold">{j.exitTime} WIB</b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TAB PERATURAN SEKOLAH TERISOLASI ===================== */}
      {activeTab === 'peraturan' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Peraturan & Tata Tertib Presensi Sekolah
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur kebijakan presensi, toleransi keterlambatan, dan batas izin kamar mandi.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Terisolasi Per-Tenant (Aman)</span>
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900">
            <strong>Keamanan Multi-Tenant:</strong> Setiap perubahan aturan di sini hanya tersimpan pada database sekolah ini. Sekolah lain atau akun Superadmin tidak akan terpengaruh.
          </div>

          <form onSubmit={handleSaveRules} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Jam & Toleransi Masuk
                </h4>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Toleransi Keterlambatan (Menit)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={rules.toleransiKeterlambatanMenit}
                    onChange={(e) => setRules({ ...rules, toleransiKeterlambatanMenit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Siswa masih berstatus Hadir jika datang dalam rentang ini.</p>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Jam Batas Masuk Normal
                  </label>
                  <input
                    type="time"
                    value={rules.jamMasukMaksimal}
                    onChange={(e) => setRules({ ...rules, jamMasukMaksimal: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Jam Selesai / Pulang Sekolah
                  </label>
                  <input
                    type="time"
                    value={rules.jamPulang}
                    onChange={(e) => setRules({ ...rules, jamPulang: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Batas Izin Kamar Mandi
                </h4>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Durasi Maksimal Izin (Menit)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={rules.izinKamarMandiMaksimalMenit}
                    onChange={(e) => setRules({ ...rules, izinKamarMandiMaksimalMenit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Siswa ditandai Overdue jika melampaui menit ini.</p>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Maksimal Siswa Izin Serentak Per Kelas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={rules.maksimalIzinSerentakPerKelas}
                    onChange={(e) => setRules({ ...rules, maksimalIzinSerentakPerKelas: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Maksimal Izin Per Siswa Dalam Sehari
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rules.maksimalIzinPerHari}
                    onChange={(e) => setRules({ ...rules, maksimalIzinPerHari: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  Sanksi & Prosedur Keterlambatan
                </h4>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Sanksi Bertahap Siswa Terlambat
                  </label>
                  <textarea
                    rows={4}
                    value={rules.sanksiKeterlambatan}
                    onChange={(e) => setRules({ ...rules, sanksiKeterlambatan: e.target.value })}
                    placeholder="Contoh: 1x terlambat teguran lisan..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Catatan Tata Tertib Presensi Sekolah
                  </label>
                  <textarea
                    rows={3}
                    value={rules.catatanPeraturan}
                    onChange={(e) => setRules({ ...rules, catatanPeraturan: e.target.value })}
                    placeholder="Catatan umum yang ditampilkan kepada guru dan wali kelas..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-slate-500 text-[11px]">
                {rules.updatedAt ? `Terakhir diperbarui: ${rules.updatedAt.slice(0, 16)}` : 'Peraturan aktif'}
              </span>
              <button
                type="submit"
                disabled={isSavingRules}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSavingRules ? 'Menyimpan...' : 'Simpan Peraturan Sekolah'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== MODAL TAMBAH KELAS ===================== */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Tambah Kelas Baru</h3>
            <form onSubmit={handleAddClassSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Rombongan Belajar (Kelas) *</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Contoh: VII-C atau X-MIPA-1"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Tingkat (Grade) *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Klasifikasi Program</label>
                  <select
                    value={newClassProgramId}
                    onChange={(e) => setNewClassProgramId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="">Reguler (Default)</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Guru Wali Kelas</label>
                <select
                  value={newClassWaliId}
                  onChange={(e) => setNewClassWaliId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {teachersList.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Kata Sandi Kelas (Untuk Login Wali Kelas) *
                </label>
                <input
                  type="text"
                  value={newClassPassword}
                  onChange={(e) => setNewClassPassword(e.target.value)}
                  placeholder="Contoh: wali123"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Sandi ini digunakan wali kelas saat mengakses menu rekap kelas yang bersangkutan.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddClass(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer shadow-xs"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL EDIT KELAS & ATUR SANDI ===================== */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Ubah Kelas & Sandi Wali Kelas</h3>
            <form onSubmit={handleUpdateClassSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Kelas *</label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Tingkat (Grade)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={editClassGrade}
                    onChange={(e) => setEditClassGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Klasifikasi Program</label>
                  <select
                    value={editClassProgramId}
                    onChange={(e) => setEditClassProgramId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="">Reguler (Default)</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Guru Wali Kelas</label>
                <select
                  value={editClassWaliId}
                  onChange={(e) => setEditClassWaliId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {teachersList.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Kata Sandi Wali Kelas (Baru/Tetap)
                </label>
                <input
                  type="text"
                  value={editClassPassword}
                  onChange={(e) => setEditClassPassword(e.target.value)}
                  placeholder="Masukkan sandi kelas..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer shadow-xs"
                >
                  Perbarui Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL TAMBAH PROGRAM ===================== */}
      {showAddProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Tambah Program Sekolah / Jurusan</h3>
            <form onSubmit={handleAddProgramSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Program *</label>
                <input
                  type="text"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  placeholder="Contoh: Peminatan Tahfidz Al-Qur'an"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Kode Singkatan Program *</label>
                <input
                  type="text"
                  value={newProgramCode}
                  onChange={(e) => setNewProgramCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: TFZ, MIPA, BHS"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono uppercase focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Deskripsi Program</label>
                <textarea
                  value={newProgramDesc}
                  onChange={(e) => setNewProgramDesc(e.target.value)}
                  placeholder="Keterangan kurikulum atau fokus pembelajaran..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddProgram(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer shadow-xs"
                >
                  Simpan Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL TAMBAH SESI PRESENSI ===================== */}
      {showAddSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Tambah Sesi Presensi Baru</h3>
            <p className="text-xs text-slate-500 mb-4">Atur waktu mulai presensi, batas waktu, dan jam perpindahan sesi</p>
            <form onSubmit={handleAddSessionSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Sesi Presensi *</label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Contoh: Sesi Pagi, Sesi Siang, Sesi Ekskul"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jam Presensi Dimulai *</label>
                  <input
                    type="time"
                    value={newSessionStart}
                    onChange={(e) => setNewSessionStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Waktu scanner dibuka</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batas Tepat Waktu (Hadir) *</label>
                  <input
                    type="time"
                    value={newSessionLimit}
                    onChange={(e) => setNewSessionLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Lewat jam ini = terlambat</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batas Terlambat</label>
                  <input
                    type="time"
                    value={newSessionLateLimit}
                    onChange={(e) => setNewSessionLateLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Lewat batas = alpha</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jam Perpindahan Sesi *</label>
                  <input
                    type="time"
                    value={newSessionTransition}
                    onChange={(e) => setNewSessionTransition(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Pergantian sesi harian</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Jam Selesai / Pulang</label>
                <input
                  type="time"
                  value={newSessionExit}
                  onChange={(e) => setNewSessionExit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddSession(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer shadow-xs"
                >
                  Simpan Sesi Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL EDIT SESI PRESENSI ===================== */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Edit Pengaturan Jam Sesi Presensi</h3>
            <p className="text-xs text-slate-500 mb-4">Ubah jam presensi dimulai, batas hadir, batas terlambat, dan perpindahan sesi</p>
            <form onSubmit={handleEditSessionSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Sesi Presensi *</label>
                <input
                  type="text"
                  value={editSessionName}
                  onChange={(e) => setEditSessionName(e.target.value)}
                  placeholder="Contoh: Sesi Pagi Reguler"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jam Presensi Dimulai *</label>
                  <input
                    type="time"
                    value={editSessionStart}
                    onChange={(e) => setEditSessionStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Jam buka scan masuk</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batas Tepat Waktu (Hadir) *</label>
                  <input
                    type="time"
                    value={editSessionLimit}
                    onChange={(e) => setEditSessionLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Batas status Hadir</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batas Terlambat</label>
                  <input
                    type="time"
                    value={editSessionLateLimit}
                    onChange={(e) => setEditSessionLateLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Lewat batas = Alpha</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jam Perpindahan Sesi *</label>
                  <input
                    type="time"
                    value={editSessionTransition}
                    onChange={(e) => setEditSessionTransition(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Pergantian sesi harian</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Jam Selesai / Pulang</label>
                <input
                  type="time"
                  value={editSessionExit}
                  onChange={(e) => setEditSessionExit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer shadow-xs"
                >
                  Perbarui Jadwal Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL TAMBAH SISWA ===================== */}
      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Tambah Data Siswa Baru
            </h3>
            <form onSubmit={handleAddStudentSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">NIS (Nomor Induk Siswa) *</label>
                  <input
                    type="text"
                    value={newNis}
                    onChange={(e) => setNewNis(e.target.value)}
                    placeholder="Contoh: 26011"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">NISN (Opsional)</label>
                  <input
                    type="text"
                    value={newNisn}
                    onChange={(e) => setNewNisn(e.target.value)}
                    placeholder="Contoh: 0081234011"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Muhammad Ilham"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Jenis Kelamin *</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Kelas *</label>
                  <select
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                    required
                  >
                    {classesList.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name} {c.programName ? `(${c.programName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-medium">Kode Kartu Barcode / RFID</label>
                  {newNis.trim() && (
                    <button
                      type="button"
                      onClick={() => setNewBarcode(`CARD-${newNis.trim()}`)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                    >
                      Gunakan Format CARD-{newNis.trim()}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  placeholder="Contoh: CARD-7A-06 atau nomor UID kartu RFID fisik"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">No. HP Orang Tua / Kontak Wali (Opsional)</label>
                <input
                  type="text"
                  value={newParentPhone}
                  onChange={(e) => setNewParentPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer transition shadow-xs"
                >
                  Simpan Siswa ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL EDIT DATA SISWA ===================== */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Data Siswa</h3>
                  <p className="text-[11px] text-slate-500">
                    Perbarui nama, kode kartu RFID/barcode, nomor induk, kelas, kontak, dan status siswa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-700 p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStudentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  placeholder="Contoh: Muhammad Ilham"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-medium focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">Kode Kartu Barcode / RFID Siswa</label>
                  {editStudentNis.trim() && (
                    <button
                      type="button"
                      onClick={() => setEditStudentBarcode(`CARD-${editStudentNis.trim()}`)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                    >
                      Format Auto (CARD-{editStudentNis.trim()})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={editStudentBarcode}
                  onChange={(e) => setEditStudentBarcode(e.target.value)}
                  placeholder="Contoh: CARD-7A-01 atau UID kartu RFID..."
                  className="w-full px-3 py-2 bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-lg text-emerald-700 font-mono tracking-wider focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Kode ini yang dipindai oleh scanner barcode USB, kartu RFID, atau kamera presensi.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">NIS (Nomor Induk Siswa) *</label>
                  <input
                    type="text"
                    value={editStudentNis}
                    onChange={(e) => setEditStudentNis(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">NISN (Opsional)</label>
                  <input
                    type="text"
                    value={editStudentNisn}
                    onChange={(e) => setEditStudentNisn(e.target.value)}
                    placeholder="Contoh: 0081234011"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Jenis Kelamin</label>
                  <select
                    value={editStudentGender}
                    onChange={(e) => setEditStudentGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Rombongan Belajar (Kelas) *</label>
                  <select
                    value={editStudentClassId}
                    onChange={(e) => setEditStudentClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
                    required
                  >
                    {classesList.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name} {c.programName ? `(${c.programName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">No. HP Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={editStudentParentPhone}
                    onChange={(e) => setEditStudentParentPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Status Keaktifan Siswa</label>
                  <select
                    value={editStudentIsActive ? 'true' : 'false'}
                    onChange={(e) => setEditStudentIsActive(e.target.value === 'true')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="true">Aktif Mengikuti Pembelajaran</option>
                    <option value="false">Nonaktif / Pindah / Lulus</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer transition shadow-xs"
                >
                  Simpan Perubahan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL KONFIRMASI HAPUS ===================== */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-rose-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Data</h3>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Tipe: {itemToDelete.type}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>"{itemToDelete.name}"</strong>?
            </p>

            {itemToDelete.description && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                {itemToDelete.description}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
