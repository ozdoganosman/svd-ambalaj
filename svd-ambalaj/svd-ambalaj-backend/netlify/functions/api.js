const express = require('express');
const http = require('http');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const mime = require('mime-types');
const catalogDb = require('../../db/catalog');
const ordersDb = require('../../db/orders');
const samplesDb = require('../../db/samples');
const mediaDb = require('../../db/media');

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const isNetlifyRuntime = Boolean(
  process.env.NETLIFY ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
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

console.log('API_INIT', { uploadsDir });

const handlerApp = express();
handlerApp.use('/.netlify/functions/api', router);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'svd-admin-secret';
const ADMIN_TOKEN_EXPIRY_MINUTES = Number(process.env.ADMIN_TOKEN_EXPIRY_MINUTES || 120);

router.get('/uploads/:filename', async (req, res) => {
  try {
    ensureUploadsDir();
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, safeName);
    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ error: 'Dosya bulunamadÄ±.' });
    }
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    const stream = fsSync.createReadStream(filePath);
    stream.on('error', (error) => {
      console.error('Upload stream error:', error);
      res.status(500).end();
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Error serving upload:', error);
    res.status(500).json({ error: 'Dosya yÃ¼klenirken hata oluÅŸtu.' });
  }
});

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
      title: 'Tam otomatik dolum hattÄ±',
      caption: 'Saha gÃ¶rÃ¼ntÃ¼leriniz burada yer alabilir.',
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
    return res.status(400).json({ error: 'KullanÄ±cÄ± adÄ± ve ÅŸifre zorunludur.' });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'GeÃ§ersiz kullanÄ±cÄ± adÄ± veya ÅŸifre.' });
  }

  const { token, expiresAt } = createAdminToken(username);
  return res.json({ token, expiresAt });
});

router.get('/auth/me', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

router.get('/media', requireAdmin, async (_req, res) => {
  try {
    const media = await mediaDb.listMedia();
    const sanitized = media.map(({ storageKey, checksum, metadata, ...rest }) => rest);
    res.json({ media: sanitized });
  } catch (error) {
    console.error('Error reading media store:', error);
    res.status(500).json({ error: 'Medya dosyalari yuklenirken hata olustu' });
  }
});

router.post('/media', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Yuklenecek dosya bulunamadi.' });
    }

    const id = `${Date.now()}-${req.file.filename}`;
    const createdMedia = await mediaDb.createMediaEntry({
      id,
      storageKey: req.file.filename,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
    });

    const { storageKey, checksum, metadata, ...media } = createdMedia;

    res.status(201).json({ media });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Medya yuklenirken hata olustu' });
  }
});

router.delete('/media/:id', requireAdmin, async (req, res) => {
  try {
    const removed = await mediaDb.deleteMedia(req.params.id);

    if (!removed) {
      return res.status(404).json({ error: 'Silinecek medya bulunamadi.' });
    }

    try {
      await fs.unlink(path.join(uploadsDir, removed.filename));
    } catch (fsError) {
      if (fsError.code !== 'ENOENT') {
        console.error('Error deleting media file:', fsError);
      }
    }

    const { storageKey, checksum, metadata, ...media } = removed;

    res.json({ media });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Medya silinirken hata olustu' });
  }
});

router.get('/landing-media', async (_req, res) => {
  try {
    const landingMedia = await mediaDb.fetchLandingMedia();
    res.json({ landingMedia: sanitizeLandingMedia(landingMedia, defaultLandingMedia) });
  } catch (error) {
    console.error('Error reading landing media:', error);
    res.status(500).json({ error: 'Landing medya icerigi yuklenirken hata olustu' });
  }
});

router.put('/landing-media', requireAdmin, async (req, res) => {
  try {
    const sanitizedPayload = sanitizeLandingMedia(req.body, defaultLandingMedia);
    const updated = await mediaDb.updateLandingMedia(sanitizedPayload);
    res.json({ landingMedia: sanitizeLandingMedia(updated, defaultLandingMedia) });
  } catch (error) {
    console.error('Error updating landing media:', error);
    res.status(500).json({ error: 'Landing medya guncellenirken hata olustu' });
  }
});

