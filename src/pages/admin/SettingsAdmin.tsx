import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminLayout';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { storeService } from '../../services/storeService';
import { authService } from '../../services/authService';
import { migrationService } from '../../services/migrationService';
import { productService } from '../../services/productService';
import {
  getSupabaseConfig,
  reinitializeSupabase,
  testSupabaseFullConnection,
  getSupabaseShareUrl,
  SupabaseDiagnosticResult,
} from '../../services/supabase';
import { SCHEMA_SQL } from '../../services/schemaSql';
import { pushLocalDataToSupabase } from '../../services/syncHelper';
import { Profile, MigrationSummary, ProductAddon, UserRole, PromoCode } from '../../types/database';
import { StaffAccount } from '../../services/authService';
import { DEFAULT_ADDONS } from '../../services/mockData';
import {
  Store,
  Database,
  Users,
  UserPlus,
  Key,
  Shield,
  DownloadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Save,
  FileCode,
  QrCode,
  Printer,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Tag,
  Percent,
  Ticket,
  Check,
  RefreshCw,
  Smartphone,
  Share2,
  Code2,
} from 'lucide-react';

export const SettingsAdmin: React.FC = () => {
  const { storeSettings, toggleStoreStatus, refreshData } = useStore();
  const { user } = useAuth();

  // Tab
  const [tab, setTab] = useState<'store' | 'qris_receipt' | 'addons' | 'promo' | 'supabase' | 'users' | 'migration'>('store');

  // Store form state
  const [storeName, setStoreName] = useState(storeSettings.store_name);
  const [address, setAddress] = useState(storeSettings.address || '');
  const [phone, setPhone] = useState(storeSettings.phone || '');
  const [description, setDescription] = useState(storeSettings.description || '');
  const [isSavingStore, setIsSavingStore] = useState(false);

  // QRIS & Invoice state (Requirements 1 & 5)
  const [qrisImageUrl, setQrisImageUrl] = useState(storeSettings.qris_image_url || '');
  const [receiptLogoUrl, setReceiptLogoUrl] = useState(storeSettings.receipt_logo_url || '');
  const [receiptShowLogo, setReceiptShowLogo] = useState(storeSettings.receipt_show_logo !== false);
  const [receiptHeaderText, setReceiptHeaderText] = useState(storeSettings.receipt_header_text || '');
  const [receiptFooterText, setReceiptFooterText] = useState(storeSettings.receipt_footer_text || '');
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isUploadingQris, setIsUploadingQris] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Addons state (Requirement 4)
  const [addonsList, setAddonsList] = useState<ProductAddon[]>(
    storeSettings.available_addons && storeSettings.available_addons.length > 0
      ? storeSettings.available_addons
      : DEFAULT_ADDONS
  );
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState<number>(0);

  // Promo Codes state (Requirement 3 & 4)
  const [promoCodesList, setPromoCodesList] = useState<PromoCode[]>(
    storeSettings.promo_codes || []
  );
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState<number>(10);
  const [newPromoMinPurchase, setNewPromoMinPurchase] = useState<number>(0);
  const [isSavingPromo, setIsSavingPromo] = useState(false);
  const [promoFormError, setPromoFormError] = useState<string | null>(null);

  // Status feedback banners
  const [storeSavedMsg, setStoreSavedMsg] = useState<string | null>(null);
  const [invoiceSavedMsg, setInvoiceSavedMsg] = useState<string | null>(null);

  // Supabase form & diagnostic states
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [customUrl, setCustomUrl] = useState(supabaseConfig.url);
  const [customKey, setCustomKey] = useState(supabaseConfig.anonKey);
  const [supabaseSaveMsg, setSupabaseSaveMsg] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<SupabaseDiagnosticResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isPushingData, setIsPushingData] = useState(false);
  const [pushDataResult, setPushDataResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const [copiedEnvVars, setCopiedEnvVars] = useState(false);

  // Staff users state
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffFullName, setNewStaffFullName] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('cashier');
  const [staffError, setStaffError] = useState<string | null>(null);

  // Migration states
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [isMigratingA, setIsMigratingA] = useState(false);
  const [migrationResultsA, setMigrationResultsA] = useState<MigrationSummary[] | null>(null);
  const [errorA, setErrorA] = useState<string | null>(null);

  const [migrationEntity, setMigrationEntity] = useState<'products' | 'categories' | 'ingredients' | 'orders'>('products');
  const [migrationFormat, setMigrationFormat] = useState<'json' | 'csv'>('json');
  const [fileContent, setFileContent] = useState('');
  const [isMigratingB, setIsMigratingB] = useState(false);
  const [migrationResultB, setMigrationResultB] = useState<MigrationSummary | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);

  const hasLoadedInitial = useRef(false);
  const isUserEditingStore = useRef(false);
  const isUserEditingInvoice = useRef(false);

  useEffect(() => {
    if (!hasLoadedInitial.current && storeSettings.store_name) {
      setStoreName(storeSettings.store_name);
      setAddress(storeSettings.address || '');
      setPhone(storeSettings.phone || '');
      setDescription(storeSettings.description || '');
      if (storeSettings.qris_image_url !== undefined) {
        setQrisImageUrl(storeSettings.qris_image_url || '');
      }
      if (storeSettings.receipt_logo_url !== undefined) {
        setReceiptLogoUrl(storeSettings.receipt_logo_url || '');
      }
      setReceiptShowLogo(storeSettings.receipt_show_logo !== false);
      setReceiptHeaderText(storeSettings.receipt_header_text || storeSettings.store_name || '');
      setReceiptFooterText(storeSettings.receipt_footer_text || '');
      if (storeSettings.available_addons && storeSettings.available_addons.length > 0) {
        setAddonsList(storeSettings.available_addons);
      }
      if (storeSettings.promo_codes) {
        setPromoCodesList(storeSettings.promo_codes);
      }
      hasLoadedInitial.current = true;
    }
  }, [storeSettings]);

  useEffect(() => {
    const loadStaff = async () => {
      const list = await authService.getStaffList();
      setStaffList(list);
      setStaffAccounts(authService.getStaffAccounts());
    };
    loadStaff();
  }, []);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStore(true);
    setStoreSavedMsg(null);
    try {
      const updated = await storeService.updateStoreInfo({
        store_name: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        description: description.trim(),
      });
      isUserEditingStore.current = false;
      if (updated) {
        setStoreName(updated.store_name);
        setAddress(updated.address || '');
        setPhone(updated.phone || '');
        setDescription(updated.description || '');
      }
      await refreshData();
      setStoreSavedMsg('Informasi kedai berhasil disimpan!');
      setTimeout(() => setStoreSavedMsg(null), 4000);
    } catch (err: any) {
      setStoreSavedMsg('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleSaveInvoiceAndQris = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInvoice(true);
    setInvoiceSavedMsg(null);
    try {
      const updated = await storeService.updateStoreInfo({
        qris_image_url: qrisImageUrl.trim() || undefined,
        receipt_logo_url: receiptLogoUrl.trim() || undefined,
        receipt_show_logo: receiptShowLogo,
        receipt_header_text: receiptHeaderText.trim() || undefined,
        receipt_footer_text: receiptFooterText.trim() || undefined,
      });
      isUserEditingInvoice.current = false;
      if (updated) {
        setQrisImageUrl(updated.qris_image_url || '');
        setReceiptLogoUrl(updated.receipt_logo_url || '');
        setReceiptShowLogo(updated.receipt_show_logo !== false);
        setReceiptHeaderText(updated.receipt_header_text || '');
        setReceiptFooterText(updated.receipt_footer_text || '');
      }
      await refreshData();
      setInvoiceSavedMsg('Pengaturan QRIS & Struk Invoice berhasil disimpan!');
      setTimeout(() => setInvoiceSavedMsg(null), 4000);
    } catch (err: any) {
      setInvoiceSavedMsg('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'qris' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'qris') setIsUploadingQris(true);
    else setIsUploadingLogo(true);

    try {
      const url = await productService.uploadProductImage(file);
      if (url) {
        if (target === 'qris') {
          setQrisImageUrl(url);
          isUserEditingInvoice.current = false;
          const updated = await storeService.updateStoreInfo({ qris_image_url: url });
          if (updated?.qris_image_url) {
            setQrisImageUrl(updated.qris_image_url);
          }
          await refreshData();
        } else {
          setReceiptLogoUrl(url);
          isUserEditingInvoice.current = false;
          const updated = await storeService.updateStoreInfo({ receipt_logo_url: url });
          if (updated?.receipt_logo_url) {
            setReceiptLogoUrl(updated.receipt_logo_url);
          }
          await refreshData();
        }
      }
    } catch (err: any) {
      console.error('Upload error:', err);
    } finally {
      if (target === 'qris') setIsUploadingQris(false);
      else setIsUploadingLogo(false);
    }
  };

  // Addon management
  const handleAddAddon = async () => {
    if (!newAddonName.trim()) return;
    const newAddon: ProductAddon = {
      id: 'addon-' + Math.random().toString(36).substring(2, 8),
      name: newAddonName.trim(),
      price: Math.max(0, Number(newAddonPrice) || 0),
    };
    const updated = [...addonsList, newAddon];
    setAddonsList(updated);
    setNewAddonName('');
    setNewAddonPrice(0);
    await storeService.updateStoreInfo({ available_addons: updated });
    await refreshData();
  };

  const handleDeleteAddon = async (id: string) => {
    const updated = addonsList.filter(a => a.id !== id);
    setAddonsList(updated);
    await storeService.updateStoreInfo({ available_addons: updated });
    await refreshData();
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoFormError(null);
    const cleanCode = newPromoCode.trim().toUpperCase();
    if (!cleanCode) {
      setPromoFormError('Silakan masukkan kode promo.');
      return;
    }
    if (newPromoDiscount <= 0 || newPromoDiscount > 100) {
      setPromoFormError('Persentase diskon harus antara 1% sampai 100%.');
      return;
    }
    if (promoCodesList.some(p => p.code.toUpperCase() === cleanCode)) {
      setPromoFormError(`Kode promo "${cleanCode}" sudah pernah dibuat sebelumnya.`);
      return;
    }

    setIsSavingPromo(true);
    try {
      const newPromo: PromoCode = {
        id: 'promo-' + Math.random().toString(36).substring(2, 9),
        code: cleanCode,
        discount_percent: Number(newPromoDiscount),
        min_purchase: Math.max(0, Number(newPromoMinPurchase) || 0),
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const updated = [newPromo, ...promoCodesList];
      setPromoCodesList(updated);
      setNewPromoCode('');
      setNewPromoDiscount(10);
      setNewPromoMinPurchase(0);
      await storeService.updateStoreInfo({ promo_codes: updated });
      await refreshData();
    } catch (err: any) {
      setPromoFormError(err.message || 'Gagal menyimpan kode promo.');
    } finally {
      setIsSavingPromo(false);
    }
  };

  const handleDeletePromoCode = async (id: string, code: string) => {
    if (!window.confirm(`Yakin ingin menghapus kode promo "${code}"?`)) return;
    const updated = promoCodesList.filter(p => p.id !== id);
    setPromoCodesList(updated);
    await storeService.updateStoreInfo({ promo_codes: updated });
    await refreshData();
  };

  const handleTogglePromoActive = async (id: string) => {
    const updated = promoCodesList.map(p =>
      p.id === id ? { ...p, is_active: !p.is_active } : p
    );
    setPromoCodesList(updated);
    await storeService.updateStoreInfo({ promo_codes: updated });
    await refreshData();
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    reinitializeSupabase(customUrl, customKey);
    const updated = getSupabaseConfig();
    setSupabaseConfig(updated);
    setSupabaseSaveMsg(
      updated.isConfigured
        ? '✓ Konfigurasi Supabase disimpan! Menjalankan tes koneksi otomatis...'
        : '⚠️ Konfigurasi disimpan. Format URL atau Anon Key belum lengkap.'
    );

    if (updated.isConfigured) {
      await handleTestConnection();
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setDiagnosticResult(null);
    try {
      const res = await testSupabaseFullConnection();
      setDiagnosticResult(res);
      if (res.ok) {
        setSupabaseSaveMsg(`✓ Terhubung ke Supabase! Latensi: ${res.latencyMs}ms. Semua tabel siap.`);
      } else {
        setSupabaseSaveMsg(`⚠️ Peringatan: ${res.message}`);
      }
    } catch (err: any) {
      setSupabaseSaveMsg(`Error pengujian koneksi: ${err.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handlePushDataToSupabase = async () => {
    if (!window.confirm('Upload semua kategori, produk, dan data toko lokal ke database Supabase? Data yang sudah ada di Supabase akan diperbarui.')) {
      return;
    }
    setIsPushingData(true);
    setPushDataResult(null);
    try {
      const res = await pushLocalDataToSupabase();
      if (res.ok) {
        setPushDataResult({
          ok: true,
          msg: `Berhasil upload: ${res.categoriesSynced} kategori, ${res.productsSynced} produk, & profil kedai ke Supabase!`,
        });
        await refreshData();
      } else {
        setPushDataResult({
          ok: false,
          msg: `Gagal upload: ${res.error || 'Terjadi kesalahan'}`,
        });
      }
    } catch (err: any) {
      setPushDataResult({
        ok: false,
        msg: `Error: ${err.message}`,
      });
    } finally {
      setIsPushingData(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleCopyShareUrl = () => {
    const url = getSupabaseShareUrl('/store');
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedShareUrl(true);
    setTimeout(() => setCopiedShareUrl(false), 3000);
  };

  const handleCopyEnvVars = () => {
    const text = `VITE_SUPABASE_URL=${customUrl.trim()}\nVITE_SUPABASE_ANON_KEY=${customKey.trim()}`;
    navigator.clipboard.writeText(text);
    setCopiedEnvVars(true);
    setTimeout(() => setCopiedEnvVars(false), 3000);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    try {
      await authService.createStaffAccount({
        username: newStaffUsername.trim(),
        full_name: newStaffFullName.trim() || newStaffUsername.trim(),
        password: newStaffPassword.trim(),
        role: newStaffRole,
      });
      setStaffAccounts(authService.getStaffAccounts());
      const updatedList = await authService.getStaffList();
      setStaffList(updatedList);
      setNewStaffUsername('');
      setNewStaffFullName('');
      setNewStaffPassword('');
      setNewStaffRole('cashier');
      setIsAddStaffOpen(false);
      alert('Akun staf baru berhasil dibuat!');
    } catch (err: any) {
      setStaffError(err.message || 'Gagal menambahkan staf.');
    }
  };

  const handleDeleteStaff = async (id: string, username: string) => {
    if (username.toLowerCase() === 'apep') {
      alert('Akun default Apep tidak dapat dihapus.');
      return;
    }
    if (!window.confirm(`Yakin ingin menghapus akun staf "${username}"?`)) return;
    try {
      await authService.deleteStaffAccount(id);
      setStaffAccounts(authService.getStaffAccounts());
      const updatedList = await authService.getStaffList();
      setStaffList(updatedList);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus akun staf.');
    }
  };

  const handleUpdateRole = async (id: string, role: UserRole) => {
    try {
      await authService.updateStaffRole(id, role);
      setStaffAccounts(authService.getStaffAccounts());
      const updatedList = await authService.getStaffList();
      setStaffList(updatedList);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui role staf.');
    }
  };

  // Run Migration Opsi A
  const handleRunMigrationA = async () => {
    if (!appsScriptUrl.trim()) {
      setErrorA('Masukkan URL endpoint Google Apps Script / Sheets.');
      return;
    }
    setErrorA(null);
    setIsMigratingA(true);
    setMigrationResultsA(null);

    try {
      const results = await migrationService.migrateFromAppsScript(appsScriptUrl);
      setMigrationResultsA(results);
      await refreshData();
    } catch (err: any) {
      setErrorA(err.message || 'Gagal menjalankan migrasi.');
    } finally {
      setIsMigratingA(false);
    }
  };

  // Run Migration Opsi B
  const handleRunMigrationB = async () => {
    if (!fileContent.trim()) {
      setErrorB('Silakan isi data JSON atau CSV terlebih dahulu.');
      return;
    }
    setErrorB(null);
    setIsMigratingB(true);
    setMigrationResultB(null);

    try {
      const summary = await migrationService.migrateFromFileContent(
        migrationEntity,
        fileContent,
        migrationFormat
      );
      setMigrationResultB(summary);
      await refreshData();
    } catch (err: any) {
      setErrorB(err.message || 'Gagal mengimpor file.');
    } finally {
      setIsMigratingB(false);
    }
  };

  return (
    <AdminLayout currentTab="settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white">Pengaturan &amp; Kustomisasi Kedai</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Konfigurasi toko, foto QRIS pembayaran online, kustomisasi logo &amp; invoice, add-on produk, dan migrasi data.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-800 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTab('store')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              tab === 'store'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Informasi Kedai
          </button>
          <button
            onClick={() => setTab('qris_receipt')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              tab === 'qris_receipt'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Foto QRIS &amp; Logo Struk
          </button>
          <button
            onClick={() => setTab('addons')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              tab === 'addons'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Kelola Add-on / Topping
          </button>
          <button
            onClick={() => setTab('promo')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              tab === 'promo'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Buat Kode Promo</span>
          </button>
          <button
            onClick={() => setTab('supabase')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              tab === 'supabase'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Koneksi Supabase
          </button>
          <button
            onClick={() => setTab('users')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              tab === 'users'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Akun Staf &amp; Role
          </button>
          <button
            onClick={() => setTab('migration')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              tab === 'migration'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Migrasi Data Lama
          </button>
        </div>

        {/* TAB 1: STORE SETTINGS */}
        {tab === 'store' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 max-w-2xl space-y-4">
            {storeSavedMsg && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{storeSavedMsg}</span>
              </div>
            )}
            <form onSubmit={handleSaveStore} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Kedai
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => {
                    isUserEditingStore.current = true;
                    setStoreName(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor WhatsApp Kedai (Notifikasi Orderan Otomatis)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => {
                    isUserEditingStore.current = true;
                    setPhone(e.target.value);
                  }}
                  placeholder="081299001999"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  *Nomor ini yang akan menerima kiriman pesan notifikasi pemesanan online dari customer.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => {
                    isUserEditingStore.current = true;
                    setAddress(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deskripsi Singkat / Tagline
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => {
                    isUserEditingStore.current = true;
                    setDescription(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingStore}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>Simpan Informasi Kedai</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: QRIS & INVOICE / RECEIPT CUSTOMIZATION (Requirements 1 & 5) */}
        {tab === 'qris_receipt' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Settings */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <QrCode className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Foto QRIS &amp; Kustomisasi Struk</h3>
                  <p className="text-[11px] text-slate-400">
                    Atur foto QRIS untuk checkout online dan logo serta format invoice cetak.
                  </p>
                </div>
              </div>

              {invoiceSavedMsg && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{invoiceSavedMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveInvoiceAndQris} className="space-y-4">
                {/* 1. Foto QRIS */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-amber-400">
                    1. Foto / Gambar QRIS Toko (Untuk Checkout Online)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="URL Gambar QRIS (https://...)"
                      value={qrisImageUrl}
                      onChange={(e) => {
                        isUserEditingInvoice.current = true;
                        setQrisImageUrl(e.target.value);
                      }}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <label className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploadingQris ? '...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'qris')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {qrisImageUrl && (
                    <div className="h-28 w-28 rounded-xl bg-white p-1.5 overflow-hidden shadow">
                      <img src={qrisImageUrl} alt="QRIS Preview" className="h-full w-full object-contain" />
                    </div>
                  )}
                </div>

                {/* 2. Logo Toko pada Struk */}
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <label className="block text-xs font-bold text-amber-400">
                    2. Logo Toko pada Struk / Invoice
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="URL Logo Struk (https://... atau /icon.svg)"
                      value={receiptLogoUrl}
                      onChange={(e) => {
                        isUserEditingInvoice.current = true;
                        setReceiptLogoUrl(e.target.value);
                      }}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <label className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploadingLogo ? '...' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={receiptShowLogo}
                      onChange={(e) => {
                        isUserEditingInvoice.current = true;
                        setReceiptShowLogo(e.target.checked);
                      }}
                      className="rounded accent-amber-500 h-4 w-4"
                    />
                    <span>Tampilkan Logo di Header Struk Thermal</span>
                  </label>
                </div>

                {/* 3. Header Text */}
                <div className="space-y-1 border-t border-slate-800 pt-3">
                  <label className="block text-xs font-bold text-amber-400">
                    3. Teks Judul / Header Struk
                  </label>
                  <input
                    type="text"
                    placeholder="K99 KEDAI KOPI & TEH"
                    value={receiptHeaderText}
                    onChange={(e) => {
                      isUserEditingInvoice.current = true;
                      setReceiptHeaderText(e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* 4. Footer Text */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-amber-400">
                    4. Teks Catatan Kaki / Footer Struk
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Terima kasih telah berkunjung ke K99!&#10;Follow Instagram @k99kedai"
                    value={receiptFooterText}
                    onChange={(e) => {
                      isUserEditingInvoice.current = true;
                      setReceiptFooterText(e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingInvoice}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>Simpan Tampilan QRIS &amp; Invoice</span>
                </button>
              </form>
            </div>

            {/* Live Preview Thermal Receipt */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Live Preview Tampilan Struk / Invoice
              </span>

              <div className="w-full max-w-[280px] bg-white text-slate-950 p-4 rounded-lg shadow font-mono text-[11px] leading-relaxed">
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  {receiptShowLogo && receiptLogoUrl && (
                    <div className="flex justify-center mb-1">
                      <img src={receiptLogoUrl} alt="Logo" className="h-8 w-8 object-contain" />
                    </div>
                  )}
                  <div className="font-sans font-black text-xs uppercase">
                    {receiptHeaderText || storeName || 'K99 KEDAI'}
                  </div>
                  <p className="text-[9px] text-slate-600">{address || 'Jl. Pemuda No. 99, Indonesia'}</p>
                  <p className="text-[9px] text-slate-600">Telp: {phone || '0812-9900-1999'}</p>
                </div>

                <div className="py-1.5 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>No: K99-1029</span>
                    <span>15:30 WIB</span>
                  </div>
                  <div>Pelanggan: Budi Santoso</div>
                  <div>Channel: OFFLINE</div>
                </div>

                <div className="py-1.5 border-b border-dashed border-slate-400 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>Kopi Susu Aren [ICE]</span>
                    <span>Rp 18.000</span>
                  </div>
                  <div className="text-[9px] text-slate-600 pl-2">
                    1 × Rp 18.000 (+Extra Shot)
                  </div>
                </div>

                <div className="py-1.5 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                  <div className="flex justify-between font-bold text-xs pt-1">
                    <span>TOTAL:</span>
                    <span>Rp 18.000</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Bayar: QRIS</span>
                    <span>LUNAS</span>
                  </div>
                </div>

                <div className="text-center pt-2 text-[9px] text-slate-500 whitespace-pre-line">
                  {receiptFooterText || 'Terima kasih telah berkunjung!\n#K99SemuaSuka'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADD-ONS MANAGEMENT (Requirement 4) */}
        {tab === 'addons' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-5 max-w-3xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Kelola Daftar Add-on &amp; Topping Menu</h3>
                <p className="text-xs text-slate-400">
                  Daftar topping dan tambahan yang dapat dipilih oleh customer saat order online maupun kasir POS.
                </p>
              </div>
            </div>

            {/* Form Add New */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex gap-2 items-center">
              <input
                type="text"
                placeholder="Nama Add-on (misal: Extra Espresso, Boba, Keju)"
                value={newAddonName}
                onChange={(e) => setNewAddonName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="number"
                placeholder="Harga (+Rp)"
                value={newAddonPrice || ''}
                onChange={(e) => setNewAddonPrice(Number(e.target.value) || 0)}
                className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddAddon}
                className="flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Add-on</span>
              </button>
            </div>

            {/* Addons Table */}
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Nama Add-on / Topping</th>
                  <th className="py-2.5 px-3">Tambahan Harga</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {addonsList.map((addon) => (
                  <tr key={addon.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-white">{addon.name}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                      +Rp {addon.price.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteAddon(addon.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB PROMO CODES (Requirement 3) */}
        {tab === 'promo' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-5 max-w-3xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4 text-amber-400" />
                  <span>Buat &amp; Kelola Kode Promo</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Buat kode promo sendiri dan tentukan persentase diskonnya. Kode promo ini otomatis memotong total pembelian pelanggan saat konfirmasi pembayaran pemesanan online.
                </p>
              </div>
            </div>

            {promoFormError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
                {promoFormError}
              </div>
            )}

            {/* Form Buat Kode Promo Baru (Requirement 3 & 4) */}
            <form onSubmit={handleCreatePromoCode} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nama / Kode Promo <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Misal: K99HEMAT"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-xs font-mono font-bold uppercase text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">Kode unik huruf besar</span>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Diskon (%) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={newPromoDiscount || ''}
                    onChange={(e) => setNewPromoDiscount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    placeholder="10"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">Contoh: 10 untuk 10%</span>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Min. Belanja (Rp)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={newPromoMinPurchase === 0 ? '' : newPromoMinPurchase}
                    onChange={(e) => setNewPromoMinPurchase(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    placeholder="0 (Tanpa minimal)"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">Syarat minimal order (Rp)</span>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={isSavingPromo}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 px-3 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </form>

            {/* List Kode Promo yang Tersimpan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Daftar Kode Promo ({promoCodesList.length})
                </h4>
              </div>

              {promoCodesList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                  Belum ada kode promo yang dibuat. Buat kode promo pertama Anda menggunakan form di atas.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
                  {promoCodesList.map((promo) => (
                    <div
                      key={promo.id}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-800/30 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-xl font-mono text-sm font-black border ${
                          promo.is_active
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800/60 text-slate-500 border-slate-700'
                        }`}>
                          {promo.code}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              Potongan {promo.discount_percent}%
                            </span>
                            <span className="text-[11px] font-semibold text-amber-400/90">
                              {promo.min_purchase && promo.min_purchase > 0
                                ? `• Min. Belanja Rp ${promo.min_purchase.toLocaleString('id-ID')}`
                                : '• Tanpa Min. Belanja'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              promo.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {promo.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Dibuat: {new Date(promo.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePromoActive(promo.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                            promo.is_active
                              ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                              : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                          }`}
                        >
                          {promo.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePromoCode(promo.id, promo.code)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
                          title="Hapus Kode Promo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SUPABASE CONNECTION & MULTI-DEVICE SYNC */}
        {tab === 'supabase' && (
          <div className="space-y-6 max-w-4xl">
            {/* 1. STATUS & CREDENTIALS FORM */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Konfigurasi Database Supabase</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sinkronisasi multi-device otomatis (PC Kasir, Laptop Admin, &amp; HP Pelanggan).
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${
                  supabaseConfig.isConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${supabaseConfig.isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {supabaseConfig.isConfigured ? 'Supabase Terhubung' : 'Mode Demo / Standby'}
                </span>
              </div>

              {supabaseSaveMsg && (
                <div className="rounded-xl bg-slate-800/90 border border-slate-700 p-3.5 text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>{supabaseSaveMsg}</div>
                </div>
              )}

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Supabase Project URL (VITE_SUPABASE_URL)
                    </label>
                    <input
                      type="url"
                      placeholder="https://xyzproject.supabase.co"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Supabase Anon Public API Key (VITE_SUPABASE_ANON_KEY)
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition"
                  >
                    <Save className="h-4 w-4" />
                    <span>Simpan Konfigurasi</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 active:scale-95 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 text-emerald-400 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    <span>{isTestingConnection ? 'Menguji Koneksi...' : 'Uji Koneksi & Cek Semua Tabel'}</span>
                  </button>
                </div>
              </form>

              {/* DIAGNOSTIC CHECKLIST */}
              {diagnosticResult && (
                <div className={`mt-4 rounded-xl border p-4 text-xs space-y-3 ${
                  diagnosticResult.ok
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-amber-500/30 bg-amber-500/5'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="font-bold text-white flex items-center gap-2">
                      {diagnosticResult.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                      <span>Hasil Diagnostik Database</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Latensi: {diagnosticResult.latencyMs} ms
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className={`p-2 rounded-lg border flex items-center justify-between ${
                      diagnosticResult.tables.store_settings
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                    }`}>
                      <span>store_settings</span>
                      <span>{diagnosticResult.tables.store_settings ? '✓ Siap' : '✗ Belum ada'}</span>
                    </div>

                    <div className={`p-2 rounded-lg border flex items-center justify-between ${
                      diagnosticResult.tables.categories
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                    }`}>
                      <span>categories</span>
                      <span>{diagnosticResult.tables.categories ? '✓ Siap' : '✗ Belum ada'}</span>
                    </div>

                    <div className={`p-2 rounded-lg border flex items-center justify-between ${
                      diagnosticResult.tables.products
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                    }`}>
                      <span>products</span>
                      <span>{diagnosticResult.tables.products ? '✓ Siap' : '✗ Belum ada'}</span>
                    </div>

                    <div className={`p-2 rounded-lg border flex items-center justify-between ${
                      diagnosticResult.tables.orders
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                    }`}>
                      <span>orders</span>
                      <span>{diagnosticResult.tables.orders ? '✓ Siap' : '✗ Belum ada'}</span>
                    </div>
                  </div>

                  {!diagnosticResult.ok && (
                    <div className="pt-2 text-slate-300 border-t border-slate-800">
                      <p className="text-amber-400 font-medium mb-1">Penyebab tabel belum ditemukan:</p>
                      <p className="text-slate-400 text-[11px]">
                        Script schema SQL belum pernah dieksekusi di Supabase SQL Editor. Silakan salin script SQL di bawah ini dan jalankan di Supabase Dashboard.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. SYNC LOCAL DATA TO SUPABASE BUTTON */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Upload &amp; Sinkronkan Data Lokal ke Supabase</h3>
                  <p className="text-xs text-slate-400">
                    Kirim semua produk, kategori, dan pengaturan yang ada di browser ini langsung ke Supabase dengan 1 klik.
                  </p>
                </div>
              </div>

              {pushDataResult && (
                <div className={`p-3 rounded-xl text-xs border ${
                  pushDataResult.ok
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}>
                  {pushDataResult.msg}
                </div>
              )}

              <button
                type="button"
                onClick={handlePushDataToSupabase}
                disabled={isPushingData || !supabaseConfig.isConfigured}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 transition"
              >
                <Upload className={`h-4 w-4 ${isPushingData ? 'animate-bounce' : ''}`} />
                <span>{isPushingData ? 'Mengunggah Data ke Supabase...' : 'Upload Data Lokal ke Database Supabase Sekarang'}</span>
              </button>
            </div>

            {/* 3. SHARE TO MOBILE (HP) VIA QR CODE & LINK */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Hubungkan HP Pelanggan / Kasir via QR Code</h3>
                  <p className="text-xs text-slate-400">
                    Scan QR ini dengan kamera HP untuk langsung membuka toko dengan database Supabase yang sama terhubung otomatis.
                  </p>
                </div>
              </div>

              {supabaseConfig.isConfigured ? (
                <div className="flex flex-col sm:flex-row items-center gap-5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-36 h-36 bg-white p-2 rounded-xl shrink-0 shadow-md flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getSupabaseShareUrl('/store'))}`}
                      alt="QR Link HP"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 flex-1">
                    <div className="font-semibold text-white">Cara Praktis Menghubungkan HP:</div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                      <li>Buka kamera di smartphone (HP) Anda.</li>
                      <li>Arahkan kamera ke QR Code di samping.</li>
                      <li>Tekan link yang muncul: HP akan langsung membuka menu kedai dan tersambung otomatis dengan database kedai Anda!</li>
                    </ol>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCopyShareUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700 transition"
                      >
                        {copiedShareUrl ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Link HP Berhasil Disalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-400" />
                            <span>Salin Link Khusus HP</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                  ⚠️ Silakan isi Supabase URL &amp; Anon Key di atas terlebih dahulu untuk membuat QR Code koneksi HP otomatis.
                </div>
              )}
            </div>

            {/* 4. SQL SCHEMA SETUP GUIDE (SQL EDITOR) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-400">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Setup Database Baru di Supabase (SQL Editor)</h3>
                    <p className="text-xs text-slate-400">
                      Eksekusi 1 kali di Supabase Dashboard untuk membuat tabel &amp; izin RLS otomatis.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-500 text-slate-950 text-xs font-bold shadow-md hover:bg-violet-400 active:scale-95 transition shrink-0"
                >
                  {copiedSql ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Script Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin Script SQL Lengkap</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-white">Langkah Mudah Menjalankan di Supabase:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px]">
                  <li>
                    Buka{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 underline hover:text-amber-300 inline-flex items-center gap-0.5"
                    >
                      <span>supabase.com/dashboard</span>
                      <ExternalLink className="h-3 w-3 inline" />
                    </a>{' '}
                    lalu buka project kedai K99 Anda.
                  </li>
                  <li>
                    Di sidebar sebelah kiri, klik menu <span className="text-white font-semibold">SQL Editor</span> (ikon query).
                  </li>
                  <li>
                    Klik tombol <span className="text-white font-semibold">New query</span>, lalu klik tombol <span className="text-violet-400 font-semibold">&ldquo;Salin Script SQL Lengkap&rdquo;</span> di atas dan paste (Ctrl+V) ke dalam editor.
                  </li>
                  <li>
                    Klik tombol hijau <span className="text-emerald-400 font-semibold">Run</span> di pojok kanan bawah. Selesai! Semua tabel, izin akses, dan realtime langsung siap.
                  </li>
                </ol>
              </div>
            </div>

            {/* 5. CLOUDFLARE PAGES ENVIRONMENT VARIABLES GUIDE */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-500/10 p-2.5 text-orange-400">
                    <DownloadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Panduan Cloudflare Pages (Agar Semua Pelanggan Otomatis Konek)</h3>
                    <p className="text-xs text-slate-400">
                      Pengaturan wajib di Cloudflare Pages agar semua pengunjung otomatis terhubung tanpa scan QR.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyEnvVars}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700 transition shrink-0"
                >
                  {copiedEnvVars ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Variabel Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Salin Variabel Cloudflare</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Cloudflare Pages adalah hosting web statis. Agar aplikasi yang ter-build di Cloudflare Pages memiliki koneksi Supabase bawaan untuk semua pengunjung:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px]">
                  <li>Buka <span className="text-white font-semibold">Cloudflare Dashboard</span> &rarr; <span className="text-white font-semibold">Workers &amp; Pages</span> &rarr; Pilih project website Anda.</li>
                  <li>Buka tab <span className="text-white font-semibold">Settings</span> &rarr; <span className="text-white font-semibold">Environment variables</span>.</li>
                  <li>
                    Tambahkan 2 variabel berikut pada bagian <span className="text-amber-400 font-semibold">Production</span>:
                    <div className="mt-1.5 space-y-1 font-mono text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-amber-300">
                      <div>VITE_SUPABASE_URL = {customUrl || '(URL Supabase Anda)'}</div>
                      <div>VITE_SUPABASE_ANON_KEY = {customKey ? `${customKey.substring(0, 20)}...` : '(Anon Key Supabase Anda)'}</div>
                    </div>
                  </li>
                  <li>
                    Setelah disimpan, buka tab <span className="text-white font-semibold">Deployments</span> &rarr; Klik titik tiga pada deploy terbaru &rarr; Pilih <span className="text-emerald-400 font-semibold">Retry deployment</span>.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STAFF USERS & ROLES */}
        {tab === 'users' && (
          <div className="space-y-6 max-w-4xl">
            {/* Header with Add Button */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-400" />
                    <span>Daftar Akun Staf &amp; Manajemen Role</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Kelola akun login kasir &amp; admin untuk kedai K99. Password tersimpan aman.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition shrink-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>+ Tambah Akun Staf</span>
                </button>
              </div>

              {/* Modal / Dialog Tambah Staf */}
              {isAddStaffOpen && (
                <div className="mt-4 p-4 rounded-xl border border-amber-500/40 bg-slate-950 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Buat Akun Staf Baru</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddStaffOpen(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Batal
                    </button>
                  </div>

                  {staffError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                      {staffError}
                    </div>
                  )}

                  <form onSubmit={handleCreateStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Username Login <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: kasir1, rudi, dll."
                        value={newStaffUsername}
                        onChange={(e) => setNewStaffUsername(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nama Lengkap / Panggilan
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Rudi Hartono (Kasir Sore)"
                        value={newStaffFullName}
                        onChange={(e) => setNewStaffFullName(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Kata Sandi <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Minimal 6 karakter..."
                        value={newStaffPassword}
                        onChange={(e) => setNewStaffPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Pilih Role / Hak Akses <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="cashier">Cashier / Kasir (POS &amp; Status Buka/Tutup)</option>
                        <option value="admin">Admin (Produk, Stok, Utang, Laporan, POS)</option>
                        <option value="owner">Owner (All Akses Penuh)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddStaffOpen(false)}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                      >
                        Simpan Akun
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Table of staff accounts */}
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Role Akses</th>
                      <th className="py-3 px-4">Hak Akses Sistem</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {staffAccounts.map((staf) => (
                      <tr key={staf.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {staf.username}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {staf.full_name}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={staf.role}
                            disabled={staf.username.toLowerCase() === 'apep'}
                            onChange={(e) => handleUpdateRole(staf.id, e.target.value as UserRole)}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-bold uppercase transition bg-slate-900 ${
                              staf.role === 'owner'
                                ? 'border-purple-500/40 text-purple-400'
                                : staf.role === 'admin'
                                ? 'border-sky-500/40 text-sky-400'
                                : 'border-amber-500/40 text-amber-400'
                            }`}
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="cashier">Cashier</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {staf.role === 'cashier' ? (
                            <span className="text-amber-300/90">POS, Transaksi, Status Buka/Tutup</span>
                          ) : staf.role === 'admin' ? (
                            <span className="text-sky-300/90">Produk, Kategori, Stok, Utang, Laporan, POS</span>
                          ) : (
                            <span className="text-purple-300 font-bold">All Akses (Semua Hak Penuh)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {staf.username.toLowerCase() === 'apep' ? (
                            <span className="text-[10px] text-slate-500 italic">Akun Utama</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(staf.id, staf.username)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Hapus Akun Staf"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matrix Panduan Hak Akses Role */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <span>Matriks &amp; Ketentuan Hak Akses Role K99</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 space-y-1.5">
                  <span className="text-xs font-black uppercase text-purple-400 tracking-wider">
                    👑 Role: OWNER
                  </span>
                  <p className="text-[11px] text-slate-300 font-medium">All Akses Penuh</p>
                  <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                    <li>Semua fitur admin &amp; kasir</li>
                    <li>Manajemen &amp; buat akun staf</li>
                    <li>Ubah konfigurasi Supabase &amp; toko</li>
                    <li>Migrasi &amp; reset database</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 space-y-1.5">
                  <span className="text-xs font-black uppercase text-sky-400 tracking-wider">
                    🛡️ Role: ADMIN
                  </span>
                  <p className="text-[11px] text-slate-300 font-medium">Operasional Lengkap</p>
                  <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                    <li>Kelola Produk &amp; Kategori</li>
                    <li>Inventaris &amp; Resep Bahan</li>
                    <li>Utang Piutang Tempo Suplier</li>
                    <li>Laporan Penjualan &amp; Profit HPP</li>
                    <li>Akses Kasir POS</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5">
                  <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                    💼 Role: CASHIER / STAF
                  </span>
                  <p className="text-[11px] text-slate-300 font-medium">Pelayanan Kasir Toko</p>
                  <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                    <li>Kasir POS (Offline &amp; Online)</li>
                    <li>Terima &amp; proses pesanan masuk</li>
                    <li>Cetak struk thermal</li>
                    <li>Buka / Tutup status operasional toko</li>
                    <li>Dibatasi dari data HPP &amp; laporan</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DATA MIGRATION */}
        {tab === 'migration' && (
          <div className="space-y-6">
            <p className="text-xs text-slate-400">
              Pilih salah satu metode migrasi di bawah ini untuk memindahkan data dari Google Sheets / Apps Script lama ke Supabase secara aman (idempotent, mempertahankan legacy_id, dan tidak membuat duplicate).
            </p>

            {/* OPSI A: GOOGLE APPS SCRIPT DIRECT MIGRATION */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <DownloadCloud className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    OPSI A — Migrasi Langsung dari Google Apps Script / Google Sheets
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Membaca API endpoint Google Apps Script Web App yang sudah ada, memetakan data, dan memasukkannya ke database.
                  </p>
                </div>
              </div>

              {errorA && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                  {errorA}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  URL Google Apps Script Web App (/exec)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    disabled={isMigratingA}
                    onClick={handleRunMigrationA}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {isMigratingA ? 'Memproses Migrasi...' : 'Jalankan Migrasi Opsi A'}
                  </button>
                </div>
              </div>

              {/* Report Opsi A */}
              {migrationResultsA && (
                <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-3">
                  <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-amber-400">
                    HASIL LAPORAN MIGRASI (OPSI A)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {migrationResultsA.map((res, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <span className="font-bold text-white block">{res.entity}</span>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-emerald-400">✓ {res.imported} berhasil diimpor</p>
                          <p className="text-amber-400">⚠ {res.duplicates} terdeteksi duplikat</p>
                          <p className="text-rose-400">✕ {res.invalid} data tidak valid</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* OPSI B: FILE EXPORT (CSV / JSON) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileSpreadsheet className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    OPSI B — Migrasi Melalui File Export (CSV / JSON)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ekspor Google Sheets lama Anda menjadi format CSV atau JSON, lalu masukkan ke dalam sistem di sini.
                  </p>
                </div>
              </div>

              {errorB && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                  {errorB}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jenis Entitas Data
                  </label>
                  <select
                    value={migrationEntity}
                    onChange={(e) => setMigrationEntity(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="products">Produk (Products)</option>
                    <option value="categories">Kategori (Categories)</option>
                    <option value="ingredients">Bahan Baku (Ingredients)</option>
                    <option value="orders">Pesanan / Transaksi (Orders)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Format File
                  </label>
                  <select
                    value={migrationFormat}
                    onChange={(e) => setMigrationFormat(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="json">JSON Array</option>
                    <option value="csv">CSV (Comma Separated)</option>
                  </select>
                </div>
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tempel Konten Data ({migrationFormat.toUpperCase()})
                </label>
                <textarea
                  rows={6}
                  placeholder={`Tempel konten file ${migrationFormat.toUpperCase()} Anda di sini...`}
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-slate-500">
                  Data yang sudah diimpor tidak akan diduplikasi karena dilindungi oleh <code className="text-amber-400">legacy_id</code>.
                </span>
                <button
                  disabled={isMigratingB}
                  onClick={handleRunMigrationB}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {isMigratingB ? 'Mengimpor Data...' : 'Import Data Sekarang'}
                </button>
              </div>

              {/* Report Opsi B */}
              {migrationResultB && (
                <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2">
                  <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-amber-400">
                    HASIL LAPORAN IMPORT (OPSI B)
                  </h4>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <span className="font-bold text-white text-sm block mb-1">
                      {migrationResultB.entity}
                    </span>
                    <p className="text-emerald-400 font-semibold">
                      ✓ {migrationResultB.imported} data berhasil diimpor
                    </p>
                    <p className="text-amber-400 font-semibold">
                      ⚠ {migrationResultB.duplicates} data duplikat dilewati
                    </p>
                    <p className="text-rose-400 font-semibold">
                      ✕ {migrationResultB.invalid} data tidak valid
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
