'use client';

import { useEffect, useState } from "react";

export type StatsFilters = {
  from: string;
  to: string;
  category: string;
};

type StatsFiltersProps = {
  categories: { id: string; name: string }[];
  onChange: (filters: StatsFilters) => void;
};

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 6, 1)
  .toISOString()
  .slice(0, 10);
const defaultTo = today.toISOString().slice(0, 10);

export function StatsFilters({ categories, onChange }: StatsFiltersProps) {
  const [filters, setFilters] = useState<StatsFilters>({
    from: defaultFrom,
    to: defaultTo,
    category: "all",
  });

  useEffect(() => {
    onChange(filters);
  }, [filters, onChange]);

  const handleChange = (field: keyof StatsFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">Başlangıç Tarihi</label>
        <input
          type="date"
          value={filters.from}
          max={filters.to}
          onChange={(event) => handleChange("from", event.target.value)}
          className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-500">Bitiş Tarihi</label>
        <input
          type="date"
          value={filters.to}
          min={filters.from}
          onChange={(event) => handleChange("to", event.target.value)}
          className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
        />
      </div>
      <div className="md:col-span-2 flex flex-col">
        <label className="text-xs font-medium text-slate-500">Kategori</label>
        <select
          value={filters.category}
          onChange={(event) => handleChange("category", event.target.value)}
          className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
