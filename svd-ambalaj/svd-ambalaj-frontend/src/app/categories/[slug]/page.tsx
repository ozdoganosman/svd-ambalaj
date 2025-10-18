import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { resolveServerApiUrl } from "@/lib/server-api";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  bulkPricing?: { minQty: number; price: number }[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);

async function getCategory(slug: string): Promise<Category | undefined> {
  try {
    const response = await fetch(resolveServerApiUrl("/categories"), {
      next: { revalidate: 120 },
    });
    if (!response.ok) {
      return undefined;
    }
    const payload = await response.json();
    return payload?.categories?.find((category: Category) => category.slug === slug);
  } catch (error) {
    console.error("Category fetch error", error);
    return undefined;
  }
}

async function getCategoryProducts(slug: string): Promise<Product[]> {
  try {
    const response = await fetch(
      resolveServerApiUrl(`/categories/${slug}/products`),
      {
        next: { revalidate: 120 },
      }
    );
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    return payload?.products ?? [];
  } catch (error) {
    console.error("Category products fetch error", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return {
      title: "Kategori bulunamadı | SVD Ambalaj",
    };
  }

  return {
    title: `${category.name} | SVD Ambalaj`,
    description: category.description,
  };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);
  const products = await getCategoryProducts(slug);

  if (!category) {
    return (
      <main className="min-h-screen bg-slate-50 py-20 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-3xl font-bold">Kategori bulunamadı</h1>
          <p className="mt-4 text-slate-600">
            Aradığınız kategori kaldırılmış olabilir. Diğer ürün kategorilerimizi görüntülemek için{" "}
            <Link href="/categories" className="font-semibold text-amber-600 hover:underline">
              tıklayın.
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
            {category.name}
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            {category.name} çözümlerimizle üretiminizi güçlendirin
          </h1>
          {category.description && (
            <p className="mt-3 text-lg text-slate-600">{category.description}</p>
          )}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              Bu kategori için henüz ürün eklenmemiş. Lütfen daha sonra tekrar kontrol edin.
            </div>
          )}

          {products.map((product) => (
            <article
              key={product.id}
              className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg"
            >
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-900">{product.title}</h2>
                <p className="text-sm text-slate-600">{product.description}</p>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Başlangıç fiyatı
                  </span>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                {product.bulkPricing && product.bulkPricing.length > 0 && (
                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Toplu alım avantajı
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-amber-800">
                      {product.bulkPricing.map((tier) => (
                        <li key={`${product.id}-${tier.minQty}`} className="flex items-center justify-between">
                          <span>{tier.minQty}+ adet</span>
                          <span className="font-semibold">{formatCurrency(tier.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <AddToCartButton
                  product={{
                    id: product.id,
                    title: product.title,
                    slug: product.slug,
                    price: product.price,
                    bulkPricing: product.bulkPricing,
                  }}
                />
                <Link
                  href={`/products/${product.slug}`}
                  className="inline-flex items-center justify-center rounded-full border border-amber-500 px-5 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-500 hover:text-white"
                >
                  Ürün Detayı
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
