'use client';

import { useEffect, useState } from "react";
import { AdminOrder, AdminStatsOverview, apiFetch } from "@/lib/admin-api";
import { DashboardCards } from "./dashboard-cards";

const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  processing: "Hazırlanıyor",
  shipped: "Kargolandı",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsOverview | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true);
      setStatsError(null);
      try {
        const response = await apiFetch<AdminStatsOverview>("/stats/overview");
        setStats(response);
      } catch (error) {
        setStatsError((error as Error).message);
      } finally {
        setLoadingStats(false);
      }
    };

    const loadOrders = async () => {
      setLoadingOrders(true);
      setOrdersError(null);
      try {
        const response = await apiFetch<{ orders: AdminOrder[] }>("/orders");
        setOrders(response.orders ?? []);
      } catch (error) {
        setOrdersError((error as Error).message);
      } finally {
        setLoadingOrders(false);
      }
    };

    loadStats();
    loadOrders();
  }, []);

  const topCategories = stats?.categorySales
    .slice()
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const recentOrders = orders
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Gösterge Paneli</h1>
            <p className="text-sm text-slate-500">Satış performansınızı ve sipariş durumlarını hızla görüntüleyin.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            className="hidden items-center rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 md:inline-flex"
          >
            Verileri Yenile
          </button>
        </div>
        <DashboardCards stats={stats} loading={loadingStats} />
        {statsError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{statsError}</div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Son Siparişler</h2>
            <span className="text-xs font-medium text-slate-500">En güncel 5 kayıt listelenir</span>
          </div>
          {ordersError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{ordersError}</div>
          )}
          {loadingOrders ? (
            <div className="py-8 text-center text-sm text-slate-500">Yükleniyor...</div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Henüz sipariş bulunmuyor.</div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{order.customer?.name ?? 'Müşteri'}</p>
                      <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                        {order.items.length} ürün
                      </span>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {currencyFormatter.format(order.totals?.subtotal ?? 0)}
                      </span>
                      <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </div>
                  </div>
                  <ul className="mt-2 text-xs text-slate-500">
                    {order.items.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        {item.title} × {item.quantity}
                      </li>
                    ))}
                    {order.items.length > 3 && <li>... ve {order.items.length - 3} ürün daha</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Kategori Bazlı Satış</h2>
            <span className="text-xs font-medium text-slate-500">Ciroya göre sıralanır</span>
          </div>
          {loadingStats ? (
            <div className="py-8 text-center text-sm text-slate-500">Yükleniyor...</div>
          ) : !topCategories || topCategories.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Kategori satışı verisi bulunamadı.</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">Kategori</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">Ciro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {topCategories.map((category) => (
                    <tr key={category.category} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-900">{category.category}</td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        {currencyFormatter.format(category.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Aylık Ciro</h2>
          <span className="text-xs font-medium text-slate-500">Yıllara göre kronolojik sırada</span>
        </div>
        {loadingStats ? (
          <div className="py-8 text-center text-sm text-slate-500">Yükleniyor...</div>
        ) : !stats?.monthlySales || stats.monthlySales.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">Henüz aylık satış verisi oluşmadı.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Ay</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-700">Ciro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.monthlySales.map((entry) => (
                  <tr key={entry.month} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold text-slate-900">{entry.month}</td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {currencyFormatter.format(entry.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
