const { Pool, neonConfig } = require('@netlify/neon');

const connectionString =
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_CONNECTION_STRING;

if (!connectionString) {
  throw new Error(
    'Database connection string not found. Please set NEON_DATABASE_URL or DATABASE_URL in your environment.'
  );
}

neonConfig.fetchConnectionCache = true;

const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT || 10_000),
});

const createTaggedQuery = (poolInstance) => {
  return async (strings, ...values) => {
    if (!Array.isArray(strings)) {
      throw new TypeError('SQL template must be an array of strings.');
    }

    const text = strings.reduce((acc, part, index) => {
      const placeholder = index < values.length ? `$${index + 1}` : '';
      return `${acc}${part}${placeholder}`;
    }, '');

    const result = await poolInstance.query(text, values);
    return result;
  };
};

const sql = createTaggedQuery(pool);

const query = async (text, params = []) => {
  const result = await pool.query(text, params);
  return result;
};

const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await callback({
      query: (text, params = []) => client.query(text, params),
      sql: createTaggedQuery(client),
    });
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  sql,
  query,
  withTransaction,
};
