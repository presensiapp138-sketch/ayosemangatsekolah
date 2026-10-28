/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { api, clearSessionToken, getSessionToken } from './services/api';
import { TenantSchool, InternalUser, GlobalSuperadminRules } from './types';
import { LoginSekolah } from './components/auth/LoginSekolah';
import { SuperAdminModal } from './components/superadmin/SuperAdminModal';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { PresensiManual } from './components/presensi/PresensiManual';
import { PresensiBarcodeRFID } from './components/presensi/PresensiBarcodeRFID';
import { IzinKamarMandi } from './components/izinkamarmandi/IzinKamarMandi';
import { WaliKelasView } from './components/walikelas/WaliKelasView';
import { KesiswaanView } from './components/kesiswaan/KesiswaanView';
import { MasterData } from './components/admin/MasterData';
import { DatabaseSettings } from './components/admin/DatabaseSettings';
import { UserManagement } from './components/admin/UserManagement';
import { BackupRestore } from './components/admin/BackupRestore';
import { AuditLogView } from './components/admin/AuditLogView';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

export default function App() {
  const [tenant, setTenant] = useState<TenantSchool | null>(null);
  const [currentUser, setCurrentUser] = useState<InternalUser | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState<string>('');
  const [dismissedNotice, setDismissedNotice] = useState<string>('');
  const [globalRules, setGlobalRules] = useState<GlobalSuperadminRules | null>(null);

  useEffect(() => {
    checkActiveSession();

    // Multi-device real-time sync: sinkronisasi berkala (tiap 10-15 detik) dan saat tab difokuskan
    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && getSessionToken()) {
        checkActiveSession(true);
      }
    }, 12000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && getSessionToken()) {
        checkActiveSession(true);
      }
    };

    const handleOnline = () => {
      if (getSessionToken()) {
        checkActiveSession(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const checkActiveSession = async (isBackgroundSync = false) => {
    const token = getSessionToken();
    if (!token) {
      if (!isBackgroundSync) setIsLoadingSession(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.tenant) {
        setTenant(res.tenant);
        setAvailableUsers(res.availableInternalUsers || []);
        if (res.broadcastNotice !== undefined) {
          setBroadcastNotice(res.broadcastNotice || '');
        }
        if (res.globalRules) {
          setGlobalRules(res.globalRules);
        }
        if (res.user) {
          setCurrentUser(res.user);
        } else if (res.availableInternalUsers?.length > 0) {
          // Default ke admin
          setCurrentUser(res.availableInternalUsers[0]);
        }
      } else {
        clearSessionToken();
        setTenant(null);
        setCurrentUser(null);
      }
    } catch (e: any) {
      const errMsg = e.message || '';
      // Jika sekolah dinonaktifkan atau dihapus oleh Superadmin, akhiri sesi otomatis seketika
      if (
        e.status === 403 ||
        e.status === 401 ||
        errMsg.toLowerCase().includes('dinonaktifkan') ||
        errMsg.toLowerCase().includes('dihapus') ||
        errMsg.toLowerCase().includes('tidak terdaftar')
      ) {
        clearSessionToken();
        setTenant(null);
        setCurrentUser(null);
        if (errMsg) {
          alert(`Sesi berakhir: ${errMsg}`);
        }
        return;
      }

      console.warn('Session verification notice:', e);
      if (!isBackgroundSync && navigator.onLine) {
        clearSessionToken();
        setTenant(null);
        setCurrentUser(null);
      }
    } finally {
      if (!isBackgroundSync) {
        setIsLoadingSession(false);
      }
    }
  };

  const handleLoginSuccess = (loggedTenant: TenantSchool, user?: any, targetTab?: NavTab) => {
    setTenant(loggedTenant);
    if (user) {
      setCurrentUser(user);
    }
    if (targetTab) {
      setCurrentTab(targetTab);
    }
    checkActiveSession();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    setTenant(null);
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-600">Memuat Lingkungan Presensi Sekolah...</span>
        </div>
      </div>
    );
  }

  // Tampilan Login Sekolah jika belum ada sesi
  if (!tenant) {
    return (
      <>
        <LoginSekolah
          onLoginSuccess={handleLoginSuccess}
          onOpenSuperAdmin={() => setShowSuperAdmin(true)}
        />
        <SuperAdminModal
          isOpen={showSuperAdmin}
          onClose={() => setShowSuperAdmin(false)}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar Atas */}
      <Navbar
        tenant={tenant}
        currentUser={currentUser}
        onUserChanged={(user) => setCurrentUser(user)}
        onLogout={handleLogout}
        availableUsers={availableUsers}
        onOpenDatabaseSettings={() => setCurrentTab('database_settings')}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Banner Pengumuman Superadmin Pusat (Multi-Device Broadcast) */}
      {broadcastNotice && broadcastNotice !== dismissedNotice && (
        <div className="bg-amber-500/10 border-b border-amber-300/60 px-4 py-2.5 text-amber-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 font-medium overflow-hidden">
            <span className="p-1 rounded-md bg-amber-200/80 text-amber-800 shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </span>
            <div className="truncate">
              <strong className="font-bold text-amber-950 mr-1.5">Pengumuman Pusat:</strong>
              <span>{broadcastNotice}</span>
            </div>
          </div>
          <button
            onClick={() => setDismissedNotice(broadcastNotice)}
            className="p-1 text-amber-700 hover:text-amber-950 rounded-lg hover:bg-amber-200/50 transition cursor-pointer shrink-0"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Konten Utama dengan Sidebar */}
      <div className="flex flex-1 relative">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          userRole={currentUser?.role || 'admin'}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard tenant={tenant} onNavigateTab={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'presensi_manual' && <PresensiManual />}
          {currentTab === 'presensi_scan' && <PresensiBarcodeRFID />}
          {currentTab === 'izin_kamar_mandi' && <IzinKamarMandi />}
          {currentTab === 'wali_kelas' && <WaliKelasView currentUser={currentUser} tenant={tenant} />}
          {currentTab === 'kesiswaan' && <KesiswaanView tenant={tenant} currentUser={currentUser} />}
          {currentTab === 'master_data' && <MasterData />}
          {currentTab === 'database_settings' && (
            <DatabaseSettings tenant={tenant} onTenantUpdated={(updated) => setTenant(updated)} />
          )}
          {currentTab === 'user_management' && <UserManagement />}
          {currentTab === 'backup_restore' && <BackupRestore />}
          {currentTab === 'audit_log' && <AuditLogView />}
        </main>
      </div>

      <SuperAdminModal
        isOpen={showSuperAdmin}
        onClose={() => setShowSuperAdmin(false)}
      />

      <OfflineIndicator />
    </div>
  );
}
