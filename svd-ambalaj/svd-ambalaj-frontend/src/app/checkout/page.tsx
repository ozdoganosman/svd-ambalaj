"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000/.netlify/functions/api";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);

type CheckoutFormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  taxNumber: string;
  address: string;
  city: string;
  notes: string;
};

const defaultState: CheckoutFormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  taxNumber: "",
  address: "",
  city: "",
  notes: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState<CheckoutFormState>(defaultState);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (items.length === 0) {
      setStatus("error");
      setMessage("Sepetiniz boş. Lütfen ürün ekleyin.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    const payload = {
      customer: form,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      })),
      totals: {
        subtotal,
        currency: "TRY",
      },
    };

    try {
      const response = await fetch(`${apiBase}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Order request failed");
      }

      clearCart();
      setForm(defaultState);
      router.push("/checkout/success");
    } catch (error) {
      console.error("Order submission failed", error);
      setStatus("error");
      setMessage("Sipariş oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
              Sipariş Tamamlama
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">Fatura ve teslimat bilgilerinizi paylaşın</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Satış ekibimiz siparişinizi onaylamak ve ödeme seçeneklerini iletmek için en kısa sürede sizinle iletişime geçecek.
            </p>
          </div>
          <Link
            href="/cart"
            className="inline-flex items-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-600"
          >
            Sepete geri dön
          </Link>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-semibold text-slate-700">
                  Ad Soyad
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-semibold text-slate-700">
                  Firma Adı
                </label>
                <input
                  id="company"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  E-posta
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                  Telefon
                </label>
                <input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  pattern="^\+?\d{10,15}$"
                  title="Lütfen geçerli bir telefon numarası girin"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="taxNumber" className="text-sm font-semibold text-slate-700">
                  Vergi No / T.C.
                </label>
                <input
                  id="taxNumber"
                  name="taxNumber"
                  value={form.taxNumber}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-semibold text-slate-700">
                  Şehir
                </label>
                <input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-semibold text-slate-700">
                Teslimat Adresi
              </label>
              <textarea
                id="address"
                name="address"
                rows={4}
                value={form.address}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Sokak, mahalle, ilçe ve posta kodu bilgilerini yazınız"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-semibold text-slate-700">
                Ek Notlar
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={form.notes}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Teslimat, paketleme veya ödeme tercihlerinizi belirtebilirsiniz."
              />
            </div>

            {message && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "submitting" ? "Gönderiliyor..." : "Sipariş Talebini Gönder"}
            </button>
          </form>

          <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
            <h2 className="text-lg font-semibold text-slate-900">Sipariş Özeti</h2>
            <ul className="space-y-4 text-sm text-slate-600">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span>
                    {item.title}
                    <span className="text-slate-400"> × {item.quantity}</span>
                  </span>
                  <span className="font-semibold text-amber-600">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-base font-bold text-amber-700">
                <span>Genel Toplam</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Kargo ve ödeme detayları satış ekibimiz tarafından onay sürecinde paylaşılacaktır.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
