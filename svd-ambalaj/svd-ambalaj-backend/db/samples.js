const { query } = require('./client');

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

const mapSampleRow = (row) => ({
  id: row.id,
  name: row.name || '',
  company: row.company || '',
  email: row.email || '',
  phone: row.phone || '',
  product: row.product_name || '',
  quantity: row.quantity_note || '',
  notes: row.notes || '',
  status: row.status || 'requested',
  createdAt: mapTimestamp(row.created_at),
  updatedAt: mapTimestamp(row.updated_at),
});

const createSampleRequest = async (payload) => {
  const {
    name = '',
    company = '',
    email = '',
    phone = '',
    product = '',
    quantity = '',
    notes = '',
  } = payload;

  const { rows } = await query(
    `
      insert into samples (name, company, email, phone, product_name, quantity_note, notes, status)
      values ($1, $2, $3, $4, $5, $6, $7, 'requested')
      returning *
    `,
    [name, company, email, phone, product, quantity, notes]
  );

  return mapSampleRow(rows[0]);
};

module.exports = {
  createSampleRequest,
};
