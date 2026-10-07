import { orderService } from './orderService';
import { productService } from './productService';
import { Order } from '../types/database';

export interface SalesReport {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMarginPercent: number;
  totalTransactions: number;
  posOrdersCount: number;
  onlineOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  paymentBreakdown: Record<string, { count: number; total: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

export const reportService = {
  async getSalesReport(dateRange?: { startDate?: string; endDate?: string }): Promise<SalesReport> {
    const orders = await orderService.getOrders();
    const products = await productService.getProducts();

    // Map product cost prices
    const productCostMap = new Map<string, number>();
    products.forEach((p) => {
      productCostMap.set(p.id, Number(p.cost_price || 0));
      productCostMap.set(p.name.toLowerCase(), Number(p.cost_price || 0));
    });

    let filteredOrders = orders;
    if (dateRange?.startDate) {
      filteredOrders = filteredOrders.filter(o => new Date(o.created_at) >= new Date(dateRange.startDate!));
    }
    if (dateRange?.endDate) {
      filteredOrders = filteredOrders.filter(o => new Date(o.created_at) <= new Date(dateRange.endDate!));
    }

    let totalRevenue = 0;
    let totalCost = 0;
    let posOrdersCount = 0;
    let onlineOrdersCount = 0;
    let completedOrdersCount = 0;
    let cancelledOrdersCount = 0;

    const paymentBreakdown: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      qris: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
      other: { count: 0, total: 0 },
    };

    const productSalesMap = new Map<string, { quantity: number; revenue: number }>();

    filteredOrders.forEach((order) => {
      if (order.status === 'cancelled') {
        cancelledOrdersCount++;
        return;
      }

      if (order.status === 'completed') {
        completedOrdersCount++;
      }

      if (order.order_type === 'pos') posOrdersCount++;
      if (order.order_type === 'online') onlineOrdersCount++;

      // Calculate effective revenue (net_revenue for Shopee/Grab/GoFood channels if defined)
      const effectiveRevenue = (order.net_revenue !== undefined && order.net_revenue !== null)
        ? Number(order.net_revenue)
        : Number(order.total);

      totalRevenue += effectiveRevenue;

      const method = order.channel && order.channel !== 'offline' ? order.channel : (order.payment_method || 'cash');
      if (!paymentBreakdown[method]) {
        paymentBreakdown[method] = { count: 0, total: 0 };
      }
      paymentBreakdown[method].count++;
      paymentBreakdown[method].total += effectiveRevenue;

      // Calculate cost & product sales
      (order.items || []).forEach((item) => {
        const itemCost = productCostMap.get(item.product_id || '') ||
                         productCostMap.get(item.product_name.toLowerCase()) ||
                         (Number(item.unit_price) * 0.4); // reasonable 40% default if unassigned

        totalCost += itemCost * Number(item.quantity);

        const cur = productSalesMap.get(item.product_name) || { quantity: 0, revenue: 0 };
        cur.quantity += Number(item.quantity);
        cur.revenue += Number(item.subtotal);
        productSalesMap.set(item.product_name, cur);
      });
    });

    const grossProfit = Math.max(0, totalRevenue - totalCost);
    const profitMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const topProducts = Array.from(productSalesMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      profitMarginPercent,
      totalTransactions: filteredOrders.length,
      posOrdersCount,
      onlineOrdersCount,
      completedOrdersCount,
      cancelledOrdersCount,
      paymentBreakdown,
      topProducts,
    };
  },
};
