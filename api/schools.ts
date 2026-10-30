import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getPool, verifySuperadminToken } from '../server/supabaseServer';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Verifikasi token Supabase Auth + role superadmin di server
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Sesi Superadmin tidak ditemukan. Silakan login terlebih dahulu.',
    });
  }

  const token = authHeader.substring(7);
  const superadmin = await verifySuperadminToken(token);

  if (!superadmin) {
    return res.status(403).json({
      success: false,
      error: 'Akses ditolak. Hanya akun berwenang Superadmin yang dapat mengakses fitur ini.',
    });
  }

  const pool = getPool();
  if (!pool) {
    return res.status(500).json({
      success: false,
      error: 'DATABASE_URL belum dikonfigurasi di server.',
    });
  }

  const client = await pool.connect();
  try {
    // GET: Ambil semua daftar sekolah untuk superadmin
    if (req.method === 'GET') {
      const result = await client.query(`
        SELECT id, kode, nama, status, sheet_id, folder_id, created_at 
        FROM public.schools 
        ORDER BY created_at DESC
      `);
      return res.status(200).json({
        success: true,
        schools: result.rows,
      });
    }

    // POST: Tambah sekolah baru (sandi di-hash dengan bcryptjs di server)
    if (req.method === 'POST') {
      const { nama, kode, password } = req.body || {};
      const cleanNama = (nama || '').trim();
      const cleanKode = (kode || '').trim().toUpperCase();
      const rawPassword = (password || '').trim();

      if (!cleanNama || !cleanKode || !rawPassword) {
        return res.status(400).json({
          success: false,
          error: 'Nama sekolah, kode sekolah, dan sandi sekolah wajib diisi.',
        });
      }

      if (rawPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Sandi sekolah minimal 6 karakter.',
        });
      }

      // Cek apakah kode sekolah sudah digunakan
      const existCheck = await client.query(
        'SELECT id FROM public.schools WHERE LOWER(kode) = LOWER($1)',
        [cleanKode]
      );
      if (existCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Kode sekolah "${cleanKode}" sudah terdaftar. Gunakan kode lain.`,
        });
      }

      // Hash sandi dengan bcryptjs (salt 10)
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const insertResult = await client.query(
        `INSERT INTO public.schools (kode, nama, password_hash, status) 
         VALUES ($1, $2, $3, 'aktif') 
         RETURNING id, kode, nama, status, created_at`,
        [cleanKode, cleanNama, passwordHash]
      );

      return res.status(201).json({
        success: true,
        message: `Sekolah "${cleanNama}" berhasil ditambahkan.`,
        school: insertResult.rows[0],
      });
    }

    // PUT: Edit data sekolah (nama, kode, status, opsi sandi baru)
    if (req.method === 'PUT') {
      const targetId = req.params?.id || req.query?.id || req.body?.id;
      const { nama, kode, status, password } = req.body || {};

      if (!targetId) {
        return res.status(400).json({ success: false, error: 'ID sekolah wajib disertakan.' });
      }

      const cleanNama = (nama || '').trim();
      const cleanKode = (kode || '').trim().toUpperCase();
      const newStatus = status === 'nonaktif' ? 'nonaktif' : 'aktif';

      // Cek keunikan kode jika diubah
      if (cleanKode) {
        const existCheck = await client.query(
          'SELECT id FROM public.schools WHERE LOWER(kode) = LOWER($1) AND id != $2',
          [cleanKode, targetId]
        );
        if (existCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: `Kode sekolah "${cleanKode}" sudah digunakan oleh sekolah lain.`,
          });
        }
      }

      if (password && password.trim().length >= 6) {
        const passwordHash = await bcrypt.hash(password.trim(), 10);
        await client.query(
          `UPDATE public.schools 
           SET nama = COALESCE($1, nama), 
               kode = COALESCE($2, kode), 
               status = $3, 
               password_hash = $4 
           WHERE id = $5`,
          [cleanNama || null, cleanKode || null, newStatus, passwordHash, targetId]
        );
      } else {
        await client.query(
          `UPDATE public.schools 
           SET nama = COALESCE($1, nama), 
               kode = COALESCE($2, kode), 
               status = $3 
           WHERE id = $4`,
          [cleanNama || null, cleanKode || null, newStatus, targetId]
        );
      }

      const updated = await client.query(
        'SELECT id, kode, nama, status, sheet_id, folder_id, created_at FROM public.schools WHERE id = $1',
        [targetId]
      );

      return res.status(200).json({
        success: true,
        message: 'Data sekolah berhasil diperbarui.',
        school: updated.rows[0],
      });
    }

    // PATCH: Toggle status aktif / nonaktif
    if (req.method === 'PATCH') {
      const targetId = req.params?.id || req.query?.id || req.body?.id;
      const { status } = req.body || {};

      if (!targetId) {
        return res.status(400).json({ success: false, error: 'ID sekolah wajib disertakan.' });
      }

      const newStatus = status === 'aktif' ? 'aktif' : 'nonaktif';
      await client.query(
        'UPDATE public.schools SET status = $1 WHERE id = $2',
        [newStatus, targetId]
      );

      return res.status(200).json({
        success: true,
        message: `Status sekolah berhasil diubah menjadi ${newStatus}.`,
        status: newStatus,
      });
    }

    // DELETE: Hapus sekolah
    if (req.method === 'DELETE') {
      const targetId = req.params?.id || req.query?.id || req.body?.id;
      if (!targetId) {
        return res.status(400).json({ success: false, error: 'ID sekolah wajib disertakan.' });
      }

      await client.query('DELETE FROM public.schools WHERE id = $1', [targetId]);

      return res.status(200).json({
        success: true,
        message: 'Sekolah berhasil dihapus dari database Supabase.',
      });
    }

    return res.status(405).json({ success: false, error: 'Metode HTTP tidak diizinkan.' });
  } catch (err: any) {
    console.error('Error in /api/schools:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan server saat memproses data sekolah.',
    });
  } finally {
    client.release();
  }
}
