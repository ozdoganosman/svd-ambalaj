'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Gösterge Paneli" },
  { href: "/admin/products", label: "Ürünler" },
  { href: "/admin/categories", label: "Kategoriler" },
  { href: "/admin/media", label: "Medya" },
  { href: "/admin/landing", label: "Landing Medya" },
  { href: "/admin/orders", label: "Siparişler" },
  { href: "/admin/stats", label: "İstatistikler" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur md:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">SVD Ambalaj</p>
          <h1 className="text-lg font-semibold text-slate-900">Yönetim Paneli</h1>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white ${
                  isActive
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 text-xs text-slate-400">
          © {new Date().getFullYear()} SVD Ambalaj
        </div>
      </div>
    </aside>
  );
}
