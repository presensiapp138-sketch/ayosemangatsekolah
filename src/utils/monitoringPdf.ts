import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface StudentPDFParams {
  student: {
    id: string;
    fullName: string;
    nis: string;
    nisn?: string;
    className: string;
    gender?: string;
  };
  timeframe: 'daily' | 'weekly' | 'monthly';
  periodLabel: string;
  stats: {
    totalDays: number;
    hadir: number;
    terlambat: number;
    sakit: number;
    izin: number;
    alpha: number;
    attendanceRate: number;
    toiletOverdueCount?: number;
    totalLateMinutes?: number;
  };
  records: Array<{
    date: string;
    status: string;
    method?: string;
    time?: string;
    notes?: string;
    recordedBy?: string;
  }>;
  schoolInfo?: {
    name?: string;
    npsn?: string;
    address?: string;
    phone?: string;
  };
  signeeName?: string;
  signeeRole?: string;
  principalName?: string;
}

export interface ClassPDFParams {
  className: string;
  waliKelasName?: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  periodLabel: string;
  stats: {
    totalStudents: number;
    totalEffectiveDays?: number;
    hadir: number;
    terlambat: number;
    sakit: number;
    izin: number;
    alpha: number;
    attendanceRate: number;
  };
  studentSummaries: Array<{
    nis: string;
    name: string;
    hadir: number;
    terlambat: number;
    sakit: number;
    izin: number;
    alpha: number;
    rate: number;
    statusNote?: string;
  }>;
  schoolInfo?: {
    name?: string;
    npsn?: string;
    address?: string;
    phone?: string;
  };
  signeeName?: string;
  signeeRole?: string;
  principalName?: string;
}

const formatIndonesianDate = (d: Date = new Date()): string => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const getDayName = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[d.getDay()] || '';
  } catch {
    return '';
  }
};

/**
 * Membuat KOP Surat Resmi Sekolah
 */
const drawSchoolHeader = (doc: jsPDF, schoolInfo?: { name?: string; npsn?: string; address?: string; phone?: string }) => {
  const schoolName = schoolInfo?.name || 'SEKOLAH INDONESIA MAJU';
  const npsn = schoolInfo?.npsn || '20104051';
  const address = schoolInfo?.address || 'Jl. Pendidikan Nasional No. 1';
  const phone = schoolInfo?.phone || '021-1234567';

  // Dinas Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('PEMERINTAH PROVINSI / DINAS PENDIDIKAN', 105, 14, { align: 'center' });

  // School Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName.toUpperCase(), 105, 20, { align: 'center' });

  // Contact & Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NPSN: ${npsn} | Alamat: ${address} | Telepon: ${phone}`, 105, 25, { align: 'center' });

  // Decorative Double Lines
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(14, 28, 196, 28);
  doc.setLineWidth(0.2);
  doc.line(14, 29.2, 196, 29.2);
};

/**
 * Export Laporan Monitoring Presensi & Kedisiplinan Per Siswa
 */
