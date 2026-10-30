import pg from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as jose from 'jose';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle pg client', err);
    });
  }
  return poolInstance;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const SETUP_SQL_MIGRATION = `
-- 1. Ekstensi pgcrypto untuk gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabel schools
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  password_hash text NOT NULL,
  status text DEFAULT 'aktif',
  sheet_id text,
  folder_id text,
  created_at timestamptz DEFAULT now()
);

-- 3. Tabel profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('superadmin','admin','guru')),
  school_id uuid REFERENCES public.schools(id),
  nama text
);

-- 4. Aktifkan Row Level Security
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function RLS untuk superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Kebijakan RLS tabel profiles
DROP POLICY IF EXISTS "profiles_superadmin_all" ON public.profiles;
CREATE POLICY "profiles_superadmin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_superadmin() OR id = auth.uid())
  WITH CHECK (public.is_superadmin() OR id = auth.uid());

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_superadmin());

-- 7. Kebijakan RLS tabel schools
DROP POLICY IF EXISTS "schools_superadmin_all" ON public.schools;
CREATE POLICY "schools_superadmin_all" ON public.schools
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "schools_user_select" ON public.schools;
CREATE POLICY "schools_user_select" ON public.schools
  FOR SELECT TO authenticated
  USING (
    public.is_superadmin() OR
    id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  );

-- Revoke akses langsung ke tabel schools dari anon
REVOKE ALL ON public.schools FROM anon;
GRANT SELECT (id, kode, nama, status, sheet_id, folder_id, created_at) ON public.schools TO authenticated;

-- 8. View public_schools (id, kode, nama, status) tanpa password_hash, boleh dibaca anon
CREATE OR REPLACE VIEW public.public_schools WITH (security_invoker = false) AS
SELECT id, kode, nama, status
FROM public.schools
WHERE status = 'aktif';

GRANT SELECT ON public.public_schools TO anon, authenticated;
`;

export async function runDatabaseMigration(): Promise<{ success: boolean; message: string }> {
  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_URL belum dikonfigurasi di server environment variable.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SETUP_SQL_MIGRATION);
    await client.query('COMMIT');
    return { success: true, message: 'Migrasi skema database Supabase berhasil diterapkan.' };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw new Error(`Gagal menjalankan migrasi database: ${err.message}`);
  } finally {
    client.release();
  }
}

export async function checkDatabaseSetupStatus(): Promise<{
  configured: boolean;
  tablesExist: boolean;
  hasSuperadmin: boolean;
  totalSchools: number;
  message?: string;
}> {
  const pool = getPool();
  if (!pool) {
    return {
      configured: false,
      tablesExist: false,
      hasSuperadmin: false,
      totalSchools: 0,
      message: 'DATABASE_URL belum dikonfigurasi.',
    };
  }

  try {
    const client = await pool.connect();
    try {
      const tableCheck = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN ('schools', 'profiles')
      `);
      const tablesExist = tableCheck.rows.length >= 2;

      let hasSuperadmin = false;
      let totalSchools = 0;

      if (tablesExist) {
        const adminCheck = await client.query(`
          SELECT COUNT(*) as count FROM public.profiles WHERE role = 'superadmin'
        `);
        hasSuperadmin = parseInt(adminCheck.rows[0]?.count || '0', 10) > 0;

        const schoolCount = await client.query(`
          SELECT COUNT(*) as count FROM public.schools
        `);
        totalSchools = parseInt(schoolCount.rows[0]?.count || '0', 10);
      }

      return {
        configured: true,
        tablesExist,
        hasSuperadmin,
        totalSchools,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      configured: true,
      tablesExist: false,
      hasSuperadmin: false,
      totalSchools: 0,
      message: err.message,
    };
  }
}

export async function createInitialSuperadmin(payload: {
  email: string;
  password: string;
  nama: string;
}): Promise<{ success: boolean; message: string; user?: any }> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY atau SUPABASE_URL belum dikonfigurasi di server.');
  }

  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_URL belum dikonfigurasi.');
  }

  // 1. Cek apakah sudah ada superadmin
  const client = await pool.connect();
  try {
    const check = await client.query(`SELECT COUNT(*) as count FROM public.profiles WHERE role = 'superadmin'`);
    const count = parseInt(check.rows[0]?.count || '0', 10);
    if (count > 0) {
      return { success: false, message: 'Superadmin sudah terdaftar dalam sistem.' };
    }

    // 2. Buat user via Supabase Auth Admin API
    const { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        nama: payload.nama.trim(),
        role: 'superadmin',
      },
    });

    if (authError) {
      // Jika user sudah ada di auth.users (misal registrasi parsial sebelumnya), dapatkan ID
      if (authError.message.toLowerCase().includes('already registered')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData?.users.find(
          (u) => u.email?.toLowerCase() === payload.email.trim().toLowerCase()
        );
        if (existingUser) {
          await client.query(
            `INSERT INTO public.profiles (id, role, nama) VALUES ($1, 'superadmin', $2)
             ON CONFLICT (id) DO UPDATE SET role = 'superadmin', nama = $2`,
            [existingUser.id, payload.nama.trim()]
          );
          return {
            success: true,
            message: 'Akun Superadmin berhasil dikaitkan dengan profil.',
            user: existingUser,
          };
        }
      }
      throw new Error(`Gagal membuat akun auth: ${authError.message}`);
    }

    // 3. Masukkan ke public.profiles
    await client.query(
      `INSERT INTO public.profiles (id, role, nama) VALUES ($1, 'superadmin', $2)
       ON CONFLICT (id) DO UPDATE SET role = 'superadmin', nama = $2`,
      [userAuth.user.id, payload.nama.trim()]
    );

    return {
      success: true,
      message: 'Akun Superadmin pertama berhasil dibuat.',
      user: userAuth.user,
    };
  } finally {
    client.release();
  }
}

export async function verifySuperadminToken(token: string): Promise<{
  id: string;
  email: string;
  nama: string;
} | null> {
  if (!token) return null;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;

    const pool = getPool();
    if (!pool) return null;

    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT role, nama FROM public.profiles WHERE id = $1`,
        [user.id]
      );
      if (res.rows.length === 0 || res.rows[0].role !== 'superadmin') {
        return null;
      }
      return {
        id: user.id,
        email: user.email || '',
        nama: res.rows[0].nama || user.user_metadata?.nama || 'Super Admin',
      };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error verifying superadmin token:', err);
    return null;
  }
}

export async function signSchoolJwt(school: { id: string; kode: string; nama: string }): Promise<string> {
  const secretKey =
    process.env.APP_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'school-attendance-supabase-system-secret-key-32chars!';
  const secret = new TextEncoder().encode(secretKey);

  return await new jose.SignJWT({
    school_id: school.id,
    kode: school.kode,
    nama: school.nama,
    role: 'school',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);
}
