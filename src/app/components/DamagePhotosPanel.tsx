"use client";

import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { Image as ImageIcon, UploadCloud, X } from "lucide-react";

export type DamageSide =
  | "หน้า" | "หลัง" | "ซ้าย" | "ขวา"
  | "หน้าซ้าย" | "หลังซ้าย" | "หน้าขวา" | "หลังขวา"
  | "ไม่ระบุ";

export type DamagePhotoItem = {
  id: string;
  file: File | null;
  previewUrl: string;
  side: DamageSide;
  detecting: boolean;
  error?: string;
  total?: number;
  perClass?: Record<string, number>;
  note?: string;
};

type Props = {
  apiBaseUrl: string;
  value?: DamagePhotoItem[];
  onChange?: (items: DamagePhotoItem[]) => void;
  maxTotalMB?: number;
};

export default function DamagePhotosPanel({
  apiBaseUrl,
  value,
  onChange,
  maxTotalMB = 100,
}: Props) {
  const [items, setItems] = useState<DamagePhotoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
  if (!value) return;

  // ถ้า value มี id เดิมกับ items ไม่ต้อง setState ใหม่
  const isSame =
    value.length === items.length &&
    value.every((v, i) => v.id === items[i]?.id);

  if (!isSame) {
    setItems(value);
    if (!selectedId && value.length > 0) {
      setSelectedId(value[0].id);
    }
  }
  // ✅ อย่าใส่ items ใน dependency array เพื่อไม่ให้ loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [value]);


  useEffect(() => {
  onChange?.(items);
}, [items, onChange]);


  const mutate = (fn: (prev: DamagePhotoItem[]) => DamagePhotoItem[]) => {
    setItems((prev) => fn(prev));
  };

  const addFiles = (files: FileList | null, side: DamageSide = "ไม่ระบุ") => {
    if (!files) return;
    const newOnes: DamagePhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: `${crypto.randomUUID()}_${Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        side,
        detecting: false,
      }));
    mutate((prev) => [...prev, ...newOnes]);
    setSelectedId(newOnes[newOnes.length - 1].id);
  };

  const removeOne = (id: string) => {
    mutate((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const setSide = (id: string, side: DamageSide) =>
    mutate((prev) => prev.map((x) => (x.id === id ? { ...x, side } : x)));

  const updateNote = (id: string, note: string) =>
    mutate((prev) => prev.map((x) => (x.id === id ? { ...x, note } : x)));

  const selectedItem = items.find((x) => x.id === selectedId);

  // 🧭 ปุ่ม upload ทั้ง 8 จุดรอบรถ
  const uploadPositions: { side: DamageSide; style: React.CSSProperties }[] = [
    // หน้า / หลัง
    { side: "หน้า", style: { top: "-2.6rem", left: "50%", transform: "translateX(-50%)" } },
    { side: "หลัง", style: { bottom: "-2.6rem", left: "50%", transform: "translateX(-50%)" } },
    // ซ้ายหลัก + ซ้ายเฉียง
    { side: "หน้าซ้าย", style: { top: "15%", left: "-1rem" } },
    { side: "ซ้าย", style: { top: "50%", left: "-1.5rem", transform: "translateY(-50%)" } },
    { side: "หลังซ้าย", style: { bottom: "15%", left: "-1rem" } },
    // ขวาหลัก + ขวาเฉียง
    { side: "หน้าขวา", style: { top: "15%", right: "-1rem" } },
    { side: "ขวา", style: { top: "50%", right: "-1.5rem", transform: "translateY(-50%)" } },
    { side: "หลังขวา", style: { bottom: "15%", right: "-1rem" } },
  ];

  return (
    <div className="rounded-[7px] p-4 bg-white">
      {/* 🟣 Upload รอบรถ */}
      <div className="flex justify-center my-6">
        <div className="relative w-[300px] m-8">
          <img src="/elements/car-top-view.png" alt="car" className="w-full" />
          {uploadPositions.map(({ side, style }) => (
            <label
              key={side}
              className="group absolute w-10 h-10 flex items-center justify-center rounded-full 
                bg-[#433D8B] border-[6px] border-[#D9D4F3] shadow-lg cursor-pointer 
                hover:bg-[#433D8B]/80 transition-all duration-300 
                hover:scale-110 hover:ring-4 hover:ring-[#433D8B]/40 active:scale-95"
              style={style}
            >
              <FontAwesomeIcon icon={faCamera as any} className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files, side);
                  e.target.value = "";
                }}
              />
            </label>
          ))}
        </div>
      </div>

      {/* 🟣 รายการรูป + Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="bg-violet-50 rounded-lg p-4 flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-violet-600" /> รายการอัปโหลด
          </h3>

          {items.length === 0 ? (
            <div className="text-sm text-black text-center">ยังไม่มีรูปความเสียหาย</div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto">
              <ul className="space-y-2">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-md text-sm transition cursor-pointer ${
                      selectedId === it.id
                        ? "bg-violet-600 text-white"
                        : "bg-white hover:bg-violet-100 text-zinc-700"
                    }`}
                    onClick={() => setSelectedId(it.id)}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="flex-1 truncate">{it.id.slice(0, 10)}...</span>
                    <select
                      value={it.side}
                      onChange={(e) => setSide(it.id, e.target.value as DamageSide)}
                      className="rounded-full bg-[#DEDCFF]/70 text-black text-xs px-2 py-1 mr-6"
                    >
                      {[
                        "ไม่ระบุ",
                        "หน้า",
                        "หลัง",
                        "ซ้าย",
                        "ขวา",
                        "หน้าซ้าย",
                        "หลังซ้าย",
                        "หน้าขวา",
                        "หลังขวา",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOne(it.id);
                      }}
                      className={`absolute top-1 right-1 rounded-[8px] transition ${
                        selectedId === it.id
                          ? "bg-[#FF4A4A] text-white hover:bg-[#e53e3e]"
                          : "bg-zinc-200 text-zinc-600 hover:bg-red-100 hover:text-red-600"
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="md:col-span-2 bg-zinc-50 rounded-lg p-4 shadow flex items-center justify-center">
          {selectedItem ? (
            <div className="flex flex-col space-y-3 w-full">
              <div className="flex justify-center">
                <img
                  src={selectedItem.previewUrl}
                  alt="preview"
                  className="max-h-[360px] rounded object-contain"
                />
              </div>
              <div>
                <p className="font-medium text-black text-sm mb-1">อธิบายภาพความเสียหาย</p>
                <textarea
                  value={selectedItem.note || ""}
                  onChange={(e) => updateNote(selectedItem.id, e.target.value)}
                  placeholder="เขียนอธิบายรายละเอียดของภาพ..."
                  className="w-full rounded px-3 py-2 text-sm resize-none bg-white text-black rounded-[8px]"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-center text-zinc-500">
              เลือกรายการจากด้านซ้ายเพื่อดูรายละเอียด
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
