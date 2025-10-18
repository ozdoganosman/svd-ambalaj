"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { AddToCartButton } from "@/components/add-to-cart-button";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  const handleQuantityChange = (productId: string, value: string) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    updateQuantity(productId, parsed);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
              Sepetiniz
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">Siparişinizi tamamlamaya hazırsınız</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Ürün adetlerini güncelleyebilir, istediğiniz ürünleri çıkarabilir ve siparişinizi tamamlamak için ödeme adımına geçebilirsiniz.
            </p>
          </div>
          <Link
            href="/checkout"
            className="inline-flex items-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600"
          >
            Siparişi Tamamla
          </Link>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            {items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                Sepetiniz boş. Ürünleri incelemek için
                <Link href="/" className="font-semibold text-amber-600 hover:underline">
                  {" "}anasayfaya dönün.
                </Link>
              </div>
            )}

            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                  <p className="text-sm text-slate-600">Birim fiyat: {formatCurrency(item.price)}</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="text-sm font-semibold text-slate-700">
                      Adet
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                        className="ml-3 w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <p className="text-lg font-bold text-amber-600">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                  <AddToCartButton
                    product={{
                      id: item.id,
                      title: item.title,
                      slug: item.slug,
                      price: item.price,
                      bulkPricing: item.bulkPricing,
                    }}
                    quantity={1}
                    variant="ghost"
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-amber-800">Sipariş Özeti</h2>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-700">
                <dt>Ara toplam</dt>
                <dd className="font-semibold">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <dt>Kargo</dt>
                <dd>Teklifte belirtilecek</dd>
              </div>
            </dl>
            <div className="mt-6 border-t border-amber-100 pt-4">
              <div className="flex items-center justify-between text-base font-bold text-amber-700">
                <span>Toplam</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="mt-6 block rounded-full bg-amber-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600"
            >
              Siparişe Devam Et
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
