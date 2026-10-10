import React, { useState } from 'react';
import {
  Download,
  Printer,
  Share2,
  ExternalLink,
  Check,
  X,
  FileCheck2,
  Truck,
  Building,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { HandoverRecord, SpreadsheetInfo } from '../types/receipt';
import { exportElementToPdf, printElementSafely } from '../utils/pdfExport';

interface ReceiptPreviewModalProps {
  receipt: HandoverRecord | null;
  spreadsheetInfo: SpreadsheetInfo | null;
  onClose: () => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  receipt,
  spreadsheetInfo,
  onClose,
}) => {
  const [copiedWA, setCopiedWA] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!receipt) return null;

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setDownloadSuccess(false);
    try {
      const filename = `${receipt.handoverNumber}_Serah_Terima_Ekspedisi.pdf`;
      await exportElementToPdf('printable-receipt', filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error('Export to PDF failed:', err);
      // Fallback to print
      handlePrint();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    printElementSafely('printable-receipt');
  };

  const expeditionName =
    receipt.expedition === 'Lainnya' && receipt.expeditionCustomName
      ? receipt.expeditionCustomName
      : receipt.expedition;

  const generateWhatsAppText = () => {
    const itemLines = (receipt.items || []).map(
      (it, idx) =>
        `   ${idx + 1}. *${it.name}* ${it.sizeOrSpec ? `(${it.sizeOrSpec})` : ''}: ${it.quantity} ${it.unit} [${it.condition}]`
    );

    const lines = [
      `*📦 TANDA TERIMA SERAH TERIMA EKSPEDISI (BAST)*`,
      `------------------------------------------`,
      `*No. Dokumen:* ${receipt.handoverNumber}`,
      `*Tanggal:* ${receipt.date} ${receipt.time || ''}`,
      `*Ekspedisi:* ${expeditionName}`,
      `*Kurir / Driver:* ${receipt.courierName} ${receipt.courierPhone ? `(${receipt.courierPhone})` : ''}`,
      receipt.vehiclePlate ? `*Plat Kendaraan:* ${receipt.vehiclePlate}` : '',
      receipt.referenceNumber ? `*No. Surat Jalan / DO:* ${receipt.referenceNumber}` : '',
      `------------------------------------------`,
      `*Penerima (Gudang):* ${receipt.warehouseName}`,
      `*PIC Penerima:* ${receipt.receiverName}`,
      `------------------------------------------`,
      `*Rincian Perlengkapan Diterima:*`,
      ...itemLines,
      `*Total Kuantitas:* ${receipt.totalQuantity} Item`,
      `*Status:* ${receipt.status}`,
      receipt.notes ? `*Catatan:* ${receipt.notes}` : '',
      `------------------------------------------`,
      `_Tanda terima fisik & digital telah dicatat resmi._`,
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(generateWhatsAppText());
      setCopiedWA(true);
      setTimeout(() => setCopiedWA(false), 2500);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Diterima Lengkap':
        return 'border-emerald-600 text-emerald-700 bg-emerald-50';
      case 'Diterima Sebagian':
        return 'border-amber-500 text-amber-700 bg-amber-50';
      default:
        return 'border-rose-500 text-rose-700 bg-rose-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:block">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Action Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Pratinjau Dokumen BAST Ekspedisi</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download PDF Button */}
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleDownloadPdf}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95'
              }`}
              title="Unduh langsung berkas PDF"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : downloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-200" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {isExportingPdf
                  ? 'Membuat PDF...'
                  : downloadSuccess
                  ? 'PDF Terunduh!'
                  : 'Unduh PDF'}
              </span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Cetak via printer atau dialog cetak browser"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Copy for WhatsApp */}
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Salin rekap teks untuk WhatsApp"
            >
              {copiedWA ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>{copiedWA ? 'Tersalin!' : 'Salin WA'}</span>
            </button>

            {spreadsheetInfo && (
              <a
                href={spreadsheetInfo.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg transition-colors"
                title="Buka data di Google Sheets"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sheets</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable BAST Container */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            id="printable-receipt"
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto print:border-none print:shadow-none print:p-4 print:max-w-none text-slate-900"
          >
            {/* Kop Dokumen */}
            <div className="flex flex-col sm:flex-row items-start justify-between pb-4 border-b-2 border-slate-800 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                      {receipt.warehouseName || 'GUDANG LOGISTIK'}
                    </h2>
                    {receipt.warehouseLocation && (
                      <p className="text-xs text-slate-500">{receipt.warehouseLocation}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1 shrink-0">
                <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white text-[11px] font-bold rounded-sm tracking-wider uppercase">
                  BERITA ACARA SERAH TERIMA
                </span>
                <p className="text-xs font-mono font-semibold text-slate-700">
                  No: <span className="text-emerald-700 font-bold">{receipt.handoverNumber}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Tanggal: {receipt.date} {receipt.time ? `• ${receipt.time}` : ''}
                </p>
              </div>
            </div>

            {/* Sub-header text */}
            <div className="my-4 text-center">
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-800">
                TANDA TERIMA PERLENGKAPAN OPERASIONAL EKSPEDISI
              </h3>
              <p className="text-xs text-slate-500">
                (Serah Terima Label Resi Thermal, Plastik Polymailer & Perlengkapan Packing)
              </p>
            </div>

            {/* Pihak-pihak Terkait */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              {/* Pihak Ekspedisi */}
              <div className="space-y-1 border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0 sm:pr-3">
                <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-700" /> Pihak Penyerah (Ekspedisi):
                </p>
                <p className="font-semibold text-slate-900 text-sm">{expeditionName}</p>
                <p className="text-slate-600">
                  Kurir / Driver: <strong>{receipt.courierName}</strong>
                </p>
                {receipt.courierPhone && (
                  <p className="text-slate-500">Kontak: {receipt.courierPhone}</p>
                )}
                {receipt.vehiclePlate && (
                  <p className="text-slate-500">
                    Plat No: <span className="font-mono">{receipt.vehiclePlate}</span>
                  </p>
                )}
                {receipt.referenceNumber && (
                  <p className="text-slate-500">
                    No. SJ / DO: <span className="font-mono">{receipt.referenceNumber}</span>
                  </p>
                )}
              </div>

              {/* Pihak Gudang */}
              <div className="space-y-1 sm:pl-2">
                <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-emerald-700" /> Pihak Penerima (Gudang):
                </p>
                <p className="font-semibold text-slate-900 text-sm">
                  {receipt.warehouseName || 'Gudang Utama'}
                </p>
                <p className="text-slate-600">
                  PIC Penerima: <strong>{receipt.receiverName}</strong>
                </p>
                <p className="text-slate-500">
                  Waktu Terima: {receipt.date} {receipt.time || ''}
                </p>
              </div>
            </div>

            {/* Tabel Rincian Barang Serah Terima */}
            <div className="mt-5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                Rincian Barang Perlengkapan Yang Diserahterimakan:
              </span>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-8 text-center">No</th>
                      <th className="p-2.5">Nama Barang / Perlengkapan</th>
                      <th className="p-2.5">Ukuran / Spesifikasi</th>
                      <th className="p-2.5 text-center w-24">Jumlah</th>
                      <th className="p-2.5 text-center w-28">Kondisi Fisik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(receipt.items || []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="p-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="p-2.5 text-slate-600">{item.sizeOrSpec || '-'}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {item.condition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right text-slate-700">
                        Total Kuantitas Perlengkapan:
                      </td>
                      <td className="p-2.5 text-center text-emerald-800 font-extrabold text-sm">
                        {receipt.totalQuantity} Item
                      </td>
                      <td className="p-2.5"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Status & Catatan */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Status Penerimaan:
                </span>
                <span
                  className={`inline-block px-3 py-1 font-bold text-xs uppercase rounded-md border mt-1 ${getStatusBadge(
                    receipt.status
                  )}`}
                >
                  {receipt.status}
                </span>
              </div>
              <div className="flex-1 sm:text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Catatan Tambahan:
                </span>
                <p className="text-slate-700 italic mt-0.5">
                  {receipt.notes || 'Tidak ada catatan khusus. Barang diterima sesuai.'}
                </p>
              </div>
            </div>

            {/* Kolom Tanda Tangan Berdampingan */}
            <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-center text-xs">
              {/* Kurir */}
              <div className="space-y-1">
                <p className="font-semibold text-slate-600">Pihak Penyerah (Kurir Ekspedisi)</p>
                <p className="text-[11px] text-slate-400">{expeditionName}</p>
                <div className="h-20 flex items-center justify-center my-1 border-b border-slate-300">
                  {receipt.courierSignature ? (
                    <img
                      src={receipt.courierSignature}
                      alt="Tanda Tangan Kurir"
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[11px] italic text-slate-400">
                      (Tanda Tangan Kurir)
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900 uppercase">
                  ( {receipt.courierName || 'Kurir / Driver'} )
                </p>
              </div>

              {/* Penerima Gudang */}
              <div className="space-y-1">
                <p className="font-semibold text-slate-600">Pihak Penerima (Gudang)</p>
                <p className="text-[11px] text-slate-400">{receipt.warehouseName || 'Gudang'}</p>
                <div className="h-20 flex items-center justify-center my-1 border-b border-slate-300">
                  {receipt.receiverSignature ? (
                    <img
                      src={receipt.receiverSignature}
                      alt="Tanda Tangan Penerima"
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[11px] italic text-slate-400">
                      (Tanda Tangan PIC Gudang)
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900 uppercase">
                  ( {receipt.receiverName || 'PIC Gudang'} )
                </p>
              </div>
            </div>

            <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Dokumen Berita Acara ini sah dan riwayatnya otomatis terdata di Google Spreadsheet.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>
            {receipt.syncedToSheets ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <Check className="w-3.5 h-3.5" /> Tercatat di Google Spreadsheet
              </span>
            ) : (
              <span className="text-amber-600 font-medium">Tersimpan di memori lokal</span>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
