import type { Request, Response } from 'express';
import {
  getPool,
  runDatabaseMigration,
  checkDatabaseSetupStatus,
  createInitialSuperadmin,
} from '../server/supabaseServer';

export default async function handler(req: Request, res: Response) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-setup-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Cek status setup database & apakah superadmin sudah ada
  if (req.method === 'GET') {
    try {
      const status = await checkDatabaseSetupStatus();
      return res.status(200).json({
        success: true,
        ...status,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Gagal memeriksa status database.',
      });
    }
  }

  // POST: Jalankan migrasi skema database & buat superadmin awal jika diminta
  if (req.method === 'POST') {
    const setupTokenHeader = (req.headers['x-setup-token'] as string) || '';
    const setupTokenBody = req.body?.setupToken || '';
    const providedToken = setupTokenHeader || setupTokenBody;

    const expectedToken = process.env.SETUP_TOKEN;
    if (!expectedToken) {
      return res.status(500).json({
        success: false,
        error: 'SETUP_TOKEN belum dikonfigurasi di server environment variable.',
      });
    }

    if (!providedToken || providedToken.trim() !== expectedToken.trim()) {
      return res.status(403).json({
        success: false,
        error: 'Token setup tidak sah. Pastikan header x-setup-token sesuai SETUP_TOKEN server.',
      });
    }

    try {
      // 1. Jalankan migrasi tabel schools, profiles, RLS & view public_schools
      const migrationResult = await runDatabaseMigration();

      // 2. Jika ada payload email & password superadmin, buat akun superadmin
      let adminResult: any = null;
      const { email, password, nama } = req.body || {};
      if (email && password) {
        adminResult = await createInitialSuperadmin({
          email,
          password,
          nama: nama || 'Super Administrator',
        });
      }

      return res.status(200).json({
        success: true,
        message: migrationResult.message,
        adminCreated: Boolean(adminResult?.success),
        adminMessage: adminResult?.message,
      });
    } catch (err: any) {
      console.error('Error in /api/setup:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Gagal melakukan setup database Supabase.',
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Metode HTTP tidak diizinkan.' });
}
