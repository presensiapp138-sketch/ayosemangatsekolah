/**
 * Utilitas Ekspor Laporan Peringkat Kedisiplinan Siswa
 * Mendukung Ekspor ke Format Excel (.xlsx) dan PDF Resmi
 */
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DisciplineStudentRankingItem {
  rank: number;
  lateRank?: number;
  isTied?: boolean;
  isLateTied?: boolean;
  studentId: string;
  nis: string;
  nisn?: string;
  fullName: string;
  className: string;
  hadirCount: number;
  terlambatCount: number;
  sakitCount: number;
  izinCount: number;
  alphaCount: number;
  toiletOverdueCount: number;
  totalRecords: number;
  timelinessRate: number; // Persentase ketepatan waktu (0-100%)
  attendanceRate: number; // Persentase kehadiran (0-100%)
  disciplineScore: number; // Skor 0-100
  predikat: string; // 'Sangat Disiplin' | 'Disiplin' | 'Cukup Disiplin' | 'Perlu Pembinaan'
}

export interface DisciplineExportOptions {
  schoolName: string;
  npsn?: string;
  address?: string;
  phone?: string;
  reportTitle?: string;
  periodLabel: string;
  className: string;
  rankings: DisciplineStudentRankingItem[];
  printedAt?: string;
  signedByName?: string;
  signedByRole?: string;
  rankingType?: 'disciplined' | 'late';
}

/**
 * Ekspor Data Peringkat Kedisiplinan ke File Excel (.xlsx)
 */
