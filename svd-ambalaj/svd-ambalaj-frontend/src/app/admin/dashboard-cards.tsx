import { AdminStatsOverview } from "@/lib/admin-api";

const numberFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

const compactNumber = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type DashboardCardsProps = {
  stats: AdminStatsOverview | null;
  loading: boolean;
};

export function DashboardCards({ stats, loading }: DashboardCardsProps) {
  const cards = [
    {
      title: "Toplam Ciro",
      value: stats ? numberFormatter.format(stats.totalRevenue) : "-",
      description: "Tüm siparişlerin toplamı",
    },
    {
      title: "Toplam Sipariş",
      value: stats ? compactNumber.format(stats.totalOrders) : "-",
      description: "Kayıtlı sipariş adedi",
    },
    {
      title: "Bekleyen Sipariş",
      value: stats ? compactNumber.format(stats.pendingOrders) : "-",
      description: "Durumu bekleme olan siparişler",
    },
    {
      title: "Ortalama Sipariş Tutarı",
      value: stats ? numberFormatter.format(stats.averageOrderValue || 0) : "-",
      description: "Sipariş başına ortalama toplam",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{card.title}</p>
          <div className="mt-3 text-2xl font-semibold text-slate-900">
            {loading ? <span className="text-sm text-slate-400">Yükleniyor...</span> : card.value}
          </div>
          <p className="mt-2 text-xs text-slate-400">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