export const generateStudentMonitoringPDF = (params: StudentPDFParams) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawSchoolHeader(doc, params.schoolInfo);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('LAPORAN MONITORING PRESENSI & KEDISIPLINAN SISWA', 105, 36, { align: 'center' });

  const timeframeLabel =
    params.timeframe === 'daily'
      ? 'Harian'
      : params.timeframe === 'weekly'
      ? 'Pekanan (Mingguan)'
      : 'Bulanan';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Periode Pemantauan: ${timeframeLabel} (${params.periodLabel})`, 105, 41, { align: 'center' });

  // Student Identity Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 45, 182, 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  doc.text('Nama Siswa', 18, 51);
  doc.text(':', 42, 51);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(params.student.fullName, 45, 51);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('NIS / NISN', 18, 57);
  doc.text(':', 42, 57);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`${params.student.nis} / ${params.student.nisn || '-'}`, 45, 57);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Jenis Kelamin', 18, 63);
  doc.text(':', 42, 63);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(params.student.gender === 'P' ? 'Perempuan' : 'Laki-Laki', 45, 63);

  // Right column of identity box
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Kelas', 120, 51);
  doc.text(':', 148, 51);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(params.student.className, 151, 51);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Tingkat Kehadiran', 120, 57);
  doc.text(':', 148, 57);
  doc.setFont('helvetica', 'bold');
  const rateColor = params.stats.attendanceRate >= 90 ? [16, 120, 72] : params.stats.attendanceRate >= 75 ? [180, 83, 9] : [190, 18, 60];
  doc.setTextColor(rateColor[0], rateColor[1], rateColor[2]);
  doc.text(`${params.stats.attendanceRate}%`, 151, 57);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Izin Toilet Melewati Batas', 120, 63);
  doc.text(':', 148, 63);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`${params.stats.toiletOverdueCount || 0} Kali`, 151, 63);

  // Statistics Summary Cards (Horizontal bar)
  const statBoxY = 70;
  const statWidth = 28.5;
  const statHeight = 14;
  const startX = 14;

  const statItems = [
    { label: 'Hadir', val: params.stats.hadir, bg: [236, 253, 245], border: [167, 243, 208], text: [6, 95, 70] },
    { label: 'Terlambat', val: params.stats.terlambat, bg: [254, 243, 199], border: [253, 230, 138], text: [146, 64, 14] },
    { label: 'Sakit', val: params.stats.sakit, bg: [239, 246, 255], border: [191, 219, 254], text: [30, 64, 175] },
    { label: 'Izin', val: params.stats.izin, bg: [250, 245, 255], border: [233, 213, 255], text: [107, 33, 168] },
    { label: 'Alpha', val: params.stats.alpha, bg: [255, 241, 242], border: [254, 205, 211], text: [159, 18, 57] },
    { label: 'Total Hari', val: params.stats.totalDays, bg: [241, 245, 249], border: [203, 213, 225], text: [30, 41, 59] },
  ];

  statItems.forEach((item, idx) => {
    const curX = startX + idx * (statWidth + 2.2);
    doc.setFillColor(item.bg[0], item.bg[1], item.bg[2]);
    doc.setDrawColor(item.border[0], item.border[1], item.border[2]);
    doc.roundedRect(curX, statBoxY, statWidth, statHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(item.text[0], item.text[1], item.text[2]);
    doc.text(item.label.toUpperCase(), curX + statWidth / 2, statBoxY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(item.text[0], item.text[1], item.text[2]);
    doc.text(String(item.val), curX + statWidth / 2, statBoxY + 11, { align: 'center' });
  });

  // Table Data
  const tableData = params.records.map((r, i) => {
    const dayName = getDayName(r.date);
    const displayStatus = r.status.toUpperCase();
    return [
      i + 1,
      r.date,
      dayName,
      displayStatus,
      r.time ? `${r.time} WIB` : '-',
      r.method || 'manual',
      r.notes || '-',
      r.recordedBy || '-',
    ];
  });

  autoTable(doc, {
    startY: 88,
    head: [['No', 'Tanggal', 'Hari', 'Status', 'Waktu', 'Metode', 'Keterangan / Alasan', 'Petugas']],
    body: tableData.length > 0 ? tableData : [['-', '-', '-', 'Belum ada data riwayat presensi', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 50 },
      7: { cellWidth: 32 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const text = String(data.cell.raw).toLowerCase();
        if (text.includes('hadir')) {
          data.cell.styles.textColor = [16, 120, 72];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('terlambat')) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('sakit')) {
          data.cell.styles.textColor = [30, 64, 175];
        } else if (text.includes('izin')) {
          data.cell.styles.textColor = [107, 33, 168];
        } else if (text.includes('alpha')) {
          data.cell.styles.textColor = [190, 18, 60];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  let signatureY = finalY + 12;

  // Add new page if space is too constrained for signatures
  if (signatureY > 240) {
    doc.addPage();
    signatureY = 25;
  }

  const currentDateStr = formatIndonesianDate();
  const signeeRole = params.signeeRole || 'Wali Kelas';
  const signeeName = params.signeeName || '...........................................';
  const principalName = params.principalName || 'Drs. H. Mulyadi, M.Pd.';

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  // Left Signature (Kepala Sekolah)
  doc.text('Mengetahui,', 25, signatureY);
  doc.text('Kepala Sekolah', 25, signatureY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(principalName, 25, signatureY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('NIP. 19750812 200003 1 004', 25, signatureY + 30);

  // Right Signature (Wali Kelas / Kesiswaan)
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Jakarta, ${currentDateStr}`, 140, signatureY);
  doc.text(signeeRole, 140, signatureY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(signeeName, 140, signatureY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP/NUPTK: -`, 140, signatureY + 30);

  // Save PDF
  const cleanStudentName = params.student.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPeriod = params.periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_Presensi_Siswa_${cleanStudentName}_${cleanPeriod}.pdf`);
};

/**
 * Export Laporan Monitoring Presensi & Rekapitulasi Per Kelas
 */
