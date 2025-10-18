"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { Image as ImageIcon, UploadCloud, X } from "lucide-react";

/** ---------- Types ---------- */
export type DamageSide = "ซ้าย" | "ขวา" | "หน้า" | "หลัง" | "ไม่ระบุ";

export type DamagePhotoItem = {
  id: string;
  file: File | null; // อาจไม่มีไฟล์จริง (รูปจาก URL)
  previewUrl: string; // blob:... หรือ https://...
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
  maxTotalMB?: number; // default 100
};

/** ---------- Component ---------- */
export default function DamagePhotosPanel({
  apiBaseUrl,
  value,
  onChange,
  maxTotalMB = 100,
}: Props) {
  const [items, setItems] = useState<DamagePhotoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // sync parent -> local (เฉพาะตอน value เปลี่ยนจริง ๆ)
  useEffect(() => {
    if (!value) return;

    // ทำ deep compare แค่ id
    const same =
      value.length === items.length &&
      value.every((v, i) => v.id === items[i]?.id);

    if (!same) {
      setItems(value);
      if (!selectedId && value.length > 0) {
        setSelectedId(value[0].id);
      }
    }
  }, [value]); // ✅ เอา selectedId ออก

  // emit local -> parent
  useEffect(() => {
    if (onChange) {
      onChange(items);
    }
  }, [items, onChange]);

  // อัปเดตภายใน (มาจากการกระทำของผู้ใช้) และ emit ไป parent
  const mutate = (fn: (prev: DamagePhotoItem[]) => DamagePhotoItem[]) => {
    setItems((prev) => {
      const next = fn(prev);
      // นี่คือการเปลี่ยนจากผู้ใช้ ไม่ใช่ sync จาก parent
      // ปล่อยให้ useEffect([items]) เป็นคน emit (ไม่ตั้ง flag)
      return next;
    });
  };

  /** เพิ่มรูปจากไฟล์ (image/*) */
  const addFiles = (files: FileList | null, side: DamageSide = "ไม่ระบุ") => {
    if (!files) return;

    const newOnes: DamagePhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        // ✅ random id ใหม่ทุกครั้ง เพื่อ force re-render
        id: `${crypto.randomUUID()}_${Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        side,
        detecting: false,
      }));

    mutate((prev) => [...prev, ...newOnes]);
    // 🟣 ✅ เพิ่มตรงนี้ เพื่อเลือกภาพล่าสุดอัตโนมัติ
    setSelectedId(newOnes[newOnes.length - 1].id);
  };
  /** ลบรูป + revoke เฉพาะ blob: */
  const removeOne = (id: string) => {
    mutate((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it && it.previewUrl.startsWith("blob:")) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  /** ตั้งค่าด้านของรถ */
  const setSide = (id: string, side: DamageSide) =>
    mutate((prev) => prev.map((x) => (x.id === id ? { ...x, side } : x)));


  const updateNote = (id: string, note: string) =>
    mutate((prev) => prev.map((x) => (x.id === id ? { ...x, note } : x)));

  const selectedItem = items.find((x) => x.id === selectedId);
  // 🟣 cleanup blob URL เวลา component ถูก unmount
  useEffect(() => {
    return () => {
      items.forEach((it) => {
        if (it.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(it.previewUrl);
        }
      });
    };
  }, []);

  return (
    <div className="rounded-[7px] p-4 bg-white">
    
     {/* 🟣 ปุ่มอัปโหลด 8 ด้าน (หน้า/หลัง/ซ้าย/ขว + มุมเฉียง) */}
<div className="flex justify-center my-6">
  <div className="relative w-[300px] m-8">
    <img src="/elements/car-top-view.png" alt="car" className="w-full" />

    {/* หน้า / หลัง */}
    {(["หน้า", "หลัง"] as DamageSide[]).map((side) => (
      <label
        key={side}
        className="group absolute w-10 h-10 flex items-center justify-center rounded-full 
          bg-[#433D8B] border-[6px] border-[#D9D4F3] shadow-lg cursor-pointer 
          hover:bg-[#433D8B]/80 transition-all duration-300 
          hover:scale-110 hover:ring-4 hover:ring-[#433D8B]/40 active:scale-95"
        style={
          side === "หน้า"
            ? { top: "-2.5rem", left: "50%", transform: "translateX(-50%)" }
            : { bottom: "-2.5rem", left: "50%", transform: "translateX(-50%)" }
        }
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

    {/* ซ้ายเฉียงบน / กลาง / ล่าง */}
    {[
      { top: "10%", left: "-1rem" },
      { top: "50%", left: "-1.5rem", transform: "translateY(-50%)" },
      { bottom: "10%", left: "-1rem" },
    ].map((style, i) => (
      <label
        key={`left-${i}`}
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
            addFiles(e.target.files, "ซ้าย");
            e.target.value = "";
          }}
        />
      </label>
    ))}

    {/* ขวาเฉียงบน / กลาง / ล่าง */}
    {[
      { top: "10%", right: "-1rem" },
      { top: "50%", right: "-1.5rem", transform: "translateY(-50%)" },
      { bottom: "10%", right: "-1rem" },
    ].map((style, i) => (
      <label
        key={`right-${i}`}
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
            addFiles(e.target.files, "ขวา");
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
            <div className="text-sm text-black text-center">
              ยังไม่มีรูปความเสียหาย
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto">
              <ul className="space-y-2">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-md text-sm transition cursor-pointer ${selectedId === it.id
                        ? "bg-violet-600 text-white"
                        : "bg-white hover:bg-violet-100 text-zinc-700"
                      }`}
                    onClick={() => setSelectedId(it.id)}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="flex-1 truncate">{it.id.slice(0, 10)}...</span>

                    {/* Dropdown เลือกด้าน */}
                    <select
                      value={it.side}
                      onChange={(e) =>
                        setSide(it.id, e.target.value as DamageSide)
                      }
                      className="rounded-full bg-[#DEDCFF]/70 text-black text-xs px-2 py-1 mr-6"
                    >
                      <option value="ไม่ระบุ">ไม่ระบุ</option>
                      <option value="ซ้าย">ด้านซ้าย</option>
                      <option value="ขวา">ด้านขวา</option>
                      <option value="หน้า">ด้านหน้า</option>
                      <option value="หลัง">ด้านหลัง</option>
                    </select>

                    {/* ปุ่มลบ */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOne(it.id);
                      }}
                      className={`absolute top-1 right-1 rounded-[8px] transition ${selectedId === it.id
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
                <p className="font-medium text-black text-sm mb-1">
                  อธิบายภาพความเสียหาย
                </p>
                <textarea
                  value={selectedItem.note || ""}
                  onChange={(e) =>
                    updateNote(selectedItem.id, e.target.value)
                  }
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
