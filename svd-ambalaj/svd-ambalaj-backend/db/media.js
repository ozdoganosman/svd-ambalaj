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

const mapMediaRow = (row) => ({
  id: row.id,
  filename: row.filename,
  originalName: row.original_name || '',
  size: row.size_bytes ? Number(row.size_bytes) : 0,
  mimeType: row.mime_type || '',
  url: row.url || '',
  storageKey: row.storage_key,
  checksum: row.checksum || null,
  metadata: row.metadata || {},
  createdAt: mapTimestamp(row.created_at),
  updatedAt: mapTimestamp(row.updated_at),
});

const listMedia = async () => {
  const { rows } = await query(
    `
      select id, storage_key, filename, original_name, mime_type, size_bytes, url, checksum, metadata, created_at, updated_at
      from media
      order by created_at desc
    `
  );
  return rows.map(mapMediaRow);
};

const getMediaById = async (id) => {
  const { rows } = await query(
    `
      select id, storage_key, filename, original_name, mime_type, size_bytes, url, checksum, metadata, created_at, updated_at
      from media
      where id = $1
      limit 1
    `,
    [id]
  );
  return rows.length ? mapMediaRow(rows[0]) : null;
};

const createMediaEntry = async (entry) => {
  const {
    id,
    storageKey,
    filename,
    originalName,
    mimeType,
    size,
    url,
    checksum = null,
    metadata = {},
  } = entry;

  const { rows } = await query(
    `
      insert into media (id, storage_key, filename, original_name, mime_type, size_bytes, url, checksum, metadata)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning id, storage_key, filename, original_name, mime_type, size_bytes, url, checksum, metadata, created_at, updated_at
    `,
    [id, storageKey, filename, originalName, mimeType, size, url, checksum, metadata]
  );

  return mapMediaRow(rows[0]);
};

const deleteMedia = async (id) => {
  const existing = await getMediaById(id);
  if (!existing) {
    return null;
  }

  await query(
    `
      delete from media
      where id = $1
    `,
    [id]
  );

  return existing;
};

const fetchLandingMedia = async () => {
  const { rows } = await query(
    `
      select id, hero_video_src, hero_video_poster, hero_video_media_id, hero_video_poster_media_id, created_at, updated_at
      from landing_media
      order by id
      limit 1
    `
  );

  const base = rows.length
    ? rows[0]
    : {
        id: 1,
        hero_video_src: '',
        hero_video_poster: '',
        hero_video_media_id: null,
        hero_video_poster_media_id: null,
      };

  const { rows: galleryRows } = await query(
    `
      select image_url
      from landing_media_gallery
      where landing_media_id = $1
      order by sort_order
    `,
    [base.id]
  );

  const { rows: highlightRows } = await query(
    `
      select title, caption, image_url
      from landing_media_highlights
      where landing_media_id = $1
      order by sort_order
    `,
    [base.id]
  );

  return {
    id: base.id,
    heroVideo: {
      src: base.hero_video_src || '',
      poster: base.hero_video_poster || '',
    },
    heroGallery: galleryRows.map((row) => row.image_url).filter(Boolean),
    mediaHighlights: highlightRows.map((row) => ({
      title: row.title || '',
      caption: row.caption || '',
      image: row.image_url || '',
    })),
    createdAt: mapTimestamp(base.created_at),
    updatedAt: mapTimestamp(base.updated_at),
  };
};

const updateLandingMedia = async (payload) => {
  const landingMediaId = 1;
  const heroGallery = Array.isArray(payload.heroGallery) ? payload.heroGallery : [];
  const heroVideo = payload.heroVideo || {};
  const highlights = Array.isArray(payload.mediaHighlights) ? payload.mediaHighlights : [];

  await withTransaction(async ({ query: trxQuery }) => {
    await trxQuery(
      `
        insert into landing_media (id, hero_video_src, hero_video_poster, hero_video_media_id, hero_video_poster_media_id)
        values ($1, $2, $3, null, null)
        on conflict (id) do update
        set hero_video_src = excluded.hero_video_src,
            hero_video_poster = excluded.hero_video_poster,
            updated_at = now()
      `,
      [landingMediaId, heroVideo.src || '', heroVideo.poster || '']
    );

    await trxQuery(`delete from landing_media_gallery where landing_media_id = $1`, [landingMediaId]);

    if (heroGallery.length) {
      const galleryParams = [];
      const galleryPlaceholders = [];
      let index = 1;

      heroGallery.forEach((imageUrl, sortOrder) => {
        galleryPlaceholders.push(`($${index}, $${index + 1}, $${index + 2})`);
        galleryParams.push(landingMediaId, imageUrl, sortOrder);
        index += 3;
      });

      await trxQuery(
        `
          insert into landing_media_gallery (landing_media_id, image_url, sort_order)
          values ${galleryPlaceholders.join(', ')}
        `,
        galleryParams
      );
    }

    await trxQuery(`delete from landing_media_highlights where landing_media_id = $1`, [landingMediaId]);

    if (highlights.length) {
      const highlightParams = [];
      const highlightPlaceholders = [];
      let index = 1;

      highlights.forEach((highlight, sortOrder) => {
        highlightPlaceholders.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3}, $${index + 4})`);
        highlightParams.push(
          landingMediaId,
          highlight.title || '',
          highlight.caption || '',
          highlight.image || '',
          sortOrder
        );
        index += 5;
      });

      await trxQuery(
        `
          insert into landing_media_highlights (landing_media_id, title, caption, image_url, sort_order)
          values ${highlightPlaceholders.join(', ')}
        `,
        highlightParams
      );
    }
  });

  return fetchLandingMedia();
};

module.exports = {
  listMedia,
  createMediaEntry,
  deleteMedia,
  fetchLandingMedia,
  updateLandingMedia,
};
