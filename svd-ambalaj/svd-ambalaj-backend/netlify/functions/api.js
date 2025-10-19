const express = require('express');
const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const isNetlifyRuntime = Boolean(
  process.env.NETLIFY ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const resolveExistingPath = (candidates, fallback) => {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    try {
      if (fsSync.existsSync(candidate)) {
        return candidate;
      }
    } catch (error) {
      console.error('Path check failed:', candidate, error);
    }
  }
  return fallback;
};

const packagedDataDir = resolveExistingPath(
  [
    path.join(__dirname, '../../data'),
    path.join(__dirname, '../data'),
    path.join(process.cwd(), 'svd-ambalaj/svd-ambalaj-backend/data'),
    path.join(process.cwd(), 'svd-ambalaj-backend/data'),
    path.join(process.cwd(), 'data'),
  ],
  path.join(__dirname, '../../data')
);

const ensureDirectory = (dir) => {
  if (!dir) {
    return null;
  }
  try {
    fsSync.mkdirSync(dir, { recursive: true });
    return dir;
  } catch (error) {
    if (error.code === 'EEXIST') {
      return dir;
    }
    if (['ENOENT', 'EACCES', 'EROFS'].includes(error.code)) {
      console.warn('Failed to ensure directory, attempting fallback:', dir, error.code);
      return null;
    }
    console.error('Failed to ensure directory:', dir, error);
    return null;
  }
};

const runtimeDataDir = (() => {
  if (isNetlifyRuntime) {
    const tmpDir = ensureDirectory(path.join('/tmp', 'svd-data')) || path.join('/tmp', 'svd-data');
    try {
      if (packagedDataDir && fsSync.existsSync(packagedDataDir)) {
        const files = fsSync.readdirSync(packagedDataDir);
        for (const file of files) {
          if (!file.endsWith('.json')) {
            continue;
          }
          const source = path.join(packagedDataDir, file);
          const target = path.join(tmpDir, file);
          if (!fsSync.existsSync(target)) {
            fsSync.copyFileSync(source, target);
          }
        }
      }
    } catch (error) {
      console.error('Failed to prepare runtime data directory:', error);
    }
    return tmpDir;
  }
  return packagedDataDir;
})();

const uploadsDir = (() => {
  const candidates = isNetlifyRuntime
    ? [path.join('/tmp', 'svd-uploads'), path.join(__dirname, '../../uploads')]
    : [
        path.join(__dirname, '../../uploads'),
        path.join(process.cwd(), 'svd-ambalaj/svd-ambalaj-backend/uploads'),
        path.join(process.cwd(), 'svd-ambalaj-backend/uploads'),
      ];

  for (const candidate of candidates) {
    const ensured = ensureDirectory(candidate);
    if (ensured) {
      return ensured;
    }
  }

  const fallback = path.join('/tmp', 'svd-uploads');
  ensureDirectory(fallback);
  return fallback;
})();

const ensureUploadsDir = () => {
  ensureDirectory(uploadsDir);
};

console.log('API_INIT', { packagedDataDir, runtimeDataDir, uploadsDir });
const DEFAULT_DATA = {
  'products.json': { products: [] },
  'orders.json': { orders: [] },
  'categories.json': { categories: [] },
  'customers.json': { customers: [] },
  'samples.json': { samples: [] },
  'landing-media.json': {
    landingMedia: {
      heroGallery: [],
      heroVideo: { src: '', poster: '' },
      mediaHighlights: [],
    },
  },
  'media.json': { media: [] },
};

const cloneDefault = (filename) => {
  const value = DEFAULT_DATA[filename];
  return value ? JSON.parse(JSON.stringify(value)) : null;
};

const handlerApp = express();
handlerApp.use('/.netlify/functions/api', router);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'svd-admin-secret';
const ADMIN_TOKEN_EXPIRY_MINUTES = Number(process.env.ADMIN_TOKEN_EXPIRY_MINUTES || 120);

