import { Category, Product, Ingredient, StoreSetting, Order, ProductAddon, Payable } from '../types/database';

export const DEFAULT_ADDONS: ProductAddon[] = [
  { id: 'addon-1', name: 'Extra Shot Espresso', price: 5000 },
  { id: 'addon-2', name: 'Gula Aren Tambahan', price: 3000 },
  { id: 'addon-3', name: 'Grass Jelly / Cincau', price: 4000 },
  { id: 'addon-4', name: 'Oat Milk Upgrade', price: 7000 },
  { id: 'addon-5', name: 'Whipped Cream', price: 4000 },
];

export const INITIAL_STORE_SETTING: StoreSetting = {
  id: '00000000-0000-0000-0000-000000000001',
  store_name: 'K99 Kedai Kopi & Teh',
  is_open: true,
  address: 'Jl. Pemuda No. 99, Indonesia',
  phone: '0812-9900-1999',
  description: 'Kedai kopi & teh santai dengan cita rasa otentik dan aneka cemilan lezat.',
  qris_image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226500016ID.CO.QRIS.WWW011893600999000000000102159360099900000005204581253033605802ID5909K99KEDAI6007JAKARTA6304ABCD',
  receipt_logo_url: '/icon.svg',
  receipt_show_logo: true,
  receipt_header_text: 'K99 KEDAI KOPI & TEH',
  receipt_footer_text: 'Terima kasih telah berkunjung ke K99!\nFollow Instagram @k99kedai\n#K99SemuaSuka',
  available_addons: DEFAULT_ADDONS,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Data dummy dibersihkan agar user dapat input manual atau migrasi data lama
export const INITIAL_PAYABLES: Payable[] = [];
export const INITIAL_CATEGORIES: Category[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_INGREDIENTS: Ingredient[] = [];
export const INITIAL_ORDERS: Order[] = [];
