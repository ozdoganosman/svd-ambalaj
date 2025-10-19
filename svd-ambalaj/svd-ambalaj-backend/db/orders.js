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

const parseNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeStatus = (status) => (status || '').toLowerCase();

const mapOrderRow = (row) => {
  const items = Array.isArray(row.items) ? row.items : [];
  const mappedItems = items.map((item) => ({
    id: item.id || item.product_id || '',
    title: item.title || '',
    quantity: parseNumber(item.quantity, 0),
    price: parseNumber(item.price ?? item.unit_price, 0),
    subtotal: parseNumber(item.subtotal, parseNumber(item.price ?? item.unit_price, 0) * parseNumber(item.quantity, 0)),
    category: item.category || null,
  }));

  return {
    id: row.id,
    status: row.status,
    createdAt: mapTimestamp(row.created_at),
    updatedAt: mapTimestamp(row.updated_at),
    customer: {
      id: row.customer_id,
      name: row.customer_name || '',
      company: row.customer_company || '',
      email: row.customer_email || '',
      phone: row.customer_phone || '',
      taxNumber: row.customer_tax_number || '',
      address: row.customer_address || '',
      city: row.customer_city || '',
      notes: row.customer_notes || '',
    },
    items: mappedItems,
    totals: {
      subtotal: parseNumber(row.subtotal, 0),
      currency: row.currency || 'TRY',
      discountTotal: parseNumber(row.discount_total, 0),
      shippingTotal: parseNumber(row.shipping_total, 0),
      total: parseNumber(row.total, parseNumber(row.subtotal, 0)),
    },
    metadata: row.metadata || {},
  };
};

const buildOrdersQuery = (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.from) {
    params.push(filters.from);
    conditions.push(`o.created_at >= $${params.length}`);
  }

  if (filters.to) {
    params.push(filters.to);
    conditions.push(`o.created_at <= $${params.length}`);
  }

  if (filters.id) {
    params.push(filters.id);
    conditions.push(`o.id = $${params.length}`);
  }

  if (filters.status && filters.status !== 'all') {
    params.push(filters.status.toLowerCase());
    conditions.push(`lower(o.status) = $${params.length}`);
  }

  const whereClause = conditions.length ? `where ${conditions.join(' and ')}` : '';

  const text = `
    select
      o.*,
      c.id as customer_id,
      c.name as customer_name,
      c.company as customer_company,
      c.email as customer_email,
      c.phone as customer_phone,
      c.tax_number as customer_tax_number,
      c.address as customer_address,
      c.city as customer_city,
      c.notes as customer_notes,
      (
        select json_agg(
          json_build_object(
            'id', oi.product_id,
            'product_id', oi.product_id,
            'title', oi.title,
            'quantity', oi.quantity,
            'price', oi.unit_price,
            'subtotal', oi.subtotal,
            'category', p.category_id
          )
          order by oi.id
        )
        from order_items oi
        left join products p on p.id = oi.product_id
        where oi.order_id = o.id
      ) as items
    from orders o
    left join customers c on c.id = o.customer_id
    ${whereClause}
    order by o.created_at desc
  `;

  return { text, params };
};

const listOrders = async (filters = {}) => {
  const { text, params } = buildOrdersQuery(filters);
  const { rows } = await query(text, params);
  return rows.map(mapOrderRow);
};

const getOrderById = async (id) => {
  const { text, params } = buildOrdersQuery({ id });
  const { rows } = await query(text, params);
  return rows.length ? mapOrderRow(rows[0]) : null;
};

const upsertCustomer = async (execQuery, customer = {}) => {
  const name = (customer.name || '').trim();
  const company = (customer.company || '').trim();
  const email = (customer.email || '').trim().toLowerCase();
  const phone = (customer.phone || '').trim();
  const taxNumber = (customer.taxNumber || customer.tax_number || '').trim();
  const address = (customer.address || '').trim();
  const city = (customer.city || '').trim();
  const notes = (customer.notes || '').trim();

  const params = [name, company, email || null, phone, taxNumber, address, city, notes];

  const queryText = email
    ? `
        insert into customers (id, name, company, email, phone, tax_number, address, city, notes)
        values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
        on conflict (email) do update
        set
          name = excluded.name,
          company = excluded.company,
          phone = excluded.phone,
          tax_number = excluded.tax_number,
          address = excluded.address,
          city = excluded.city,
          notes = excluded.notes,
          updated_at = now()
        returning id
      `
    : `
        insert into customers (id, name, company, email, phone, tax_number, address, city, notes)
        values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
        returning id
      `;

  const { rows } = await execQuery(queryText, params);
  return rows[0].id;
};

