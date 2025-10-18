import { resolveServerApiUrl } from "@/lib/server-api";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch(resolveServerApiUrl("/categories"), {
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      console.error("Failed to fetch categories", response.statusText);
      return [];
    }

    const payload = await response.json();
    return payload?.categories ?? [];
  } catch (error) {
    console.error("Category fetch error", error);
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
              Ürün Kategorileri
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">
              Tüm ambalaj çözümlerimizi kategorilere göre keşfedin
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">
              Mist spreyler, köpük pompaları, kapaklar ve şişeler dahil geniş ürün gamımızla üretim hatlarınızı destekliyoruz. Her kategori için adet bazlı fiyatlandırma avantajlarımızdan yararlanın.
            </p>
          </div>
          <a
            href="/checkout"
            className="inline-flex items-center rounded-full border border-amber-500 px-6 py-3 text-sm font-semibold text-amber-600 transition hover:bg-amber-500 hover:text-white"
          >
            Hızlı Teklif Al
          </a>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              Şu anda listelenecek kategori bulunamadı. Lütfen daha sonra tekrar deneyin.
            </div>
          )}

          {categories.map((category) => (
            <a
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900 group-hover:text-amber-600">
                  {category.name}
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                  {category.description ?? ""}
                </p>
              </div>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-amber-600">
                Kategoriyi incele →
              </span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
