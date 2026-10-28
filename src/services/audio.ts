/**
 * Web Audio API Sound Feedback
 * Menghasilkan feedback audio (beep sukses, buzzer gagal, peringatan)
 * secara murni via browser Web Audio API tanpa membutuhkan file asset eksternal.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic dual tone for pleasant scanner beep
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, now);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.16);
    osc2.stop(now + 0.16);
  } catch (e) {
    console.warn('Audio chime notice:', e);
  }
}

export function playWarningChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(440, now + 0.1); // A4

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch (e) {
    console.warn('Audio chime notice:', e);
  }
}

export function playErrorBuzzer() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // Low buzz
    osc.frequency.setValueAtTime(164.81, now + 0.15);

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch (e) {
    console.warn('Audio chime notice:', e);
  }
}

/**
 * Text-to-Speech (TTS) Engine dengan dukungan bahasa Indonesia (id-ID)
 */

let cachedIndonesianVoice: SpeechSynthesisVoice | null = null;

function getIndonesianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (cachedIndonesianVoice) return cachedIndonesianVoice;

  const voices = window.speechSynthesis.getVoices();
  // Cari suara Bahasa Indonesia
  const idVoice = voices.find(
    (v) =>
      v.lang.toLowerCase() === 'id-id' ||
      v.lang.toLowerCase() === 'id_id' ||
      v.lang.toLowerCase().startsWith('id') ||
      v.name.toLowerCase().includes('indonesia')
  );

  if (idVoice) {
    cachedIndonesianVoice = idVoice;
    return idVoice;
  }

  // Fallback ke suara pertama yang tersedia
  return voices[0] || null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedIndonesianVoice = null;
    getIndonesianVoice();
  };
}

export interface SpeakOptions {
  rate?: number; // 0.8 - 1.2
  pitch?: number; // 0.9 - 1.1
  volume?: number; // 0 - 1
  lang?: string;
}

export function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
}

export function speakText(text: string, options: SpeakOptions = {}): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API tidak didukung pada browser ini.');
    return false;
  }

  try {
    // Hentikan suara yang sedang membaca sebelumnya agar tidak bertumpuk
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'id-ID';
    utterance.rate = options.rate ?? 1.05; // Sedikit lebih responsif
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    const voice = getIndonesianVoice();
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('TTS speech execution warning:', err);
    return false;
  }
}

export interface AttendanceVoicePayload {
  studentName?: string;
  className?: string;
  status: 'hadir' | 'terlambat' | 'pulang' | 'duplicate' | 'not_found' | 'error';
  message?: string;
}

/**
 * Membaca pengumuman status presensi siswa secara natural via TTS
 * dan memainkan efek suara scanner yang selaras
 */
export function speakAttendanceNotification(
  payload: AttendanceVoicePayload,
  config: { playChime?: boolean; ttsEnabled?: boolean } = { playChime: true, ttsEnabled: true }
): string {
  const { studentName, className, status, message } = payload;
  const playSound = config.playChime !== false;
  const useTts = config.ttsEnabled !== false;

  let spokenSentence = '';

  switch (status) {
    case 'hadir':
      if (playSound) playSuccessChime();
      spokenSentence = studentName ? `${studentName}, hadir.` : 'Hadir tepat waktu.';
      break;

    case 'terlambat':
      if (playSound) playWarningChime();
      spokenSentence = studentName ? `${studentName}, terlambat.` : 'Status terlambat.';
      break;

    case 'pulang':
      if (playSound) playSuccessChime();
      spokenSentence = studentName ? `${studentName}, presensi pulang.` : 'Presensi pulang.';
      break;

    case 'duplicate':
      if (playSound) playWarningChime();
      spokenSentence = studentName
        ? `${studentName}, sudah presensi sebelumnya.`
        : (message || 'Sudah presensi sebelumnya.');
      break;

    case 'not_found':
      if (playSound) playErrorBuzzer();
      spokenSentence = 'Kartu tidak terdaftar.';
      break;

    case 'error':
    default:
      if (playSound) playErrorBuzzer();
      spokenSentence = message || 'Presensi gagal diproses.';
      break;
  }

  if (useTts && spokenSentence) {
    speakText(spokenSentence);
  }

  return spokenSentence;
}