export const generateClassMonitoringPDF = (params: ClassPDFParams) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  drawSchoolHeader(doc, params.schoolInfo);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('LAPORAN MONITORING & REKAPITULASI PRESENSI KELAS', 105, 36, { align: 'center' });

  const timeframeLabel =
    params.timeframe === 'daily'
      ? 'Harian'
      : params.timeframe === 'weekly'
      ? 'Pekanan (Mingguan)'
      : 'Bulanan';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Kelas: ${params.className} | Periode: ${timeframeLabel} (${params.periodLabel})`, 105, 41, { align: 'center' });

  // Class Info Bar
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 45, 182, 16, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Nama Kelas', 18, 51);
  doc.text(':', 45, 51);
  doc.setTextColor(15, 23, 42);
  doc.text(`Kelas ${params.className}`, 48, 51);

  doc.setTextColor(51, 65, 85);
  doc.text('Wali Kelas', 18, 57);
  doc.text(':', 45, 57);
  doc.setTextColor(15, 23, 42);
  doc.text(params.waliKelasName || 'Wali Kelas Terdaftar', 48, 57);

  doc.setTextColor(51, 65, 85);
  doc.text('Total Siswa', 120, 51);
  doc.text(':', 150, 51);
  doc.setTextColor(15, 23, 42);
  doc.text(`${params.stats.totalStudents} Siswa`, 153, 51);

  doc.setTextColor(51, 65, 85);
  doc.text('Rata-rata Kehadiran', 120, 57);
  doc.text(':', 150, 57);
  const rateColor = params.stats.attendanceRate >= 90 ? [16, 120, 72] : params.stats.attendanceRate >= 75 ? [180, 83, 9] : [190, 18, 60];
  doc.setTextColor(rateColor[0], rateColor[1], rateColor[2]);
  doc.text(`${params.stats.attendanceRate}%`, 153, 57);

  // Statistics Summary Row
  const statBoxY = 64;
  const statWidth = 28.5;
  const statHeight = 13;
  const startX = 14;

  const statItems = [
    { label: 'Total Hadir', val: params.stats.hadir, bg: [236, 253, 245], border: [167, 243, 208], text: [6, 95, 70] },
    { label: 'Terlambat', val: params.stats.terlambat, bg: [254, 243, 199], border: [253, 230, 138], text: [146, 64, 14] },
    { label: 'Sakit', val: params.stats.sakit, bg: [239, 246, 255], border: [191, 219, 254], text: [30, 64, 175] },
    { label: 'Izin', val: params.stats.izin, bg: [250, 245, 255], border: [233, 213, 255], text: [107, 33, 168] },
    { label: 'Alpha', val: params.stats.alpha, bg: [255, 241, 242], border: [254, 205, 211], text: [159, 18, 57] },
    { label: 'Tingkat Kehadiran', val: `${params.stats.attendanceRate}%`, bg: [241, 245, 249], border: [203, 213, 225], text: [30, 41, 59] },
  ];

  statItems.forEach((item, idx) => {
    const curX = startX + idx * (statWidth + 2.2);
    doc.setFillColor(item.bg[0], item.bg[1], item.bg[2]);
    doc.setDrawColor(item.border[0], item.border[1], item.border[2]);
    doc.roundedRect(curX, statBoxY, statWidth, statHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(item.text[0], item.text[1], item.text[2]);
    doc.text(item.label.toUpperCase(), curX + statWidth / 2, statBoxY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(item.text[0], item.text[1], item.text[2]);
    doc.text(String(item.val), curX + statWidth / 2, statBoxY + 10.5, { align: 'center' });
  });

  // Table Data per Siswa
  const tableData = params.studentSummaries.map((s, i) => [
    i + 1,
    s.nis,
    s.name,
    s.hadir,
    s.terlambat,
    s.sakit,
    s.izin,
    s.alpha,
    `${s.rate}%`,
    s.statusNote || (s.rate >= 95 ? 'Sangat Baik' : s.rate >= 80 ? 'Baik' : s.rate >= 70 ? 'Perlu Pembinaan' : 'Panggilan Orang Tua'),
  ]);

  autoTable(doc, {
    startY: 81,
    head: [['No', 'NIS', 'Nama Lengkap Siswa', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpha', '% Hadir', 'Keterangan Kedisiplinan']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'Belum ada data rekapitulasi siswa', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 50 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 14, halign: 'center' },
      9: { cellWidth: 32 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 4 && Number(data.cell.raw) > 0) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 7 && Number(data.cell.raw) > 0) {
          data.cell.styles.textColor = [190, 18, 60];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  let signatureY = finalY + 12;

  if (signatureY > 240) {
    doc.addPage();
    signatureY = 25;
  }

  const currentDateStr = formatIndonesianDate();
  const signeeRole = params.signeeRole || 'Wali Kelas';
  const signeeName = params.signeeName || params.waliKelasName || '...........................................';
  const principalName = params.principalName || 'Drs. H. Mulyadi, M.Pd.';

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  // Left Signature (Kepala Sekolah)
  doc.text('Mengetahui,', 25, signatureY);
  doc.text('Kepala Sekolah', 25, signatureY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(principalName, 25, signatureY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('NIP. 19750812 200003 1 004', 25, signatureY + 30);

  // Right Signature (Wali Kelas / Kesiswaan)
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Jakarta, ${currentDateStr}`, 140, signatureY);
  doc.text(signeeRole, 140, signatureY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(signeeName, 140, signatureY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP/NUPTK: -`, 140, signatureY + 30);

  // Save PDF
  const cleanClassName = params.className.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPeriod = params.periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_Presensi_Kelas_${cleanClassName}_${cleanPeriod}.pdf`);
};
