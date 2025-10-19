const DEFAULT_API_BASE = "http://localhost:5000/.netlify/functions/api";
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const getSiteUrl = (): string | null => {
  const siteCandidate =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    process.env.DEPLOY_URL ??
    process.env.VERCEL_URL ??
    null;

  if (!siteCandidate || typeof siteCandidate !== "string") {
    return null;
  }

  const prefixed = siteCandidate.startsWith("http")
    ? siteCandidate
    : `https://${siteCandidate}`;

  try {
    return new URL(prefixed).origin;
  } catch (error) {
    console.error("Failed to parse site URL", error);
    return null;
  }
};

const normalizeBase = (base: string): string => base.replace(/\/$/, "");

export const resolveServerApiBase = (): string => {
  const rawBase =
    typeof process?.env?.NEXT_PUBLIC_API_URL === "string"
      ? process.env.NEXT_PUBLIC_API_URL
      : DEFAULT_API_BASE;

  if (ABSOLUTE_URL_REGEX.test(rawBase)) {
    return normalizeBase(rawBase);
  }

  const siteOrigin = getSiteUrl();
  if (siteOrigin) {
    try {
      const absolute = new URL(rawBase, siteOrigin).toString();
      return normalizeBase(absolute);
    } catch (error) {
      console.error("Failed to resolve relative API base", error);
    }
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    return normalizeBase(origin);
  }

  return normalizeBase(DEFAULT_API_BASE);
};

export const resolveServerApiUrl = (path: string): string => {
  const base = resolveServerApiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

export const resolveServerApiOrigin = (): string => {
  const base = resolveServerApiBase();
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
};

export const buildBlobProxyUrl = (key: string): string => {
  const normalizedKey = key.startsWith("/") ? key.slice(1) : key;
  const base = resolveServerApiBase();

  if (!base) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/.netlify/functions/blob-proxy?key=${encodeURIComponent(normalizedKey)}`;
    }
    return `/.netlify/functions/blob-proxy?key=${encodeURIComponent(normalizedKey)}`;
  }

  return `${base}/.netlify/functions/blob-proxy?key=${encodeURIComponent(normalizedKey)}`;
};
