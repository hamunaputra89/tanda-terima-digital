import React, { useState, useEffect } from 'react';
import {
  Truck,
  History,
  FileSpreadsheet,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Package,
  Cloud,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setAccessToken,
  TARGET_USER_EMAIL,
  testFirestoreConnection,
} from './services/firebase';
import {
  findOrCreateReceiptsSpreadsheet,
  appendReceiptToSheet,
  fetchReceiptsFromSheet,
  deleteReceiptRowFromSheet,
} from './services/googleSheets';
import {
  saveHandoverRecordToFirestore,
  subscribeToHandoverRecords,
  deleteHandoverRecordFromFirestore,
  saveWarehouseProfileToFirestore,
  loadWarehouseProfileFromFirestore,
} from './services/firestoreService';
import { HandoverRecord, WarehouseProfile, SpreadsheetInfo } from './types/receipt';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { ReceiptForm } from './components/ReceiptForm';
import { ReceiptHistory } from './components/ReceiptHistory';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { BusinessSettingsModal } from './components/BusinessSettingsModal';

const LOCAL_STORAGE_RECORDS = 'exp_handover_records';
const LOCAL_STORAGE_PROFILE = 'exp_warehouse_profile';
const LOCAL_STORAGE_SHEET_INFO = 'exp_sheet_info';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Cloud Firestore sync status
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // Warehouse profile
  const [warehouseProfile, setWarehouseProfile] = useState<WarehouseProfile>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PROFILE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return {
      warehouseName: 'GUDANG LOGISTIK & PACKING',
      warehouseAddress: 'Jl. Daan Mogot KM 11, Komplek Pergudangan Sentra, Jakarta Barat',
      contactPhone: '0812-3456-7890',
      defaultReceiverName: 'Admin Logistik',
      defaultExpeditions: ['J&T Express', 'SiCepat Ekspres', 'Shopee Xpress (SPX)', 'JNE Express'],
      defaultNotes: 'Barang diterima dalam kondisi tersegel baik dan jumlah sesuai.',
    };
  });

  // Handover records list
  const [receipts, setReceipts] = useState<HandoverRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_RECORDS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  });

  // Google Spreadsheet info
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<SpreadsheetInfo | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_SHEET_INFO);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return null;
  });

  // UI state
  const [isInitializingSheets, setIsInitializingSheets] = useState(false);
  const [isLoadingFromSheets, setIsLoadingFromSheets] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<HandoverRecord | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [statusToast, setStatusToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setStatusToast({ type, message });
    setTimeout(() => {
      setStatusToast(null);
    }, 4000);
  };

  // Sync receipts to localStorage as fallback
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_RECORDS, JSON.stringify(receipts));
  }, [receipts]);

  // Sync warehouseProfile to localStorage & Firestore
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_PROFILE, JSON.stringify(warehouseProfile));
  }, [warehouseProfile]);

  // Sync spreadsheetInfo to localStorage
  useEffect(() => {
    if (spreadsheetInfo) {
      localStorage.setItem(LOCAL_STORAGE_SHEET_INFO, JSON.stringify(spreadsheetInfo));
    }
  }, [spreadsheetInfo]);

  // Real-time Firestore auto-sync on mount (Works 100% without manual login!)
  useEffect(() => {
    testFirestoreConnection();

    // Listen to cloud records in real time
    const unsubscribeFirestore = subscribeToHandoverRecords(
      (cloudRecords) => {
        setIsCloudConnected(true);
        if (cloudRecords && cloudRecords.length > 0) {
          setReceipts(cloudRecords);
        }
      },
      (err) => {
        console.warn('Firestore subscription notice:', err.message);
      }
    );

    // Load cloud warehouse profile if exists and local hasn't been set
    loadWarehouseProfileFromFirestore().then((cloudProf) => {
      if (cloudProf && !localStorage.getItem(LOCAL_STORAGE_PROFILE)) {
        setWarehouseProfile(cloudProf);
      }
    }).catch(() => {});

    return () => {
      unsubscribeFirestore();
    };
  }, []);

  // Initialize Auth on mount with session detection
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
        setAccessToken(authToken);
        await initSpreadsheetConnection(authToken);
      },
      (detectedUser) => {
        if (!detectedUser.isAnonymous) {
          setUser(detectedUser);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Initialize or discover spreadsheet in user's Google Drive
  const initSpreadsheetConnection = async (authToken: string) => {
    setIsInitializingSheets(true);
    try {
      const sheet = await findOrCreateReceiptsSpreadsheet(authToken);
      setSpreadsheetInfo(sheet);

      // Load existing records from sheet if needed
      try {
        const sheetRows = await fetchReceiptsFromSheet(authToken, sheet.id);
        if (sheetRows.length > 0) {
          setReceipts((prev) => {
            const existingNumbers = new Set(prev.map((r) => r.handoverNumber));
            const newFromSheet = sheetRows.filter(
              (r) => !existingNumbers.has(r.handoverNumber)
            );
            return [...prev, ...newFromSheet];
          });
        }
      } catch (loadErr) {
        console.warn('Could not load existing rows from sheet:', loadErr);
      }

      showToast('success', `Tersambung ke Google Spreadsheet: "${sheet.title}"`);
    } catch (err: any) {
      console.error('Error connecting spreadsheet:', err);
      showToast('error', `Gagal menghubungkan Spreadsheet: ${err.message}`);
    } finally {
      setIsInitializingSheets(false);
    }
  };

  // Sign in handler
  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const targetHint = user?.email || TARGET_USER_EMAIL;
      const result = await googleSignIn(targetHint);
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        await initSpreadsheetConnection(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      showToast('error', err.message || 'Gagal masuk dengan Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      showToast('info', 'Anda telah keluar dari akun Google.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Save new handover record handler (Auto-syncs immediately without login!)
  const handleSaveRecord = async (newRecord: HandoverRecord): Promise<boolean> => {
    let savedRecord = { ...newRecord };

    // 1. Instantly save to Cloud Firestore (Works with ZERO LOGIN needed!)
    try {
      await saveHandoverRecordToFirestore(savedRecord);
      savedRecord.syncedToSheets = true;
      setIsCloudConnected(true);
    } catch (fsErr) {
      console.warn('Firestore auto-save notice:', fsErr);
    }

    // 2. Also append to Google Sheets if token is available
    const activeToken = token || (await getAccessToken());
    if (activeToken && spreadsheetInfo) {
      try {
        await appendReceiptToSheet(activeToken, spreadsheetInfo.id, savedRecord);
      } catch (sheetErr) {
        console.warn('Optional sheets append skipped:', sheetErr);
      }
    }

    setReceipts((prev) => {
      const exists = prev.some((r) => r.id === savedRecord.id);
      return exists ? prev : [savedRecord, ...prev];
    });

    // Open receipt preview right after creation
    setSelectedReceipt(savedRecord);

    return true;
  };

  // Refresh data from Google Sheets
  const handleRefreshFromSheets = async () => {
    const activeToken = token || (await getAccessToken());
    if (!activeToken || !spreadsheetInfo) return;

    setIsLoadingFromSheets(true);
    try {
      const rows = await fetchReceiptsFromSheet(activeToken, spreadsheetInfo.id);
      setReceipts((prev) => {
        const sheetNumbers = new Set(rows.map((r) => r.handoverNumber));
        const unsyncedLocal = prev.filter(
          (r) => !sheetNumbers.has(r.handoverNumber)
        );
        return [...unsyncedLocal, ...rows];
      });
      showToast('success', 'Data riwayat berhasil disinkronkan dari Google Sheets!');
    } catch (err: any) {
      console.error('Refresh from sheets error:', err);
      showToast('error', `Gagal memuat dari Sheets: ${err.message}`);
    } finally {
      setIsLoadingFromSheets(false);
    }
  };

  // Sync unsynced local receipts to Google Sheets
  const handleSyncLocalToSheets = async () => {
    let activeToken = token || (await getAccessToken());
    if (!activeToken) {
      const signResult = await googleSignIn(user?.email || TARGET_USER_EMAIL);
      if (signResult) {
        activeToken = signResult.accessToken;
        setToken(signResult.accessToken);
        if (!spreadsheetInfo) {
          await initSpreadsheetConnection(signResult.accessToken);
        }
      } else {
        showToast('error', 'Silakan hubungkan Google terlebih dahulu.');
        return;
      }
    }

    if (!spreadsheetInfo) {
      showToast('error', 'Spreadsheet belum siap.');
      return;
    }

    let successCount = 0;
    for (const record of receipts) {
      try {
        await appendReceiptToSheet(activeToken, spreadsheetInfo.id, record);
        successCount++;
      } catch (err) {
        console.error(`Failed to sync ${record.handoverNumber}:`, err);
      }
    }

    showToast('success', `${successCount} serah terima berhasil dicatat ke Google Sheets!`);
  };

  // Delete handover record with sync
  const handleDeleteReceipt = async (recordToDelete: HandoverRecord) => {
    // 1. Delete from Cloud Firestore
    try {
      await deleteHandoverRecordFromFirestore(recordToDelete.id);
    } catch (fsErr) {
      console.warn('Firestore delete notice:', fsErr);
    }

    // 2. Delete from Google Sheets if available
    const activeToken = token || (await getAccessToken());
    if (activeToken && spreadsheetInfo && recordToDelete.sheetsRowIndex) {
      try {
        await deleteReceiptRowFromSheet(
          activeToken,
          spreadsheetInfo.id,
          recordToDelete.sheetsRowIndex
        );
      } catch (err) {
        console.warn('Sheets delete notice:', err);
      }
    }

    setReceipts((prev) => prev.filter((r) => r.id !== recordToDelete.id));
    showToast('info', `Dokumen serah terima "${recordToDelete.handoverNumber}" telah dihapus.`);
  };

  const handleUpdateProfile = (updated: WarehouseProfile) => {
    setWarehouseProfile(updated);
    saveWarehouseProfileToFirestore(updated).catch(() => {});
    showToast('info', 'Info gudang berhasil diperbarui.');
  };

  const activeEmail = user?.email || TARGET_USER_EMAIL;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13 sm:h-16">
            {/* Logo & App Title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-1.5 truncate">
                  <span className="truncate">Tanda Terima Ekspedisi</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <Cloud className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-700" />
                    <span className="hidden xs:inline">Auto-Sync</span>
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block truncate">
                  Pencatatan serah terima perlengkapan tersimpan otomatis ke cloud
                </p>
              </div>
            </div>

            {/* Account & Action Bar */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {user && !user.isAnonymous ? (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl p-1 sm:p-1.5 pl-2 sm:pl-3">
                  <div className="flex items-center gap-1.5">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-slate-300 object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-700 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center">
                        {user.displayName ? user.displayName.charAt(0) : 'H'}
                      </div>
                    )}
                    <div className="text-left hidden md:block">
                      <p className="text-xs font-semibold text-slate-800 leading-none">
                        {user.displayName || 'Akun Google'}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5 max-w-44 truncate font-mono">
                        {activeEmail}
                      </p>
                    </div>
                  </div>

                  {token ? (
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-1.5 sm:px-2 py-0.5 rounded-md border border-emerald-300">
                      ● Sheets
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSignIn}
                      disabled={isLoggingIn}
                      className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md sm:rounded-lg shadow-2xs transition-colors cursor-pointer"
                      title="Sinkronkan ke Google Sheets di Drive"
                    >
                      {isLoggingIn ? '...' : 'Sheets'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 rounded-md sm:rounded-lg hover:bg-white transition-colors cursor-pointer"
                    title="Keluar dari akun Google"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Auto-Sync Aktif</span>
                  </div>
                  <GoogleSignInButton
                    onClick={handleSignIn}
                    loading={isLoggingIn || isInitializingSheets}
                    label="Hubungkan Sheets"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg sm:rounded-xl transition-colors cursor-pointer shrink-0"
                title="Pengaturan Profil Gudang"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Auto-Sync Status Bar (Compact 1-line on mobile) */}
      <div className="bg-white border-b border-slate-200/80 px-2.5 sm:px-6 py-1.5 sm:py-2 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 font-medium truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="hidden sm:inline">
              <strong>Auto-Sync Cloud:</strong> Setiap tanda terima otomatis tersimpan real-time ke database cloud.
            </span>
            <span className="sm:hidden truncate font-medium">
              Database Cloud Terhubung
            </span>

            {spreadsheetInfo && token && (
              <>
                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                <span className="text-emerald-700 font-medium items-center gap-1 hidden sm:flex">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Sheets: {spreadsheetInfo.title}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {spreadsheetInfo && (
              <a
                href={spreadsheetInfo.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                <span className="hidden sm:inline">Buka di Google Sheets</span>
                <span className="sm:hidden">Sheets</span>
                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </a>
            )}
            <div className="hidden sm:flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Aman & Terproteksi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed top-16 sm:top-20 right-3 sm:right-6 left-3 sm:left-auto z-50 max-w-md animate-in slide-in-from-top-4 duration-200 print:hidden">
          <div
            className={`p-3 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2 ${
              statusToast.type === 'success'
                ? 'bg-emerald-800 text-white border-emerald-700'
                : statusToast.type === 'error'
                ? 'bg-rose-800 text-white border-rose-700'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            {statusToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
            ) : statusToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />
            )}
            <span className="flex-1 leading-snug">{statusToast.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-2.5 sm:py-6 ${selectedReceipt ? 'print:hidden' : ''}`}>
        {/* Navigation Tabs - Sleek segmented control */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 mb-3 sm:mb-6 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Form BAST</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Riwayat</span>
            <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
              {receipts.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Create Handover */}
        {activeTab === 'create' && (
          <div className="max-w-4xl mx-auto">
            <ReceiptForm
              warehouseProfile={warehouseProfile}
              spreadsheetInfo={spreadsheetInfo}
              isAuthenticated={true}
              onSaveRecord={handleSaveRecord}
              onUpdateProfile={handleUpdateProfile}
              onOpenSettings={() => setShowSettingsModal(true)}
            />
          </div>
        )}

        {/* Tab 2: History & Spreadsheet */}
        {activeTab === 'history' && (
          <ReceiptHistory
            receipts={receipts}
            spreadsheetInfo={spreadsheetInfo}
            isAuthenticated={Boolean(token)}
            isLoadingFromSheets={isLoadingFromSheets}
            onRefreshFromSheets={handleRefreshFromSheets}
            onViewReceipt={(receipt) => setSelectedReceipt(receipt)}
            onDeleteReceipt={handleDeleteReceipt}
            onSyncLocalToSheets={handleSyncLocalToSheets}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            &copy; {new Date().getFullYear()} {warehouseProfile.warehouseName} &bull; Tanda Terima
            Serah Terima Ekspedisi Terintegrasi Cloud Auto-Sync
          </p>
          <p className="text-[11px] text-slate-400">
            Penyimpanan data cloud otomatis &bull; Siap ekspor spreadsheet (.csv) kapan saja
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ReceiptPreviewModal
        receipt={selectedReceipt}
        spreadsheetInfo={spreadsheetInfo}
        onClose={() => setSelectedReceipt(null)}
      />

      <BusinessSettingsModal
        isOpen={showSettingsModal}
        initialProfile={warehouseProfile}
        onSave={(updated) => {
          handleUpdateProfile(updated);
          showToast('success', 'Profil gudang berhasil disimpan ke cloud!');
        }}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
