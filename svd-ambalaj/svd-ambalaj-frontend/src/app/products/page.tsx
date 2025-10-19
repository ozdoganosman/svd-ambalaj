import Image from "next/image";
import Link from "next/link";
import { resolveServerApiBase } from "@/lib/server-api";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);

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
  images?: string[];
  image?: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

async function getProducts(apiBase: string): Promise<Product[]> {
  try {
    const response = await fetch(`${apiBase}/products`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return payload?.products ?? [];
  } catch {
    return [];
  }
}

async function getCategories(apiBase: string): Promise<Category[]> {
  try {
    const response = await fetch(`${apiBase}/categories`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    return payload?.categories ?? [];
  } catch {
    return [];
  }
}

const resolveMediaPath = (path: string | undefined | null, apiOrigin: string): string => {
  if (!path) {
    return "";
  }

  if (path.startsWith("/uploads/") && apiOrigin) {
    return `${apiOrigin}${path}`;
  }

  return path;
};

export default async function ProductsPage() {
  const apiBase = resolveServerApiBase();

  const [products, categories] = await Promise.all([
    getProducts(apiBase),
    getCategories(apiBase),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 py-16 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 sm:px-10">
        <header className="space-y-6 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
            Ürün Kataloğu
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">Ambalaj Çözümleri</h1>
            <p className="mx-auto max-w-3xl text-base text-slate-600">
              Sprey, pompa ve PET ambalaj ürünlerimizin stok ve toplu alım avantajlarını keşfedin. İhtiyaçlarınıza en uygun çözümler için ürün detay sayfalarımıza göz atabilirsiniz.
            </p>
          </div>
          {categories.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-3 text-sm text-slate-600">
              {categories.map((category) => (
                <li key={category.id} className="rounded-full border border-slate-200 px-4 py-2">
                  {category.name}
                </li>
              ))}
            </ul>
          )}
        </header>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-900">Ürünler</h2>
            <span className="rounded-full bg-slate-100 px-4 py-1 text-sm text-slate-600">
              {products.length} ürün
            </span>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              Görüntülenecek ürün bulunamadı. Lütfen daha sonra tekrar deneyin veya iletişime geçin.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const image = resolveMediaPath(product.images?.[0] ?? product.image, apiBase);

                return (
                  <article
                    key={product.id}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative h-48 w-full bg-slate-100">
                      <Image
                        src={image || "/images/placeholders/product.jpg"}
                        alt={product.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-4 p-6">
                      <header className="space-y-2">
                        <h3 className="text-xl font-semibold text-slate-900">{product.title}</h3>
                        <p className="text-sm text-slate-600">{product.description}</p>
                      </header>

                      <div className="space-y-2">
                        <span className="text-xs uppercase tracking-wide text-slate-500">Başlangıç fiyatı</span>
                        <p className="text-2xl font-bold text-amber-600">{formatCurrency(product.price)}</p>
                        {product.bulkPricing && product.bulkPricing.length > 0 && (
                          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                              Toplu Alım Avantajı
                            </p>
                            <ul className="mt-3 space-y-2">
                              {product.bulkPricing.map((tier) => (
                                <li key={`${product.id}-tier-${tier.minQty}`} className="flex items-center justify-between">
                                  <span>{tier.minQty}+ adet</span>
                                  <span className="font-semibold">{formatCurrency(tier.price)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto flex flex-col gap-3">
                        <Link
                          href={`/products/${product.slug}`}
                          className="inline-flex items-center justify-center rounded-full border border-amber-500 px-5 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-500 hover:text-white"
                        >
                          Detayları Gör
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
