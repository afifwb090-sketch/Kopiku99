import React from 'react';
import { Order } from '../types/database';
import { orderService } from '../services/orderService';
import { Bell, CheckCircle2, X } from 'lucide-react';

interface Props {
  order: Order | null;
  onClose: () => void;
  onAccepted?: (order: Order) => void;
}

export const IncomingOrderModal: React.FC<Props> = ({ order, onClose, onAccepted }) => {
  if (!order) return null;

  const handleAccept = async () => {
    try {
      const updated = await orderService.updateOrderStatus(order.id, 'confirmed');
      if (updated && onAccepted) {
        onAccepted(updated);
      }
    } catch (err) {
      console.error('Error accepting order:', err);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/50 bg-slate-900 shadow-2xl shadow-amber-500/20">
        {/* Header with sound badge */}
        <div className="flex items-center justify-between bg-amber-500 px-5 py-3.5 text-slate-950 font-bold">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950"></span>
            </span>
            <Bell className="h-5 w-5 animate-bounce" />
            <span className="text-base font-extrabold tracking-wide uppercase">ORDER BARU ONLINE!</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-950 hover:bg-amber-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400">Nomor Pesanan</span>
              <p className="text-2xl font-black text-amber-400 font-mono tracking-wide">{order.order_number}</p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-wider text-slate-400">Pelanggan</span>
              <p className="font-semibold text-white">{order.customer_name}</p>
              {order.customer_phone && (
                <p className="text-xs text-slate-400 font-mono">{order.customer_phone}</p>
              )}
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-2 rounded-xl bg-slate-800/60 p-3.5 border border-slate-700/50 max-h-48 overflow-y-auto">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-700/30 last:border-none">
                <div>
                  <span className="font-medium text-slate-200">{item.product_name}</span>
                  <span className="ml-2 font-bold text-amber-400">× {item.quantity}</span>
                  {item.notes && (
                    <p className="text-xs italic text-slate-400">Catatan: {item.notes}</p>
                  )}
                </div>
                <span className="font-semibold text-slate-300">
                  Rp {(item.subtotal || item.unit_price * item.quantity).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="rounded-lg bg-amber-500/10 p-2.5 border border-amber-500/20 text-xs text-amber-300">
              <span className="font-semibold">Catatan Pembeli:</span> {order.notes}
            </div>
          )}

          {/* Total & Payment method */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs text-slate-400">Metode Pembayaran</span>
              <p className="font-semibold text-white uppercase text-sm tracking-wide">
                {order.payment_method}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total Tagihan</span>
              <p className="text-2xl font-black text-emerald-400">
                Rp {order.total.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex gap-3">
            <button
              onClick={onClose}
              className="w-1/3 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleAccept}
              className="w-2/3 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>TERIMA PESANAN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
