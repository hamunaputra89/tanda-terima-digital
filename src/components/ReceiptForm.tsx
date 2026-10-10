import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  Calendar,
  User,
  Phone,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  FileCheck,
  Building,
  PenTool,
  MapPin,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ExpeditionName,
  HandoverRecord,
  HandoverSupplyItem,
  WarehouseProfile,
  SpreadsheetInfo,
  ItemCategory,
  ItemUnit,
  ItemCondition,
} from '../types/receipt';
import { SignaturePad } from './SignaturePad';

interface ReceiptFormProps {
  warehouseProfile: WarehouseProfile;
  spreadsheetInfo: SpreadsheetInfo | null;
  isAuthenticated: boolean;
  onSaveRecord: (record: HandoverRecord) => Promise<boolean>;
  onUpdateProfile?: (updated: WarehouseProfile) => void;
  onOpenSettings: () => void;
}

const EXPEDITION_LIST: ExpeditionName[] = [
  'J&T Express',
  'SiCepat Ekspres',
  'Shopee Xpress (SPX)',
  'JNE Express',
  'Anteraja',
  'Ninja Xpress',
  'Lion Parcel',
  'Pos Indonesia',
  'Wahana Logistik',
  'IDexpress',
  'Lainnya',
];

const PRESET_ITEMS = [
  {
    category: 'Label Thermal' as ItemCategory,
    name: 'Label Thermal 100x150 mm',
    sizeOrSpec: '100x150 mm (500 lbr/rol)',
    unit: 'Rol' as ItemUnit,
  },
  {
    category: 'Label Thermal' as ItemCategory,
    name: 'Label Thermal 100x100 mm',
    sizeOrSpec: '100x100 mm (500 lbr/rol)',
    unit: 'Rol' as ItemUnit,
  },
  {
    category: 'Plastik Polymailer' as ItemCategory,
    name: 'Plastik Polymailer 17x30 cm',
    sizeOrSpec: '17x30 cm (Ukuran S)',
    unit: 'Pack' as ItemUnit,
  },
  {
    category: 'Plastik Polymailer' as ItemCategory,
    name: 'Plastik Polymailer 25x35 cm',
    sizeOrSpec: '25x35 cm (Ukuran M)',
    unit: 'Pack' as ItemUnit,
  },
  {
    category: 'Plastik Polymailer' as ItemCategory,
    name: 'Plastik Polymailer 28x42 cm',
    sizeOrSpec: '28x42 cm (Ukuran L)',
    unit: 'Pack' as ItemUnit,
  },
  {
    category: 'Plastik Polymailer' as ItemCategory,
    name: 'Plastik Polymailer 35x50 cm',
    sizeOrSpec: '35x50 cm (Ukuran XL)',
    unit: 'Pack' as ItemUnit,
  },
  {
    category: 'Lakban Ekspedisi' as ItemCategory,
    name: 'Lakban Berlogo Ekspedisi',
    sizeOrSpec: '48 mm x 90 m',
    unit: 'Rol' as ItemUnit,
  },
  {
    category: 'Kantong Tempel Resi' as ItemCategory,
    name: 'Kantong Tempel Resi (Waybill Pouch)',
    sizeOrSpec: '15x20 cm',
    unit: 'Pack' as ItemUnit,
  },
  {
    category: 'Karung Packing' as ItemCategory,
    name: 'Karung Packing Ekspedisi',
    sizeOrSpec: 'Ukuran Besar',
    unit: 'Pcs' as ItemUnit,
  },
];

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  warehouseProfile,
  spreadsheetInfo,
  isAuthenticated,
  onSaveRecord,
  onUpdateProfile,
  onOpenSettings,
}) => {
  const generateHandoverNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `BAST-EXP-${dateStr}-${randomNum}`;
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentTimeStr = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const [handoverNumber, setHandoverNumber] = useState(generateHandoverNumber());
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(currentTimeStr);

  // Expedition & Courier (Clean inputs ready for direct entry)
  const [expedition, setExpedition] = useState<ExpeditionName>('J&T Express');
  const [expeditionCustomName, setExpeditionCustomName] = useState('');
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  // Warehouse & Receiver (Fully editable!)
  const [warehouseName, setWarehouseName] = useState(warehouseProfile.warehouseName || '');
  const [warehouseLocation, setWarehouseLocation] = useState(warehouseProfile.warehouseAddress || '');
  const [warehousePhone, setWarehousePhone] = useState(warehouseProfile.contactPhone || '');
  const [receiverName, setReceiverName] = useState(warehouseProfile.defaultReceiverName || '');
  const [notes, setNotes] = useState(warehouseProfile.defaultNotes || '');
  const [saveAsDefaultProfile, setSaveAsDefaultProfile] = useState(true);

  // Supply Items - Clean starter item (ready for real user input)
  const [items, setItems] = useState<HandoverSupplyItem[]>([
    {
      id: '1',
      category: 'Label Thermal',
      name: '',
      sizeOrSpec: '',
      quantity: 1,
      unit: 'Rol',
      condition: 'Lengkap & Baik',
      notes: '',
    },
  ]);

  const [status, setStatus] = useState<'Diterima Lengkap' | 'Diterima Sebagian' | 'Ada Catatan Khusus'>(
    'Diterima Lengkap'
  );

  // Quick clear
  const handleResetForm = () => {
    setCourierName('');
    setCourierPhone('');
    setVehiclePlate('');
    setReferenceNumber('');
    setCourierSignature('');
    setReceiverSignature('');
    setItems([
      {
        id: Date.now().toString(),
        category: 'Label Thermal',
        name: '',
        sizeOrSpec: '',
        quantity: 1,
        unit: 'Rol',
        condition: 'Lengkap & Baik',
        notes: '',
      },
    ]);
  };

  // Signatures
  const [courierSignature, setCourierSignature] = useState<string>('');
  const [receiverSignature, setReceiverSignature] = useState<string>('');
  const [signingParty, setSigningParty] = useState<'courier' | 'receiver' | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Sync when warehouseProfile changes from parent or settings modal
  useEffect(() => {
    if (warehouseProfile) {
      if (warehouseProfile.warehouseName) setWarehouseName(warehouseProfile.warehouseName);
      if (warehouseProfile.warehouseAddress) setWarehouseLocation(warehouseProfile.warehouseAddress);
      if (warehouseProfile.contactPhone) setWarehousePhone(warehouseProfile.contactPhone);
      if (warehouseProfile.defaultReceiverName) setReceiverName(warehouseProfile.defaultReceiverName);
      if (warehouseProfile.defaultNotes && !notes) setNotes(warehouseProfile.defaultNotes);
    }
  }, [warehouseProfile]);

  const handleAddItem = (preset?: typeof PRESET_ITEMS[0]) => {
    if (preset) {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          category: preset.category,
          name: preset.name,
          sizeOrSpec: preset.sizeOrSpec,
          quantity: 1,
          unit: preset.unit,
          condition: 'Lengkap & Baik',
          notes: '',
        },
      ]);
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          category: 'Plastik Polymailer',
          name: '',
          sizeOrSpec: '',
          quantity: 1,
          unit: 'Pack',
          condition: 'Lengkap & Baik',
          notes: '',
        },
      ]);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof HandoverSupplyItem,
    value: any
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalQuantity = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!courierName.trim()) {
      setFeedbackMessage({
        type: 'error',
        text: 'Harap isi nama kurir / driver yang menyerahkan perlengkapan!',
      });
      return;
    }

    if (!warehouseName.trim()) {
      setFeedbackMessage({
        type: 'error',
        text: 'Harap isi nama gudang / toko penerima!',
      });
      return;
    }

    if (!receiverName.trim()) {
      setFeedbackMessage({
        type: 'error',
        text: 'Harap isi nama PIC gudang / penerima!',
      });
      return;
    }

    const validItems = items.filter((it) => it.name.trim() !== '' && it.quantity > 0);
    if (validItems.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Minimal tambahkan 1 item perlengkapan (Label / Plastik) yang diserahkan!',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    // Save/update warehouse profile if user opted to save as default
    if (onUpdateProfile && saveAsDefaultProfile) {
      onUpdateProfile({
        ...warehouseProfile,
        warehouseName: warehouseName.trim(),
        warehouseAddress: warehouseLocation.trim(),
        contactPhone: warehousePhone.trim(),
        defaultReceiverName: receiverName.trim(),
      });
    }

    const record: HandoverRecord = {
      id: `bast-${Date.now()}`,
      handoverNumber: handoverNumber.trim() || generateHandoverNumber(),
      date,
      time,
      expedition,
      expeditionCustomName: expedition === 'Lainnya' ? expeditionCustomName : undefined,
      courierName: courierName.trim(),
      courierPhone: courierPhone.trim() || undefined,
      vehiclePlate: vehiclePlate.trim() || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      warehouseName: warehouseName.trim(),
      warehouseLocation: warehouseLocation.trim() || undefined,
      receiverName: receiverName.trim(),
      items: validItems,
      totalQuantity,
      status,
      notes: notes.trim() || undefined,
      courierSignature: courierSignature || undefined,
      receiverSignature: receiverSignature || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      const success = await onSaveRecord(record);
      if (success) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch (_) {}

        setFeedbackMessage({
          type: 'success',
          text: isAuthenticated
            ? 'Tanda terima serah terima perlengkapan berhasil dibuat & dicatat otomatis ke Google Sheets!'
            : 'Tanda terima serah terima perlengkapan berhasil dibuat & tersimpan di riwayat lokal!',
        });

        // Reset courier fields for next handover (preserve warehouse info!)
        setHandoverNumber(generateHandoverNumber());
        setCourierName('');
        setCourierPhone('');
        setVehiclePlate('');
        setReferenceNumber('');
        setCourierSignature('');
        setReceiverSignature('');
        setNotes(warehouseProfile.defaultNotes || '');
        setItems([
          {
            id: Date.now().toString(),
            category: 'Label Thermal',
            name: '',
            sizeOrSpec: '',
            quantity: 1,
            unit: 'Rol',
            condition: 'Lengkap & Baik',
            notes: '',
          },
        ]);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Gagal menyimpan tanda terima.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs sm:shadow-sm p-3 sm:p-6 lg:p-8">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 sm:pb-5 border-b border-slate-100 gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 sm:p-2 bg-emerald-100/70 text-emerald-800 rounded-lg sm:rounded-xl shrink-0">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
          </span>
          <div>
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
              Tanda Terima Serah Terima Ekspedisi
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Penerimaan perlengkapan (Label resi, polymailer, lakban, karung)
            </p>
          </div>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-2.5 py-1 sm:py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Kosongkan isian form kurir & barang"
          >
            Form Baru
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1 sm:p-1.5 px-2 sm:px-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer border border-slate-200"
            title="Kelola Profil Gudang & Bawaan"
          >
            <Building className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-medium">Profil Gudang</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`mt-3 p-2.5 sm:p-3.5 rounded-xl text-xs flex items-start gap-2 animate-in fade-in duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <FileCheck className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="leading-snug font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 sm:mt-6 space-y-3 sm:space-y-5">
        {/* Nomor BAST, Tanggal & Jam (Compact 2-col on mobile, 3-col on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
              No. Tanda Terima / BAST
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={handoverNumber}
                onChange={(e) => setHandoverNumber(e.target.value)}
                className="w-full pl-2.5 pr-8 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setHandoverNumber(generateHandoverNumber())}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 p-0.5 cursor-pointer"
                title="Acak / Buat Baru Nomor"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
              Tanggal Serah Terima
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-7 sm:pl-9 pr-2 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="col-span-1">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
              Jam Penerimaan
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="Contoh: 10:15 WIB"
              className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Pihak Penyerah: Ekspedisi & Kurir (Compact 2x2 grid on mobile) */}
        <div className="p-2.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2.5 sm:space-y-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Truck className="w-4 h-4 text-emerald-700" />
            <span>Pihak Penyerah (Ekspedisi & Kurir)</span>
          </div>

          {/* Quick Expedition Selector - Sleek & Compact */}
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <label className="text-[11px] sm:text-xs font-medium text-slate-600">
                Pilih Ekspedisi:
              </label>
              {/* Dropdown for any expedition */}
              <select
                value={expedition}
                onChange={(e) => setExpedition(e.target.value as ExpeditionName)}
                className="text-[11px] py-1 px-2 border border-slate-200 rounded-md bg-white text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
              >
                {EXPEDITION_LIST.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick chips (Top 4 most common) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {(['J&T Express', 'Shopee Xpress (SPX)', 'SiCepat Ekspres', 'JNE Express'] as ExpeditionName[]).map((exp) => (
                <button
                  key={exp}
                  type="button"
                  onClick={() => setExpedition(exp)}
                  className={`px-2 py-0.5 text-[11px] rounded-md border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    expedition === exp
                      ? 'bg-emerald-700 text-white font-semibold border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {exp}
                </button>
              ))}
            </div>

            {expedition === 'Lainnya' && (
              <input
                type="text"
                placeholder="Tuliskan nama ekspedisi..."
                value={expeditionCustomName}
                onChange={(e) => setExpeditionCustomName(e.target.value)}
                className="mt-1.5 w-full sm:w-72 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            )}
          </div>

          {/* Kurir Fields: 2x2 grid on mobile, 4-col on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-slate-700 mb-1">
                Nama Kurir / Driver <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Mas Joko"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-slate-700 mb-1">
                No. HP / WA Kurir
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="0812-xxxx-xxxx"
                  value={courierPhone}
                  onChange={(e) => setCourierPhone(e.target.value)}
                  className="w-full pl-7 sm:pl-8 pr-2 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <Phone className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-slate-700 mb-1">
                Plat Nomor Kendaraan
              </label>
              <input
                type="text"
                placeholder="B 1234 XYZ"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-slate-700 mb-1">
                No. Surat Jalan / DO
              </label>
              <input
                type="text"
                placeholder="SJ-JT-982103"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Pihak Penerima (Gudang & Staff) - Compact on Mobile */}
        <div className="p-2.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>Pihak Penerima (Info Gudang & Staff)</span>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
            >
              Pengaturan &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-slate-700 mb-1">
                Nama Gudang / Toko <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Gudang Logistik Utama"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-slate-700 mb-1">
                Nama PIC / Staff Penerima <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Rian (Admin Gudang)"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Alamat Gudang</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Pergudangan Blok B-12"
                value={warehouseLocation}
                onChange={(e) => setWarehouseLocation(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>No. Telp Gudang</span>
              </label>
              <input
                type="text"
                placeholder="0812-3456-7890"
                value={warehousePhone}
                onChange={(e) => setWarehousePhone(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-0.5 flex items-center justify-between gap-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveAsDefaultProfile}
                onChange={(e) => setSaveAsDefaultProfile(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[11px] text-slate-600">
                Simpan info gudang ini sebagai bawaan
              </span>
            </label>
            {onUpdateProfile && (
              <button
                type="button"
                onClick={() => {
                  onUpdateProfile({
                    ...warehouseProfile,
                    warehouseName: warehouseName.trim(),
                    warehouseAddress: warehouseLocation.trim(),
                    contactPhone: warehousePhone.trim(),
                    defaultReceiverName: receiverName.trim(),
                  });
                }}
                className="px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-md transition-colors cursor-pointer"
              >
                Simpan
              </button>
            )}
          </div>
        </div>

        {/* Rincian Barang Perlengkapan - Mobile-First Compact Architecture */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-700" />
                <span>Rincian Barang Serah Terima</span>
              </label>
            </div>

            {/* Quick Add Presets in single-line horizontal scroll */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
              <span className="text-[10px] text-slate-400 mr-0.5 shrink-0">Preset:</span>
              <button
                type="button"
                onClick={() => handleAddItem(PRESET_ITEMS[0])}
                className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-md transition-colors cursor-pointer shrink-0"
              >
                + Label 100x150
              </button>
              <button
                type="button"
                onClick={() => handleAddItem(PRESET_ITEMS[2])}
                className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-md transition-colors cursor-pointer shrink-0"
              >
                + Plastik 17x30
              </button>
              <button
                type="button"
                onClick={() => handleAddItem(PRESET_ITEMS[3])}
                className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-md transition-colors cursor-pointer shrink-0"
              >
                + Plastik 25x35
              </button>
              <button
                type="button"
                onClick={() => handleAddItem(PRESET_ITEMS[6])}
                className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-md transition-colors cursor-pointer shrink-0"
              >
                + Lakban
              </button>
            </div>
          </div>

          {/* Items Container */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-2 sm:p-3 space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2 sm:space-y-0"
              >
                {/* Mobile View Layout (Clean & Compact) */}
                <div className="block sm:hidden space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-[11px] font-bold text-emerald-800">
                      Baris #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Nama Barang (misal: Label Thermal / Plastik)"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Ukuran / Spek (100x150 mm)"
                      value={item.sizeOrSpec || ''}
                      onChange={(e) => handleItemChange(idx, 'sizeOrSpec', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />

                    {/* Quantity & Unit in 1 row */}
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-16 px-2 py-1.5 text-xs text-center border border-slate-200 rounded-md font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value as ItemUnit)}
                        className="flex-1 px-1.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      >
                        <option value="Rol">Rol</option>
                        <option value="Pack">Pack</option>
                        <option value="Ikat / Bundel">Ikat</option>
                        <option value="Dus / Box">Dus</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Karung">Karung</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <select
                      value={item.condition}
                      onChange={(e) =>
                        handleItemChange(idx, 'condition', e.target.value as ItemCondition)
                      }
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="Lengkap & Baik">Kondisi: Lengkap & Baik</option>
                      <option value="Segel Utuh">Kondisi: Segel Utuh</option>
                      <option value="Rusak / Basah">Kondisi: Rusak / Basah</option>
                      <option value="Kuantitas Kurang">Kondisi: Kuantitas Kurang</option>
                    </select>
                  </div>
                </div>

                {/* Desktop View Layout (12-col grid) */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Nama Barang / Item
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Label Thermal / Plastik"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Ukuran / Spesifikasi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 100x150 mm / 25x35 cm"
                      value={item.sizeOrSpec || ''}
                      onChange={(e) => handleItemChange(idx, 'sizeOrSpec', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2 flex gap-1">
                    <div className="w-16">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Jumlah
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity || ''}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-2 py-1.5 text-xs text-center border border-slate-200 rounded-md font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Satuan
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value as ItemUnit)}
                        className="w-full px-1.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      >
                        <option value="Rol">Rol</option>
                        <option value="Pack">Pack</option>
                        <option value="Ikat / Bundel">Ikat</option>
                        <option value="Dus / Box">Dus / Box</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Lembar">Lembar</option>
                        <option value="Rim">Rim</option>
                        <option value="Karung">Karung</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Kondisi Fisik
                    </label>
                    <select
                      value={item.condition}
                      onChange={(e) =>
                        handleItemChange(idx, 'condition', e.target.value as ItemCondition)
                      }
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="Lengkap & Baik">Lengkap & Baik</option>
                      <option value="Segel Utuh">Segel Utuh</option>
                      <option value="Rusak / Basah">Rusak / Basah</option>
                      <option value="Kuantitas Kurang">Kurang</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex items-end justify-center pt-2 sm:pt-0">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="inline-flex items-center gap-1 px-2.5 py-1 sm:py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris
              </button>
              <div className="text-right text-xs">
                <span className="text-slate-500 mr-1.5">Total:</span>
                <span className="font-bold text-emerald-800 text-xs sm:text-sm">
                  {totalQuantity} Item
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Penerimaan & Catatan (Compact) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
              Status Serah Terima
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="Diterima Lengkap">Diterima Lengkap (Sesuai)</option>
              <option value="Diterima Sebagian">Diterima Sebagian (Ada Sisa)</option>
              <option value="Ada Catatan Khusus">Ada Catatan Khusus / Klaim</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
              Catatan Serah Terima / Keterangan
            </label>
            <input
              type="text"
              placeholder="Contoh: Dus label tersegel utuh, plastik diterima sesuai."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Tanda Tangan Digital Dua Pihak (Side-by-side on mobile too!) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-1">
          {/* Tanda Tangan Kurir */}
          <div className="border border-slate-200 rounded-xl p-2 sm:p-3 bg-slate-50">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate flex items-center gap-1">
                <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">TTD Kurir</span>
              </span>
              <button
                type="button"
                onClick={() => setSigningParty('courier')}
                className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <PenTool className="w-3 h-3 text-emerald-600" />
                <span>{courierSignature ? 'Ubah' : 'Tanda Tangan'}</span>
              </button>
            </div>

            <div className="h-16 sm:h-20 bg-white rounded-lg border border-dashed border-slate-200 flex items-center justify-center p-1.5">
              {courierSignature ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={courierSignature}
                    alt="TTD Kurir"
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setCourierSignature('')}
                    className="absolute right-0.5 top-0.5 text-[9px] sm:text-[10px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <span className="text-[10px] sm:text-xs italic text-slate-400 text-center line-clamp-2">
                  {courierName ? `TTD ${courierName}` : 'Klik untuk tanda tangan'}
                </span>
              )}
            </div>
          </div>

          {/* Tanda Tangan Penerima */}
          <div className="border border-slate-200 rounded-xl p-2 sm:p-3 bg-slate-50">
            <div className="flex items-center justify-between mb-1.5 gap-1">
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate flex items-center gap-1">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">TTD Staff</span>
              </span>
              <button
                type="button"
                onClick={() => setSigningParty('receiver')}
                className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <PenTool className="w-3 h-3 text-emerald-600" />
                <span>{receiverSignature ? 'Ubah' : 'Tanda Tangan'}</span>
              </button>
            </div>

            <div className="h-16 sm:h-20 bg-white rounded-lg border border-dashed border-slate-200 flex items-center justify-center p-1.5">
              {receiverSignature ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={receiverSignature}
                    alt="TTD Penerima"
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiverSignature('')}
                    className="absolute right-0.5 top-0.5 text-[9px] sm:text-[10px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <span className="text-[10px] sm:text-xs italic text-slate-400 text-center line-clamp-2">
                  {receiverName ? `TTD ${receiverName}` : 'Klik untuk tanda tangan'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[11px] sm:text-xs text-slate-500 text-center sm:text-left">
            {spreadsheetInfo ? (
              <span>
                Otomatis dicatat ke Sheets: <strong className="text-slate-700">{spreadsheetInfo.title}</strong>
              </span>
            ) : (
              <span>Otomatis tersimpan aman di cloud</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-200" />
            )}
            <span>
              {isSubmitting
                ? 'Menyimpan & Mencatat...'
                : 'Terbitkan Tanda Terima (BAST)'}
            </span>
          </button>
        </div>
      </form>

      {/* Signature Pad Modal */}
      {signingParty && (
        <SignaturePad
          initialSignature={signingParty === 'courier' ? courierSignature : receiverSignature}
          defaultName={signingParty === 'courier' ? courierName : receiverName}
          onSave={(dataUrl) => {
            if (signingParty === 'courier') setCourierSignature(dataUrl);
            if (signingParty === 'receiver') setReceiverSignature(dataUrl);
            setSigningParty(null);
          }}
          onCancel={() => setSigningParty(null)}
        />
      )}
    </div>
  );
};
