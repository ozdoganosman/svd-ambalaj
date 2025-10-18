'use client';

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AdminMedia, fetchMediaList, resolveMediaUrl } from "@/lib/admin-api";

type MediaPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: AdminMedia) => void;
};

export function MediaPicker({ isOpen, onClose, onSelect }: MediaPickerProps) {
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const media = await fetchMediaList();
      setItems(media.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, loadItems]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-4xl space-y-6 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Medya Seç</h2>
            <p className="text-sm text-slate-600">Ürün veya kategoriniz için kullanılacak görseli seçin.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadItems}
              disabled={loading}
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-400"
            >
              Yenile
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Kapat
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
            Henüz medya yüklenmemiş. Lütfen önce Medya sayfasından dosya ekleyin.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const fileUrl = resolveMediaUrl(item.url);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg"
                >
                  <div className="relative aspect-video w-full bg-slate-100">
                    <Image src={fileUrl} alt={item.originalName} fill className="object-cover" sizes="(max-width: 768px) 100vw, 240px" />
                  </div>
                  <div className="space-y-1 px-4 py-3 text-sm">
                    <p className="font-semibold text-slate-900 group-hover:text-amber-600">{item.originalName}</p>
                    <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("tr-TR")}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
