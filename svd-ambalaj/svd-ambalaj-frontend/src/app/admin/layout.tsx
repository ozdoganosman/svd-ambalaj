"use client";

import type { ReactNode } from "react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-6">
          <AdminNav />
          <main className="flex-1 space-y-6">
            <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">SVD Ambalaj</p>
                <h1 className="text-2xl font-semibold text-slate-900">Yönetim Paneli</h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>Admin token ile giriş yapılmıştır.</span>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.removeItem("svd_admin_token");
                      window.location.reload();
                    }
                  }}
                  className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Çıkış Yap
                </button>
              </div>
            </header>
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