export function exportDisciplineToExcel(options: DisciplineExportOptions): void {
  const {
    schoolName,
    npsn,
    reportTitle = 'LAPORAN PERINGKAT KEDISIPLINAN SISWA',
    periodLabel,
    className,
    rankings,
    printedAt = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date()),
    rankingType = 'disciplined',
  } = options;

  const isLateRanking = rankingType === 'late';
  const effectiveTitle = isLateRanking
    ? 'LAPORAN PERINGKAT SISWA TERBANYAK TERLAMBAT'
    : reportTitle;

  // Header Metadata Dokumen Excel
  const headerData = [
    [schoolName.toUpperCase()],
    [`NPSN: ${npsn || '-'} | Sistem Presensi Sekolah Terintegrasi`],
    [effectiveTitle],
    [`Kelas: ${className} | Periode: ${periodLabel}`],
    [`Waktu Cetak: ${printedAt} WIB`],
    [], // Baris kosong pemisah
    [
      'Peringkat',
      'NIS / ID',
      'NISN',
      'Nama Lengkap Siswa',
      'Kelas',
      'Hadir Tepat Waktu',
      'Terlambat',
      'Sakit',
      'Izin',
      'Alpha',
      'Toilet Overdue',
      'Total Catatan',
      'Ketepatan Waktu (%)',
      'Kehadiran (%)',
      'Skor Kedisiplinan (0-100)',
      'Predikat Kedisiplinan',
    ],
  ];

  // Baris Data Siswa
  const rowsData = rankings.map((item, idx) => {
    const displayRank = isLateRanking
      ? (item.lateRank !== undefined ? (item.isLateTied ? `${item.lateRank}=` : `${item.lateRank}`) : `${idx + 1}`)
      : (item.isTied ? `${item.rank}=` : `${item.rank}`);

    return [
      displayRank,
      item.nis || '-',
      item.nisn || '-',
      item.fullName,
      item.className,
      item.hadirCount,
      item.terlambatCount,
      item.sakitCount,
      item.izinCount,
      item.alphaCount,
      item.toiletOverdueCount || 0,
      item.totalRecords,
      `${item.timelinessRate}%`,
      `${item.attendanceRate}%`,
      item.disciplineScore,
      item.predikat,
    ];
  });

  // Footer Ringkasan
  const footerRow = [
    [''],
    ['RINGKASAN LAPORAN:'],
    [`Total Siswa Dievaluasi: ${rankings.length} siswa`],
    [`Rata-rata Skor Kedisiplinan: ${rankings.length > 0 ? (rankings.reduce((acc, r) => acc + r.disciplineScore, 0) / rankings.length).toFixed(1) : 0} / 100`],
    [`Total Keterlambatan: ${rankings.reduce((acc, r) => acc + r.terlambatCount, 0)} kali`],
    [`Total Ketidakhadiran (Alpha): ${rankings.reduce((acc, r) => acc + r.alphaCount, 0)} kali`],
  ];

  const fullSheetData = [...headerData, ...rowsData, ...footerRow];

  // Buat Worksheet & Workbook
  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Atur Lebar Kolom agar Sangat Rapi
  worksheet['!cols'] = [
    { wch: 12 }, // Peringkat
    { wch: 14 }, // NIS
    { wch: 14 }, // NISN
    { wch: 30 }, // Nama
    { wch: 14 }, // Kelas
    { wch: 18 }, // Hadir
    { wch: 12 }, // Terlambat
    { wch: 10 }, // Sakit
    { wch: 10 }, // Izin
    { wch: 10 }, // Alpha
    { wch: 16 }, // Toilet Overdue
    { wch: 14 }, // Total
    { wch: 20 }, // Ketepatan Waktu
    { wch: 16 }, // Kehadiran
    { wch: 22 }, // Skor
    { wch: 20 }, // Predikat
  ];

  const workbook = XLSX.utils.book_new();
  const safeSheetName = isLateRanking ? 'Peringkat Terlambat' : 'Peringkat Kedisiplinan';
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  // Nama File yang Rapi
  const cleanClassName = className.replace(/[^a-zA-Z0-9]/g, '_');
  const filePrefix = isLateRanking ? 'Peringkat_Terlambat' : 'Peringkat_Kedisiplinan';
  const fileName = `${filePrefix}_${cleanClassName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * Ekspor Data Peringkat Kedisiplinan ke Format PDF Resmi
 */
export function exportDisciplineToPDF(options: DisciplineExportOptions): void {
  const {
    schoolName,
    npsn,
    address = 'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi',
    phone = '-',
    reportTitle = 'LAPORAN RESMI PERINGKAT KEDISIPLINAN SISWA',
    periodLabel,
    className,
    rankings,
    printedAt = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date()),
    signedByName = 'Wali Kelas / Kesiswaan',
    signedByRole = 'Penanggung Jawab Presensi',
    rankingType = 'disciplined',
  } = options;

  const isLateRanking = rankingType === 'late';
  const effectiveTitle = isLateRanking
    ? 'LAPORAN REKAPITULASI SISWA TERBANYAK TERLAMBAT'
    : reportTitle;

  // Gunakan orientasi landscape agar seluruh kolom statistik presensi muat dengan elegan
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. KOP SURAT RESMI SEKOLAH
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(26, 32, 44);
  doc.text(schoolName.toUpperCase(), pageWidth / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(74, 85, 104);
  const subkop = `NPSN: ${npsn || '-'} | Alamat: ${address} | Telp: ${phone}`;
  doc.text(subkop, pageWidth / 2, 19, { align: 'center' });

  // Garis Ganda Pembatas KOP Surat
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(14, 22, pageWidth - 14, 22);
  doc.setLineWidth(0.2);
  doc.line(14, 23, pageWidth - 14, 23);

  // 2. JUDUL DOKUMEN & KOTAK INFORMASI
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(isLateRanking ? 180 : 37, isLateRanking ? 30 : 99, isLateRanking ? 30 : 235); // Merah jika terlambat, Indigo jika disiplin
  doc.text(effectiveTitle, pageWidth / 2, 29, { align: 'center' });

  // Kotak Informasi Meta Laporan
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 32, pageWidth - 28, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Kelas: ${className}`, 18, 37);
  doc.text(`Periode Evaluasi: ${periodLabel}`, 18, 41);

  doc.text(`Dicetak Pada: ${printedAt} WIB`, pageWidth - 80, 37);
  doc.text(`Total Siswa Terdaftar: ${rankings.length} Siswa`, pageWidth - 80, 41);

  // 3. TABEL DATA SISWA
  const tableHeaders = [
    'Rank',
    'NIS',
    'Nama Lengkap Siswa',
    'Kelas',
    'Tepat (H)',
    'Terlambat',
    'Sakit',
    'Izin',
    'Alpha',
    'Total',
    'Ketepatan',
    'Skor',
    'Predikat',
  ];

  const tableBody = rankings.map((item, idx) => {
    const displayRank = isLateRanking
      ? (item.lateRank !== undefined ? (item.isLateTied ? `${item.lateRank}=` : `${item.lateRank}`) : `${idx + 1}`)
      : (item.isTied ? `${item.rank}=` : `${item.rank}`);

    return [
      displayRank,
      item.nis || '-',
      item.fullName,
      item.className,
      String(item.hadirCount),
      String(item.terlambatCount),
      String(item.sakitCount),
      String(item.izinCount),
      String(item.alphaCount),
      String(item.totalRecords),
      `${item.timelinessRate}%`,
      `${item.disciplineScore}`,
      item.predikat,
    ];
  });

  autoTable(doc, {
    startY: 47,
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: isLateRanking ? [190, 24, 24] : [49, 46, 129], // Merah marun untuk terlambat, Indigo tua untuk disiplin
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14, fontStyle: 'bold' }, // Rank
      1: { halign: 'center', cellWidth: 18 },                    // NIS
      2: { cellWidth: 'auto' },                                 // Nama
      3: { halign: 'center', cellWidth: 20 },                    // Kelas
      4: { halign: 'center', cellWidth: 16 },                    // Tepat
      5: { halign: 'center', cellWidth: 18 },                    // Terlambat
      6: { halign: 'center', cellWidth: 14 },                    // Sakit
      7: { halign: 'center', cellWidth: 14 },                    // Izin
      8: { halign: 'center', cellWidth: 14 },                    // Alpha
      9: { halign: 'center', cellWidth: 14 },                    // Total
      10: { halign: 'center', cellWidth: 20 },                   // Ketepatan %
      11: { halign: 'center', cellWidth: 16, fontStyle: 'bold' }, // Skor
      12: { halign: 'center', cellWidth: 30 },                   // Predikat
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawCell: (data) => {
      // Pewarnaan khusus untuk kolom Skor & Predikat
      if (data.section === 'body') {
        const row = rankings[data.row.index];
        if (!row) return;

        // Kolom Skor
        if (data.column.index === 11) {
          if (row.disciplineScore >= 90) {
            data.cell.styles.textColor = [16, 149, 106]; // Hijau
          } else if (row.disciplineScore < 60) {
            data.cell.styles.textColor = [220, 38, 38]; // Merah
          }
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 4. KOTAK TANDA TANGAN DAN PENGESAHAN (FOOTER)
  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  const signatureY = Math.min(finalY + 10, pageHeight - 40);

  // Jika tabel hampir menyentuh batas bawah halaman, buat halaman baru untuk tanda tangan
  if (signatureY > pageHeight - 35) {
    doc.addPage();
  }

  const currentY = signatureY > pageHeight - 35 ? 20 : signatureY;

  // Catatan Resmi
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '* Catatan: Laporan ini dihasilkan secara otomatis oleh Sistem Presensi Multi-Tenant berbasis Google Drive & Google Sheets.',
    14,
    currentY + 5
  );
  doc.text(
    '* Seluruh data kehadiran, ketepatan waktu, dan skor kedisiplinan tervalidasi langsung dari log presensi sekolah.',
    14,
    currentY + 9
  );

  // Kolom Tanda Tangan
  const sigX = pageWidth - 70;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Mengetahui,`, sigX, currentY + 5);
  doc.text(signedByRole, sigX, currentY + 9);

  // Titik tanda tangan
  doc.line(sigX, currentY + 28, sigX + 50, currentY + 28);
  doc.setFont('helvetica', 'bold');
  doc.text(signedByName, sigX, currentY + 32);

  // Unduh Berkas PDF
  const cleanClassName = className.replace(/[^a-zA-Z0-9]/g, '_');
  const filePrefix = isLateRanking ? 'Laporan_Peringkat_Terlambat' : 'Laporan_Peringkat_Kedisiplinan';
  const fileName = `${filePrefix}_${cleanClassName}_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(fileName);
}
