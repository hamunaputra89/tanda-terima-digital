import { HandoverRecord } from '../types/receipt';

/**
 * Generates and downloads a CSV spreadsheet file of all handover records.
 * Can be opened directly in Google Sheets, Microsoft Excel, or LibreOffice.
 */
export function exportRecordsToCsv(records: HandoverRecord[], filename = 'Riwayat_Serah_Terima_Ekspedisi.csv'): void {
  if (records.length === 0) {
    alert('Tidak ada data riwayat untuk diunduh.');
    return;
  }

  const headers = [
    'No. BAST',
    'Tanggal',
    'Jam',
    'Ekspedisi',
    'Nama Kurir',
    'No. HP Kurir',
    'Plat Kendaraan',
    'No. Surat Jalan / DO',
    'Penerima (PIC Gudang)',
    'Nama Gudang',
    'Total Qty',
    'Rincian Barang',
    'Status',
    'Catatan',
    'Waktu Tercatat',
  ];

  const rows = records.map((r) => {
    const itemsSummary = (r.items || [])
      .map((it) => `${it.name} ${it.sizeOrSpec ? `(${it.sizeOrSpec})` : ''}: ${it.quantity} ${it.unit} [${it.condition}]`)
      .join(' ; ');

    const expedition = r.expedition === 'Lainnya' && r.expeditionCustomName ? r.expeditionCustomName : r.expedition;

    return [
      r.handoverNumber,
      r.date,
      r.time || '',
      expedition,
      r.courierName,
      r.courierPhone || '',
      r.vehiclePlate || '',
      r.referenceNumber || '',
      r.receiverName,
      r.warehouseName,
      r.totalQuantity,
      itemsSummary,
      r.status,
      r.notes || '',
      r.createdAt,
    ].map((field) => {
      // Escape quotes and wrap in quotes for CSV compliance
      const str = String(field ?? '').replace(/"/g, '""');
      return `"${str}"`;
    });
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