const readJson = async (filename) => {
  const runtimePath = runtimeDataDir ? path.join(runtimeDataDir, filename) : null;
  const packagedPath =
    packagedDataDir && packagedDataDir !== runtimeDataDir
      ? path.join(packagedDataDir, filename)
      : null;

  try {
    if (runtimePath) {
      const content = await fs.readFile(runtimePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    if (error.code === 'ENOENT' && packagedDataDir && packagedDataDir !== runtimeDataDir) {
      try {
        if (packagedPath) {
          const packagedContent = await fs.readFile(packagedPath, 'utf8');
          const data = JSON.parse(packagedContent);
          try {
            await writeJson(filename, data);
          } catch (seedError) {
            console.warn(`Unable to seed runtime data for ${filename}:`, seedError);
          }
          return data;
        }
      } catch (fallbackError) {
        console.error(`Failed to read packaged data for ${filename}:`, fallbackError);
      }
    }
    const fallback = cloneDefault(filename);
    if (fallback) {
      try {
        await writeJson(filename, fallback);
      } catch (seedError) {
        console.warn(`Unable to write default data for ${filename}:`, seedError);
      }
      return fallback;
    }
    throw error;
  }

  if (runtimePath) {
    try {
      const content = await fs.readFile(runtimePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to read runtime data for ${filename}:`, error);
    }
  }

  if (packagedPath) {
    try {
      const packagedContent = await fs.readFile(packagedPath, 'utf8');
      return JSON.parse(packagedContent);
    } catch (error) {
      console.error(`Failed to read packaged data for ${filename}:`, error);
    }
  }

  const fallback = cloneDefault(filename);
  if (fallback) {
    return fallback;
  }

  throw new Error(`Unable to load data file: ${filename}`);
};

const writeJson = async (filename, data) => {
  const baseDir = isNetlifyRuntime ? path.join('/tmp', 'svd-data') : runtimeDataDir;
  const preferredDir = ensureDirectory(baseDir);
  const fallbackDir = preferredDir || ensureDirectory(path.join('/tmp', 'svd-data'));
  const dir = fallbackDir || baseDir || runtimeDataDir || path.join('/tmp', 'svd-data');
  const filePath = path.join(dir, filename);
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Failed to write ${filename}:`, error);
    throw error;
  }
};

const readJsonWithFallback = async (filename, fallback) => {
  try {
    return await readJson(filename);
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        await writeJson(filename, fallback);
      } catch (writeError) {
        console.warn(`Failed to seed ${filename} with fallback:`, writeError);
      }
      return fallback;
    }
    console.error(`Failed to read ${filename}:`, error);
    return fallback;
  }
};

const slugify = (text = '') =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const parseBulkPricing = (input, fallback = []) => {
  if (!input && input !== 0) {
    return fallback;
  }

  let source = input;
  if (typeof source === 'string') {
    if (!source.trim()) {
      return fallback;
    }
    try {
      source = JSON.parse(source);
    } catch (error) {
      console.error('Bulk pricing JSON parse error:', error);
      return fallback;
    }
  }

  if (!Array.isArray(source)) {
    return fallback;
  }

  return source
    .map((item) => ({
      minQty: Number(item.minQty),
      price: Number(item.price),
    }))
    .filter((item) => Number.isFinite(item.minQty) && Number.isFinite(item.price));
};

const sanitizeImages = (input, fallback = []) => {
  if (!input && input !== '') {
    return fallback;
  }

  if (Array.isArray(input)) {
    return input.map((value) => value && value.toString().trim()).filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return fallback;
};

const defaultLandingMedia = {
  heroGallery: [
    '/images/landing/24.png',
    '/images/landing/25.png',
    '/images/landing/27.png',
    '/images/landing/28.png',
  ],
  heroVideo: {
    src: '',
    poster: '/images/landing/24.png',
  },
  mediaHighlights: [
    {
      title: 'Tam otomatik dolum hattı',
      caption: 'Saha görüntüleriniz burada yer alabilir.',
      image: '/images/landing/25.png',
    },
  ],
};

const sanitizeLandingMedia = (input, fallback = defaultLandingMedia) => {
  if (!input || typeof input !== 'object') {
    return fallback;
  }

  const heroGallery = Array.isArray(input.heroGallery)
    ? input.heroGallery.map((item) => (item ? item.toString().trim() : '')).filter(Boolean)
    : fallback.heroGallery;

  const heroVideoRaw = input.heroVideo && typeof input.heroVideo === 'object' ? input.heroVideo : {};
  const heroVideo = {
    src: heroVideoRaw.src ? heroVideoRaw.src.toString().trim() : '',
    poster: heroVideoRaw.poster ? heroVideoRaw.poster.toString().trim() : '',
  };

  const mediaHighlights = Array.isArray(input.mediaHighlights)
    ? input.mediaHighlights
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }
          const image = item.image ? item.image.toString().trim() : '';
          if (!image) {
            return null;
          }
          return {
            title: item.title ? item.title.toString().trim() : '',
            caption: item.caption ? item.caption.toString().trim() : '',
            image,
          };
        })
        .filter(Boolean)
    : fallback.mediaHighlights;

  return {
    heroGallery: heroGallery.length > 0 ? heroGallery : fallback.heroGallery,
    heroVideo,
    mediaHighlights: mediaHighlights.length > 0 ? mediaHighlights : fallback.mediaHighlights,
  };
};

