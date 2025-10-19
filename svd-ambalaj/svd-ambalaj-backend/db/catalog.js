const { query, withTransaction } = require('./client');

const mapTimestamp = (value) => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date(value).toISOString();
};

const normalizeImages = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return normalizeImages(parsed);
    } catch {
      return [value];
    }
  }
  return [];
};

const normalizeBulkPricing = (value) => {
  if (!value) {
    return [];
  }
  const tiers = Array.isArray(value) ? value : [value];
  return tiers
    .map((tier) => ({
      minQty: Number(
        tier.minQty ??
          tier.minqty ??
          tier.min_quantity ??
          tier.minquantity ??
          tier.min_qty ??
          0
      ),
      price: Number(tier.price ?? 0),
    }))
    .filter((tier) => Number.isFinite(tier.minQty) && Number.isFinite(tier.price))
    .sort((a, b) => a.minQty - b.minQty);
};

const mapCategoryRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description || '',
  image: row.image || '',
  createdAt: mapTimestamp(row.created_at),
  updatedAt: mapTimestamp(row.updated_at),
});

const mapProductRow = (row) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  description: row.description || '',
  price: Number(row.price ?? 0),
  bulkPricing: normalizeBulkPricing(row.bulk_pricing),
  category: row.category_id,
  images: normalizeImages(row.images),
  stock: Number(row.stock ?? 0),
  createdAt: mapTimestamp(row.created_at),
  updatedAt: mapTimestamp(row.updated_at),
});

const buildProductQuery = (whereClause = '', orderClause = 'order by p.created_at desc') => `
  select
    p.*,
    coalesce(
      (
        select json_agg(
          json_build_object('minQty', bp.min_quantity, 'price', bp.price)
          order by bp.min_quantity
        )
        from product_bulk_pricing bp
        where bp.product_id = p.id
      ),
      '[]'::json
    ) as bulk_pricing,
    coalesce(
      (
        select array_agg(pi.image_url order by pi.sort_order)
        from product_images pi
        where pi.product_id = p.id
      ),
      '{}'::text[]
    ) as images
  from products p
  ${whereClause}
  ${orderClause}
`;

const listCategories = async () => {
  const { rows } = await query(
    `
      select id, name, slug, description, image, created_at, updated_at
      from categories
      order by name asc
    `
  );
  return rows.map(mapCategoryRow);
};

const getCategoryById = async (id) => {
  const { rows } = await query(
    `
      select id, name, slug, description, image, created_at, updated_at
      from categories
      where id = $1
      limit 1
    `,
    [id]
  );
  return rows.length ? mapCategoryRow(rows[0]) : null;
};

const getCategoryBySlug = async (slug) => {
  const { rows } = await query(
    `
      select id, name, slug, description, image, created_at, updated_at
      from categories
      where slug = $1
      limit 1
    `,
    [slug]
  );
  return rows.length ? mapCategoryRow(rows[0]) : null;
};

const createCategory = async ({ id, name, slug, description = '', image = '' }) => {
  const { rows } = await query(
    `
      insert into categories (id, name, slug, description, image)
      values ($1, $2, $3, $4, $5)
      returning id, name, slug, description, image, created_at, updated_at
    `,
    [id, name, slug, description, image]
  );
  return mapCategoryRow(rows[0]);
};

const updateCategory = async (id, payload) => {
  const existing = await getCategoryById(id);
  if (!existing) {
    return null;
  }

  const name = payload.name ?? existing.name;
  const slug = payload.slug ?? existing.slug;
  const description = payload.description ?? existing.description ?? '';
  const image = payload.image ?? existing.image ?? '';

  const { rows } = await query(
    `
      update categories
      set name = $2,
          slug = $3,
          description = $4,
          image = $5,
          updated_at = now()
      where id = $1
      returning id, name, slug, description, image, created_at, updated_at
    `,
    [id, name, slug, description, image]
  );

  return rows.length ? mapCategoryRow(rows[0]) : null;
};

const deleteCategory = async (id) => {
  const existing = await getCategoryById(id);
  if (!existing) {
    return null;
  }

  await query(
    `
      delete from categories
      where id = $1
    `,
    [id]
  );

  return existing;
};

