"use client";
import React, { useLayoutEffect, useRef, useState, useCallback } from "react";
import type { Annotation } from "@/types/claim";
import { CirclePlus } from "lucide-react";
import { Prompt, Noto_Sans_Thai, Inter } from 'next/font/google';
const headingFont = Prompt({ subsets: ['thai', 'latin'], weight: ['600', '700'], display: 'swap' });
const bodyFont = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], display: 'swap' });
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
type Props = {
  imageUrl?: string;
  imageLabel?: string;
  imageNote?: string;
  boxes: Annotation[];
  /** เรียกเมื่อวาดกล่องเสร็จ */
  onCreate?: (rect: { x: number; y: number; w: number; h: number }) => void;
  /** ถ้ายังมีปุ่มเพิ่มใน parent ให้เรียก toggle โหมดวาดเองได้ */
  startDrawExternally?: boolean;
  onExitDraw?: () => void;
};
function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}
export default function ImageViewer({
  imageUrl,
  imageLabel,
  imageNote,
  boxes,
  onCreate,
  startDrawExternally = false,
  onExitDraw,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [temp, setTemp] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  console.log("ImageViewer render", { imageNote });
  // ถ้า parent ส่งสัญญาณให้เริ่มวาดจากภายนอก
  React.useEffect(() => {
    if (startDrawExternally) {
      setDrawMode(true);
    }
  }, [startDrawExternally]);

  const getRel = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current!;
    const r = el.getBoundingClientRect();
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const x = clamp((clientX - r.left) / r.width, 0, 1);
    const y = clamp((clientY - r.top) / r.height, 0, 1);
    return { x, y };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!drawMode || !wrapRef.current) return;
    wrapRef.current.setPointerCapture(e.pointerId);
    const p = getRel(e.clientX, e.clientY);
    setTemp({ x: p.x, y: p.y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !temp) return;
    const p = getRel(e.clientX, e.clientY);
    const x1 = Math.min(temp.x, p.x);
    const y1 = Math.min(temp.y, p.y);
    const x2 = Math.max(temp.x, p.x);
    const y2 = Math.max(temp.y, p.y);
    setTemp({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
  };

  const finishDraw = () => {
    if (!isDrawing || !temp) return;
    setIsDrawing(false);
    setDrawMode(false);
    // กันกรอบเล็กเกินไป
    if (temp.w > 0.01 && temp.h > 0.01) {
      onCreate?.({
        x: round3(temp.x),
        y: round3(temp.y),
        w: round3(temp.w),
        h: round3(temp.h),
      });
    }
    setTemp(null);
    onExitDraw?.();
  };

  const onPointerUp = () => finishDraw();
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsDrawing(false);
      setDrawMode(false);
      setTemp(null);
      onExitDraw?.();
    }
  };

  return (
    <div className={`${thaiFont.className} rounded-[8px] border border-zinc-200 bg-white p-3 shadow-sm`}>

      <div className="mb-2 text-sm text-zinc-600">ภาพ · {imageLabel ?? "ไม่ระบุ"}</div>

      <div
        ref={wrapRef}
        className={`relative w-full overflow-hidden rounded-xl bg-zinc-100 select-none ${drawMode ? "cursor-crosshair" : ""
          }`}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        tabIndex={0} // ให้จับคีย์ ESC ได้
      >
        {/* รูป */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={imageLabel ?? ""} className="block w-full h-auto" />

        {/* กล่องถาวร */}
        {boxes.map((b) => (
          <div
            key={b.id}
            className="absolute rounded-xl border-2"
            style={{
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              width: `${b.w * 100}%`,
              height: `${b.h * 100}%`,
              borderColor: b.color,
            }}
          >
            <div
              className="absolute -top-3 left-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ background: b.color }}
              title={`${b.part} : ${b.damage}`}
            >
              {b.id}
            </div>
          </div>
        ))}

        {/* กล่องกำลังวาด */}
        {temp && (
          <div
            className="absolute rounded-xl border-2 border-dashed"
            style={{
              left: `${temp.x * 100}%`,
              top: `${temp.y * 100}%`,
              width: `${temp.w * 100}%`,
              height: `${temp.h * 100}%`,
              borderColor: "#0ea5e9",
              background: "rgba(14,165,233,0.1)",
            }}
          />
        )}
      </div>

      {imageNote && (
        <div className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          <div className="flex items-start gap-2">

            <p className="whitespace-pre-wrap">{imageNote}</p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          หากระบบตรวจจับไม่ครบ คุณสามารถกด “เพิ่มจุดเสียหาย” แล้วแก้ไขจากตารางด้านล่าง
        </div>

        <button
          onClick={() => setDrawMode(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6D5BD0] px-4 py-2 text-sm font-medium text-white shadow-sm 
               hover:bg-[#433D8B] active:scale-[0.97] transition-all duration-150 ease-in-out"
        >
          <CirclePlus className="w-4 h-4" />
          เพิ่มจุดเสียหาย
        </button>
      </div>
    </div>
  );
}
