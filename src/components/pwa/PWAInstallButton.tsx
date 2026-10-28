import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Check, Apple } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'prominent' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Jika sudah terpasang dan berjalan dalam mode standalone, sembunyikan tombol
  if (isInstalled) {
    return null;
  }

  // Tombol untuk Chromium, Android, Windows, Mac, Edge
  if (isInstallable) {
    if (variant === 'prominent') {
      return (
        <button
          onClick={install}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Pasang Aplikasi Presensi</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer shadow-2xs ${className}`}
        title="Pasang aplikasi di perangkat ini"
      >
        <Download className="w-3.5 h-3.5 text-indigo-600" />
        <span className="hidden sm:inline">Pasang Aplikasi</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  }

  // Alur khusus iOS Safari (iPhone / iPad) atau panduan pasang
  return (
    <>
      <button
        onClick={() => setShowIOSModal(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition cursor-pointer shadow-2xs ${className}`}
        title="Pasang aplikasi di iPhone, iPad, atau ponsel Anda"
      >
        {isIOS ? <Apple className="w-3.5 h-3.5 text-slate-800" /> : <Smartphone className="w-3.5 h-3.5 text-slate-700" />}
        <span className="hidden sm:inline">{isIOS ? 'Pasang di iOS' : 'Pasang Aplikasi'}</span>
        <span className="sm:hidden">{isIOS ? 'iOS App' : 'Install'}</span>
      </button>

      {/* Modal Panduan Pasang PWA di iOS & Mobile */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 text-slate-900 animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isIOS ? 'Pasang di iPhone / iPad' : 'Pasang di Layar Utama'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Akses cepat tanpa browser address bar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Langkah Pemasangan iOS Safari */}
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Ketuk Tombol Bagikan</span>
                    <Share className="w-3.5 h-3.5 text-indigo-600 inline" />
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Di peramban Safari (bawah layar iPhone atau atas layar iPad), ketuk ikon <strong>Bagikan (Share)</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Pilih "Tambah ke Layar Utama"</span>
                    <PlusSquare className="w-3.5 h-3.5 text-indigo-600 inline" />
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Gulir ke bawah pada menu opsi lalu ketuk menu <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Ketuk "Tambah" (Add)</span>
                    <Check className="w-3.5 h-3.5 text-emerald-600 inline font-bold" />
                  </div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Ketuk tombol <strong>Tambah (Add)</strong> di sudut kanan atas. Ikon aplikasi Presensi akan langsung muncul di layar utama iOS Anda layaknya aplikasi asli App Store.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