const listProducts = async () => {
  const { rows } = await query(buildProductQuery());
  return rows.map(mapProductRow);
};

const getProductById = async (id) => {
  const { rows } = await query(buildProductQuery('where p.id = $1', 'limit 1'), [id]);
  return rows.length ? mapProductRow(rows[0]) : null;
};

const getProductBySlug = async (slug) => {
  const { rows } = await query(buildProductQuery('where p.slug = $1', 'limit 1'), [slug]);
  return rows.length ? mapProductRow(rows[0]) : null;
};

const listProductsByCategory = async (categoryId) => {
  const { rows } = await query(buildProductQuery('where p.category_id = $1'), [categoryId]);
  return rows.map(mapProductRow);
};

const upsertBulkPricing = async (queryFn, productId, bulkPricing = []) => {
  await queryFn(`delete from product_bulk_pricing where product_id = $1`, [productId]);

  if (!bulkPricing.length) {
    return;
  }

  const params = [productId];
  const placeholders = [];
  let paramIndex = 2;

  bulkPricing.forEach((tier) => {
    placeholders.push(`($1, $${paramIndex}, $${paramIndex + 1})`);
    params.push(Number(tier.minQty ?? 0), Number(tier.price ?? 0));
    paramIndex += 2;
  });

  await queryFn(
    `
      insert into product_bulk_pricing (product_id, min_quantity, price)
      values ${placeholders.join(', ')}
    `,
    params
  );
};

const upsertProductImages = async (queryFn, productId, images = []) => {
  await queryFn(`delete from product_images where product_id = $1`, [productId]);

  if (!images.length) {
    return;
  }

  const params = [productId];
  const placeholders = [];
  let paramIndex = 2;

  images.forEach((imageUrl, index) => {
    placeholders.push(`($1, $${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
    params.push(imageUrl, index, index === 0);
    paramIndex += 3;
  });

  await queryFn(
    `
      insert into product_images (product_id, image_url, sort_order, is_primary)
      values ${placeholders.join(', ')}
    `,
    params
  );
};

const createProduct = async (payload) => {
  const normalizedImages = normalizeImages(payload.images);
  const normalizedPricing = normalizeBulkPricing(payload.bulkPricing);

  await withTransaction(async ({ query: trxQuery }) => {
    await trxQuery(
      `
        insert into products (id, title, slug, description, price, category_id, stock)
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        payload.id,
        payload.title,
        payload.slug,
        payload.description ?? '',
        Number(payload.price ?? 0),
        payload.category,
        Number(payload.stock ?? 0),
      ]
    );

    await upsertBulkPricing(trxQuery, payload.id, normalizedPricing);
    await upsertProductImages(trxQuery, payload.id, normalizedImages);
  });

  return getProductById(payload.id);
};

const updateProduct = async (id, payload) => {
  const existing = await getProductById(id);
  if (!existing) {
    return null;
  }

  const normalizedImages =
    payload.images !== undefined ? normalizeImages(payload.images) : existing.images;
  const normalizedPricing =
    payload.bulkPricing !== undefined
      ? normalizeBulkPricing(payload.bulkPricing)
      : existing.bulkPricing;

  await withTransaction(async ({ query: trxQuery }) => {
    await trxQuery(
      `
        update products
        set title = $2,
            slug = $3,
            description = $4,
            price = $5,
            category_id = $6,
            stock = $7,
            updated_at = now()
        where id = $1
      `,
      [
        id,
        payload.title ?? existing.title,
        payload.slug ?? existing.slug,
        payload.description ?? existing.description ?? '',
        Number(payload.price ?? existing.price ?? 0),
        payload.category ?? existing.category,
        Number(payload.stock ?? existing.stock ?? 0),
      ]
    );

    await upsertBulkPricing(trxQuery, id, normalizedPricing);
    await upsertProductImages(trxQuery, id, normalizedImages);
  });

  return getProductById(id);
};

const deleteProduct = async (id) => {
  const existing = await getProductById(id);
  if (!existing) {
    return null;
  }

  await query(
    `
      delete from products
      where id = $1
    `,
    [id]
  );

  return existing;
};

module.exports = {
  listCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  getProductById,
  getProductBySlug,
  listProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
};
