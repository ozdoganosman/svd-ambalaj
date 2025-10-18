export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-600 sm:px-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-900">SVD Ambalaj</p>
          <p className="mt-1 max-w-md text-slate-500">
            Ambalaj çözümleriniz için güvenilir tedarikçi. Adet bazlı fiyatlandırma ile işletmenize özel teklifleri keşfedin.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-slate-500">
          <a href="mailto:info@svdambalaj.com" className="transition hover:text-amber-600">
            info@svdambalaj.com
          </a>
          <a href="tel:+908501234567" className="transition hover:text-amber-600">
            0850 123 45 67
          </a>
          <span>İstanbul, Türkiye</span>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SVD Ambalaj. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
