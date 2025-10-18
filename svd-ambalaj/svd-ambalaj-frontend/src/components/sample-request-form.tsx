"use client";

import { useState } from "react";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000/.netlify/functions/api";

export type SampleRequestFormProps = {
  categories: { id: string; name: string }[];
};

type FormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  product: string;
  quantity: string;
  notes: string;
};

const defaultState: FormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  product: "",
  quantity: "",
  notes: "",
};

export function SampleRequestForm({ categories }: SampleRequestFormProps) {
  const [form, setForm] = useState<FormState>(defaultState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setStatus("success");
      setMessage("Numune talebiniz başarıyla alındı. Satış ekibimiz en kısa sürede iletişime geçecek.");
      setForm(defaultState);
    } catch (error) {
      console.error("Sample request failed", error);
      setStatus("error");
      setMessage("Numune talebi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
    }
  };

  return (
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
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="product" className="text-sm font-semibold text-slate-700">
            İlgilendiğiniz Ürün
          </label>
          <select
            id="product"
            name="product"
            value={form.product}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="">Ürün kategorisi seçin</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="quantity" className="text-sm font-semibold text-slate-700">
            Tahmini Adet
          </label>
          <input
            id="quantity"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            placeholder="Ör: 5.000 adet"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-semibold text-slate-700">
          Ek Notlar
        </label>
        <textarea
          id="notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          placeholder="İstediğiniz boy, renk veya özel gereksinimleri belirtebilirsiniz."
        />
      </div>
      {message && (
        <div
          className={
            status === "success"
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          }
        >
          {message}
        </div>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "submitting" ? "Gönderiliyor..." : "Numune Talep Et"}
      </button>
    </form>
  );
}
