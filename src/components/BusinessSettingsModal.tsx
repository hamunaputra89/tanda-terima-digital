import React, { useState, useEffect } from 'react';
import { Building2, X, Check, MapPin, Phone, UserCheck, Shield } from 'lucide-react';
import { WarehouseProfile } from '../types/receipt';

interface BusinessSettingsModalProps {
  isOpen: boolean;
  initialProfile: WarehouseProfile;
  onSave: (updated: WarehouseProfile) => void;
  onClose: () => void;
}

export const BusinessSettingsModal: React.FC<BusinessSettingsModalProps> = ({
  isOpen,
  initialProfile,
  onSave,
  onClose,
}) => {
  const [profile, setProfile] = useState<WarehouseProfile>(initialProfile);

  useEffect(() => {
    if (isOpen) {
      setProfile(initialProfile);
    }
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-lg w-full p-3.5 sm:p-6 border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Profil Gudang & Penerima</h3>
              <p className="text-xs text-slate-500">Informasi default pihak gudang pada tanda terima BAST</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Gudang / Toko / Perusahaan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Gudang Logistik Pusat / Toko Berkah Abadi"
              value={profile.warehouseName}
              onChange={(e) => setProfile({ ...profile, warehouseName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Lokasi / Alamat Gudang</span>
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Komplek Pergudangan Sentra Blok B-12, Jl. Daan Mogot, Jakarta Barat"
              value={profile.warehouseAddress}
              onChange={(e) => setProfile({ ...profile, warehouseAddress: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>No. Telp / WA Gudang</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 0812-3456-7890"
                value={profile.contactPhone}
                onChange={(e) => setProfile({ ...profile, contactPhone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>PIC / Staff Penerima Bawaan</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Admin Logistik / Rian"
                value={profile.defaultReceiverName}
                onChange={(e) => setProfile({ ...profile, defaultReceiverName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Bawaan Dokumen Serah Terima
            </label>
            <input
              type="text"
              placeholder="Contoh: Barang telah diperiksa fisik, segel utuh dan kuantitas sesuai."
              value={profile.defaultNotes}
              onChange={(e) => setProfile({ ...profile, defaultNotes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan Profil</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
