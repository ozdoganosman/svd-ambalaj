import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/products", label: "Ürünler" },
  { href: "/categories", label: "Kategoriler" },
  { href: "/cart", label: "Sepet" },
  { href: "/checkout", label: "Sipariş" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="SVD Ambalaj"
            width={48}
            height={48}
            className="h-12 w-12"
            priority
          />
          <span className="text-xl font-bold tracking-tight text-amber-600">
            SVD Ambalaj
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-700 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-amber-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/checkout"
            className="hidden rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-600 transition hover:border-amber-400 hover:bg-amber-50 lg:inline-flex"
          >
            Hızlı Satın Al
          </Link>
          <Link
            href="/#sample"
            className="hidden rounded-full border border-transparent bg-white px-4 py-2 text-sm font-semibold text-amber-600 shadow-sm shadow-amber-200/50 transition hover:border-amber-400 hover:bg-amber-50 md:inline-flex"
          >
            Numune Talep Et
          </Link>
          <a
            href="tel:+908501234567"
            className="hidden rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-600 transition hover:border-amber-400 hover:bg-amber-50 sm:inline-flex"
          >
            0850 123 45 67
          </a>
        </div>
      </div>
      <div className="md:hidden">
        <nav className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700">
          {links.slice(0, 3).map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-amber-600">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
