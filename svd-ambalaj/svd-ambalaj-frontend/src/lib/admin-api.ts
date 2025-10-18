type ApiOptions = RequestInit & {
  parseJson?: boolean;
};

type UnauthorizedHandler = () => void;

let adminAuthToken: string | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

async function parseResponse<T>(response: Response, parseJson = true): Promise<T> {
  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }

    let message = `İstek başarısız (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      }
    } catch (error) {
      console.error("JSON parse error", error);
    }
    throw new Error(message);
  }

  if (!parseJson) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

const resolveApiBase = () => {
  if (process.env.NEXT_PUBLIC_ADMIN_API_BASE) {
    return process.env.NEXT_PUBLIC_ADMIN_API_BASE;
  }

  return "http://localhost:5000/.netlify/functions/api";
};

export function getAdminApiOrigin(): string {
  try {
    const url = new URL(resolveApiBase());
    return url.origin;
  } catch (error) {
    console.error("Unable to parse admin API base", error);
    const matches = resolveApiBase().match(/^(https?:\/\/[^/]+)/i);
    return matches ? matches[1] : "";
  }
}

export function resolveMediaUrl(path: string): string {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!path.startsWith("/uploads/")) {
    return path;
  }

  const origin = getAdminApiOrigin();
  if (!origin) {
    return path;
  }

  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function setAdminAuthToken(token: string | null) {
  adminAuthToken = token;
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { parseJson = true, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };

  if (!isFormData && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (adminAuthToken) {
    finalHeaders.Authorization = `Bearer ${adminAuthToken}`;
  }

  const response = await fetch(`${resolveApiBase()}${path}`, {
    headers: finalHeaders,
    ...rest,
  });

  return parseResponse<T>(response, parseJson);
}

export type AdminProduct = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  bulkPricing: { minQty: number; price: number }[];
  category: string;
  images: string[];
  stock: number;
  createdAt: string;
  updatedAt?: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminMedia = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  createdAt: string;
};

export type LandingMediaHighlight = {
  title: string;
  caption: string;
  image: string;
};

export type LandingMedia = {
  heroGallery: string[];
  heroVideo: {
    src: string;
    poster: string;
  };
  mediaHighlights: LandingMediaHighlight[];
};

export async function fetchMediaList(): Promise<AdminMedia[]> {
  const response = await apiFetch<{ media: AdminMedia[] }>("/media");
  return response.media ?? [];
}

export async function uploadMediaFile(file: File): Promise<AdminMedia> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiFetch<{ media: AdminMedia }>("/media", {
    method: "POST",
    body: formData,
  });
  return response.media;
}

export async function deleteMediaItem(id: string): Promise<AdminMedia> {
  const response = await apiFetch<{ media: AdminMedia }>(`/media/${id}`, {
    method: "DELETE",
  });
  return response.media;
}

export async function fetchLandingMedia(): Promise<LandingMedia> {
  const response = await apiFetch<{ landingMedia: LandingMedia }>("/landing-media");
  return response.landingMedia;
}

export async function updateLandingMedia(payload: LandingMedia): Promise<LandingMedia> {
  const response = await apiFetch<{ landingMedia: LandingMedia }>("/landing-media", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return response.landingMedia;
}

export type AdminOrder = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  customer: {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    taxNumber?: string;
    address?: string;
    city?: string;
    notes?: string;
  };
  items: {
    id: string;
    title: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  totals: {
    subtotal: number;
    currency?: string;
  };
};

export type AdminStatsOverview = {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  categorySales: { category: string; total: number }[];
  monthlySales: { month: string; total: number }[];
};

export type StatsFiltersPayload = {
  from?: string;
  to?: string;
  category?: string;
};

export async function fetchStatsOverview(filters: StatsFiltersPayload = {}): Promise<AdminStatsOverview> {
  const query = new URLSearchParams();
  if (filters.from) {
    query.set("from", filters.from);
  }
  if (filters.to) {
    query.set("to", filters.to);
  }
  if (filters.category && filters.category !== "all") {
    query.set("category", filters.category);
  }

  const search = query.toString();
  const path = `/stats/overview${search ? `?${search}` : ""}`;
  return apiFetch<AdminStatsOverview>(path);
}
