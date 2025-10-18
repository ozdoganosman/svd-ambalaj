'use client';

import { useEffect, useRef, useState } from "react";
import { AdminMedia, deleteMediaItem, fetchMediaList, resolveMediaUrl, uploadMediaFile } from "@/lib/admin-api";

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes)) {
    return "-";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  for (const unit of units) {
    if (value < 1024) {
      return `${value.toFixed(1)} ${unit}`;
    }
    value /= 1024;
  }
  return `${value.toFixed(1)} TB`;
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMediaList();
      setItems(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Lütfen yüklenecek bir dosya seçin.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await uploadMediaFile(file);
      setItems((prev) => [created, ...prev]);
      setSuccess("Dosya başarıyla yüklendi.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu medyayı silmek istediğinize emin misiniz?")) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const removed = await deleteMediaItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSuccess(`${removed.originalName} silindi.`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Medya Kütüphanesi</h1>
            <p className="text-sm text-slate-600">Yüklenen görselleri yönetin, yeni dosyalar ekleyin ve gerekirse silin.</p>
          </div>
          <button
            type="button"
            onClick={loadMedia}
            disabled={loading}
            className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-400"
          >
            Yenile
          </button>
        </div>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div>
        )}
        <form className="flex flex-col gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center" onSubmit={handleUpload}>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="media-file">
              Dosya Seç
            </label>
            <input
              id="media-file"
              name="file"
              type="file"
              ref={fileInputRef}
              className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
              accept="image/*,video/*"
            />
            <p className="text-xs text-slate-500">Maksimum dosya boyutu backend yapılandırmasına bağlıdır.</p>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
          >
            {uploading ? "Yükleniyor..." : "Dosyayı Yükle"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Yüklenen Dosyalar</h2>
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">Henüz yüklenmiş medya bulunmuyor.</div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isImage = item.mimeType.startsWith("image/");
              const fileUrl = resolveMediaUrl(item.url);
              return (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {isImage ? (
                      <img src={fileUrl} alt={item.originalName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                        {item.mimeType}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-slate-900">{item.originalName}</p>
                    <p className="text-slate-600">Boyut: {formatFileSize(item.size)}</p>
                    <p className="text-slate-600">Yüklenme: {new Date(item.createdAt).toLocaleString("tr-TR")}</p>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      Dosyayı Aç
                    </a>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
