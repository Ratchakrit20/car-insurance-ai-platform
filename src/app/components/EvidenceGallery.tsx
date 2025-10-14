"use client";

import React, { useEffect, useMemo, useState } from "react";

export type MediaItem = {
  url: string;
  type?: "image" | "video";
  publicId?: string;
  caption?: string; // เช่น ด้าน: หน้า
  note?: string; // รายละเอียดความเสียหาย
};

type Props = {
  media: (string | MediaItem)[];
  title?: string;
  thumbWidth?: number;
  className?: string;
};

const asMediaItem = (m: string | MediaItem): MediaItem =>
  typeof m === "string" ? { url: m } : m;

const isVideo = (m: MediaItem) =>
  m.type === "video" || /\.(mp4|mov|webm|ogg)$/i.test(m.url);

const makeThumb = (url: string, w = 800) =>
  url.includes("/upload/")
    ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`)
    : url;

export default function EvidenceGallery({
  media,
  thumbWidth = 800,
  className = "",
}: Props) {
  const flattenMedia = (raw: any[]): MediaItem[] => {
    if (!Array.isArray(raw)) return [];
    // ตรวจจับกรณี url เป็น array
    if (raw.length === 1 && Array.isArray(raw[0]?.url) && Array.isArray(raw[0]?.type)) {
      return raw[0].url.map((u: string, i: number) => ({
        url: u,
        type: raw[0].type?.[i] ?? "image",
      }));
    }
    return raw.map(asMediaItem);
  };

  const items = useMemo(() => flattenMedia(media || []), [media]);

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  console.log("items", items);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (!items.length) return;
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % items.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, items.length]);

  if (!items.length) {
    return <div className="text-sm text-zinc-500">ไม่มีไฟล์แนบ</div>;
  }

  return (
    <section className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((m, i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden shadow-sm ring-1 ring-zinc-200/70 bg-white hover:shadow-md transition"
          >
            <button
              type="button"
              onClick={() => {
                setIndex(i);
                setOpen(true);
              }}
              className="relative w-full aspect-video block overflow-hidden group"
            >
              {isVideo(m) ? (
                <video src={m.url} className="h-full w-full object-cover" controls />
              ) : (
                <img
                  src={makeThumb(m.url, thumbWidth)}
                  alt={`evidence-${i}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              {m.caption && (
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                  {m.caption}
                </div>
              )}
            </button>

            {/* note ใต้ภาพ */}
            {(m.caption || m.note) && (
              <div className="p-2">
                {m.note && (
                  <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-snug">
                    <span className="font-medium text-zinc-800">รายละเอียด:</span> {m.note}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 🔍 Modal */}
      {open && items[index] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-xl"
            >
              ✕
            </button>

            {items.length > 1 && (
              <>
                <button
                  onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 px-3 py-2 text-white/90 hover:text-white text-3xl"
                >
                  ‹
                </button>
                <button
                  onClick={() => setIndex((i) => (i + 1) % items.length)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 px-3 py-2 text-white/90 hover:text-white text-3xl"
                >
                  ›
                </button>
              </>
            )}

            {isVideo(items[index]) ? (
              <video
                src={items[index].url}
                controls
                className="mx-auto max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
              />
            ) : (
              <img
                src={items[index].url}
                alt="preview"
                className="mx-auto max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
              />
            )}

            {/* caption + note ใน modal */}
            {(items[index].caption || items[index].note) && (
              <div className="mt-3 text-center text-white space-y-1">
                {items[index].caption && (
                  <p className="text-sm font-semibold">{items[index].caption}</p>
                )}
                {items[index].note && (
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                    รายละเอียด: {items[index].note}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
