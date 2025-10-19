-- Seed data derived from the legacy JSON files.
-- Run this after applying schema.sql to populate Neon with baseline content.

begin;

-- Categories -------------------------------------------------------------------
insert into categories (id, name, slug, description, image)
values
  ('mist-spreyler', 'Mist Spreyler', 'mist-spreyler', 'Kozmetik ve temizlik ürünleri için ince atomizasyon sağlayan mist sprey çözümleri.', '/images/categories/mist-spreyler.jpg'),
  ('sabun-dozaj', 'Sabun Dozaj Pompaları', 'sabun-dozaj', 'Sıvı sabun ve dezenfektanlar için üretilen dozaj pompaları.', '/images/categories/sabun-dozaj.jpg'),
  ('krem', 'Krem Pompaları', 'krem', 'Kozmetik ürünlerde maksimum hijyen sağlayan krem pompaları ve airless çözümler.', '/images/categories/krem.jpg'),
  ('damlaliklar', 'Damlalıklar', 'damlaliklar', 'Serum, vitamin ve aromaterapi ürünleri için cam damlalık şişeleri.', '/images/categories/damlaliklar.jpg'),
  ('oral-nasal', 'Oral & Nasal Spreyler', 'oral-nasal', 'Medikal sınıf oral ve nasal sprey pompaları.', '/images/categories/oral-nasal.jpg'),
  ('trigger-mini', 'Triger Mini', 'trigger-mini', 'Temizlik ve bakım ürünleri için ergonomik triger pompalar.', '/images/categories/trigger-mini.jpg'),
  ('kopuk', 'Köpük Pompaları', 'kopuk', 'Köpük sabun ve şampuanlar için mikser yapılı pompalar.', '/images/categories/kopuk.jpg'),
  ('kapak-diger', 'Kapak & Diğer', 'kapak-diger', 'Flip-top, disk-top ve özel tasarım kapak çözümleri.', '/images/categories/kapak-diger.jpg'),
  ('siseler', 'Şişeler', 'siseler', 'PET ve cam şişe seçenekleri.', '/images/categories/siseler.jpg')
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    image = excluded.image,
    updated_at = now();

-- Products ---------------------------------------------------------------------
insert into products (id, title, slug, description, price, category_id, stock, created_at)
values
  ('mist-sprey-24-410', 'Mist Sprey Pompa 24/410', 'mist-sprey-24-410', 'Parfüm, tonik ve dezenfektan ürünleri için ince atomizasyon sağlayan yüksek kaliteli mist sprey pompası.', 3.40, 'mist-spreyler', 5000, '2025-10-17T12:00:00Z'),
  ('sabun-dozaj-pompa', 'Sabun Dozaj Pompası 28/400', 'sabun-dozaj-pompa', 'Sıvı sabun ve dezenfektanlar için ideal, sızdırmazlık garantili sabun dozaj pompası.', 4.20, 'sabun-dozaj', 4000, '2025-10-17T12:10:00Z'),
  ('krem-pompa-airless', 'Airless Krem Pompası 30ml', 'krem-pompa-airless', 'Kozmetik ürünler için hava almayan yapı ile son kullanıma kadar hijyen sağlayan airless krem pompası.', 6.90, 'krem', 2500, '2025-10-17T12:20:00Z'),
  ('damlalik-30ml', 'Cam Damlalık 30ml', 'damlalik-30ml', 'Vitamin, serum ve aromaterapi yağları için hassas dozlamaya uygun cam damlalık şişe.', 5.30, 'damlaliklar', 3200, '2025-10-17T12:30:00Z'),
  ('oral-nasal-sprey', 'Oral & Nasal Sprey Pompası', 'oral-nasal-sprey', 'Medikal sınıf malzemeden üretilmiş, oral ve burun spreyleri için uygun pompa.', 7.10, 'oral-nasal', 2800, '2025-10-17T12:40:00Z'),
  ('trigger-mini-28-410', 'Triger Mini Tetik Pompası 28/410', 'trigger-mini-28-410', 'Temizlik ve bakım ürünlerinde ergonomik kullanım sağlayan mini triger tetik pompası.', 5.80, 'trigger-mini', 3500, '2025-10-17T12:50:00Z'),
  ('kopuk-dispencer', 'Köpük Dispenser Pompası', 'kopuk-dispencer', 'Köpük sabun ve şampuanlar için optimize edilmiş mikser yapılı dispenser pompası.', 6.40, 'kopuk', 3100, '2025-10-17T13:00:00Z'),
  ('kapak-fliptop-24', 'Flip-Top Kapak 24/410', 'kapak-fliptop-24', 'Şampuan, losyon ve temizleyiciler için popüler flip-top kapak modeli.', 1.90, 'kapak-diger', 8000, '2025-10-17T13:10:00Z'),
  ('pet-sise-500ml', 'PET Şişe 500ml', 'pet-sise-500ml', 'Gıda dışı sıvılar için uygun, yüksek berraklığa sahip 500ml PET şişe.', 2.70, 'siseler', 10000, '2025-10-17T13:20:00Z')
