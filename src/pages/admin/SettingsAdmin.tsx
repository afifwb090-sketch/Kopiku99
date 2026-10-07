import React, { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { storeService } from '../../services/storeService';
import { authService } from '../../services/authService';
import { migrationService } from '../../services/migrationService';
import { productService } from '../../services/productService';
import { getSupabaseConfig, reinitializeSupabase } from '../../services/supabase';
import { Profile, MigrationSummary, ProductAddon, UserRole } from '../../types/database';
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
} from 'lucide-react';

export const SettingsAdmin: React.FC = () => {
  const { storeSettings, toggleStoreStatus, refreshData } = useStore();
  const { user } = useAuth();

  // Tab
  const [tab, setTab] = useState<'store' | 'qris_receipt' | 'addons' | 'supabase' | 'users' | 'migration'>('store');

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

  // Supabase form state
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [customUrl, setCustomUrl] = useState(supabaseConfig.url);
  const [customKey, setCustomKey] = useState(supabaseConfig.anonKey);
  const [supabaseSaveMsg, setSupabaseSaveMsg] = useState<string | null>(null);

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

  useEffect(() => {
    setStoreName(storeSettings.store_name);
    setAddress(storeSettings.address || '');
    setPhone(storeSettings.phone || '');
    setDescription(storeSettings.description || '');
    setQrisImageUrl(storeSettings.qris_image_url || '');
    setReceiptLogoUrl(storeSettings.receipt_logo_url || '');
    setReceiptShowLogo(storeSettings.receipt_show_logo !== false);
    setReceiptHeaderText(storeSettings.receipt_header_text || storeSettings.store_name);
    setReceiptFooterText(storeSettings.receipt_footer_text || '');
    if (storeSettings.available_addons && storeSettings.available_addons.length > 0) {
      setAddonsList(storeSettings.available_addons);
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
    try {
      await storeService.updateStoreInfo({
        store_name: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        description: description.trim(),
      });
      await refreshData();
      alert('Informasi kedai berhasil disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleSaveInvoiceAndQris = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInvoice(true);
    try {
      await storeService.updateStoreInfo({
        qris_image_url: qrisImageUrl.trim() || undefined,
        receipt_logo_url: receiptLogoUrl.trim() || undefined,
        receipt_show_logo: receiptShowLogo,
        receipt_header_text: receiptHeaderText.trim() || undefined,
        receipt_footer_text: receiptFooterText.trim() || undefined,
      });
      await refreshData();
      alert('Pengaturan QRIS & Struk Invoice berhasil disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
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
        if (target === 'qris') setQrisImageUrl(url);
        else setReceiptLogoUrl(url);
      }
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

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    reinitializeSupabase(customUrl, customKey);
    const updated = getSupabaseConfig();
    setSupabaseConfig(updated);
    setSupabaseSaveMsg(
      updated.isConfigured
        ? '✓ Konfigurasi Supabase berhasil diperbarui dan aktif!'
        : '⚠️ Konfigurasi disimpan. Pastikan format URL dan Anon Key valid.'
    );
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 max-w-2xl">
            <form onSubmit={handleSaveStore} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Kedai
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
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
                  onChange={(e) => setPhone(e.target.value)}
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
                  onChange={(e) => setAddress(e.target.value)}
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
                  onChange={(e) => setDescription(e.target.value)}
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
                      onChange={(e) => setQrisImageUrl(e.target.value)}
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
                      onChange={(e) => setReceiptLogoUrl(e.target.value)}
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
                      onChange={(e) => setReceiptShowLogo(e.target.checked)}
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
                    onChange={(e) => setReceiptHeaderText(e.target.value)}
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
                    onChange={(e) => setReceiptFooterText(e.target.value)}
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

        {/* TAB 4: SUPABASE CONNECTION */}
        {tab === 'supabase' && (
          <div className="space-y-4 max-w-3xl">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Status Database Supabase</h3>
                    <p className="text-xs text-slate-400">
                      {supabaseConfig.isConfigured
                        ? 'Terhubung dengan database Supabase PostgreSQL.'
                        : 'Mode lokal / demo sinkronisasi realtime multi-tab aktif.'}
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  supabaseConfig.isConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {supabaseConfig.isConfigured ? '🟢 Supabase Aktif' : '🟡 Standby / Demo'}
                </span>
              </div>

              {supabaseSaveMsg && (
                <div className="rounded-xl bg-slate-800 p-3 text-xs text-amber-300">
                  {supabaseSaveMsg}
                </div>
              )}

              <form onSubmit={handleSaveSupabaseConfig} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supabase Project URL (VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzproject.supabase.co"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  Simpan &amp; Uji Koneksi
                </button>
              </form>
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
