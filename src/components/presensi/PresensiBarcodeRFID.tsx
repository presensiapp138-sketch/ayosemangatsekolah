import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScanLine,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  History,
  Clock,
  Sparkles,
  RefreshCw,
  UserCheck,
  Mic,
  RotateCcw,
  Check,
  Info,
  Radio,
  Lock,
  Unlock,
  Zap,
  MousePointer,
  Crosshair,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  speakAttendanceNotification,
  speakText,
  stopSpeech,
  playSuccessChime,
  playErrorBuzzer,
  playWarningChime,
} from '../../services/audio';

export interface ScanResultRecord {
  status: 'hadir' | 'terlambat' | 'duplicate' | 'error';
  studentName?: string;
  className?: string;
  attendanceStatus?: string;
  cardCode?: string;
  message: string;
  spokenText?: string;
  timestamp: string;
}

export const PresensiBarcodeRFID: React.FC = () => {
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const [lastScanResult, setLastScanResult] = useState<ScanResultRecord | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResultRecord[]>([]);
  const [isSpeakingNow, setIsSpeakingNow] = useState(false);

  // Kursor Otomatis (Autofocus Lock) & Kecepatan Baca
  const [autoFocusLocked, setAutoFocusLocked] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(true);
  const [instantScanNotice, setInstantScanNotice] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const lastScanTimestampRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');

  // Sesi Presensi Aktif Otomatis Real-Time (Pergantian Otomatis Tiap 10 Detik)
  const [sessionInfo, setSessionInfo] = useState<{
    activeSession: any | null;
    nextSession: any | null;
    serverTime: string;
    serverDate: string;
    dayName: string;
    status: 'active' | 'outside_schedule' | 'break' | 'holiday';
    message: string;
  } | null>(null);

  const fetchCurrentSession = useCallback(async () => {
    try {
      const res = await api.getCurrentSession();
      if (res && res.success) {
        setSessionInfo(res);
      }
    } catch (e) {
      console.warn('Gagal memuat status sesi presensi aktif:', e);
    }
  }, []);

  useEffect(() => {
    fetchCurrentSession();
    const interval = setInterval(fetchCurrentSession, 10000);
    return () => clearInterval(interval);
  }, [fetchCurrentSession]);

  // Keep isProcessingRef in sync
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Fungsi pemasti fokus kursor selalu aktif pada input scanner
  const ensureInputFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      setIsInputFocused(true);
    }
  }, []);

  // Popup Modal Pemberitahuan Presensi Scan/RFID (Muncul & Tutup Otomatis)
  const AUTO_CLOSE_DURATION_MS = 3200; // Menutup otomatis dalam 3.2 detik tanpa klik tombol
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [remainingTimeMs, setRemainingTimeMs] = useState(AUTO_CLOSE_DURATION_MS);
  const autoCloseTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  const clearAutoCloseTimers = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const closeNotificationModal = useCallback(() => {
    clearAutoCloseTimers();
    setShowNotificationModal(false);
    requestAnimationFrame(() => ensureInputFocus());
  }, [clearAutoCloseTimers, ensureInputFocus]);

  const openNotificationModal = useCallback((result: ScanResultRecord) => {
    clearAutoCloseTimers();
    setLastScanResult(result);
    setRemainingTimeMs(AUTO_CLOSE_DURATION_MS);
    setShowNotificationModal(true);

    const startTime = Date.now();
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, AUTO_CLOSE_DURATION_MS - elapsed);
      setRemainingTimeMs(left);
      if (left <= 0 && countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 60);

    // Kotak menutup otomatis tanpa perlu menekan tombol apapun
    autoCloseTimerRef.current = setTimeout(() => {
      closeNotificationModal();
    }, AUTO_CLOSE_DURATION_MS);

    requestAnimationFrame(() => ensureInputFocus());
  }, [clearAutoCloseTimers, closeNotificationModal, ensureInputFocus]);

  useEffect(() => {
    return () => {
      clearAutoCloseTimers();
    };
  }, [clearAutoCloseTimers]);

  // Sinkronisasi Multi-Device Real-Time (polling riwayat presensi tiap 3 detik)
  const loadRecentAttendance = useCallback(async () => {
    try {
      const res = await api.getPresensi();
      if (res.success && res.records) {
        const recent: ScanResultRecord[] = res.records
          .slice(-25)
          .reverse()
          .map((r: any) => ({
            status: (r.status === 'terlambat' ? 'terlambat' : 'hadir') as any,
            studentName: r.studentName,
            className: r.className,
            attendanceStatus: r.status,
            cardCode: r.notes?.replace('Pemindaian instan RFID/Barcode: ', '') || '-',
            message: `Presensi ${r.status.toUpperCase()} (${r.method || 'rfid'})`,
            timestamp: r.recordedAt
              ? new Date(r.recordedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
              : '-',
          }));
        setScanHistory(recent);
      }
    } catch (e) {
      // silent catch for background polling
    }
  }, []);

  useEffect(() => {
    loadRecentAttendance();
    const syncInterval = setInterval(loadRecentAttendance, 3000);
    return () => clearInterval(syncInterval);
  }, [loadRecentAttendance]);

  // 1. Inisialisasi awal & Keep-Alive Focus Guardian
  // Menjaga kursor tetap aktif di input RFID bahkan jika user tidak sengaja mengklik area kosong
  useEffect(() => {
    ensureInputFocus();
    const t1 = setTimeout(ensureInputFocus, 80);
    const t2 = setTimeout(ensureInputFocus, 300);

    const keepAliveInterval = setInterval(() => {
      if (autoFocusLocked && !isProcessingRef.current) {
        const active = document.activeElement;
        const isOtherInteractive = active && (
          (active.tagName === 'INPUT' && active !== inputRef.current) ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT'
        );
        if (!isOtherInteractive && active !== inputRef.current) {
          ensureInputFocus();
        }
      }
    }, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(keepAliveInterval);
    };
  }, [autoFocusLocked, ensureInputFocus]);

  // 2. Global Document Click Guardian: jika user mengklik latar/kartu/tabel kosong, kursor otomatis kembali
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!autoFocusLocked) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Cek apakah yang diklik adalah tombol atau input lain yang disengaja
      const isInteractive = target.closest('button, a, select, textarea, input:not([data-scanner-input="true"]), [role="button"], [role="dialog"], label');
      if (!isInteractive) {
        requestAnimationFrame(() => {
          ensureInputFocus();
        });
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [autoFocusLocked, ensureInputFocus]);

  // 3. Window Re-Focus Event: saat user berpindah tab atau aplikasi kembali ke browser
  useEffect(() => {
    const handleWindowFocus = () => {
      if (autoFocusLocked) {
        ensureInputFocus();
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [autoFocusLocked, ensureInputFocus]);

  // 4. Global Keystroke Interceptor untuk Hardware Wedge RFID / Barcode Scanner:
  // Jika pembaca RFID mengetik kode saat kursor sempat terlepas, segera tangkap & teruskan ke input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isOtherInput = active && (
        (active.tagName === 'INPUT' && active !== inputRef.current) ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT'
      );
      if (isOtherInput) return;

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Jika tombol Escape ditekan, tutup modal notifikasi jika sedang tampil
      if (e.key === 'Escape') {
        if (showNotificationModal) {
          e.preventDefault();
          closeNotificationModal();
          return;
        }
      }

      // Jika tombol Enter ditekan
      if (e.key === 'Enter') {
        const currentCode = (inputRef.current?.value || manualCodeInput).trim();
        if (currentCode) {
          e.preventDefault();
          triggerImmediateFastScan(currentCode);
        } else {
          ensureInputFocus();
        }
        return;
      }

      // Jika tombol karakter tunggal ditekan dari hardware scanner saat belum fokus:
      if (e.key.length === 1 && active !== inputRef.current) {
        ensureInputFocus();
        setManualCodeInput((prev) => prev + e.key);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [manualCodeInput, ensureInputFocus, showNotificationModal, closeNotificationModal]);

  // Eksekusi pemindaian instan dengan latensi 0ms
  const triggerImmediateFastScan = (codeToScan: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmed = codeToScan.trim();
    if (!trimmed || isProcessingRef.current) return;

    // Filter duplikasi instan jika kartu yang persis sama ditempelkan berulang kali dalam 1.2 detik
    const now = Date.now();
    if (trimmed === lastScannedCodeRef.current && now - lastScanTimestampRef.current < 1200) {
      setManualCodeInput('');
      return;
    }

    lastScanTimestampRef.current = now;
    lastScannedCodeRef.current = trimmed;

    // Bersihkan kotak input seketika agar langsung siap untuk siswa berikutnya
    setManualCodeInput('');

    // Tampilkan sinyal cepat
    setInstantScanNotice(`⚡ Memproses: ${trimmed}`);
    setTimeout(() => setInstantScanNotice(null), 1500);

    // Proses presensi seketika (0ms delay)
    processCardScan(trimmed);
  };

  // Fallback debounce super cepat (75ms) untuk barcode scanner tipe lama yang tidak mengirim tombol Enter
  useEffect(() => {
    const trimmed = manualCodeInput.trim();
    if (!trimmed || isProcessing) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Hanya 75ms delay (jauh lebih cepat dari sebelumnya 380ms)
    debounceTimerRef.current = setTimeout(() => {
      if (trimmed.length >= 4 && !isProcessingRef.current) {
        triggerImmediateFastScan(trimmed);
      }
    }, 75);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [manualCodeInput, isProcessing]);



  const processCardScan = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || isProcessingRef.current) return;

    setIsProcessing(true);
    isProcessingRef.current = true;
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      const res = await api.recordPresensi({
        code: trimmed,
        method: 'rfid',
        sessionId: sessionInfo?.activeSession?.id || 'auto',
        notes: `Pemindaian instan RFID/Barcode: ${trimmed}`,
      });

      if (res.success) {
        const studentName = res.studentName || res.record?.studentName || 'Siswa';
        const className = res.className || res.record?.className || '';
        const statusType = (res.record?.status === 'terlambat' || res.status === 'terlambat') ? 'terlambat' : 'hadir';

        // Suarakan notifikasi TTS & putar chime seketika
        const spoken = speakAttendanceNotification(
          {
            studentName,
            className,
            status: statusType,
          },
          { playChime: soundEnabled, ttsEnabled }
        );

        const newResult: ScanResultRecord = {
          status: statusType,
          studentName,
          className,
          attendanceStatus: statusType,
          cardCode: trimmed,
          message: res.message || `Presensi berhasil dicatat (${statusType.toUpperCase()})`,
          spokenText: spoken,
          timestamp: `${nowTimeStr} WIB`,
        };

        openNotificationModal(newResult);
        setScanHistory((prev) => [newResult, ...prev.slice(0, 24)]);
        triggerSpeakingAnimation();
      }
    } catch (err: any) {
      const isDuplicate = err.message?.includes('sudah melakukan presensi') || err.data?.alreadyRecorded;

      if (isDuplicate) {
        const studentName = err.data?.studentName || 'Siswa';
        const className = err.data?.className || '';
        const recordedStatus = err.data?.status || 'HADIR';

        const spoken = speakAttendanceNotification(
          {
            studentName,
            className,
            status: 'duplicate',
            message: err.message,
          },
          { playChime: soundEnabled, ttsEnabled }
        );

        const newResult: ScanResultRecord = {
          status: 'duplicate',
          studentName,
          className,
          attendanceStatus: recordedStatus,
          cardCode: trimmed,
          message: err.message || `${studentName} sudah tercatat presensi sebelumnya.`,
          spokenText: spoken,
          timestamp: `${nowTimeStr} WIB`,
        };

        openNotificationModal(newResult);
        setScanHistory((prev) => [newResult, ...prev.slice(0, 24)]);
        triggerSpeakingAnimation();
      } else {
        const isNotFound = err.message?.includes('tidak ditemukan') || err.message?.includes('tidak terdaftar');
        const spoken = speakAttendanceNotification(
          {
            status: isNotFound ? 'not_found' : 'error',
            message: err.message || 'Kartu barcode/RFID tidak terdaftar dalam sistem.',
          },
          { playChime: soundEnabled, ttsEnabled }
        );

        const newResult: ScanResultRecord = {
          status: 'error',
          cardCode: trimmed,
          message: err.message || 'Kartu tidak terdaftar atau gagal memproses presensi.',
          spokenText: spoken,
          timestamp: `${nowTimeStr} WIB`,
        };

        openNotificationModal(newResult);
        setScanHistory((prev) => [newResult, ...prev.slice(0, 24)]);
        triggerSpeakingAnimation();
      }
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      setManualCodeInput('');
      // Kursor langsung otomatis fokus kembali ke input seketika
      requestAnimationFrame(() => {
        ensureInputFocus();
      });
    }
  };

  const triggerSpeakingAnimation = () => {
    setIsSpeakingNow(true);
    setTimeout(() => setIsSpeakingNow(false), 3500);
  };

  const handleReplayTTS = () => {
    if (!lastScanResult) return;
    if (lastScanResult.spokenText) {
      speakText(lastScanResult.spokenText);
      triggerSpeakingAnimation();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCodeInput.trim()) {
      triggerImmediateFastScan(manualCodeInput);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <ScanLine className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Pemindai Barcode / RFID Otomatis
                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 font-bold tracking-wide uppercase">
                  Auto-Detect ON
                </span>
              </h2>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                Presensi berjalan otomatis tanpa tombol submit, kotak notifikasi interaktif, dan pembaca suara Text-to-Speech (TTS) langsung nama & status.
              </p>
            </div>
          </div>
        </div>

        {/* Audio & Video Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* TTS Voice Toggle */}
          <button
            type="button"
            onClick={() => {
              if (ttsEnabled) stopSpeech();
              setTtsEnabled(!ttsEnabled);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
              ttsEnabled
                ? 'bg-indigo-50 text-indigo-900 border-indigo-300 shadow-xs'
                : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}
            title="Aktifkan/Nonaktifkan Text-to-Speech Bahasa Indonesia"
          >
            <Mic className={`w-3.5 h-3.5 ${ttsEnabled ? 'text-indigo-700 animate-pulse' : 'text-slate-600'}`} />
            <span>TTS: {ttsEnabled ? 'Aktif (id-ID)' : 'Mati'}</span>
          </button>

          {/* Sound Beep Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}
            title="Efek Suara Beep / Nada Scanner"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-700" /> : <VolumeX className="w-3.5 h-3.5 text-slate-600" />}
            <span>Beep: {soundEnabled ? 'Aktif' : 'Mati'}</span>
          </button>
        </div>
      </div>

      {/* Live Session Status Banner (Pergantian Sesi Presensi Otomatis) */}
      <div className="w-full">
        {sessionInfo?.status === 'active' && sessionInfo.activeSession ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-300 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
              </span>
              <div>
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  Sesi Aktif: {sessionInfo.activeSession.sessionName}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold ml-1">
                    {sessionInfo.activeSession.entryStartTime} - {sessionInfo.activeSession.exitTime || sessionInfo.activeSession.transitionTime || sessionInfo.activeSession.lateLimitTime} WIB
                  </span>
                </span>
                <span className="text-[11px] text-emerald-800 block mt-0.5">
                  Batas Hadir Tepat Waktu: <strong className="font-bold">{sessionInfo.activeSession.entryLimitTime} WIB</strong> (Lewat jam ini otomatis terlambat)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-900 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Server: {sessionInfo.serverTime || 'WIB'}</span>
            </div>
          </div>
        ) : sessionInfo?.status === 'break' ? (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl shadow-xs flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span><strong>Waktu Istirahat Sekolah:</strong> {sessionInfo.message}</span>
            </div>
            <span className="text-[11px] text-amber-700 font-mono">Server: {sessionInfo.serverTime}</span>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-800">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Di Luar Jadwal Presensi Normal</span>
                <span className="text-[11px] text-slate-600">{sessionInfo?.message || 'Menunggu jadwal sesi berikutnya dimulai...'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
              <span>{sessionInfo?.dayName || 'Hari Ini'}, {sessionInfo?.serverTime || 'WIB'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Area Pemindaian Barcode & RFID */}
      <div className="space-y-6">
        {/* Kontainer Pemindai Hardware & Kamera */}
        <div className="w-full space-y-5">
          <div className={`bg-white rounded-2xl border-2 transition-all duration-300 p-5 shadow-xs ${
            isInputFocused
              ? 'border-emerald-500 shadow-emerald-100 ring-2 ring-emerald-500/20'
              : 'border-slate-200'
          }`}>
            {/* Header Scanner & Auto-Focus Pill Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Input Pembaca RFID / Barcode Scanner
                </span>
              </div>

              {/* Status Kursor Terkunci Otomatis */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoFocusLocked;
                    setAutoFocusLocked(next);
                    if (next) ensureInputFocus();
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                    autoFocusLocked
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  }`}
                  title="Klik untuk mengubah mode kunci kursor otomatis"
                >
                  {autoFocusLocked ? (
                    <>
                      <Lock className="w-3 h-3 text-emerald-600" />
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                        Kursor Terkunci (Auto)
                      </span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-amber-600" />
                      <span>Kunci Lepas</span>
                    </>
                  )}
                </button>

                {/* Tombol Cepat Fokuskan Manual jika kursor lepas */}
                {!isInputFocused && (
                  <button
                    type="button"
                    onClick={ensureInputFocus}
                    className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Fokuskan</span>
                  </button>
                )}
              </div>
            </div>

            {/* Banner Indikator Fokus Kursor */}
            <div className={`mb-3 px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
              isInputFocused
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800 animate-pulse'
            }`}>
              <div className="flex items-center gap-2">
                {isInputFocused ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                    </span>
                    <span className="font-medium text-[11px]">
                      Kursor Aktif & Siap Menerima Tap Kartu RFID / Barcode
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-medium text-[11px]">
                      Kursor sedang tidak aktif. Mengembalikan fokus otomatis...
                    </span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded text-slate-800 border border-slate-300 font-bold">
                0ms Latensi Enter
              </span>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="relative">
                <input
                  ref={inputRef}
                  data-scanner-input="true"
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => {
                    setIsInputFocused(false);
                    if (autoFocusLocked) {
                      setTimeout(ensureInputFocus, 40);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const currentVal = manualCodeInput.trim();
                      if (currentVal) {
                        triggerImmediateFastScan(currentVal);
                      }
                    }
                  }}
                  placeholder="Tempelkan kartu RFID atau sorot barcode..."
                  disabled={isProcessing}
                  className={`w-full pl-4 pr-32 py-3.5 bg-slate-50 rounded-xl text-base text-slate-900 placeholder-slate-500 font-mono tracking-wider transition shadow-xs ${
                    isInputFocused
                      ? 'border-2 border-emerald-500 bg-white ring-2 ring-emerald-500/20'
                      : 'border-2 border-slate-300'
                  }`}
                  autoFocus
                />
                <div className="absolute right-2 top-2 bottom-2 flex items-center pr-2">
                  {isProcessing ? (
                    <span className="text-xs text-indigo-950 flex items-center gap-1.5 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-300">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-700" />
                      Memproses...
                    </span>
                  ) : instantScanNotice ? (
                    <span className="text-[11px] text-amber-950 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 animate-pulse">
                      {instantScanNotice}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-950 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-700" />
                      Auto 0ms
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Kursor otomatis terkunci di kolom ini. Pembacaan instan tanpa klik tombol.
                </span>
                <span className="font-mono text-slate-700 font-bold">USB HID Wedge / RFID Reader</span>
              </div>
            </form>

            {/* Quick Demo Simulator Buttons */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-800 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Simulasi Uji Cepat Kartu Siswa:
                </span>
                <span className="text-xs text-slate-900 font-extrabold">Klik kartu untuk tes memunculkan kotak notifikasi</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => triggerImmediateFastScan('2735219638')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-300 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  2735219638 (Faiz - Kartu Fisik)
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => triggerImmediateFastScan('CARD-7A-01')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  CARD-7A-01 (Faiz)
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => triggerImmediateFastScan('CARD-7A-04')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  CARD-7A-04 (Cantika)
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => triggerImmediateFastScan('CARD-7B-01')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  CARD-7B-01 (Elisa)
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => triggerImmediateFastScan('UNKNOWN-CARD-99')}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  Kartu Tak Terdaftar
                </button>
              </div>
            </div>
          </div>



          {/* Riwayat Sesi Pemindaian */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-600" />
                Riwayat Sesi Scan ({scanHistory.length})
              </h3>
              {scanHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScanHistory([])}
                  className="text-xs text-slate-700 hover:text-slate-950 font-bold cursor-pointer underline"
                >
                  Bersihkan
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {scanHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-600 text-xs font-semibold">
                  Belum ada rekaman scan pada sesi pemindai saat ini.
                </div>
              ) : (
                scanHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                      item.status === 'hadir'
                        ? 'bg-emerald-50/80 border-emerald-300 text-slate-900'
                        : item.status === 'terlambat'
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                        : item.status === 'duplicate'
                        ? 'bg-sky-50/80 border-sky-300 text-sky-950'
                        : 'bg-rose-50/80 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          item.status === 'hadir'
                            ? 'bg-emerald-200 text-emerald-950 border border-emerald-400'
                            : item.status === 'terlambat'
                            ? 'bg-amber-200 text-amber-950 border border-amber-400'
                            : item.status === 'duplicate'
                            ? 'bg-sky-200 text-sky-950 border border-sky-400'
                            : 'bg-rose-200 text-rose-950 border border-rose-400'
                        }`}
                      >
                        {item.studentName ? item.studentName.charAt(0) : '!'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-950">
                          {item.studentName || item.message.slice(0, 32)}
                        </div>
                        <div className="text-[10px] text-slate-700 font-semibold">
                          {item.className ? `Kelas ${item.className} • ${item.attendanceStatus?.toUpperCase()}` : item.cardCode}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-800 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300">{item.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Baris Ringkas: Status Pemindaian Terakhir (Hanya tampil jika sudah ada scan) */}
        {lastScanResult && (
          <div className="p-4 rounded-2xl bg-white border border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                lastScanResult.status === 'hadir'
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                  : lastScanResult.status === 'terlambat'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                  : lastScanResult.status === 'duplicate'
                  ? 'bg-sky-100 text-sky-950 border border-sky-300'
                  : 'bg-rose-100 text-rose-950 border border-rose-300'
              }`}>
                {lastScanResult.studentName ? lastScanResult.studentName.charAt(0) : '!'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-600">Scan Terakhir:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                    lastScanResult.status === 'hadir'
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                      : lastScanResult.status === 'terlambat'
                      ? 'bg-amber-100 text-amber-950 border border-amber-300'
                      : lastScanResult.status === 'duplicate'
                      ? 'bg-sky-100 text-sky-950 border border-sky-300'
                      : 'bg-rose-100 text-rose-950 border border-rose-300'
                  }`}>
                    {lastScanResult.status === 'hadir' ? 'HADIR' : lastScanResult.status === 'terlambat' ? 'TERLAMBAT' : lastScanResult.status === 'duplicate' ? 'DUPLIKAT' : 'TAK TERDAFTAR'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">{lastScanResult.timestamp}</span>
                </div>
                <div className="text-sm font-black text-slate-950 mt-0.5">
                  {lastScanResult.studentName || lastScanResult.cardCode} {lastScanResult.className && `(Kelas ${lastScanResult.className})`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowNotificationModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-indigo-600" />
                <span>Buka Kotak Notifikasi</span>
              </button>
              <button
                type="button"
                onClick={handleReplayTTS}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Putar ulang suara TTS"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-700" />
                <span>Ulang Suara</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* POPUP MODAL PEMBERITAHUAN PRESENSI SCAN/RFID (MUNCUL OTOMATIS SAAT SCAN) */}
      {showNotificationModal && lastScanResult && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeNotificationModal();
          }}
        >
          <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl w-full max-w-lg p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Hasil Pemindaian Kartu Presensi
                </span>
              </div>
              <button
                type="button"
                onClick={closeNotificationModal}
                className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner Status Presensi */}
            {lastScanResult.status === 'hadir' ? (
              <div className="p-4 rounded-2xl bg-emerald-600 text-white flex items-center justify-between gap-3 shadow-md mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-100">Status Presensi</span>
                    <h3 className="text-xl font-black text-white tracking-wide">HADIR TEPAT WAKTU</h3>
                  </div>
                </div>
                <span className="text-xs font-mono bg-white text-emerald-950 px-3 py-1.5 rounded-xl font-black shadow-xs">
                  {lastScanResult.timestamp}
                </span>
              </div>
            ) : lastScanResult.status === 'terlambat' ? (
              <div className="p-4 rounded-2xl bg-amber-500 text-white flex items-center justify-between gap-3 shadow-md mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-amber-100">Status Presensi</span>
                    <h3 className="text-xl font-black text-white tracking-wide">TERLAMBAT</h3>
                  </div>
                </div>
                <span className="text-xs font-mono bg-white text-amber-950 px-3 py-1.5 rounded-xl font-black shadow-xs">
                  {lastScanResult.timestamp}
                </span>
              </div>
            ) : lastScanResult.status === 'duplicate' ? (
              <div className="p-4 rounded-2xl bg-sky-600 text-white flex items-center justify-between gap-3 shadow-md mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-sky-100">Peringatan Presensi</span>
                    <h3 className="text-xl font-black text-white tracking-wide">SUDAH MELAKUKAN PRESENSI</h3>
                  </div>
                </div>
                <span className="text-xs font-mono bg-white text-sky-950 px-3 py-1.5 rounded-xl font-black shadow-xs">
                  {lastScanResult.timestamp}
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-600 text-white flex items-center justify-between gap-3 shadow-md mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-rose-100">Gagal / Ditolak</span>
                    <h3 className="text-xl font-black text-white tracking-wide">KARTU TAK TERDAFTAR</h3>
                  </div>
                </div>
                <span className="text-xs font-mono bg-white text-rose-950 px-3 py-1.5 rounded-xl font-black shadow-xs">
                  {lastScanResult.timestamp}
                </span>
              </div>
            )}

            {/* Profil Siswa / Detail Kartu */}
            {lastScanResult.studentName ? (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-xs shrink-0">
                  {lastScanResult.studentName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-950 bg-indigo-100 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      Kelas {lastScanResult.className || '-'}
                    </span>
                    {lastScanResult.cardCode && (
                      <span className="text-[11px] font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-300">
                        {lastScanResult.cardCode}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-950 mt-1 truncate">
                    {lastScanResult.studentName}
                  </h2>
                  <p className="text-xs text-slate-700 font-semibold mt-0.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {lastScanResult.status === 'hadir'
                      ? 'Presensi otomatis berhasil diverifikasi ke database'
                      : lastScanResult.status === 'terlambat'
                      ? 'Melewati batas masuk tepat waktu'
                      : lastScanResult.message}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 mb-4">
                <div className="text-xs text-slate-700 font-bold uppercase">Informasi Kartu / Barcode:</div>
                <div className="text-sm font-mono text-rose-800 font-bold bg-white p-3 rounded-xl border border-rose-300 shadow-xs">
                  Kode: {lastScanResult.cardCode || 'Tidak Terbaca'}
                </div>
                <p className="text-xs text-rose-800 leading-relaxed font-bold">
                  {lastScanResult.message}
                </p>
              </div>
            )}

            {/* Kotak TTS Notifikasi Suara */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg bg-indigo-100 text-indigo-800 ${isSpeakingNow ? 'animate-bounce' : ''}`}>
                  <Volume2 className="w-4 h-4 text-indigo-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-600 uppercase font-bold flex items-center gap-1">
                    <span>Suara Text-to-Speech:</span>
                    {isSpeakingNow && <span className="text-indigo-700 font-bold animate-pulse">• Sedang Membaca</span>}
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate italic">
                    "{lastScanResult.spokenText || `${lastScanResult.studentName || 'Siswa'}, ${lastScanResult.status}.`}"
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReplayTTS}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-xs"
                title="Ulangi pembacaan suara"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ulang</span>
              </button>
            </div>

            {/* Siap Scan Siswa Berikutnya Langsung & Auto-Close Bar */}
            <div className="space-y-2.5 pt-2">
              {/* Progress Bar Penutupan Otomatis */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1.5 text-indigo-700 font-bold">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Menutup otomatis dalam {(remainingTimeMs / 1000).toFixed(1)} dtk...</span>
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                    Auto-Close ON
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      lastScanResult.status === 'hadir'
                        ? 'bg-emerald-500'
                        : lastScanResult.status === 'terlambat'
                        ? 'bg-amber-500'
                        : lastScanResult.status === 'duplicate'
                        ? 'bg-sky-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${(remainingTimeMs / AUTO_CLOSE_DURATION_MS) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-900 px-3.5 py-2.5 rounded-xl border border-emerald-300 font-bold">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                  </span>
                  <span>Siap Tap Kartu Berikutnya Seketika</span>
                </span>
                <span className="font-mono text-emerald-950 font-black text-[11px] bg-emerald-200/70 px-2 py-0.5 rounded-md">
                  Kursor Otomatis Aktif
                </span>
              </div>

              <button
                type="button"
                onClick={closeNotificationModal}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Tutup Sekarang (Opsional / Esc)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