const encodeBase64Url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const decodeBase64Url = (input) => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (padded.length % 4)) % 4;
  const paddedInput = `${padded}${'='.repeat(paddingLength)}`;
  return Buffer.from(paddedInput, 'base64').toString('utf8');
};

const createAdminToken = (username) => {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + ADMIN_TOKEN_EXPIRY_MINUTES * 60 * 1000;
  const payload = { username, issuedAt, expiresAt };
  const base = encodeBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', ADMIN_SECRET).update(base).digest('hex');
  return { token: `${base}.${signature}`, expiresAt };
};

const verifyAdminToken = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const [base, signature] = token.split('.');
  if (!base || !signature) {
    return null;
  }

  const expectedSignature = crypto.createHmac('sha256', ADMIN_SECRET).update(base).digest('hex');
  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(decodeBase64Url(base));
  } catch (error) {
    console.error('Token parse error:', error);
    return null;
  }

  if (!payload || !payload.expiresAt || payload.expiresAt < Date.now()) {
    return null;
  }

  if (payload.username !== ADMIN_USERNAME) {
    return null;
  }

  return payload;
};

const requireAdmin = (_req, _res, next) => next();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MEDIA_MAX_SIZE_BYTES || 5 * 1024 * 1024),
  },
});

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });
  }

  const { token, expiresAt } = createAdminToken(username);
  return res.json({ token, expiresAt });
});

