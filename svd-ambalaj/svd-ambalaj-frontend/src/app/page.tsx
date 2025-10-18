import Image from "next/image";
import { SampleRequestForm } from "@/components/sample-request-form";
import { AddToCartButton } from "@/components/add-to-cart-button";

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
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
};

type HighlightCard = {
  title: string;
  caption: string;
  image: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(value);

async function getProducts(): Promise<Product[]> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:5000/.netlify/functions/api';

  try {
    const response = await fetch(`${apiBase}/products`, {
      // cache on the server side for a minute to reduce file IO
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Failed to load products', response.statusText);
      return [];
    }

    const payload = await response.json();
    return payload?.products ?? [];
  } catch (error) {
    console.error('Error fetching products', error);
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:5000/.netlify/functions/api';

  try {
    const response = await fetch(`${apiBase}/categories`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Failed to load categories', response.statusText);
      return [];
    }

    const payload = await response.json();
    return payload?.categories ?? [];
  } catch (error) {
    console.error('Error fetching categories', error);
    return [];
  }
}

export default async function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/.netlify/functions/api';
  let apiOrigin: string | null = null;
  try {
    apiOrigin = new URL(apiBase).origin;
  } catch (error) {
    console.error('Failed to parse API base URL', error);
  }

  const resolveMediaPath = (path: string | undefined | null): string => {
    if (!path) {
      return '';
    }
    if (path.startsWith('/uploads/') && apiOrigin) {
      return `${apiOrigin}${path}`;
    }
    return path;
  };

  const [products, categories, landingMediaPayload] = await Promise.all([
    getProducts(),
    getCategories(),
    fetch(`${apiBase}/landing-media`, { next: { revalidate: 60 } })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Landing media request failed: ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        console.error('Failed to load landing media', error);
        return { landingMedia: null };
      }),
  ]);

  const landingMedia = landingMediaPayload?.landingMedia;

  const landingGallery: string[] = Array.isArray(landingMedia?.heroGallery) && landingMedia.heroGallery.length > 0
    ? landingMedia.heroGallery
    : [
        '/images/landing/24.png',
        '/images/landing/25.png',
        '/images/landing/27.png',
        '/images/landing/28.png',
      ];

  const resolvedLandingGallery = landingGallery.map((item: string) => resolveMediaPath(item) || item);

  const heroImage = resolvedLandingGallery[0] ?? '/images/products/mist-sprey-24-410.jpg';
  const heroOverlayImages = resolvedLandingGallery.slice(1);
  const heroCycleDuration = 20;

  const heroVideo = {
    src: landingMedia?.heroVideo?.src || '',
    poster: landingMedia?.heroVideo?.poster || heroImage,
  };

  const fallbackHeroVideoSrc = 'https://cdn.coverr.co/videos/coverr-plastic-bottles-on-a-production-line-5589/1080p.mp4';
  const heroVideoSrc = resolveMediaPath(heroVideo.src) || fallbackHeroVideoSrc;
  const heroVideoPoster = resolveMediaPath(heroVideo.poster) || heroImage;

  const mediaHighlights: HighlightCard[] = Array.isArray(landingMedia?.mediaHighlights) && landingMedia.mediaHighlights.length > 0
    ? landingMedia.mediaHighlights
    : [
        {
          title: 'Tam otomatik dolum hatlarımız',
          caption: 'Günlük 180K adetlik kadın-erkek bakım dolum kapasitesi',
          image: resolvedLandingGallery[1] ?? '/images/products/mist-sprey-24-410.jpg',
        },
        {
          title: 'Trigger pompa montaj istasyonu',
          caption: 'Inline tork ve sızıntı testleriyle %0,02 hata oranı',
          image: resolvedLandingGallery[2] ?? '/images/products/mist-sprey-24-410.jpg',
        },
        {
          title: 'PET şişe şişirme ve depo alanı',
          caption: '7.000 m² stoklu sevkiyat alanı ile haftalık konteyner çıkışı',
          image: resolvedLandingGallery[3] ?? '/images/products/mist-sprey-24-410.jpg',
        },
      ];

  const resolvedMediaHighlights: HighlightCard[] = mediaHighlights.map((item) => ({
    ...item,
    image: resolveMediaPath(item.image) || item.image,
  }));

  const capabilities = [
    {
      title: 'Kalıp ve Tasarım Desteği',
      description:
        'Markanıza özel kalıp geliştirme, renk uyumu ve yüzey işlemleri için AR-GE ekibimiz ışık hızında çözüm sunar.',
    },
    {
      title: 'Dolum Hattı Uyum Testleri',
      description:
        'Trigger, mist ve köpük pompalarımızı talep ettiğiniz dolum hatlarında test eder, performans raporunu sizinle paylaşırız.',
    },
    {
      title: 'Sürdürülebilir Malzeme Seçenekleri',
      description:
        'Geri dönüştürülebilir PP, PET ve bio-bazlı hammaddelerle üretim yaparak çevresel ayak izinizi azaltmanıza yardımcı oluyoruz.',
    },
    {
      title: 'Küresel Lojistik Ağı',
      description:
        'İstanbul ve Şanghay depolarımızdan haftalık parsiyel ve konteyner sevkiyatları ile Avrupa ve MENA’ya kesintisiz teslimat.',
    },
  ];

  const processSteps = [
    {
      step: '1',
      title: 'İhtiyaç Analizi',
      description: 'Üretim hattınız ve hedef pazarınız için ürün-spesifik gereksinimleri dinliyoruz.',
    },
    {
      step: '2',
      title: 'Numune & Pilot Üretim',
      description: 'Seçilen sprey veya pompa için numune gönderimi ve pilot üretim gerçekleştiriyoruz.',
    },
    {
      step: '3',
      title: 'Kalite Onayı',
      description: 'IPQC kontrolleri ve tork, sızıntı, atomizasyon testleri tamamlanır, raporlanır.',
    },
    {
      step: '4',
      title: 'Sevkiyat & Süreç Takibi',
      description: 'Ürünleriniz paketlenir, lojistik departmanımız konteyner hareketlerini anlık paylaşır.',
    },
  ];

  const certifications = [
    { label: 'ISO 9001:2015', description: 'Kalite yönetim sistemi ile süreç kontrolü' },
    { label: 'GMP Standartları', description: 'Hijyenik üretim hatları ve izlenebilirlik' },
    { label: 'IFRA Uyumlu', description: 'Parfümeri ve kozmetik ürünlerinde güvenli kullanım' },
    { label: 'REACH & RoHS', description: 'AB pazarına uyumlu hammadde seçimi' },
  ];

  const testimonials = [
    {
      quote:
        'Yeni ürün lansmanımızda SVD ekibinin sağladığı hızlı numune süreci ve üretim planlaması sayesinde 6 haftada raflara çıktık.',
      author: 'Burcu K., Kozmetik Marka Yöneticisi',
    },
    {
      quote:
        'Trigger spreylerde tork ve sızıntı testlerinin video raporlarını almamız karar süreçlerimizi hızlandırdı.',
      author: 'Serhat T., Temizlik Ürünleri Operasyon Müdürü',
    },
  ];

  const showcaseStats = [
    {
      label: 'Ürün çeşidi',
      value: products.length > 0 ? `${products.length}+` : '25+',
    },
    {
      label: 'Çözüm kategorisi',
      value: categories.length > 0 ? `${categories.length}` : '9',
    },
    {
      label: 'Yıllık sevkiyat kapasitesi',
      value: '50M+',
    },
    {
      label: 'İhracat edilen ülke',
      value: '24',
    },
  ];

  const features = [
    {
      title: 'SVD Üretim Gücü',
      description:
        'İstanbul ve Şanghay merkezli tedarik zincirimiz ile sprey başlık, pompa ve şişe üretimini aynı çatı altında topluyoruz. Her sevkiyat SVD kalite güvence süreçlerinden geçer.',
    },
    {
      title: 'Özel Kalıp ve Renk Opsiyonları',
      description:
        'Kozmetik, temizlik ve sağlık markalarına özel kalıp, renk ve logo baskı hizmetleri sunarak raflarda öne çıkmanızı sağlıyoruz.',
    },
    {
      title: 'Just-in-Time Lojistik',
      description:
        'İstanbul depomuzdan Türkiye geneline 24 saat içinde sevkiyat, Avrupa ve Orta Doğu’ya düzenli ihracat planlaması ile siparişlerinizi zamanında teslim ediyoruz.',
    },
    {
      title: 'B2B Dijital Altyapı',
      description:
        'Yetkilendirilmiş bayi ve distribütörleriniz için dinamik fiyat listeleri, kampanya yönetimi ve detaylı raporlama tek panelde.',
    },
  ];

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-20 sm:px-10 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
            SVD Ambalaj · 1998’den beri profesyonel ambalaj çözümleri
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Endüstriyel üretiminiz için{' '}
            <span className="text-amber-600"> güvenilir sprey ve pompa tedarik zinciri</span>
          </h1>
          <p className="text-lg text-slate-600 sm:max-w-xl">
            SVD Ambalaj olarak kozmetik, kişisel bakım, ev-deterjan ve otomotiv sektörleri için sprey valf, tetik pompa, köpük pompası ve PET ambalaj üretip ithal ediyoruz. Tüm ürünlerimiz kalite kontrollerinden geçer, siparişleriniz planlanan tarihte depolarınıza ulaşır.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#products"
              className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600"
            >
              Ürünleri İncele
            </a>
            <a
              href="mailto:info@svdambalaj.com"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-600"
            >
              Teklif Talep Et
            </a>
            <a
              href="#sample"
              className="rounded-full border border-transparent bg-white px-6 py-3 text-sm font-semibold text-amber-600 shadow-sm shadow-amber-200/50 transition hover:border-amber-400 hover:bg-amber-50"
            >
              Numune Talep Et
            </a>
          </div>
        </div>
        <div className="relative flex-1">
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-slate-900/5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200">
            <Image
              src={heroImage}
              alt="SVD Ambalaj üretimden çıkan sprey ve pompa çözümleri"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            />
            {heroOverlayImages.map((imageSrc: string, index: number) => (
              <Image
                key={imageSrc}
                src={imageSrc}
                alt={`SVD Ambalaj üretim görseli ${index + 2}`}
                fill
                className="object-cover hero-fade"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                style={{
                  animationDelay: `${(index + 1) * (heroCycleDuration / (heroOverlayImages.length + 1))}s`,
                  animationDuration: `${heroCycleDuration}s`,
                }}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent p-6 text-white">
              <p className="text-sm uppercase tracking-widest text-amber-300">Saha tarafından</p>
              <h2 className="text-2xl font-semibold">Tam entegre dolum hattı uyumlu çözümler</h2>
              <ul className="space-y-1 text-sm text-slate-100/90">
                <li>• ISO 9001:2015 sertifikalı üretim ortakları</li>
                <li>• EN13432 uyumlu geri dönüştürülebilir ham madde opsiyonları</li>
                <li>• Markanıza özel UV veya tampon baskı seçeneği</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-6xl grid gap-6 px-6 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
          {showcaseStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-amber-100 bg-amber-50 px-6 py-8 text-center shadow-sm shadow-amber-200/50"
            >
              <p className="text-3xl font-bold text-amber-600">{stat.value}</p>
              <p className="mt-2 text-sm font-semibold text-amber-800">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-6xl space-y-12 px-6 sm:px-10">
          <div className="grid gap-10 lg:grid-cols-[1.3fr,0.7fr] lg:items-center">
            <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl shadow-black/40">
              <video
                key={heroVideoSrc}
                className="absolute inset-0 h-full w-full object-cover"
                poster={heroVideoPoster}
                controls
                playsInline
              >
                <source src={heroVideoSrc} type="video/mp4" />
                Tarayıcınız video etiketini desteklemiyor.
              </video>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 space-y-2 p-6">
                <span className="inline-flex rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">
                  Fabrika turu
                </span>
                <p className="text-lg font-semibold text-white">
                  SVD Ambalaj üretim parkuruna yakından bakın, dolum ve paketleme istasyonlarının işleyişini izleyin.
                </p>
                <p className="text-sm text-slate-200/80">
                  Videolarınızı buraya yükleyerek müşterilerinize tedarik güvencenizi gösterin.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold">Görsel ve video içeriklerle daha güçlü etkileşim</h2>
                <p className="text-slate-200">
                  Yüksek çözünürlüklü fotoğraflarınızı ve operasyon videolarınızı, potansiyel müşterilerinize üretim kalitenizi kanıtlamak için kullanın. Bu alan, ürün gamınızı ve süreçlerinizi sahadan görüntülerle sergilemeniz için hazır.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-amber-400" />
                  4K çözünürlüğe kadar video desteği ile showroom turu veya makine demoları yayınlayın.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-amber-400" />
                  Kademe kademe üretim fotoğraflarınızı müşterilerle paylaşarak güven yaratın.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-amber-400" />
                  Videoları altyazı ve bilgi etiketleriyle destekleyerek marka hikayenizi anlatın.
                </li>
              </ul>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
                <p>
                  Kendi videonuzu eklemek için medya kütüphanesine MP4 formatında yükleyip URL’sini bu alandaki kaynağa bağlamanız yeterlidir. Poster alanına yüksek çözünürlüklü kapak görseli atayarak hızlı yüklenmesini sağlayabilirsiniz.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold">Fotoğraf galerisi</h3>
                <p className="text-sm text-slate-300">
                  Geniş ekranlı cihazlar için optimize edilmiş yatay galeri ile üretim hattınızı detaylı bir şekilde sergileyin.
                </p>
              </div>
              <span className="rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
                Sürükleyerek inceleyin
              </span>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-4">
                {resolvedMediaHighlights.map((item: { title: string; caption: string; image: string }) => (
                  <figure
                    key={item.title}
                    className="relative h-64 w-[320px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/30"
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 80vw, 320px"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 text-sm">
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-200/90">{item.caption}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Çözüm Kategorilerimiz</h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Mist sprey, köpük pompası, tetik sprey, sabun dozaj pompaları ve PET şişe çözümlerimizle yüksek hacimli dolum hatlarınızı destekliyoruz. Her kategori stoklu çalışır, ihracata hazırdır.
              </p>
            </div>
            <a
              href="/categories"
              className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-600"
            >
              Tüm Kategorileri Gör
            </a>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg"
              >
                <div className="relative h-40 w-full overflow-hidden">
                  <Image
                    src={category.image ?? "/images/placeholders/category.jpg"}
                    alt={category.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between gap-4 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-amber-600">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {category.description ?? ''}
                  </p>
                  <span className="inline-flex items-center text-sm font-semibold text-amber-600">
                    İncele →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-slate-100">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold">
              SVD Ambalaj’ın dijital satış kanalı ile operasyonlarınızı hızlandırın
            </h2>
            <p className="mt-4 text-slate-300">
              B2B bayi ağımız için geliştirdiğimiz platform, toplu siparişleri fiyat kademelerine göre yönetmenizi, stok seviyelerini takip etmenizi ve lojistik süreçlerinizi tek panelden planlamanızı sağlar.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6 shadow-lg shadow-black/20">
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl space-y-8 px-6 sm:px-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-slate-900">Neden üretim partneri olarak SVD Ambalaj?</h2>
            <p className="mt-3 text-slate-600">
              Ölçeklenebilir üretim altyapımız ve küresel tedarik ağıyla, sprey ve pompa çözümlerinde uçtan uca hizmet sunuyoruz. Aşağıda öne çıkan kabiliyetlerimizi inceleyin.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {capabilities.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-6xl space-y-10 px-6 sm:px-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold">Siparişten sevkiyata kadar şeffaf süreç yönetimi</h2>
            <p className="mt-4 text-slate-300">
              Teklif talebinizden itibaren tüm aşamaları dijital olarak takip edebilirsiniz. Her adımda saha mühendislerimiz ve lojistik ekibimiz sizinle.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((item) => (
              <div key={item.step} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-lg font-semibold text-amber-200">
                  {item.step}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-amber-50/80">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl space-y-8 px-6 sm:px-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-slate-900">Sertifikalar ve uyum belgeleri</h2>
            <p className="mt-3 text-slate-600">
              Ürünlerimiz uluslararası denetimlerden geçer, tüm hammaddelerimiz REACH ve RoHS uyumludur. Gerekli belgeleri teklif aşamasında paylaşabiliriz.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {certifications.map((cert) => (
              <div key={cert.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{cert.label}</h3>
                <p className="mt-2 text-sm text-slate-600">{cert.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-amber-50 py-16">
        <div className="mx-auto max-w-4xl space-y-8 px-6 text-center sm:px-10">
          <h2 className="text-3xl font-bold text-slate-900">Müşterilerimizden notlar</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {testimonials.map((item) => (
              <div key={item.author} className="rounded-2xl border border-amber-200 bg-white p-6 text-left shadow-sm">
                <p className="text-sm text-slate-700">“{item.quote}”</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-600">{item.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Öne Çıkan Ürünler</h2>
              <p className="mt-2 text-slate-600">
                Stokta hazır bulunan sprey, pompa ve PET ambalaj ürünlerimizi inceleyin; adet bazlı fiyat avantajlarını keşfedin.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {products.length} ürün listelendi
            </span>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                Şu anda görüntülenecek ürün bulunamadı. Lütfen daha sonra tekrar deneyin.
              </div>
            )}

            {products.map((product) => (
              <article
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <Image
                    src={product.images?.[0] ?? "/images/placeholders/product.jpg"}
                    alt={product.title}
                    fill
                    className="object-cover transition duration-500 hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <header className="space-y-2">
                    <h3 className="text-xl font-semibold text-slate-900">
                      {product.title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {product.description}
                    </p>
                  </header>
                  <div className="mt-auto space-y-3">
                    <div>
                      <span className="text-sm text-slate-500">Başlangıç fiyatı</span>
                      <p className="text-2xl font-bold text-amber-600">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                    {product.bulkPricing && product.bulkPricing.length > 0 && (
                      <div className="rounded-xl bg-amber-50 p-4" id="pricing">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                          Toplu Alım Avantajı
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-amber-800">
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
                  <div className="mt-4 flex flex-col gap-3">
                    <AddToCartButton
                      product={{
                        id: product.id,
                        title: product.title,
                        slug: product.slug,
                        price: product.price,
                        bulkPricing: product.bulkPricing,
                      }}
                    />
                    <a
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center justify-center rounded-full border border-amber-500 px-5 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-500 hover:text-white"
                    >
                      Detayları Gör
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="sample"
        className="bg-slate-100 py-16"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 sm:flex-row sm:px-10">
          <div className="flex-1 space-y-4">
            <span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-amber-600">
              Numune Talebi
            </span>
            <h2 className="text-3xl font-bold text-slate-900">
              Hattınıza uygun ürünü seçin, numunenizi aynı gün hazırlayalım
            </h2>
            <p className="text-slate-600">
              Üretim hatlarınıza en uygun sprey, pompa veya şişeyi seçebilmeniz için ücretsiz numune gönderimi sunuyoruz. Formu doldurun, satış mühendislerimiz 24 saat içinde sizi arayarak ihtiyacınızı netleştirsin.
            </p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>• Numune ve revize edilmiş fiyat teklifini birlikte alırsınız.</li>
              <li>• Özel renk, boy ve aksesuar talepleri için kalıp danışmanlığı sunarız.</li>
              <li>• Talebiniz CRM sistemimize düşer, süreci şeffaf şekilde takip edebilirsiniz.</li>
            </ul>
          </div>
          <div className="flex-1">
            <SampleRequestForm
              categories={categories.map((category) => ({ id: category.id, name: category.name }))}
            />
          </div>
        </div>
      </section>

      <section className="bg-amber-500 py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 text-center sm:px-10">
          <h2 className="text-3xl font-bold">Tedarik zincirinizi SVD Ambalaj güvencesiyle büyütün</h2>
          <p className="max-w-2xl text-lg text-amber-50">
            Toplu siparişlerinizi dakikalar içinde yönetin, ihtiyaç duyduğunuz tüm sprey ve pompa çözümlerini tek merkezden temin edin. SVD Ambalaj ile üretim planlarınızı aksatmadan sürdürebilirsiniz.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/checkout"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-amber-600 shadow-lg shadow-amber-600/30 transition hover:bg-amber-100"
            >
              Teklif Oluştur
            </a>
            <a
              href="mailto:info@svdambalaj.com"
              className="rounded-full border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-400/20"
            >
              Satış Ekibiyle İletişime Geç
            </a>
            <a
              href="https://wa.me/905555555555"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp ile Hızlı Destek
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
