import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "..", "svd-ambalaj-backend", "data");
const landingMediaFile = path.join(dataDir, "landing-media.json");

type LandingMedia = {
  heroGallery: string[];
  heroVideo: {
    src: string;
    poster: string;
  };
  mediaHighlights: {
    title: string;
    caption: string;
    image: string;
  }[];
};

const defaultLandingMedia: LandingMedia = {
  heroGallery: [
    "/images/landing/24.png",
    "/images/landing/25.png",
    "/images/landing/27.png",
    "/images/landing/28.png",
  ],
  heroVideo: {
    src: "",
    poster: "/images/landing/24.png",
  },
  mediaHighlights: [
    {
      title: "Tam otomatik dolum hattı",
      caption: "Saha görüntüleriniz burada yer alabilir.",
      image: "/images/landing/25.png",
    },
  ],
};

async function readLandingMedia(): Promise<LandingMedia> {
  try {
    const buffer = await fs.readFile(landingMediaFile, "utf8");
    return JSON.parse(buffer.toString());
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(path.dirname(landingMediaFile), { recursive: true });
      await fs.writeFile(landingMediaFile, JSON.stringify(defaultLandingMedia, null, 2));
      return defaultLandingMedia;
    }
    throw error;
  }
}

async function writeLandingMedia(payload: LandingMedia): Promise<void> {
  await fs.writeFile(landingMediaFile, JSON.stringify(payload, null, 2));
}

function sanitizeLandingMedia(input: unknown, fallback: LandingMedia): LandingMedia {
  if (!input || typeof input !== "object") {
    return fallback;
  }
  const source = input as Partial<LandingMedia>;

  const heroGallery = Array.isArray(source.heroGallery)
    ? source.heroGallery.map((item) => (item ? item.toString().trim() : "")).filter(Boolean)
    : fallback.heroGallery;

  const heroVideo = {
    src: source.heroVideo?.src ? source.heroVideo.src.toString().trim() : fallback.heroVideo.src,
    poster: source.heroVideo?.poster ? source.heroVideo.poster.toString().trim() : fallback.heroVideo.poster,
  };

  const mediaHighlights = Array.isArray(source.mediaHighlights)
    ? source.mediaHighlights
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const title = item.title ? item.title.toString().trim() : "";
          const caption = item.caption ? item.caption.toString().trim() : "";
          const image = item.image ? item.image.toString().trim() : "";
          if (!image) {
            return null;
          }
          return { title, caption, image };
        })
        .filter(Boolean)
    : fallback.mediaHighlights;

  return {
    heroGallery: heroGallery.length > 0 ? heroGallery : fallback.heroGallery,
    heroVideo,
    mediaHighlights: mediaHighlights.length > 0 ? (mediaHighlights as LandingMedia["mediaHighlights"]) : fallback.mediaHighlights,
  };
}

export async function GET(_request: NextRequest) {
  try {
    const landingMedia = await readLandingMedia();
    return NextResponse.json({ landingMedia });
  } catch (error) {
    console.error("Landing media GET error", error);
    return NextResponse.json({ error: "Landing media yüklenirken hata oluştu" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await request.json();
    const current = await readLandingMedia();
    const sanitized = sanitizeLandingMedia(payload, current);
    await writeLandingMedia(sanitized);
    return NextResponse.json({ landingMedia: sanitized });
  } catch (error) {
    console.error("Landing media PUT error", error);
    return NextResponse.json({ error: "Landing media güncellenirken hata oluştu" }, { status: 500 });
  }
}
