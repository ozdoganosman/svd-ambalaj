import Link from "next/link";

const formatNow = () =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-20 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl border border-emerald-100 bg-white p-10 text-center shadow-xl shadow-emerald-100">
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
          Sipariş Talebi Gönderildi
        </span>
        <h1 className="mt-6 text-4xl font-bold text-slate-900">
          Teşekkürler! Talebinizi aldık.
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Satış ekibimiz {formatNow()} tarihli talebinizi inceleyecek ve ödeme & teslimat seçeneklerini paylaşmak için en kısa sürede sizinle iletişime geçecek.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
          >
            Alışverişe Devam Et
          </Link>
          <Link
            href="/orders"
            className="inline-flex items-center rounded-full border border-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            Siparişlerimi Görüntüle
          </Link>
        </div>
      </div>
    </main>
  );
}
