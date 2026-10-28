import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  ScanLine,
  DoorOpen,
  GraduationCap,
  ShieldAlert,
  Database,
  Users,
  HardDrive,
  FileText,
  Settings,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'presensi_manual'
  | 'presensi_scan'
  | 'izin_kamar_mandi'
  | 'wali_kelas'
  | 'kesiswaan'
  | 'master_data'
  | 'database_settings'
  | 'user_management'
  | 'backup_restore'
  | 'audit_log';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole?: UserRole;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole = 'admin',
  isOpenMobile,
  onCloseMobile,
}) => {
  // Aturan hak akses per menu
  const canAccess = (tab: NavTab): boolean => {
    if (userRole === 'admin' || userRole === 'superadmin') return true;
    switch (tab) {
      case 'dashboard':
        return true;
      case 'presensi_manual':
      case 'presensi_scan':
        return userRole === 'petugas';
      case 'izin_kamar_mandi':
        return userRole === 'petugas' || userRole === 'kesiswaan';
      case 'wali_kelas':
        return userRole === 'wali_kelas';
      case 'kesiswaan':
        return userRole === 'kesiswaan' || userRole === 'kepala_sekolah';
      case 'master_data':
      case 'database_settings':
      case 'user_management':
      case 'backup_restore':
      case 'audit_log':
        return false; // Hanya admin
      default:
        return false;
    }
  };

  interface NavItem {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    highlight?: boolean;
  }

  const navGroups: { group: string; adminOnly?: boolean; items: NavItem[] }[] = [
    {
      group: 'Operasional Utama',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'presensi_manual', label: 'Presensi Manual', icon: ClipboardCheck },
        { id: 'presensi_scan', label: 'Scan Barcode / RFID', icon: ScanLine },
        { id: 'izin_kamar_mandi', label: 'Izin Kamar Mandi', icon: DoorOpen, highlight: true },
      ],
    },
    {
      group: 'Laporan & Pemantauan',
      items: [
        { id: 'wali_kelas' as NavTab, label: 'Menu Wali Kelas', icon: GraduationCap },
        { id: 'kesiswaan' as NavTab, label: 'Kesiswaan & Disiplin', icon: ShieldAlert },
      ],
    },
    {
      group: 'Administrasi Sekolah',
      adminOnly: true,
      items: [
        { id: 'master_data' as NavTab, label: 'Data Master Sekolah', icon: Database },
        { id: 'database_settings' as NavTab, label: 'Pengaturan Google Sheets', icon: Settings },
        { id: 'user_management' as NavTab, label: 'Akun Pengguna Internal', icon: Users },
        { id: 'backup_restore' as NavTab, label: 'Cadangan & Pemulihan', icon: HardDrive },
        { id: 'audit_log' as NavTab, label: 'Log Aktivitas (Audit)', icon: FileText },
      ],
    },
  ];

  return (
    <>
      {/* Overlay Mobile */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 md:top-14 h-screen md:h-[calc(100vh-3.5rem)] w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-200 flex flex-col ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          {navGroups.map((group, idx) => {
            const accessibleItems = group.items.filter(item => canAccess(item.id));
            if (accessibleItems.length === 0) return null;

            return (
              <div key={idx}>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-2 px-2.5">
                  {group.group}
                </div>
                <div className="space-y-1">
                  {accessibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs font-bold'
                            : 'text-slate-800 hover:text-slate-950 hover:bg-slate-100 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-700'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.highlight && !isActive && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80">
          <div className="text-xs text-slate-900 flex items-center gap-1.5 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Google Drive & Sheets API</span>
          </div>
          <div className="text-[10px] text-slate-700 font-semibold mt-1">
            Data terisolasi per-sekolah. Sesi terlindungi.
          </div>
        </div>
      </aside>
    </>
  );
};