router.get('/products', async (_req, res) => {
  try {
    const products = await catalogDb.listProducts();
    res.json({ products });
  } catch (error) {
    console.error('Error reading products:', error);
    res.status(500).json({ error: 'Urunler yuklenirken hata olustu' });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await catalogDb.getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Urun bulunamadi' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error reading product:', error);
    res.status(500).json({ error: 'Urun yuklenirken hata olustu' });
  }
});

router.get('/products/slug/:slug', async (req, res) => {
  try {
    const product = await catalogDb.getProductBySlug(req.params.slug);

    if (!product) {
      return res.status(404).json({ error: 'Urun bulunamadi' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error reading product by slug:', error);
    res.status(500).json({ error: 'Urun yuklenirken hata olustu' });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const categories = await catalogDb.listCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Error reading categories:', error);
    res.status(500).json({ error: 'Kategoriler yuklenirken hata olustu' });
  }
});

router.get('/categories/:slug/products', async (req, res) => {
  try {
    const category = await catalogDb.getCategoryBySlug(req.params.slug);

    if (!category) {
      return res.json({ products: [] });
    }

    const products = await catalogDb.listProductsByCategory(category.id);
    res.json({ products });
  } catch (error) {
    console.error('Error filtering category products:', error);
    res.status(500).json({ error: 'Kategori urunleri yuklenirken hata olustu' });
  }
});

router.post('/products', requireAdmin, async (req, res) => {
  try {
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
      return res.status(400).json({ error: 'Urun basligi (title) zorunludur.' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Kategori (category) alani zorunludur.' });
    }

    const slug = incomingSlug ? incomingSlug.trim() : slugify(title);
    const id = incomingId ? incomingId.trim() : slug;

    const [existingById, existingBySlug] = await Promise.all([
      catalogDb.getProductById(id),
      catalogDb.getProductBySlug(slug),
    ]);

    if (existingById) {
      return res.status(409).json({ error: 'Ayni id degerine sahip bir urun zaten mevcut.' });
    }

    if (existingBySlug) {
      return res.status(409).json({ error: 'Ayni slug degerine sahip bir urun zaten mevcut.' });
    }

    const categoryRecord = await catalogDb.getCategoryById(category);
    if (!categoryRecord) {
      return res.status(400).json({ error: 'Gecerli bir kategori secmelisiniz.' });
    }

    const product = await catalogDb.createProduct({
      id,
      title,
      slug,
      description,
      price: Number(price) || 0,
      bulkPricing: parseBulkPricing(bulkPricing, []),
      category,
      images: sanitizeImages(images ?? image ?? [], []),
      stock: Number.isFinite(Number(stock)) ? Number(stock) : 0,
    });

    res.status(201).json({ product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Urun olusturulurken hata olustu' });
  }
});

router.put('/products/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await catalogDb.getProductById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Guncellenecek urun bulunamadi.' });
    }

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

    const slug = incomingSlug ? incomingSlug.trim() : existing.slug || slugify(title);

    if (slug !== existing.slug) {
      const slugMatch = await catalogDb.getProductBySlug(slug);
      if (slugMatch && slugMatch.id !== existing.id) {
        return res.status(409).json({ error: 'Ayni slug degerine sahip bir urun zaten mevcut.' });
      }
    }

    if (category && category !== existing.category) {
      const categoryRecord = await catalogDb.getCategoryById(category);
      if (!categoryRecord) {
        return res.status(400).json({ error: 'Gecerli bir kategori secmelisiniz.' });
      }
    }

    const sanitizedBulkPricing =
      bulkPricing !== undefined ? parseBulkPricing(bulkPricing, existing.bulkPricing) : undefined;

    const sanitizedImages =
      images !== undefined || image !== undefined
        ? sanitizeImages(images ?? image ?? existing.images, existing.images)
        : undefined;

    const computedStock =
      stock !== undefined
        ? Number.isFinite(Number(stock))
          ? Number(stock)
          : existing.stock
        : undefined;

    const updatedProduct = await catalogDb.updateProduct(existing.id, {
      title,
      slug,
      description,
      price: price !== undefined ? Number(price) : undefined,
      bulkPricing: sanitizedBulkPricing,
      category,
      images: sanitizedImages,
      stock: computedStock,
    });

    res.json({ product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Urun guncellenirken hata olustu' });
  }
});

router.delete('/products/:id', requireAdmin, async (req, res) => {
  try {
    const removedProduct = await catalogDb.deleteProduct(req.params.id);

    if (!removedProduct) {
      return res.status(404).json({ error: 'Silinecek urun bulunamadi.' });
    }

    res.json({ product: removedProduct });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Urun silinirken hata olustu' });
  }
});

router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const {
      id: incomingId,
      name,
      slug: incomingSlug,
      description = '',
      image = '',
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Kategori adi (name) zorunludur.' });
    }

    const slug = incomingSlug ? incomingSlug.trim() : slugify(name);
    const id = incomingId ? incomingId.trim() : slug;

    const [existingById, existingBySlug] = await Promise.all([
      catalogDb.getCategoryById(id),
      catalogDb.getCategoryBySlug(slug),
    ]);

    if (existingById) {
      return res.status(409).json({ error: 'Ayni id degerine sahip bir kategori zaten mevcut.' });
    }

    if (existingBySlug) {
      return res.status(409).json({ error: 'Ayni slug degerine sahip bir kategori zaten mevcut.' });
    }

    const category = await catalogDb.createCategory({
      id,
      name,
      slug,
      description,
      image,
    });

    res.status(201).json({ category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Kategori olusturulurken hata olustu' });
  }
});

router.put('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await catalogDb.getCategoryById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Guncellenecek kategori bulunamadi.' });
    }

    const {
      name = existing.name,
      slug: incomingSlug,
      description = existing.description ?? '',
      image = existing.image ?? '',
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Kategori adi (name) zorunludur.' });
    }

    const slug = incomingSlug ? incomingSlug.trim() : existing.slug || slugify(name);

    if (slug !== existing.slug) {
      const slugMatch = await catalogDb.getCategoryBySlug(slug);
      if (slugMatch && slugMatch.id !== existing.id) {
        return res.status(409).json({ error: 'Ayni slug degerine sahip bir kategori zaten mevcut.' });
      }
    }

    const category = await catalogDb.updateCategory(existing.id, {
      name,
      slug,
      description,
      image,
    });

    res.json({ category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Kategori guncellenirken hata olustu' });
  }
});