on conflict (id) do update
set title = excluded.title,
    slug = excluded.slug,
    description = excluded.description,
    price = excluded.price,
    category_id = excluded.category_id,
    stock = excluded.stock,
    updated_at = now();

-- Product bulk pricing ---------------------------------------------------------
insert into product_bulk_pricing (product_id, min_quantity, price, created_at)
values
  ('mist-sprey-24-410', 1, 3.40, '2025-10-17T12:00:00Z'),
  ('mist-sprey-24-410', 250, 3.10, '2025-10-17T12:00:00Z'),
  ('mist-sprey-24-410', 1000, 2.80, '2025-10-17T12:00:00Z'),
  ('sabun-dozaj-pompa', 1, 4.20, '2025-10-17T12:10:00Z'),
  ('sabun-dozaj-pompa', 200, 3.80, '2025-10-17T12:10:00Z'),
  ('sabun-dozaj-pompa', 800, 3.40, '2025-10-17T12:10:00Z'),
  ('krem-pompa-airless', 1, 6.90, '2025-10-17T12:20:00Z'),
  ('krem-pompa-airless', 150, 6.20, '2025-10-17T12:20:00Z'),
  ('krem-pompa-airless', 600, 5.50, '2025-10-17T12:20:00Z'),
  ('damlalik-30ml', 1, 5.30, '2025-10-17T12:30:00Z'),
  ('damlalik-30ml', 200, 4.90, '2025-10-17T12:30:00Z'),
  ('damlalik-30ml', 1000, 4.40, '2025-10-17T12:30:00Z'),
  ('oral-nasal-sprey', 1, 7.10, '2025-10-17T12:40:00Z'),
  ('oral-nasal-sprey', 300, 6.60, '2025-10-17T12:40:00Z'),
  ('oral-nasal-sprey', 1200, 6.00, '2025-10-17T12:40:00Z'),
  ('trigger-mini-28-410', 1, 5.80, '2025-10-17T12:50:00Z'),
  ('trigger-mini-28-410', 250, 5.20, '2025-10-17T12:50:00Z'),
  ('trigger-mini-28-410', 900, 4.70, '2025-10-17T12:50:00Z'),
  ('kopuk-dispencer', 1, 6.40, '2025-10-17T13:00:00Z'),
  ('kopuk-dispencer', 250, 5.90, '2025-10-17T13:00:00Z'),
  ('kopuk-dispencer', 1000, 5.30, '2025-10-17T13:00:00Z'),
  ('kapak-fliptop-24', 1, 1.90, '2025-10-17T13:10:00Z'),
  ('kapak-fliptop-24', 500, 1.60, '2025-10-17T13:10:00Z'),
  ('kapak-fliptop-24', 2000, 1.30, '2025-10-17T13:10:00Z'),
  ('pet-sise-500ml', 1, 2.70, '2025-10-17T13:20:00Z'),
  ('pet-sise-500ml', 600, 2.30, '2025-10-17T13:20:00Z'),
  ('pet-sise-500ml', 2500, 1.90, '2025-10-17T13:20:00Z')
on conflict (product_id, min_quantity) do update
set price = excluded.price;