router.get('/auth/me', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

router.get('/media', requireAdmin, async (_req, res) => {
  try {
    const mediaStore = await readJsonWithFallback('media.json', { media: [] });
    res.json(mediaStore);
  } catch (error) {
    console.error('Error reading media store:', error);
    res.status(500).json({ error: 'Medya dosyaları yüklenirken hata oluştu' });
  }
});

router.post('/media', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Yüklenecek dosya bulunamadı.' });
    }

    const mediaStore = await readJsonWithFallback('media.json', { media: [] });
    const item = {
      id: `${Date.now()}-${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
      createdAt: new Date().toISOString(),
    };

    mediaStore.media.push(item);
    await writeJson('media.json', mediaStore);

    res.status(201).json({ media: item });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Medya yüklenirken hata oluştu' });
  }
});

router.delete('/media/:id', requireAdmin, async (req, res) => {
  try {
    const mediaStore = await readJsonWithFallback('media.json', { media: [] });
    const index = mediaStore.media.findIndex((item) => item.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Silinecek medya bulunamadı.' });
    }

    const [removed] = mediaStore.media.splice(index, 1);
    await writeJson('media.json', mediaStore);

    try {
      await fs.unlink(path.join(uploadsDir, removed.filename));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error deleting media file:', error);
      }
    }

    res.json({ media: removed });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Medya silinirken hata oluştu' });
  }
});

router.get('/landing-media', async (_req, res) => {
  try {
    const media = await readJsonWithFallback('landing-media.json', defaultLandingMedia);
    res.json({ landingMedia: sanitizeLandingMedia(media) });
  } catch (error) {
    console.error('Error reading landing media:', error);
    res.status(500).json({ error: 'Landing medya içeriği yüklenirken hata oluştu' });
  }
});

router.put('/landing-media', requireAdmin, async (req, res) => {
  try {
    const current = await readJsonWithFallback('landing-media.json', defaultLandingMedia);
    const sanitized = sanitizeLandingMedia(req.body, current);
    await writeJson('landing-media.json', sanitized);
    res.json({ landingMedia: sanitized });
  } catch (error) {
    console.error('Error updating landing media:', error);
    res.status(500).json({ error: 'Landing medya güncellenirken hata oluştu' });
  }
});

router.get('/products', async (_req, res) => {
  try {
    const data = await readJson('products.json');
    res.json(data);
  } catch (error) {
    console.error('Error reading products:', error);
    res.status(500).json({ error: 'Ürünler yüklenirken hata oluştu' });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const data = await readJson('products.json');
    const product = data.products.find((item) => item.id === req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error reading product:', error);
    res.status(500).json({ error: 'Ürün yüklenirken hata oluştu' });
  }
});

router.get('/products/slug/:slug', async (req, res) => {
  try {
    const data = await readJson('products.json');
    const product = data.products.find((item) => item.slug === req.params.slug);

    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error reading product by slug:', error);
    res.status(500).json({ error: 'Ürün yüklenirken hata oluştu' });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const data = await readJson('categories.json');
    res.json(data);
  } catch (error) {
    console.error('Error reading categories:', error);
    res.status(500).json({ error: 'Kategoriler yüklenirken hata oluştu' });
  }
});

router.get('/categories/:slug/products', async (req, res) => {
  try {
    const { slug } = req.params;
    const products = await readJson('products.json');
    const filtered = products.products.filter((item) => item.category === slug);
    res.json({ products: filtered });
  } catch (error) {
    console.error('Error filtering category products:', error);
    res.status(500).json({ error: 'Kategori ürünleri yüklenirken hata oluştu' });
  }
});

router.post('/products', requireAdmin, async (req, res) => {
  try {
    const data = await readJson('products.json');
    const {
      id: incomingId,
      title,
      slug: incomingSlug,
      description = '',
      price,
      bulkPricing,
      category,
      images,
      image,
      stock,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Ürün başlığı (title) zorunludur.' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Kategori (category) alanı zorunludur.' });
    }

    const slug = incomingSlug ? incomingSlug.trim() : slugify(title);
    const id = incomingId ? incomingId.trim() : slug;

    if (data.products.some((product) => product.id === id)) {
      return res.status(409).json({ error: 'Aynı id değerine sahip bir ürün zaten mevcut.' });
    }

    if (data.products.some((product) => product.slug === slug)) {
      return res.status(409).json({ error: 'Aynı slug değerine sahip bir ürün zaten mevcut.' });
    }

    const product = {
      id,
      title,
      slug,
      description,
      price: Number(price) || 0,
      bulkPricing: parseBulkPricing(bulkPricing, []),
      category,
      images: sanitizeImages(images ?? image ?? [], []),
      stock: Number.isFinite(Number(stock)) ? Number(stock) : 0,
      createdAt: new Date().toISOString(),
    };

    data.products.push(product);
    await writeJson('products.json', data);

    res.status(201).json({ product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Ürün oluşturulurken hata oluştu' });
  }
});

router.put('/products/:id', requireAdmin, async (req, res) => {
  try {
    const data = await readJson('products.json');
    const productIndex = data.products.findIndex((item) => item.id === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({ error: 'Güncellenecek ürün bulunamadı.' });
    }

    const existing = data.products[productIndex];
    const {
      title = existing.title,
      slug: incomingSlug,
      description = existing.description,
      price,
      bulkPricing,
      category = existing.category,
      images,
      image,
      stock,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Ürün başlığı (title) zorunludur.' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Kategori (category) alanı zorunludur.' });
    }

    const slug = incomingSlug ? incomingSlug.trim() : existing.slug || slugify(title);

    if (slug !== existing.slug && data.products.some((product) => product.slug === slug)) {
      return res.status(409).json({ error: 'Aynı slug değerine sahip bir ürün zaten mevcut.' });
    }

    const updatedProduct = {
      ...existing,
      title,
      slug,
      description,
      price: price !== undefined ? (Number(price) || 0) : existing.price,
      bulkPricing: bulkPricing !== undefined ? parseBulkPricing(bulkPricing, existing.bulkPricing) : existing.bulkPricing,
      category,
      images:
        images !== undefined || image !== undefined
          ? sanitizeImages(images ?? image ?? existing.images, existing.images)
          : existing.images,
      stock: stock !== undefined ? (Number.isFinite(Number(stock)) ? Number(stock) : existing.stock) : existing.stock,
    };

    data.products[productIndex] = updatedProduct;
    await writeJson('products.json', data);

    res.json({ product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Ürün güncellenirken hata oluştu' });
  }
});

router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const data = await readJson('products.json');
    const productIndex = data.products.findIndex((item) => item.id === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({ error: 'Silinecek ürün bulunamadı.' });
    }

    const [removedProduct] = data.products.splice(productIndex, 1);
    await writeJson('products.json', data);

    res.json({ product: removedProduct });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Ürün silinirken hata oluştu' });
  }
});

router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const data = await readJson('categories.json');
    const {
      id: incomingId,
      name,
      slug: incomingSlug,
      description = '',
      image = '',
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Kategori adı (name) zorunludur.' });
    }

    const slug = incomingSlug ? incomingSlug.trim() : slugify(name);
    const id = incomingId ? incomingId.trim() : slug;

    if (data.categories.some((category) => category.id === id)) {
      return res.status(409).json({ error: 'Aynı id değerine sahip bir kategori zaten mevcut.' });
    }

    if (data.categories.some((category) => category.slug === slug)) {
      return res.status(409).json({ error: 'Aynı slug değerine sahip bir kategori zaten mevcut.' });
    }

    const category = {
      id,
      name,
      slug,
      description,
      image,
      createdAt: new Date().toISOString(),
    };

    data.categories.push(category);
    await writeJson('categories.json', data);

    res.status(201).json({ category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Kategori oluşturulurken hata oluştu' });
  }
});

router.put('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const data = await readJson('categories.json');
    const categoryIndex = data.categories.findIndex((item) => item.id === req.params.id);

    if (categoryIndex === -1) {
      return res.status(404).json({ error: 'Güncellenecek kategori bulunamadı.' });
    }

    const existing = data.categories[categoryIndex];
    const {
      name = existing.name,
      slug: incomingSlug,
      description = existing.description ?? '',
      image = existing.image ?? '',
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Kategori adı (name) zorunludur.' });
    }

    const slug = incomingSlug ? incomingSlug.trim() : existing.slug || slugify(name);

    if (slug !== existing.slug && data.categories.some((category) => category.slug === slug)) {
      return res.status(409).json({ error: 'Aynı slug değerine sahip bir kategori zaten mevcut.' });
    }

    const updated = {
      ...existing,
      name,
      slug,
      description,
      image,
      updatedAt: new Date().toISOString(),
    };

    data.categories[categoryIndex] = updated;
    await writeJson('categories.json', data);

    res.json({ category: updated });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Kategori güncellenirken hata oluştu' });
  }
});

router.delete('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const data = await readJson('categories.json');
    const categoryIndex = data.categories.findIndex((item) => item.id === req.params.id);

    if (categoryIndex === -1) {
      return res.status(404).json({ error: 'Silinecek kategori bulunamadı.' });
    }

    const [removedCategory] = data.categories.splice(categoryIndex, 1);
    await writeJson('categories.json', data);

    res.json({ category: removedCategory });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Kategori silinirken hata oluştu' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const orders = await readJson('orders.json');
    const payload = {
      ...req.body,
      id: `order-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    orders.orders.push(payload);
    await writeJson('orders.json', orders);
    res.status(201).json({ message: 'Sipariş alındı', order: payload });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Sipariş kaydedilirken hata oluştu' });
  }
});

