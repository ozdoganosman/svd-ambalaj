import { AdminStatsOverview } from "@/lib/admin-api";

const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

type SalesTableProps = {
  stats: AdminStatsOverview | null;
  loading: boolean;
};

export function SalesTable({ stats, loading }: SalesTableProps) {
  if (loading) {
    return <div className="py-8 text-center text-sm text-slate-500">Veriler yükleniyor...</div>;
  }

  if (!stats || stats.monthlySales.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-500">Henüz satış verisi bulunmuyor.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-slate-700">Ay</th>
            <th className="px-4 py-2 text-right font-medium text-slate-700">Ciro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {stats.monthlySales.map((entry) => (
            <tr key={entry.month} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-medium text-slate-900">{entry.month}</td>
              <td className="px-4 py-2 text-right text-slate-600">
                {currencyFormatter.format(entry.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
