type MiniCardProps = {
  title: string;
  value: string;
  description?: string;
  loading?: boolean;
};

export function MiniCard({ title, value, description, loading }: MiniCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="mt-3 text-2xl font-semibold text-slate-900">
        {loading ? <span className="text-sm text-slate-400">Yükleniyor...</span> : value}
      </div>
      {description && <p className="mt-2 text-xs text-slate-400">{description}</p>}
    </div>
  );
}
