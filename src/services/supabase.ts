import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface PublicSchool {
  id: string;
  kode: string;
  nama: string;
  status: string;
}

/**
 * Mengambil daftar sekolah publik dari VIEW public_schools di Supabase
 * dengan fallback otomatis ke server endpoint /api/public-schools
 */
export async function fetchPublicSchools(): Promise<{ success: boolean; schools: PublicSchool[]; error?: string }> {
  // 1. Coba baca langsung dari Supabase Client via view public_schools
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('public_schools')
        .select('id, kode, nama, status')
        .order('nama', { ascending: true });

      if (!error && Array.isArray(data)) {
        return {
          success: true,
          schools: data as PublicSchool[],
        };
      }
      if (error) {
        console.warn('Supabase client public_schools error:', error.message);
      }
    } catch (clientErr: any) {
      console.warn('Gagal memanggil Supabase client langsung:', clientErr);
    }
  }

  // 2. Fallback ke endpoint server /api/public-schools
  try {
    const res = await fetch('/api/public-schools');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.schools)) {
        return { success: true, schools: json.schools };
      }
    }
  } catch (serverErr) {
    console.warn('Gagal memanggil /api/public-schools:', serverErr);
  }

  return {
    success: false,
    schools: [],
    error: isSupabaseConfigured
      ? 'Gagal terhubung ke database server Supabase.'
      : 'VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum dikonfigurasi di frontend.',
  };
}

/**
 * Berlangganan Realtime Supabase pada tabel schools
 */
export function subscribeToSchoolsRealtime(onSchoolChange: () => void): (() => void) | null {
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  try {
    const channel = supabase
      .channel('public:schools:changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schools' },
        () => {
          onSchoolChange();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Supabase realtime subscribe error:', e);
    return null;
  }
}