router.delete('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const removedCategory = await catalogDb.deleteCategory(req.params.id);

    if (!removedCategory) {
      return res.status(404).json({ error: 'Silinecek kategori bulunamadi.' });
    }

    res.json({ category: removedCategory });
  } catch (error) {
    if (error && error.code === '23503') {
      return res
        .status(409)
        .json({ error: 'Kategori, iliskili urunlar nedeniyle silinemiyor.' });
    }
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Kategori silinirken hata olustu' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const order = await ordersDb.createOrder(req.body || {});
    res.status(201).json({ message: 'Siparis alindi', order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Siparis kaydedilirken hata olustu' });
  }
});

router.get('/orders', requireAdmin, async (_req, res) => {
  try {
    const orders = await ordersDb.listOrders();
    res.json({ orders });
  } catch (error) {
    console.error('Error reading orders:', error);
    res.status(500).json({ error: 'Siparisler yuklenirken hata olustu' });
  }
});

router.put('/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Yeni durum (status) zorunludur.' });
    }

    const updatedOrder = await ordersDb.updateOrderStatus(req.params.id, status);
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Guncellenecek siparis bulunamadi.' });
    }

    res.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Siparis guncellenirken hata olustu' });
  }
});

router.post('/samples', async (req, res) => {
  try {
    const sample = await samplesDb.createSampleRequest(req.body || {});
    res.status(201).json({ message: 'Numune talebi alindi', sample });
  } catch (error) {
    console.error('Error creating sample request:', error);
    res.status(500).json({ error: 'Numune talebi kaydedilirken hata olustu' });
  }
});

router.get('/stats/overview', requireAdmin, async (req, res) => {
  try {
    const filters = {
      from: req.query?.from || null,
      to: req.query?.to || null,
      category: req.query?.category || null,
      status: req.query?.status || null,
    };

    const stats = await ordersDb.getStatsOverview(filters);
    res.json(stats);
  } catch (error) {
    console.error('Error computing stats:', error);
    res.status(500).json({ error: 'Istatistikler hesaplanirken hata olustu' });
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