-- Media ------------------------------------------------------------------------
insert into media (id, storage_key, filename, original_name, mime_type, size_bytes, url, created_at)
values
  ('1760813241309-1760813241279-947080013.png', '1760813241279-947080013.png', '1760813241279-947080013.png', '24.png', 'image/png', 2180568, 'https://svdambalaj.netlify.app/.netlify/blobs/site/uploads/1760813241279-947080013.png', '2025-10-18T18:47:21.310Z'),
  ('1760813405580-1760813405578-422281035.jpeg', '1760813405578-422281035.jpeg', '1760813405578-422281035.jpeg', '24 MS T G.jpeg', 'image/jpeg', 20162, 'https://svdambalaj.netlify.app/.netlify/blobs/site/uploads/1760813405578-422281035.jpeg', '2025-10-18T18:50:05.580Z'),
  ('1760814590520-1760814590517-425730466.jpeg', '1760814590517-425730466.jpeg', '1760814590517-425730466.jpeg', '24 MS T G.jpeg', 'image/jpeg', 20162, 'https://svdambalaj.netlify.app/.netlify/blobs/site/uploads/1760814590517-425730466.jpeg', '2025-10-18T19:09:50.520Z'),
  ('1760814631980-1760814631960-803570660.mp4', '1760814631960-803570660.mp4', '1760814631960-803570660.mp4', 'fabrika.mp4', 'video/mp4', 1380240, 'https://svdambalaj.netlify.app/.netlify/blobs/site/uploads/1760814631960-803570660.mp4', '2025-10-18T19:10:31.980Z'),
  ('1760815475608-1760815475590-315818037.mp4', '1760815475590-315818037.mp4', '1760815475590-315818037.mp4', 'fabrika.mp4', 'video/mp4', 1380240, 'https://svdambalaj.netlify.app/.netlify/blobs/site/uploads/1760815475590-315818037.mp4', '2025-10-18T19:24:35.608Z'),
  ('1760815551417-1760815551377-282677799.png', '1760815551377-282677799.png', '1760815551377-282677799.png', '27.png', 'image/png', 2367973, 'https://svdambalaj.netlify.app/.netlify/blobs/site/uploads/1760815551377-282677799.png', '2025-10-18T19:25:51.417Z')
on conflict (id) do update
set storage_key = excluded.storage_key,
    filename = excluded.filename,
    original_name = excluded.original_name,
    mime_type = excluded.mime_type,
    size_bytes = excluded.size_bytes,
    url = excluded.url,
    updated_at = now();

-- Product images ----------------------------------------------------------------
insert into product_images (product_id, media_id, image_url, alt_text, sort_order, is_primary, created_at)
values
  ('mist-sprey-24-410', null, '/images/products/mist-sprey-24-410.jpg', null, 0, true, '2025-10-17T12:00:00Z'),
  ('sabun-dozaj-pompa', null, '/images/products/sabun-dozaj-28-400.jpg', null, 0, true, '2025-10-17T12:10:00Z'),
  ('krem-pompa-airless', null, '/images/products/krem-pompa-airless.jpg', null, 0, true, '2025-10-17T12:20:00Z'),
  ('damlalik-30ml', null, '/images/products/damlalik-30ml.jpg', null, 0, true, '2025-10-17T12:30:00Z'),
  ('oral-nasal-sprey', null, '/images/products/oral-nasal-sprey.jpg', null, 0, true, '2025-10-17T12:40:00Z'),
  ('trigger-mini-28-410', null, '/images/products/trigger-mini-28-410.jpg', null, 0, true, '2025-10-17T12:50:00Z'),
  ('kopuk-dispencer', null, '/images/products/kopuk-dispenser.jpg', null, 0, true, '2025-10-17T13:00:00Z'),
  ('kapak-fliptop-24', null, '/images/products/kapak-fliptop-24.jpg', null, 0, true, '2025-10-17T13:10:00Z'),
  ('pet-sise-500ml', null, '/images/products/pet-sise-500ml.jpg', null, 0, true, '2025-10-17T13:20:00Z')
on conflict (product_id, sort_order) do update
set image_url = excluded.image_url,
    media_id = excluded.media_id,
    alt_text = excluded.alt_text,
    is_primary = excluded.is_primary,
    updated_at = now();

