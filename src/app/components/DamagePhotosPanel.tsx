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

  const [hoverSide, setHoverSide] = useState<DamageSide | null>(null);
  const [previewSide, setPreviewSide] = useState<DamageSide | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  // ตรวจว่าปัจจุบันเป็น mobile/tablet หรือไม่
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

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

  // 
  // 🖼 รวมรูปแต่ละด้านเป็น array
  const sidePreviewMap: Record<DamageSide, string[]> = {
    "หน้า": ["/eximage/S__19070992.jpg"],
    "หลัง": ["/eximage/S__19070986.jpg"],
    "ซ้าย": [
      "/eximage/S__19070983.jpg",
      "/eximage/S__19070998.jpg",
      "/eximage/S__19070999.jpg",
    ],
    "ขวา": [
      "/eximage/S__19070988.jpg",
      "/eximage/S__19070989.jpg",
      "/eximage/S__19070990.jpg",
    ],
    "หน้าซ้าย": [
      "/eximage/S__19070995.jpg",
      "/eximage/S__19070996.jpg",
    ],
    "หลังซ้าย": [
      "/eximage/S__19070984.jpg",
      "/eximage/S__19070985.jpg",
    ],
    "หน้าขวา": [
      "/eximage/S__19070991.jpg",
      "/eximage/S__19070994.jpg",
    ],
    "หลังขวา": [
      "/eximage/S__19070987.jpg",
      "/eximage/S__19071000.jpg",
    ],
    "ไม่ระบุ": [],
  };
  // หมุนภาพอัตโนมัติทุก 2 วินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => prev + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, []);


  return (
    <div className="rounded-[7px] p-4 bg-white relative z-[4000] overflow-visible">
      {/* 🟣 Upload รอบรถ */}
      <div className="flex justify-center my-6 overflow-visible">
        <div className="relative w-[90%] sm:w-[280px] md:w-[300px] lg:w-[360px] mx-auto z-[4000] overflow-visible py-8 sm:pt-14 mb-12">
          <img
            src="/elements/car-top-view.png"
            alt="car"
            className="w-full max-w-[420px] mx-auto select-none pointer-events-none"
          />
          {uploadPositions.map(({ side, style }) => (
            <div
              key={side}
              className={`group absolute w-10 h-10 flex items-center justify-center rounded-full 
                  bg-[#433D8B] border-[6px] border-[#D9D4F3] shadow-lg cursor-pointer 
                  hover:bg-[#433D8B]/80 transition-all duration-300 
                  hover:scale-110 hover:ring-4 hover:ring-[#433D8B]/40 active:scale-95
                  ${side === "หลัง" || side === "หน้า" ? "z-[9999]" : "z-[100]"}`} // ✅ ยกปุ่มขึ้นเหนือ element อื่น
              style={style}
              onMouseEnter={() => !isMobile && setHoverSide(side)}
              onMouseLeave={() => !isMobile && setHoverSide(null)}
              onClick={() => {
                if (isMobile) {
                  setPreviewSide(side);
                  setShowPreviewModal(true);
                }
              }}
            >
              {/* ปุ่มอัปโหลด */}
              <label className="relative w-full h-full flex items-center justify-center cursor-pointer">
                <FontAwesomeIcon icon={faCamera as any} className="w-4 h-4 text-white pointer-events-none" />
                {/* ✅ เงื่อนไขเฉพาะ Desktop เท่านั้น */}
                {!isMobile && (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      addFiles(e.target.files, side);
                      e.target.value = "";
                    }}
                  />
                )}
              </label>
              {/* Hover Preview (Desktop Only) */}
              {!isMobile && hoverSide === side && (
                <div
                  className={`absolute z-[99999] w-[280px] p-2 
                        bg-white border rounded-xl shadow-2xl pointer-events-none
                        ${side === "หน้า"
                      ? "left-1/2 -translate-x-1/2 bottom-[-14rem]" // หน้า → ตรงกลาง ล่าง
                      : side === "หน้าซ้าย" || side === "ซ้าย" || side === "หลังซ้าย"
                        ? "left-[-12rem] -top-[14rem]" // ซ้ายทั้งหมด → เยื้องซ้าย
                        : side === "หน้าขวา" || side === "ขวา" || side === "หลังขวา"
                          ? "-top-[14rem]" // ✅ ใช้ inline style เยื้องขวาแทน
                          : "-top-[14rem] left-1/2 -translate-x-1/2"
                    }`}
                  style={{
                    ...(side === "หน้าขวา" || side === "ขวา" || side === "หลังขวา"
                      ? { right: "-12rem" }
                      : {}),
                    boxShadow: "0 10px 28px rgba(0,0,0,0.25)",
                  }}
                >
                  {sidePreviewMap[side] && sidePreviewMap[side].length > 0 ? (
                    <img
                      src={sidePreviewMap[side][slideIndex % sidePreviewMap[side].length]}
                      alt={`${side} preview`}
                      className="rounded-lg w-full h-[160px] md:h-[180px] object-cover transition-all duration-700"
                    />
                  ) : (
                    <p className="text-xs text-zinc-500 text-center">ยังไม่มีรูปฝั่ง {side}</p>
                  )}
                </div>
              )}
            </div>
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
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-md text-sm transition cursor-pointer ${selectedId === it.id
                        ? "bg-[#6F47E4] text-white"
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
    <div className="flex flex-col items-center justify-center">
                <p
                  className="text-sm text-white m-3 truncate max-w-[80%] px-3 py-1 bg-[#6F47E4] rounded-full"
                  title={selectedItem.file?.name || "ไม่ทราบชื่อไฟล์"}
                >
                  {selectedItem.file?.name || "ไม่ทราบชื่อไฟล์"}
                </p>
                <img
                  src={selectedItem.previewUrl}
                  alt="preview"
                  className="max-h-[360px] rounded object-contain border-3 border-[#6F47E4]"
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
      {showPreviewModal && previewSide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-4 max-w-sm w-[90%] text-center relative">
            <h4 className="text-sm font-semibold mb-3 text-violet-700">
              รูปตัวอย่างด้าน {previewSide}
            </h4>

            {sidePreviewMap[previewSide] && sidePreviewMap[previewSide].length > 0 ? (
              <img
                src={
                  sidePreviewMap[previewSide][
                  slideIndex % sidePreviewMap[previewSide].length
                  ]
                }
                alt={`${previewSide} preview`}
                className="rounded w-full object-cover transition-all duration-700"
              />
            ) : (
              <p className="text-xs text-zinc-500">ยังไม่มีรูปด้านนี้</p>
            )}

            {/* ✅ ปุ่มอัปโหลดในป็อปอัพ */}
            <div className="mt-4 flex justify-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 text-white cursor-pointer hover:bg-violet-700 transition">
                <FontAwesomeIcon icon={faCamera as any} />
                อัปโหลดรูป
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files, previewSide);
                    e.target.value = "";
                    setShowPreviewModal(false);
                  }}
                />
              </label>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-full bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