router.get('/orders', requireAdmin, async (_req, res) => {
  try {
    const orders = await readJson('orders.json');
    res.json(orders);
  } catch (error) {
    console.error('Error reading orders:', error);
    res.status(500).json({ error: 'Siparişler yüklenirken hata oluştu' });
  }
});

router.put('/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const ordersData = await readJson('orders.json');
    const orderIndex = ordersData.orders.findIndex((order) => order.id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Güncellenecek sipariş bulunamadı.' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Yeni durum (status) zorunludur.' });
    }

    ordersData.orders[orderIndex] = {
      ...ordersData.orders[orderIndex],
      status,
      updatedAt: new Date().toISOString(),
    };

    await writeJson('orders.json', ordersData);

    res.json({ order: ordersData.orders[orderIndex] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Sipariş güncellenirken hata oluştu' });
  }
});

router.post('/samples', async (req, res) => {
  try {
    const samples = await readJson('samples.json');
    const payload = {
      ...req.body,
      id: `sample-${Date.now()}`,
      status: 'requested',
      createdAt: new Date().toISOString(),
    };
    samples.samples.push(payload);
    await writeJson('samples.json', samples);
    res.status(201).json({ message: 'Numune talebi alındı', sample: payload });
  } catch (error) {
    console.error('Error creating sample request:', error);
    res.status(500).json({ error: 'Numune talebi kaydedilirken hata oluştu' });
  }
});

