export type ExpeditionName =
  | 'J&T Express'
  | 'SiCepat Ekspres'
  | 'Shopee Xpress (SPX)'
  | 'JNE Express'
  | 'Anteraja'
  | 'Ninja Xpress'
  | 'Lion Parcel'
  | 'Pos Indonesia'
  | 'Wahana Logistik'
  | 'IDexpress'
  | 'Lainnya';

export type ItemCategory =
  | 'Label Thermal'
  | 'Plastik Polymailer'
  | 'Lakban Ekspedisi'
  | 'Karung Packing'
  | 'Kantong Tempel Resi'
  | 'Lainnya';

export type ItemUnit =
  | 'Rol'
  | 'Pack'
  | 'Ikat / Bundel'
  | 'Lembar'
  | 'Pcs'
  | 'Dus / Box'
  | 'Rim'
  | 'Karung';

export type ItemCondition = 'Lengkap & Baik' | 'Segel Utuh' | 'Rusak / Basah' | 'Kuantitas Kurang';

export interface HandoverSupplyItem {
  id: string;
  category: ItemCategory;
  name: string; // e.g. "Label Thermal 100x150mm" or "Plastik Polymailer 25x35cm"
  sizeOrSpec?: string; // e.g. "100x150 mm", "30x40 cm tebal 0.05", "48mm x 90m"
  quantity: number;
  unit: ItemUnit;
  condition: ItemCondition;
  notes?: string;
}

export interface HandoverRecord {
  id: string;
  handoverNumber: string; // e.g. BAST-EXP-20261010-001
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  expedition: ExpeditionName;
  expeditionCustomName?: string;
  courierName: string; // Nama Driver / Petugas Ekspedisi
  courierPhone?: string; // Kontak kurir
  vehiclePlate?: string; // No. Polisi kendaraan kurir
  referenceNumber?: string; // No. Surat Jalan / No. DO / AWB Ekspedisi

  // Warehouse / Store (Receiver)
  warehouseName: string; // Nama Gudang / Toko
  warehouseLocation?: string; // Alamat / Lokasi Gudang
  receiverName: string; // Nama PIC Gudang / Staff Penerima

  // Items
  items: HandoverSupplyItem[];
  totalQuantity: number;

  // General Status & Notes
  status: 'Diterima Lengkap' | 'Diterima Sebagian' | 'Ada Catatan Khusus';
  notes?: string;

  // Digital Signatures
  courierSignature?: string; // Tanda tangan kurir ekspedisi (Data URL)
  receiverSignature?: string; // Tanda tangan penerima gudang (Data URL)

  // Sync state
  syncedToSheets?: boolean;
  sheetsRowIndex?: number;
  createdAt: string;
}

export interface WarehouseProfile {
  warehouseName: string;
  warehouseAddress: string;
  contactPhone: string;
  defaultReceiverName: string;
  defaultExpeditions: string[];
  defaultNotes: string;
}

export interface SpreadsheetInfo {
  id: string;
  title: string;
  url: string;
  sheetName: string;
}