-- Landing media -----------------------------------------------------------------
insert into landing_media (id, hero_video_src, hero_video_poster, hero_video_media_id, hero_video_poster_media_id, created_at, updated_at)
values
  (1, 'https://svdambalaj.netlify.app/.netlify/blobs/site/uploads/1760815475590-315818037.mp4', 'https://svdambalaj.netlify.app/.netlify/blobs/site/uploads/1760815551377-282677799.png', '1760815475608-1760815475590-315818037.mp4', '1760815551417-1760815551377-282677799.png', '2025-10-18T19:24:35.608Z', '2025-10-18T19:25:51.417Z')
on conflict (id) do update
set hero_video_src = excluded.hero_video_src,
    hero_video_poster = excluded.hero_video_poster,
    hero_video_media_id = excluded.hero_video_media_id,
    hero_video_poster_media_id = excluded.hero_video_poster_media_id,
    updated_at = excluded.updated_at;

insert into landing_media_gallery (landing_media_id, media_id, image_url, sort_order, created_at)
values
  (1, null, '/images/landing/24.png', 0, '2025-10-18T19:24:35.608Z'),
  (1, null, '/images/landing/25.png', 1, '2025-10-18T19:24:35.608Z'),
  (1, null, '/images/landing/27.png', 2, '2025-10-18T19:24:35.608Z'),
  (1, null, '/images/landing/28.png', 3, '2025-10-18T19:24:35.608Z')
on conflict (landing_media_id, sort_order) do update
set media_id = excluded.media_id,
    image_url = excluded.image_url,
    updated_at = now();

insert into landing_media_highlights (landing_media_id, title, caption, media_id, image_url, sort_order, created_at)
values
  (1, 'Tam otomatik dolum hattı', 'Saha görüntüleriniz burada yer alabilir.', null, '/images/landing/25.png', 0, '2025-10-18T19:24:35.608Z'),
  (1, 'asdasd', 'asdasd', '1760813405580-1760813405578-422281035.jpeg', 'https://svdambalaj.netlify.app/.netlify/blobs/site/uploads/1760813405578-422281035.jpeg', 1, '2025-10-18T19:24:35.608Z')
on conflict (landing_media_id, sort_order) do update
set title = excluded.title,
    caption = excluded.caption,
    media_id = excluded.media_id,
    image_url = excluded.image_url,
    updated_at = now();

-- Customers & orders ------------------------------------------------------------
insert into customers (id, name, company, email, phone, tax_number, address, city, notes, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'Osman Özdoğan', 'Svd ambalaj plastik oto inş. san. tic. ltd. şti', 'osman_ose@hotmail.com', '05076078906', '12222222222222222222222222', 'Murat Çeşme Mah. Sultan Murat Cad. (No:17) Küçroğlu İş Merkezi giriş kapı no:1', 'Büyükçekmece', '', '2025-10-18T02:37:54.431Z')
on conflict (id) do update
set name = excluded.name,
    company = excluded.company,
    email = excluded.email,
    phone = excluded.phone,
    tax_number = excluded.tax_number,
    address = excluded.address,
    city = excluded.city,
    notes = excluded.notes,
    updated_at = now();

insert into orders (id, customer_id, status, currency, subtotal, discount_total, shipping_total, total, created_at)
values
  ('order-1760755074431', '11111111-1111-1111-1111-111111111111', 'pending', 'TRY', 11.30, 0, 0, 11.30, '2025-10-18T02:37:54.431Z')
on conflict (id) do update
set customer_id = excluded.customer_id,
    status = excluded.status,
    currency = excluded.currency,
    subtotal = excluded.subtotal,
    discount_total = excluded.discount_total,
    shipping_total = excluded.shipping_total,
    total = excluded.total,
    updated_at = now();

insert into order_items (order_id, product_id, title, quantity, unit_price, subtotal, created_at)
values
  ('order-1760755074431', 'oral-nasal-sprey', 'Oral & Nasal Sprey Pompası', 1, 7.10, 7.10, '2025-10-18T02:37:54.431Z'),
  ('order-1760755074431', 'sabun-dozaj-pompa', 'Sabun Dozaj Pompası 28/400', 1, 4.20, 4.20, '2025-10-18T02:37:54.431Z')
on conflict (order_id, product_id, title) do update
set quantity = excluded.quantity,
    unit_price = excluded.unit_price,
    subtotal = excluded.subtotal,
    created_at = excluded.created_at;

commit;
