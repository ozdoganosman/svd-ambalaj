'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AdminMedia,
  LandingMedia,
  LandingMediaHighlight,
  fetchLandingMedia,
  resolveMediaUrl,
  updateLandingMedia,
  uploadMediaFile,
} from "@/lib/admin-api";
import { MediaPicker } from "@/components/admin/media/media-picker";
import { useRouter } from "next/navigation";

const defaultLandingMedia: LandingMedia = {
  heroGallery: [],
  heroVideo: {
    src: "",
    poster: "",
  },
  mediaHighlights: [],
};

type PendingHighlight = LandingMediaHighlight & { id: string };

const createHighlightId = () => crypto.randomUUID();

export default function AdminLandingMediaPage() {
  const [landingMedia, setLandingMedia] = useState<LandingMedia>(defaultLandingMedia);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [galleryEditingIndex, setGalleryEditingIndex] = useState<number | null>(null);
  const [highlightEditingId, setHighlightEditingId] = useState<string | null>(null);
  const [videoField, setVideoField] = useState<{ src: string; poster: string }>({ src: "", poster: "" });
  const [highlights, setHighlights] = useState<PendingHighlight[]>([]);
  const [uploadingVideoPoster, setUploadingVideoPoster] = useState(false);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [uploadingVideoFile, setUploadingVideoFile] = useState(false);
  const router = useRouter();


  const fieldIds = {
    videoUrl: "landing-video-url",
    posterUrl: "landing-video-poster",
  };

  const highlightFieldId = (id: string, field: "title" | "caption" | "image") => `landing-highlight-${field}-${id}`;
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const landing = await fetchLandingMedia();
      setLandingMedia(landing);
      setVideoField({ src: landing.heroVideo?.src ?? "", poster: landing.heroVideo?.poster ?? "" });
      setHighlights(
        (landing.mediaHighlights ?? []).map((item) => ({
          id: createHighlightId(),
          title: item.title,
          caption: item.caption,
          image: item.image,
        }))
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVideoFile = async (file: File) => {
    setUploadingVideoFile(true);
    setError(null);
    try {
      const media = await uploadMediaFile(file);
      setVideoField((prev) => ({ ...prev, src: media.url }));
      setSuccess("Video dosyası yüklendi ve ayarlandı.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingVideoFile(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleRemoveGalleryItem = (index: number) => {
    setLandingMedia((prev) => ({
      ...prev,
      heroGallery: [...(prev.heroGallery ?? [])].filter((_, i) => i !== index),
    }));
  };

  const handleSelectMedia = (media: AdminMedia) => {
    if (galleryEditingIndex !== null) {
      setLandingMedia((prev) => {
        const next = [...(prev.heroGallery ?? [])];
        next[galleryEditingIndex] = media.url;
        return {
          ...prev,
          heroGallery: next,
        };
      });
      setGalleryEditingIndex(null);
      setPickerOpen(false);
      return;
    }

    if (highlightEditingId) {
      setHighlights((prev) =>
        prev.map((item) => (item.id === highlightEditingId ? { ...item, image: media.url } : item))
      );
      setHighlightEditingId(null);
      setPickerOpen(false);
      return;
    }

    setVideoField((prev) => ({
      ...prev,
      poster: media.url,
    }));
    setPickerOpen(false);
  };

  const handleUploadPoster = async (file: File) => {
    setUploadingVideoPoster(true);
    setError(null);
    try {
      const media = await uploadMediaFile(file);
      setVideoField((prev) => ({ ...prev, poster: media.url }));
      setSuccess("Poster görseli yüklendi.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingVideoPoster(false);
    }
  };

  const handleUploadGalleryImage = async (file: File) => {
    setUploadingGalleryImage(true);
    setError(null);
    try {
      const media = await uploadMediaFile(file);
      setLandingMedia((prev) => ({
        ...prev,
        heroGallery: [...(prev.heroGallery ?? []), media.url],
      }));
      setSuccess("Galeri görseli yüklendi.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingGalleryImage(false);
    }
  };

  const handleAddHighlight = () => {
    setHighlights((prev) => [
      ...prev,
      {
        id: createHighlightId(),
        title: "",
        caption: "",
        image: "",
      },
    ]);
  };

  const handleHighlightChange = (id: string, key: keyof LandingMediaHighlight, value: string) => {
    setHighlights((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const handleRemoveHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const sanitizedHighlights = highlights
      .map((item) => ({ title: item.title.trim(), caption: item.caption.trim(), image: item.image.trim() }))
      .filter((item) => item.image);

    const payload: LandingMedia = {
      heroGallery: (landingMedia.heroGallery ?? []).filter((item) => item.trim().length > 0),
      heroVideo: {
        src: videoField.src.trim(),
        poster: videoField.poster.trim(),
      },
      mediaHighlights: sanitizedHighlights,
    };

    try {
      const updated = await updateLandingMedia(payload);
      setLandingMedia(updated);
      setSuccess("Landing sayfası medya içerikleri güncellendi.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">Yükleniyor...</div>;
  }

  const galleryPreviewItems = landingMedia.heroGallery ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Landing Sayfası Medya Yönetimi</h1>
            <p className="text-sm text-slate-600">
              Ana sayfadaki kahraman alanı, video bölümü ve galeri görsellerini buradan güncelleyebilirsiniz.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadInitialData}
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Yenile
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
            >
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
          </div>
        </div>
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div>}
      </section>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">Kahraman Galerisi</h2>
          <p className="text-sm text-slate-600">
            Ana sayfanın üst bölümünde dönen görsellerdir. Sıralamayı sürükleyip bırakarak değiştirin veya yeni görsel ekleyin.
          </p>
        </header>
        <div className="flex flex-wrap gap-4">
          {galleryPreviewItems.map((item, index) => {
            const resolved = resolveMediaUrl(item);
            return (
              <div key={`${item}-${index}`} className="flex w-40 flex-col gap-2">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <Image src={resolved} alt={item} fill className="object-cover" sizes="160px" />
                </div>
                <div className="truncate text-xs text-slate-500" title={item}>
                  {item}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGalleryEditingIndex(index);
                      setPickerOpen(true);
                    }}
                    className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Değiştir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveGalleryItem(index)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setGalleryEditingIndex(null);
              setPickerOpen(true);
            }}
            className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500 transition hover:border-amber-400 hover:text-amber-600"
          >
            + Medya Kütüphanesi
          </button>
          <label className="flex h-40 w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500 transition hover:border-amber-400 hover:text-amber-600">
            <span>{uploadingGalleryImage ? "Yükleniyor..." : "+ Bilgisayardan"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUploadGalleryImage(file);
                }
                event.target.value = "";
              }}
              disabled={uploadingGalleryImage}
            />
          </label>
        </div>
      </section>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">Video Alanı</h2>
          <p className="text-sm text-slate-600">
            Videonuzun MP4 URL’sini girin, poster görseli olarak medya kütüphanesinden veya bilgisayarınızdan görsel belirleyin.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor={fieldIds.videoUrl}>Video URL</label>
            <input
              id={fieldIds.videoUrl}
              name="heroVideoUrl"
              type="text"
              value={videoField.src}
              onChange={(event) => setVideoField((prev) => ({ ...prev, src: event.target.value }))}
              placeholder="https://cdn.ornek.com/video.mp4"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
            />
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="rounded-md border border-slate-200 px-3 py-2 transition hover:bg-slate-100">
                {uploadingVideoFile ? "Yükleniyor..." : "Bilgisayardan Yükle"}
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleUploadVideoFile(file);
                  }
                  event.target.value = "";
                }}
                disabled={uploadingVideoFile}
              />
            </label>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor={fieldIds.posterUrl}>Poster Görseli</label>
            <div className="flex gap-2">
              <input
                id={fieldIds.posterUrl}
                name="heroVideoPoster"
                type="text"
                value={videoField.poster}
                onChange={(event) => setVideoField((prev) => ({ ...prev, poster: event.target.value }))}
                placeholder="/uploads/video-poster.jpg"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => {
                  setHighlightEditingId(null);
                  setGalleryEditingIndex(null);
                  setPickerOpen(true);
                }}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Kütüphane
              </button>
              <label className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                {uploadingVideoPoster ? "Yükleniyor..." : "Yükle"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleUploadPoster(file);
                    }
                    event.target.value = "";
                  }}
                  disabled={uploadingVideoPoster}
                />
              </label>
            </div>
            {videoField.poster && (
              <div className="relative mt-3 h-40 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <Image src={resolveMediaUrl(videoField.poster)} alt="Video poster" fill className="object-cover" sizes="(max-width: 768px) 50vw, 200px" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">Fotoğraf Galerisi Kartları</h2>
          <p className="text-sm text-slate-600">
            Galeri alanında gösterilecek kartların başlık, açıklama ve görsellerini düzenleyin.
          </p>
        </header>
        <div className="space-y-4">
          {highlights.map((item) => (
            <div key={item.id} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor={highlightFieldId(item.id, "title")}>Başlık</label>
                <input
                  id={highlightFieldId(item.id, "title")}
                  name={`highlight-${item.id}-title`}
                  type="text"
                  value={item.title}
                  onChange={(event) => handleHighlightChange(item.id, "title", event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                />
                <label className="block text-sm font-medium text-slate-700" htmlFor={highlightFieldId(item.id, "caption")}>Açıklama</label>
                <textarea
                  id={highlightFieldId(item.id, "caption")}
                  name={`highlight-${item.id}-caption`}
                  value={item.caption}
                  onChange={(event) => handleHighlightChange(item.id, "caption", event.target.value)}
                  className="h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveHighlight(item.id)}
                    className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Kartı Sil
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor={highlightFieldId(item.id, "image")}>Görsel URL</label>
                <div className="flex gap-2">
                  <input
                    id={highlightFieldId(item.id, "image")}
                    name={`highlight-${item.id}-image`}
                    type="text"
                    value={item.image}
                    onChange={(event) => handleHighlightChange(item.id, "image", event.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightEditingId(item.id);
                      setPickerOpen(true);
                    }}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Kütüphane
                  </button>
                </div>
                {item.image && (
                  <div className="relative mt-2 h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <Image src={resolveMediaUrl(item.image)} alt={item.title || "Galeri görseli"} fill className="object-cover" sizes="(max-width: 768px) 50vw, 200px" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddHighlight}
            className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            + Yeni Kart Ekle
          </button>
        </div>
      </section>

      <MediaPicker
        isOpen={isPickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setGalleryEditingIndex(null);
          setHighlightEditingId(null);
        }}
        onSelect={handleSelectMedia}
      />
    </div>
  );
}
