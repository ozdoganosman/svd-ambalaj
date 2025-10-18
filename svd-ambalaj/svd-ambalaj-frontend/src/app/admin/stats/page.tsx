'use client';

import { useEffect, useMemo, useState } from "react";
import { AdminCategory, AdminStatsOverview, StatsFiltersPayload, fetchStatsOverview, apiFetch } from "@/lib/admin-api";
import { MiniCard } from "@/components/admin/stats/mini-card";
import { TrendCard } from "@/components/admin/stats/trend-card";
import { SalesTable } from "@/components/admin/stats/sales-table";
import { StatsFilters, StatsFilters as StatsFiltersState } from "@/components/admin/stats/filters";
import { CategorySalesChart } from "@/components/admin/stats/category-sales-chart";

const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export default function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStatsOverview | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [filters, setFilters] = useState<StatsFiltersState>({ from: "", to: "", category: "all" });
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiFetch<{ categories: AdminCategory[] }>("/categories");
        setCategories(response.categories ?? []);
      } catch (err) {
        console.error(err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true);
      setError(null);
      try {
        const payload: StatsFiltersPayload = {
          from: filters.from || undefined,
          to: filters.to || undefined,
          category: filters.category,
        };
        const overview = await fetchStatsOverview(payload);
        setStats(overview);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [filters]);

  const topCategories = useMemo(() => {
    if (!stats?.categorySales) {
      return [];
    }
    return stats.categorySales
      .slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((entry) => ({
        label: entry.category,
        value: currencyFormatter.format(entry.total),
      }));
  }, [stats]);

  const monthlyTrend = useMemo(() => {
    if (!stats?.monthlySales || stats.monthlySales.length < 2) {
      return { diff: 0, positive: true };
    }
    const sorted = stats.monthlySales.slice().sort((a, b) => (a.month < b.month ? -1 : 1));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const diff = last.total - prev.total;
    return {
      diff,
      positive: diff >= 0,
    };
  }, [stats]);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">İstatistikler</h1>
          <p className="text-sm text-slate-500">Satış performansınızı tarih aralıklarına ve kategorilere göre analiz edin.</p>
        </div>
        <StatsFilters
          categories={categories.map((category) => ({ id: category.id, name: category.name }))}
          onChange={setFilters}
        />
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniCard
          title="Toplam Ciro"
          value={stats ? currencyFormatter.format(stats.totalRevenue) : "-"}
          description="Seçilen filtrelere göre toplam satış"
          loading={loadingStats}
        />
        <MiniCard
          title="Toplam Sipariş"
          value={stats ? stats.totalOrders.toLocaleString("tr-TR") : "-"}
          description="Bu dönemdeki sipariş sayısı"
          loading={loadingStats}
        />
        <MiniCard
          title="Bekleyen Sipariş"
          value={stats ? stats.pendingOrders.toLocaleString("tr-TR") : "-"}
          description="Durumu beklemede olan siparişler"
          loading={loadingStats}
        />
        <TrendCard
          title="Aylık Trend"
          value={stats ? currencyFormatter.format(stats.averageOrderValue || 0) : "-"}
          trendLabel="Son aya göre değişim"
          trendValue={stats ? currencyFormatter.format(Math.abs(monthlyTrend.diff)) : "-"}
          trendPositive={monthlyTrend.positive}
          loading={loadingStats}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Kategori Satış Dağılımı</h2>
            <p className="text-xs text-slate-500">Toplam cirosu en yüksek kategoriler</p>
          </div>
          <CategorySalesChart stats={stats} loading={loadingStats} />
          {topCategories.length > 0 && (
            <ul className="space-y-2 text-sm text-slate-500">
              {topCategories.map((category) => (
                <li key={category.label} className="flex items-center justify_between">
                  <span>{category.label}</span>
                  <span>{category.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Aylık Ciro</h2>
            <p className="text-xs text-slate-500">Seçilen tarih aralığında aylık bazda toplam ciro</p>
          </div>
          <SalesTable stats={stats} loading={loadingStats} />
        </div>
      </section>
    </div>
  );
}
