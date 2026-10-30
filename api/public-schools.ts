import type { Request, Response } from 'express';
import { getPool } from '../server/supabaseServer';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Metode HTTP tidak diizinkan.' });
  }

  const pool = getPool();
  if (!pool) {
    return res.status(200).json({
      success: true,
      schools: [],
      warning: 'DATABASE_URL belum dikonfigurasi di server.',
    });
  }

  try {
    const client = await pool.connect();
    try {
      // Query dari view public_schools yang hanya berisi id, kode, nama, status
      const result = await client.query(`
        SELECT id, kode, nama, status 
        FROM public.public_schools 
        ORDER BY nama ASC
      `);
      return res.status(200).json({
        success: true,
        schools: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Error in /api/public-schools:', err);
    return res.status(500).json({
      success: false,
      error: 'Gagal memuat daftar sekolah dari database server.',
      schools: [],
    });
  }
}