router.get('/stats/overview', requireAdmin, async (req, res) => {
  try {
    const requestedFrom = req.query?.from;
    const requestedTo = req.query?.to;
    const requestedCategory = req.query?.category;
    const requestedStatusRaw = req.query?.status;
    const requestedStatus = requestedStatusRaw && requestedStatusRaw !== 'all' ? requestedStatusRaw.toLowerCase() : null;

    const [ordersData, productsData] = await Promise.all([
      readJson('orders.json'),
      readJson('products.json'),
    ]);

    const orders = ordersData.orders ?? [];
    const products = productsData.products ?? [];
    const productMap = new Map(products.map((product) => [product.id, product]));

    let totalRevenue = 0;
    let pendingOrders = 0;
    const categoryTotals = new Map();
    const monthlyTotals = new Map();

    for (const order of orders) {
      const createdAtDate = order.createdAt ? new Date(order.createdAt) : null;

      if (requestedFrom || requestedTo) {
        const fromTime = requestedFrom ? new Date(requestedFrom).getTime() : null;
        const toTime = requestedTo ? new Date(requestedTo).getTime() : null;
        const orderTime = createdAtDate && !Number.isNaN(createdAtDate.getTime()) ? createdAtDate.getTime() : null;

        if (orderTime === null) {
          continue;
        }

        if (fromTime !== null && orderTime < fromTime) {
          continue;
        }

        if (toTime !== null && orderTime > toTime + (24 * 60 * 60 * 1000 - 1)) {
          continue;
        }
      }

      const orderTotal = Number(order?.totals?.subtotal) || 0;
      const statusValue = (order.status || '').toLowerCase();

      if (requestedStatus && statusValue !== requestedStatus) {
        continue;
      }

      totalRevenue += orderTotal;

      if (statusValue === 'pending' || statusValue === 'beklemede') {
        pendingOrders += 1;
      }

      const items = order.items ?? [];
      for (const item of items) {
        const product = productMap.get(item.id);
        const category = product?.category ?? 'other';

        if (requestedCategory && requestedCategory !== 'all' && category !== requestedCategory) {
          continue;
        }

        const amount = Number(item.subtotal) || (Number(item.price) * Number(item.quantity)) || 0;
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
      }

      if (createdAtDate && !Number.isNaN(createdAtDate.getTime())) {
        const monthKey = `${createdAtDate.getFullYear()}-${String(createdAtDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + orderTotal);
      }
    }

    const stats = {
      totalRevenue,
      totalOrders: orders.length,
      pendingOrders,
      averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
      categorySales: Array.from(categoryTotals.entries()).map(([category, total]) => ({ category, total })),
      monthlySales: Array.from(monthlyTotals.entries())
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => (a.month > b.month ? 1 : -1)),
    };

    res.json(stats);
  } catch (error) {
    console.error('Error computing stats:', error);
    res.status(500).json({ error: 'İstatistikler hesaplanırken hata oluştu' });
  }
});

module.exports = router;

const buildQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) {
    return '';
  }
  return new URLSearchParams(entries).toString();
};

const getPathWithQuery = (event) => {
  const rawPath = event.rawPath || event.path || '/';
  const rawQuery = event.rawQuery || '';
  const fallbackQuery = buildQueryString(event.queryStringParameters);
  const query = rawQuery || fallbackQuery;
  const pathWithQuery = rawPath + (query ? `?${query}` : '');
  return pathWithQuery;
};

module.exports.handler = async (event, context) => {
  return new Promise((resolve, reject) => {
    const server = handlerApp.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const pathWithQuery = getPathWithQuery(event);

      const options = {
        hostname: '127.0.0.1',
        port,
        path: pathWithQuery,
        method: event.httpMethod || 'GET',
        headers: {
          ...event.headers,
          host: `127.0.0.1:${port}`,
        },
      };

      const req = http.request(options, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const bodyBuffer = Buffer.concat(chunks);
          const bodyString = bodyBuffer.toString('utf8');

          const headers = { ...res.headers };
          delete headers.connection;
          delete headers['transfer-encoding'];

          server.close(() => {
            resolve({
              statusCode: res.statusCode || 200,
              headers,
              body: bodyString,
            });
          });
        });
      });

      req.on('error', (error) => {
        server.close(() => reject(error));
      });

      if (event.body) {
        const bodyData = event.isBase64Encoded
          ? Buffer.from(event.body, 'base64')
          : event.body;
        req.write(bodyData);
      }

      req.end();
    });
  });
};



