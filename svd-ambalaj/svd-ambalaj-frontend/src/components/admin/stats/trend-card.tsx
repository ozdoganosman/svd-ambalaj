type TrendCardProps = {
  title: string;
  value: string;
  trendLabel: string;
  trendValue: string;
  trendPositive?: boolean;
  loading?: boolean;
};

export function TrendCard({ title, value, trendLabel, trendValue, trendPositive = true, loading }: TrendCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="mt-3 text-2xl font-semibold text-slate-900">
        {loading ? <span className="text-sm text-slate-400">Yükleniyor...</span> : value}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${trendPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
          {trendPositive ? '+' : '-'}{trendValue}
        </span>
        <span className="text-slate-400">{trendLabel}</span>
      </div>
    </div>
  );
}
