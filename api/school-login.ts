import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getPool, signSchoolJwt } from '../server/supabaseServer';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Metode HTTP tidak diizinkan.' });
  }

  const { school_id, schoolQuery, password } = req.body || {};
  const targetIdentifier = (school_id || schoolQuery || '').trim();
  const inputPassword = (password || '').trim();

  if (!targetIdentifier || !inputPassword) {
    return res.status(400).json({
      success: false,
      error: 'ID/Kode sekolah dan sandi sekolah wajib diisi.',
    });
  }

  const pool = getPool();
  if (!pool) {
    return res.status(500).json({
      success: false,
      error: 'DATABASE_URL belum dikonfigurasi di server.',
    });
  }

  try {
    const client = await pool.connect();
    try {
      // Cari berdasarkan UUID id atau kode sekolah (case-insensitive)
      const query = `
        SELECT id, kode, nama, password_hash, status 
        FROM public.schools 
        WHERE id::text = $1 OR LOWER(kode) = LOWER($1) OR LOWER(nama) = LOWER($1)
        LIMIT 1
      `;
      const result = await client.query(query, [targetIdentifier]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Sekolah tidak ditemukan. Pastikan memilih sekolah yang terdaftar.',
        });
      }

      const school = result.rows[0];

      if (school.status !== 'aktif') {
        return res.status(403).json({
          success: false,
          error: 'Sekolah ini sedang dinonaktifkan oleh Super Administrator.',
        });
      }

      // Verifikasi kata sandi dengan bcrypt
      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(inputPassword, school.password_hash);
      } catch (bcErr) {
        console.error('Bcrypt error in school-login:', bcErr);
      }

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Sandi sekolah salah. Silakan coba kembali.',
        });
      }

      // Buat token JWT pendek ditandatangani APP_JWT_SECRET (berlaku 12 jam)
      const token = await signSchoolJwt({
        id: school.id,
        kode: school.kode,
        nama: school.nama,
      });

      return res.status(200).json({
        success: true,
        message: 'Autentikasi sekolah berhasil.',
        token,
        school: {
          id: school.id,
          kode: school.kode,
          nama: school.nama,
          status: school.status,
        },
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Error in /api/school-login:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan pada server saat verifikasi sekolah.',
    });
  }
}
