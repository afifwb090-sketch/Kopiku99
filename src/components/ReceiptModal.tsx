import React from 'react';
import { Order } from '../types/database';
import { useStore } from '../context/StoreContext';
import { Printer, X, Coffee } from 'lucide-react';

interface Props {
  order: Order | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ order, onClose }) => {
  const { storeSettings } = useStore();
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.created_at).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-800/60">
          <span className="text-sm font-semibold text-slate-300">Struk Pembayaran / Invoice</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thermal Receipt Paper Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[320px] bg-white text-slate-900 p-5 rounded-lg shadow font-mono text-xs leading-relaxed"
          >
            {/* Store header & Optional Logo */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              {storeSettings.receipt_show_logo && storeSettings.receipt_logo_url && (
                <div className="flex justify-center mb-1.5">
                  <img
                    src={storeSettings.receipt_logo_url}
                    alt="Logo"
                    className="h-10 w-10 object-contain rounded"
                  />
                </div>
              )}
              <div className="font-sans font-black text-base text-slate-950 uppercase tracking-wide">
                {storeSettings.receipt_header_text || storeSettings.store_name || 'K99 KEDAI'}
              </div>
              <p className="text-[10px] text-slate-600">{storeSettings.address || 'Jl. Pemuda No. 99, Indonesia'}</p>
              <p className="text-[10px] text-slate-600">Telp/WA: {storeSettings.phone || '0812-9900-1999'}</p>
            </div>

            {/* Order meta */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>No. Order:</span>
                <span className="font-bold">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span>{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Channel:</span>
                <span className="uppercase font-semibold">
                  {order.channel || order.order_type}
                </span>
              </div>
              {order.online_order_reference && (
                <div className="flex justify-between text-slate-600">
                  <span>Ref Online:</span>
                  <span className="font-bold">{order.online_order_reference}</span>
                </div>
              )}
              {order.delivery_type && (
                <div className="flex justify-between text-slate-600">
                  <span>Metode:</span>
                  <span className="font-bold">
                    {order.delivery_type === 'spx_instant' ? 'SPX Instant' : 'Ambil di Kedai'}
                  </span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="flex justify-between font-semibold">
                    <span>
                      {item.product_name}
                      {item.temperature && (
                        <span className="text-[10px] text-slate-600 ml-1 font-normal">
                          [{item.temperature.toUpperCase()}]
                        </span>
                      )}
                    </span>
                    <span>Rp {(item.subtotal || item.unit_price * item.quantity).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="text-slate-600 text-[10px] pl-2 space-y-0.5">
                    <div>
                      {item.quantity} × Rp {item.unit_price.toLocaleString('id-ID')}
                    </div>
                    {item.addons && item.addons.length > 0 && (
                      <div className="text-[9px] text-slate-500">
                        + {item.addons.map(a => `${a.name} (Rp ${a.price})`).join(', ')}
                      </div>
                    )}
                    {item.notes && <div className="italic text-[10px]">Catatan: {item.notes}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon:</span>
                  <span>-Rp {order.discount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-950 pt-1 border-t border-dotted border-slate-300">
                <span>TOTAL:</span>
                <span>Rp {order.total.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-700 pt-0.5">
                <span>Metode Bayar:</span>
                <span className="uppercase font-semibold">{order.payment_method}</span>
              </div>
            </div>

            {/* Custom Footer */}
            <div className="text-center pt-2.5 text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">
              {storeSettings.receipt_footer_text || (
                <>
                  <p>Terima kasih telah berkunjung ke K99!</p>
                  <p>Follow Instagram @k99kedai</p>
                  <p className="font-bold text-slate-900">#K99SemuaSuka</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Struk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
