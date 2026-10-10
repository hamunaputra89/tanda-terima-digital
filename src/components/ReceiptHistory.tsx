import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  RefreshCw,
  Eye,
  Trash2,
  Table,
  CheckCircle2,
  Clock,
  Filter,
  FileSpreadsheet,
  CloudUpload,
  Truck,
  Package,
  Layers,
  Download,
} from 'lucide-react';
import { HandoverRecord, SpreadsheetInfo, ExpeditionName } from '../types/receipt';
import { ConfirmModal } from './ConfirmModal';
import { exportRecordsToCsv } from '../utils/csvExport';

interface ReceiptHistoryProps {
  receipts: HandoverRecord[];
  spreadsheetInfo: SpreadsheetInfo | null;
  isAuthenticated: boolean;
  isLoadingFromSheets: boolean;
  onRefreshFromSheets: () => Promise<void>;
  onViewReceipt: (receipt: HandoverRecord) => void;
  onDeleteReceipt: (receipt: HandoverRecord) => Promise<void>;
  onSyncLocalToSheets: () => Promise<void>;
}

export const ReceiptHistory: React.FC<ReceiptHistoryProps> = ({
  receipts,
  spreadsheetInfo,
  isAuthenticated,
  isLoadingFromSheets,
  onRefreshFromSheets,
  onViewReceipt,
  onDeleteReceipt,
  onSyncLocalToSheets,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expeditionFilter, setExpeditionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deletingReceipt, setDeletingReceipt] = useState<HandoverRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Statistics calculation for supplies
  const stats = useMemo(() => {
    const totalRecords = receipts.length;
    const totalQuantity = receipts.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
    const completeCount = receipts.filter((r) => r.status === 'Diterima Lengkap').length;
    const unsyncedCount = receipts.filter((r) => !r.syncedToSheets).length;

    // Count by expedition
    const expCounts: Record<string, number> = {};
    receipts.forEach((r) => {
      const name = r.expedition === 'Lainnya' && r.expeditionCustomName ? r.expeditionCustomName : r.expedition;
      expCounts[name] = (expCounts[name] || 0) + 1;
    });

    let topExpedition = '-';
    let topCount = 0;
    Object.entries(expCounts).forEach(([name, count]) => {
      if (count > topCount) {
        topCount = count;
        topExpedition = name;
      }
    });

    return { totalRecords, totalQuantity, completeCount, unsyncedCount, topExpedition };
  }, [receipts]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchSearch =
        r.handoverNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.courierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.expedition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.referenceNumber && r.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.items && r.items.some((it) => it.name.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchExpedition = expeditionFilter === 'ALL' || r.expedition === expeditionFilter;
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchSearch && matchExpedition && matchStatus;
    });
  }, [receipts, searchTerm, expeditionFilter, statusFilter]);

  const handleConfirmDelete = async () => {
    if (!deletingReceipt) return;
    setIsDeleting(true);
    try {
      await onDeleteReceipt(deletingReceipt);
      setDeletingReceipt(null);
    } catch (err) {
      console.error('Failed to delete receipt:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      await onSyncLocalToSheets();
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Metric Cards (Compact 2x2 grid on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Total BAST
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-sm sm:text-xl font-bold text-slate-900 mt-1 sm:mt-2">{stats.totalRecords} Dokumen</p>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">{stats.completeCount} lengkap</p>
        </div>

        <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Total Barang
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-sm sm:text-xl font-bold text-slate-900 mt-1 sm:mt-2">{stats.totalQuantity} Item</p>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">Label, plastik & dus</p>
        </div>

        <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Tersering
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-xs sm:text-base font-bold text-slate-900 mt-1 sm:mt-2 truncate">{stats.topExpedition}</p>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">Sering kirim</p>
        </div>

        <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Spreadsheet
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2">
            {spreadsheetInfo ? (
              <a
                href={spreadsheetInfo.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline truncate"
              >
                <span>Buka Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-[11px] sm:text-xs text-amber-700 font-medium">Belum aktif</span>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">
            {spreadsheetInfo ? spreadsheetInfo.title : 'Cloud aktif'}
          </p>
        </div>
      </div>

      {/* Unsynced notification banner if any */}
      {stats.unsyncedCount > 0 && isAuthenticated && (
        <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-900">
              <strong>{stats.unsyncedCount} Tanda Terima</strong> belum tercatat ke Google Spreadsheet.
            </div>
          </div>
          <button
            type="button"
            disabled={isSyncingAll}
            onClick={handleSyncAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer w-full sm:w-auto justify-center"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            {isSyncingAll ? 'Menyinkronkan...' : 'Sinkron ke Spreadsheet'}
          </button>
        </div>
      )}

      {/* Table / List Container */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs sm:shadow-sm overflow-hidden">
        {/* Table Controls (Compact responsive layout) */}
        <div className="p-2.5 sm:p-5 border-b border-slate-100 flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <input
                type="text"
                placeholder="Cari no. BAST, kurir, label..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Filters side-by-side on mobile */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              {/* Filter Ekspedisi */}
              <div className="relative">
                <select
                  value={expeditionFilter}
                  onChange={(e) => setExpeditionFilter(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden truncate"
                >
                  <option value="ALL">Semua Ekspedisi</option>
                  <option value="J&T Express">J&T Express</option>
                  <option value="SiCepat Ekspres">SiCepat Ekspres</option>
                  <option value="Shopee Xpress (SPX)">Shopee Xpress</option>
                  <option value="JNE Express">JNE Express</option>
                  <option value="Anteraja">Anteraja</option>
                  <option value="Ninja Xpress">Ninja Xpress</option>
                  <option value="Lion Parcel">Lion Parcel</option>
                  <option value="Pos Indonesia">Pos Indonesia</option>
                  <option value="Wahana Logistik">Wahana</option>
                  <option value="IDexpress">IDexpress</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              </div>

              {/* Filter Status */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden truncate"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Diterima Lengkap">Lengkap</option>
                  <option value="Diterima Sebagian">Sebagian</option>
                  <option value="Ada Catatan Khusus">Catatan</option>
                </select>
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-500">
              {filteredReceipts.length} BAST ditemukan
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => exportRecordsToCsv(filteredReceipts)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Unduh seluruh data tabel sebagai berkas spreadsheet"
              >
                <Download className="w-3 h-3 text-emerald-700" />
                <span>Unduh CSV</span>
              </button>

              {isAuthenticated && (
                <button
                  type="button"
                  disabled={isLoadingFromSheets}
                  onClick={onRefreshFromSheets}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Segarkan data dari Google Sheets"
                >
                  <RefreshCw
                    className={`w-3 h-3 text-slate-500 ${
                      isLoadingFromSheets ? 'animate-spin text-emerald-600' : ''
                    }`}
                  />
                  <span>Muat Ulang</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-800">
              {searchTerm ? 'Tidak ada serah terima yang cocok' : 'Belum Ada Tanda Terima Serah Terima'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchTerm
                ? 'Coba gunakan kata kunci pencarian atau filter lain.'
                : 'Buat tanda terima serah terima perlengkapan baru melalui form.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (Optimized for Android / Mobile screens) */}
            <div className="block md:hidden p-2.5 space-y-2 bg-slate-50/50">
              {filteredReceipts.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onViewReceipt(r)}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 active:bg-slate-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-emerald-800 text-xs truncate">
                      {r.handoverNumber}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                        r.status === 'Diterima Lengkap'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'Diterima Sebagian'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <div className="truncate">
                      <strong className="text-slate-900 font-semibold">
                        {r.expedition === 'Lainnya' && r.expeditionCustomName
                          ? r.expeditionCustomName
                          : r.expedition}
                      </strong>
                      <span className="text-slate-500 text-[11px] ml-1">
                        &bull; Kurir: {r.courierName}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 ml-1">
                      {r.date}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg space-y-0.5">
                    {(r.items || []).slice(0, 2).map((it, i) => (
                      <div key={i} className="truncate">
                        &bull; {it.name || 'Item'}: <strong>{it.quantity} {it.unit}</strong>
                      </div>
                    ))}
                    {(r.items || []).length > 2 && (
                      <div className="text-[10px] text-slate-400 italic">
                        +{r.items.length - 2} item lainnya...
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="font-bold text-slate-800 text-[11px]">
                      Total: <span className="text-emerald-800">{r.totalQuantity} Item</span>
                    </div>

                    <div
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onViewReceipt(r)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                      >
                        Buka BAST
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingReceipt(r)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">No. BAST</th>
                    <th className="py-3 px-4">Tanggal & Jam</th>
                    <th className="py-3 px-4">Ekspedisi & Kurir</th>
                    <th className="py-3 px-4">Rincian Barang</th>
                    <th className="py-3 px-4 text-center">Total Qty</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Sinkronisasi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReceipts.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onViewReceipt(r)}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-800 whitespace-nowrap">
                        {r.handoverNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div>{r.date}</div>
                        {r.time && <div className="text-[10px] text-slate-400">{r.time}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {r.expedition === 'Lainnya' && r.expeditionCustomName
                            ? r.expeditionCustomName
                            : r.expedition}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Kurir: {r.courierName} {r.vehiclePlate ? `(${r.vehiclePlate})` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          {(r.items || []).slice(0, 2).map((it, i) => (
                            <div key={i} className="text-slate-800 truncate text-[11px]">
                              &bull; <strong>{it.name}</strong>: {it.quantity} {it.unit}
                            </div>
                          ))}
                          {(r.items || []).length > 2 && (
                            <span className="text-[10px] text-slate-400 italic">
                              + {r.items.length - 2} item lainnya...
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 whitespace-nowrap">
                        {r.totalQuantity} Item
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'Diterima Lengkap'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'Diterima Sebagian'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {r.syncedToSheets ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sheets
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Lokal
                          </span>
                        )}
                      </td>
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(r)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Lihat / Cetak BAST"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingReceipt(r)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Tanda Terima"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer Note */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan <strong>{filteredReceipts.length}</strong> dari{' '}
            <strong>{receipts.length}</strong> total
          </span>
          {spreadsheetInfo && (
            <span className="text-[11px] hidden sm:inline">
              Tab &lsquo;{spreadsheetInfo.sheetName}&rsquo;
            </span>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Destructive Delete */}
      <ConfirmModal
        isOpen={Boolean(deletingReceipt)}
        title="Hapus Tanda Terima Serah Terima Ini?"
        message={`Apakah Anda yakin ingin menghapus dokumen serah terima "${deletingReceipt?.handoverNumber}" dari ekspedisi "${deletingReceipt?.expedition}"? Tindakan ini tidak dapat dibatalkan.`}
        detail={
          deletingReceipt?.syncedToSheets
            ? `Data akan dihapus dari riwayat aplikasi dan baris data terkait di Google Spreadsheet.`
            : `Data akan dihapus dari riwayat aplikasi lokal.`
        }
        confirmLabel="Ya, Hapus Data"
        cancelLabel="Batal"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingReceipt(null)}
      />
    </div>
  );
};
