"use client";

import React, { useEffect, useMemo, useState } from "react";

export type MediaItem = {
  url: string;
  type?: "image" | "video";
  publicId?: string;
  caption?: string; // เช่น ด้านหน้า, ด้านขวา
  note?: string; // รายละเอียดความเสียหาย
};

type Props = {
  media: (string | MediaItem)[];
  thumbWidth?: number;
  className?: string;
};

/* -------------------- Utility -------------------- */
const asMediaItem = (m: string | MediaItem): MediaItem =>
  typeof m === "string" ? { url: m } : m;

// ✅ ตรวจว่าเป็นวิดีโอ — แบบปลอดภัย
const isVideo = (m: MediaItem) =>
  m.type === "video" || (typeof m.url === "string" && /\.(mp4|mov|webm|ogg)$/i.test(m.url));

const makeThumb = (url: string, w = 800) =>
  url.includes("/upload/")
    ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`)
    : url;

/* -------------------- Main Component -------------------- */
export default function EvidenceGallery({
  media,
  thumbWidth = 800,
  className = "",
}: Props) {
  /* ✅ flatten data ให้แน่ใจว่า url เป็น string เสมอ */
  const flattenMedia = (raw: any[]): MediaItem[] => {
    if (!Array.isArray(raw)) return [];
    // handle case: { url: [], type: [] }
    if (raw.length === 1 && Array.isArray(raw[0]?.url) && Array.isArray(raw[0]?.type)) {
      return raw[0].url.map((u: string, i: number) => ({
        url: u,
        type: raw[0].type?.[i] ?? "image",
        caption: raw[0].caption?.[i],
        note: raw[0].note?.[i],
      }));
    }
    return raw.map(asMediaItem);
  };

  const items = useMemo(() => flattenMedia(media || []), [media]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // ✅ ปิด scroll ตอนเปิด modal + ปุ่มลูกศรเลื่อนซ้าย/ขวา
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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

  const openPreview = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  /* -------------------- Layout Renderer -------------------- */
  const renderLayout = () => {
    const count = items.length;
    const imgs = items.slice(0, 5);

    if (count === 1) {
      return <div className="aspect-video w-full">{renderMedia(imgs[0], 0, "w-full h-full")}</div>;
    }

    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {imgs.map((m, i) => renderMedia(m, i, "aspect-video w-full"))}
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="grid grid-rows-[2fr_1fr] gap-2">
          <div>{renderMedia(imgs[0], 0, "aspect-video w-full")}</div>
          <div className="grid grid-cols-2 gap-2">
            {imgs.slice(1).map((m, i) => renderMedia(m, i + 1, "aspect-video w-full"))}
          </div>
        </div>
      );
    }

    if (count === 4) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {imgs.map((m, i) => renderMedia(m, i, "aspect-video w-full"))}
        </div>
      );
    }

    // ✅ 5 รูปขึ้นไป (1 ใหญ่ซ้าย + 4 เล็กขวา)
    return (
      <div className="grid grid-cols-3 grid-rows-2 gap-2">
        <div className="col-span-2 row-span-2">
          {renderMedia(imgs[0], 0, "aspect-video w-full h-full")}
        </div>
        {imgs.slice(1, 4).map((m, i) => renderMedia(m, i + 1, "aspect-video w-full"))}
        <div className="relative">
          {renderMedia(imgs[4], 4, "aspect-video w-full opacity-90")}
          {count > 5 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-semibold rounded-lg">
              +{count - 5}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* -------------------- Render ภาพ/วิดีโอแต่ละชิ้น -------------------- */
  const renderMedia = (m: MediaItem, i: number, cls: string) => {
  const displayCaption = m.caption || (m as any).side; // ✅ ถูกที่แล้ว

  return (
    <button
      key={i}
      type="button"
      onClick={() => openPreview(i)}
      className={`relative block overflow-hidden rounded-lg ${cls}`}
    >
      {isVideo(m) ? (
        <>
          <video
            src={m.url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-white text-lg">
              ▶
            </div>
          </div>
        </>
      ) : (
        <img
          src={makeThumb(m.url, thumbWidth)}
          alt={`evidence-${i}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      )}

      {/* ✅ แสดงชื่อด้าน */}
      {displayCaption && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
           {displayCaption}
        </div>
      )}
    </button>
  );
};

  /* -------------------- Modal Preview -------------------- */
  return (
    <section className={className}>
      {renderLayout()}

      {open && items[index] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ปุ่มปิด */}
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-xl"
            >
              ✕
            </button>

            {/* ปุ่มเลื่อนซ้าย/ขวา */}
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

            {/* ✅ preview media */}
            {isVideo(items[index]) ? (
              <video
                src={items[index].url}
                controls
                autoPlay
                playsInline
                className="mx-auto max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-lg"
              />
            ) : (
              <img
                src={items[index].url}
                alt="preview"
                className="mx-auto max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-lg"
              />
            )}

            {/* ✅ caption + note (ชัดเจน แยกกรอบ) */}
            {(items[index].caption || items[index].note) && (
              <div className="mt-4 w-full max-w-2xl bg-white/10 rounded-xl p-3 text-center text-white">
                {items[index].caption && (
                  <p className="text-sm font-semibold mb-1">
                    ด้านของรถ: <span className="font-normal">{items[index].caption}</span>
                  </p>
                )}
                {items[index].note && (
                  <p className="text-sm text-zinc-200 leading-snug whitespace-pre-wrap">
                    รายละเอียดความเสียหาย: {items[index].note}
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
