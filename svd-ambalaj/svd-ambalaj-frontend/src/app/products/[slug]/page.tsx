import type { Metadata } from "next";
import { AddToCartButton } from "@/components/add-to-cart-button";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000/.netlify/functions/api";

type BulkTier = {
  minQty: number;
  price: number;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  bulkPricing?: BulkTier[];
  category: string;
  images?: string[];
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);

async function getProduct(slug: string): Promise<Product | undefined> {
  try {
    const response = await fetch(`${apiBase}/products/slug/${slug}`, {
      next: { revalidate: 120 },
    });
    if (!response.ok) {
      return undefined;
    }
    return response.json();
  } catch (error) {
    console.error("Product fetch error", error);
    return undefined;
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${apiBase}/categories`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    return payload?.categories ?? [];
  } catch (error) {
    console.error("Categories fetch error", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Ürün bulunamadı | SVD Ambalaj",
    };
  }

  return {
    title: `${product.title} | SVD Ambalaj`,
    description: product.description,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, categories] = await Promise.all([
    getProduct(slug),
    getCategories(),
  ]);

  if (!product) {
    return (
      <main className="min-h-screen bg-slate-50 py-20 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-3xl font-bold">Ürün bulunamadı</h1>
          <p className="mt-4 text-slate-600">
            Aradığınız ürün kaldırılmış olabilir. Tüm ürünlerimizi görmek için
            <a href="/products" className="font-semibold text-amber-600 hover:underline">
              {" "}ürün listesine geri dönün.
            </a>
          </p>
        </div>
      </main>
    );
  }

  const category = categories.find((item) => item.id === product.category);

  const galleryImages = product.images && product.images.length > 0
    ? product.images
    : ["/images/placeholders/product-default.jpg"];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {galleryImages.map((image, index) => (
                <div
                  key={`${product.id}-image-${index}`}
                  className="relative h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                >
                  <img
                    src={image}
                    alt={`${product.title} görsel ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>

            <article className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
              <header className="space-y-3">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                  {category ? category.name : "Ambalaj Çözümleri"}
                </span>
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                  {product.title}
                </h1>
                <p className="text-lg text-slate-600">{product.description}</p>
              </header>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                  Adet Bazlı Fiyatlandırma
                </p>
                <ul className="mt-4 space-y-2 text-sm text-amber-800">
                  <li className="flex items-center justify-between">
                    <span>1+ adet</span>
                    <span className="font-semibold">{formatCurrency(product.price)}</span>
                  </li>
                  {product.bulkPricing?.map((tier) => (
                    <li key={`${product.id}-tier-${tier.minQty}`} className="flex items-center justify-between">
                      <span>{tier.minQty}+ adet</span>
                      <span className="font-semibold">{formatCurrency(tier.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Teknik Özellikler</h2>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Minimum sipariş adedi: 1.000 adet (önerilen)</li>
                    <li>• Teslimat süresi: 3-5 iş günü stoktan, 10-15 iş günü ithal ürünlerde</li>
                    <li>• Renk seçenekleri: Beyaz, siyah, özel renk üretimi</li>
                    <li>• Sertifika: ISO 9001 üretim tesisi</li>
                  </ul>
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Kullanım Alanları</h2>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Kozmetik: Tonik, saç spreyi, losyon</li>
                    <li>• Ev bakım: Yüzey temizleyici, oda spreyi</li>
                    <li>• Sağlık: Antiseptik ve dezenfektan çözeltiler</li>
                    <li>• Endüstriyel kullanımda dayanıklı yapı</li>
                  </ul>
                </div>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Numune ve Özelleştirme</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Bu ürün için renk, dip boru uzunluğu ve baskı seçeneklerinde özelleştirme yapılabilir. Numune talep etmek için
                  <a href="/#sample" className="font-semibold text-amber-600 hover:underline">
                    {" "}numune formunu doldurun
                  </a>
                  . Müşteri temsilcilerimiz 24 saat içinde dönüş yapacaktır.
                </p>
              </section>
            </article>
          </section>

          <aside className="flex h-fit flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Başlangıç fiyatı
              </p>
              <p className="text-4xl font-bold text-amber-600">
                {formatCurrency(product.price)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Fiyatlar adet bazlı olup toplu alımlarda otomatik güncellenir.
              </p>
            </div>

            <AddToCartButton
              product={{
                id: product.id,
                title: product.title,
                slug: product.slug,
                price: product.price,
                bulkPricing: product.bulkPricing,
              }}
              quantity={1}
              variant="primary"
              className="w-full"
            />
            <AddToCartButton
              product={{
                id: product.id,
                title: product.title,
                slug: product.slug,
                price: product.price,
                bulkPricing: product.bulkPricing,
              }}
              quantity={1000}
              variant="secondary"
              className="w-full"
            />

            <a
              href="mailto:info@svdambalaj.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-600"
            >
              Teklif iste
            </a>
            <a
              href="/#sample"
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-white px-6 py-3 text-sm font-semibold text-amber-600 shadow-sm shadow-amber-200/50 transition hover:border-amber-400 hover:bg-amber-50"
            >
              Numune talep et
            </a>
          </aside>
        </div>
      </div>
    </main>
  );
}
