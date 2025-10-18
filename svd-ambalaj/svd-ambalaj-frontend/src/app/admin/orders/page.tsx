'use client';

import { useEffect, useMemo, useState } from "react";
import { AdminOrder, apiFetch } from "@/lib/admin-api";

const statusOptions = [
  { value: "all", label: "Tüm Durumlar" },
  { value: "pending", label: "Beklemede" },
  { value: "processing", label: "Hazırlanıyor" },
  { value: "shipped", label: "Kargolandı" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "cancelled", label: "İptal" },
];

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  processing: "Hazırlanıyor",
  shipped: "Kargolandı",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ orders: AdminOrder[] }>("/orders");
      setOrders(response.orders ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") {
      return orders;
    }
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiFetch(`/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
        parseJson: false,
      });
      await fetchOrders();
      setSuccessMessage(`Sipariş durumu "${statusLabels[newStatus] ?? newStatus}" olarak güncellendi`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Sipariş Yönetimi</h1>
            <p className="text-sm text-slate-600">
              Gelen siparişleri görüntüleyin, durumlarını yönetin ve müşteri detaylarına hızlıca erişin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-400"
            >
              Yenile
            </button>
          </div>
        </div>
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
        {successMessage && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            {successMessage}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Siparişler yükleniyor...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">Seçili duruma ait sipariş bulunamadı.</div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => (
              <article key={order.id} className="rounded-lg border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">#{order.id}</span>
                      <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                        {statusLabels[order.status] ?? order.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="font-medium text-slate-900">{order.customer?.name ?? "Müşteri"}</p>
                      {order.customer?.company && <p>{order.customer.company}</p>}
                      {order.customer?.phone && <p>{order.customer.phone}</p>}
                      {order.customer?.email && <p>{order.customer.email}</p>}
                      {order.customer?.city && <p>{order.customer.city}</p>}
                      {order.customer?.address && <p className="max-w-lg text-xs text-slate-500">{order.customer.address}</p>}
                    </div>
                    {order.customer?.notes && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Not: {order.customer.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right text-sm">
                      <p className="font-semibold text-slate-900">Toplam</p>
                      <p className="text-lg font-semibold text-amber-600">
                        {currencyFormatter.format(order.totals?.subtotal ?? 0)}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {statusOptions
                        .filter((option) => option.value !== "all")
                        .map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleStatusChange(order.id, option.value)}
                            disabled={updatingId === order.id || order.status === option.value}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white ${
                              order.status === option.value
                                ? 'border border-amber-200 text-amber-600'
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                            } ${updatingId === order.id ? 'opacity-60' : ''}`}
                          >
                            {option.label}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-900">Sipariş Kalemleri</h3>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Ürün</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700">Adet</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700">Birim</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-700">Ara Toplam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((item) => (
                          <tr key={`${order.id}-${item.id}`} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-700">{item.title}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {currencyFormatter.format(item.price)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-900 font-semibold">
                              {currencyFormatter.format(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