const insertOrderItems = async (execQuery, orderId, items = []) => {
  if (!items.length) {
    return;
  }

  const params = [];
  const placeholders = [];
  let index = 1;

  items.forEach((item) => {
    const quantity = parseNumber(item.quantity, 0);
    const unitPrice = parseNumber(item.price ?? item.unit_price, 0);
    const subtotal = parseNumber(item.subtotal, unitPrice * quantity);

    placeholders.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5})`);
    params.push(orderId, item.id || item.product_id || null, item.title || '', quantity, unitPrice, subtotal);
    index += 6;
  });

  await execQuery(
    `
      insert into order_items (order_id, product_id, title, quantity, unit_price, subtotal)
      values ${placeholders.join(', ')}
    `,
    params
  );
};

const createOrder = async (payload) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const totals = payload.totals || {};
  const id = payload.id || `order-${Date.now()}`;
  const status = (payload.status || 'pending').toLowerCase();
  const currency = totals.currency || 'TRY';
  const subtotal = parseNumber(totals.subtotal, items.reduce((sum, item) => {
    const quantity = parseNumber(item.quantity, 0);
    const unitPrice = parseNumber(item.price ?? item.unit_price, 0);
    return sum + quantity * unitPrice;
  }, 0));
  const shippingTotal = parseNumber(totals.shippingTotal ?? payload.shippingTotal, 0);
  const discountTotal = parseNumber(totals.discountTotal ?? payload.discountTotal, 0);
  const total = subtotal + shippingTotal - discountTotal;

  await withTransaction(async ({ query: trxQuery }) => {
    const customerId = await upsertCustomer(trxQuery, payload.customer);

    await trxQuery(
      `
        insert into orders (id, customer_id, status, currency, subtotal, discount_total, shipping_total, total, metadata)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        id,
        customerId,
        status,
        currency,
        subtotal,
        discountTotal,
        shippingTotal,
        total,
        payload.metadata || {},
      ]
    );

    await insertOrderItems(trxQuery, id, items);
  });

  return getOrderById(id);
};

const updateOrderStatus = async (id, status) => {
  const normalizedStatus = status ? status.toLowerCase() : null;
  if (!normalizedStatus) {
    throw new Error('Status value is required');
  }

  await query(
    `
      update orders
      set status = $2,
          updated_at = now()
      where id = $1
    `,
    [id, normalizedStatus]
  );

  return getOrderById(id);
};

const getStatsOverview = async (filters = {}) => {
  const normalizedStatus = filters.status && filters.status !== 'all' ? filters.status.toLowerCase() : null;
  const orders = await listOrders({
    from: filters.from,
    to: filters.to,
    status: normalizedStatus,
  });

  const requestedCategory = filters.category && filters.category !== 'all' ? filters.category : null;

  let totalRevenue = 0;
  let pendingOrders = 0;
  const categoryTotals = new Map();
  const monthlyTotals = new Map();

  orders.forEach((order) => {
    const orderStatus = normalizeStatus(order.status);
    const orderTotal = parseNumber(order.totals?.subtotal, 0);

    if (orderStatus === 'pending' || orderStatus === 'beklemede') {
      pendingOrders += 1;
    }

    totalRevenue += orderTotal;

    const createdAtDate = order.createdAt ? new Date(order.createdAt) : null;
    if (createdAtDate && !Number.isNaN(createdAtDate.valueOf())) {
      const monthKey = `${createdAtDate.getFullYear()}-${String(createdAtDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + orderTotal);
    }

    (order.items || []).forEach((item) => {
      const category = item.category || 'other';
      if (requestedCategory && category !== requestedCategory) {
        return;
      }
      const amount = parseNumber(item.subtotal, parseNumber(item.price, 0) * parseNumber(item.quantity, 0));
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
    });
  });

  return {
    totalRevenue,
    totalOrders: orders.length,
    pendingOrders,
    averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
    categorySales: Array.from(categoryTotals.entries()).map(([category, total]) => ({ category, total })),
    monthlySales: Array.from(monthlyTotals.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => (a.month > b.month ? 1 : -1)),
  };
};

module.exports = {
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getStatsOverview,
};
