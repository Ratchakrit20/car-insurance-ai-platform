"use client";

import { useEffect, useState } from "react";
import type { Annotation } from "@/types/claim";

/* ===== ตัวเลือกภาษาไทยล้วน ===== */
const DAMAGE_THAI = ["ร้าว","บุบ","กระจกแตก","ไฟแตก","ขีดข่วน","ยางแบน"];
const PART_THAI = [
  "กันชนหลัง","ประตูหลัง","ล้อหลัง","หน้าต่างหลัง","กระจกบังลมหลัง",
  "บังโคลน/แก้มข้าง","กันชนหน้า","ประตูหน้า","ล้อหน้า","หน้าต่างหน้า",
  "กระจังหน้า","ไฟหน้า","ฝากระโปรงหน้า","ป้ายทะเบียน","กระจกมองข้าง",
  "แผงบังโคลนหลัง","คิ้ว/สเกิร์ตข้าง","หลังคา","ไฟท้าย","ฝากระโปรงหลัง","กระจกบังลมหน้า",
];
const OTHER_PART = "อื่น ๆ / ระบุเอง";

/* utils */
const addUnique = (list: string[], item: string) => {
  const k = item.trim();
  if (!k) return list;
  const exists = list.some((x) => x.trim().toLowerCase() === k.toLowerCase());
  return exists ? list : [...list, k];
};
const removeAt = (list: string[], i: number) => list.filter((_, idx) => idx !== i);
const normArr = (v: unknown) =>
  (Array.isArray(v) ? v : v ? [String(v)] : []).map((s) => s.trim()).filter(Boolean);

export default function DamageTable({
  boxes,
  onChange,
  onRemove,
  saveCurrentImage,
  onDone,
  canProceed,             // ✅ เพิ่มเข้ามา
}: {
  boxes: Annotation[];
  onChange: (b: Annotation) => void;
  onRemove: (id: number) => void;
  saveCurrentImage: (merged?: Annotation[]) => void;
  onDone: () => void;
  canProceed: boolean;    // ✅ เพิ่มเข้ามา
}) {
  const [openPickerId, setOpenPickerId] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState("");

  // ปิด popover เมื่อคลิกนอกแถว
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (openPickerId == null) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("[data-row-picker]") as HTMLElement | null;
      const idAttr = anchor?.getAttribute("data-row-picker") || null;
      if (idAttr === String(openPickerId)) return;
      setOpenPickerId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openPickerId]);
  // ✅ รวมกล่องที่มีชิ้นส่วนซ้ำกัน
  const mergedBoxes = Object.values(
    boxes.reduce((acc, b) => {
      const key = b.part?.trim() || `__id_${b.id}`; // ใช้ part เป็น key
      if (!acc[key]) {
        acc[key] = { ...b, damage: [...normArr(b.damage)] };
      } else {
        // รวมความเสียหาย (ไม่ซ้ำ)
        const combinedDamage = Array.from(
          new Set([...normArr(acc[key].damage), ...normArr(b.damage)])
        );
        acc[key] = { ...acc[key], damage: combinedDamage };
      }
      return acc;
    }, {} as Record<string, Annotation>)
  );


  return (
    <div className="mt-4 rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm p-4 sm:p-5 lg:p-6">
      {/* header (≥ md) */}
      <div className="mb-3 hidden md:grid grid-cols-12 items-center text-xs text-zinc-500">
        <div className="col-span-1 pl-1">สี</div>
        <div className="col-span-7 px-4">ชื่อชิ้นส่วน</div>
        <div className="col-span-2">ระดับ</div>
        <div className="col-span-2 text-right pr-1">ลบ</div>
      </div>

      <div className="space-y-3">
        {boxes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-zinc-500">
            ยังไม่มีจุดความเสียหาย
          </div>
        )}

        {mergedBoxes.map((b) => {
          const partTH = b.part ?? "";
          const isCustomPart = partTH !== "" && !PART_THAI.includes(partTH);
          const damages = Array.from(
            new Set(normArr((b as any).damage).map((x) => x.toLowerCase()))
          ).map((v) => v);

          const isOpen = openPickerId === b.id;
          const toggleDamage = (label: string) => {
            const key = label.toLowerCase();
            const idx = damages.findIndex((x) => x === key);
            const next = idx >= 0 ? removeAt(damages, idx) : addUnique(damages, label);
            onChange({ ...b, damage: next as any });
          };

          return (
            <div key={b.id} className="rounded-2xl ring-1 ring-zinc-200 bg-white p-3 sm:p-4">
              <div className="grid grid-cols-12 gap-x-3 gap-y-2 items-center">
                {/* สี */}
                <div className="col-span-12 md:col-span-1">
                  <span
                    className="inline-block h-4 w-4 rounded ring-1 ring-zinc-300"
                    style={{ backgroundColor: b.color }}
                  />
                </div>

                {/* ชิ้นส่วน */}
                <div className="col-span-12 md:col-span-7 min-w-0">
                  <select
                    className="h-10 w-full rounded-xl border-zinc-200 bg-white px-3 ring-1 ring-zinc-200 focus:outline-none"
                    value={PART_THAI.includes(partTH) ? partTH : ""}
                    onChange={(e) =>
                      onChange({ ...b, part: e.target.value === OTHER_PART ? "" : e.target.value })
                    }
                  >
                    <option value="" disabled>เลือกชิ้นส่วน…</option>
                    {PART_THAI.map((th) => <option key={th} value={th}>{th}</option>)}
                    <option value={OTHER_PART}>{OTHER_PART}</option>
                  </select>

                  {(isCustomPart || partTH === "") && (
                    <input
                      className="mt-2 h-10 w-full rounded-xl border-zinc-200 bg-white px-3 ring-1 ring-zinc-200 focus:outline-none"
                      placeholder="ระบุชิ้นส่วน"
                      value={b.part ?? ""}
                      onChange={(e) => onChange({ ...b, part: e.target.value })}
                    />
                  )}
                </div>

                {/* ระดับ (A/B/C เท่านั้น ให้ตรงกับ DB) */}
                <div className="col-span-6 md:col-span-2">
                  <select
                    className="h-10 w-full rounded-xl bg-white px-3 ring-1 ring-zinc-200"
                    value={b.severity}
                    onChange={(e) => onChange({ ...b, severity: e.target.value as any })}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                {/* ลบ */}
                <div className="col-span-6 md:col-span-2 flex justify-end">
                  <button
                    className="h-10 rounded-xl bg-rose-50 px-3 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                    onClick={() => onRemove(b.id)}
                  >
                    ลบ
                  </button>
                </div>

                {/* ความเสียหาย */}
                <div
                  className="col-span-12 md:col-start-2 md:col-span-10"
                  data-row-picker={isOpen ? String(b.id) : undefined}
                >
                  <div className="text-xs text-zinc-500 mb-1 md:hidden">ความเสียหาย</div>

                  {/* chips */}
                  <div className="flex flex-wrap gap-2 min-h-[2.25rem]">
                    {damages.length === 0 && (
                      <span className="text-zinc-400">ยังไม่ได้เลือกความเสียหาย</span>
                    )}
                    {damages.map((d, i) => (
                      <span
                        key={`${b.id}-d-${i}-${d}`}
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1"
                      >
                        <span className="text-zinc-700">{d}</span>
                        <button
                          type="button"
                          className="rounded-full bg-white px-2 py-0.5 text-zinc-600 ring-1 ring-zinc-200 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => onChange({ ...b, damage: removeAt(damages, i) as any })}
                          title="ลบ"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* เพิ่มความเสียหาย */}
                  <div className="relative mt-2">
                    <button
                      type="button"
                      onClick={() => { setOpenPickerId(isOpen ? null : b.id); setCustomInput(""); }}
                      className="h-10 rounded-xl bg-white px-4 text-sm text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
                    >
                      เพิ่มความเสียหาย
                    </button>

                    {isOpen && (
                      <div className="absolute left-0 top-full z-30 mt-2 w-full md:w-[min(720px,100%)] max-w-full rounded-xl border border-zinc-200 bg-white shadow-lg">
                        <div className="p-3 border-b border-zinc-100">
                          <div className="text-sm font-medium text-zinc-700 mb-2">
                            เลือก/เพิ่มความเสียหาย
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={customInput}
                              onChange={(e) => setCustomInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = customInput.trim(); if (!v) return;
                                  toggleDamage(v); setCustomInput("");
                                }
                              }}
                              placeholder="พิมพ์เพื่อเพิ่มใหม่ (Enter)"
                              className="h-10 flex-1 rounded-lg border-zinc-200 bg-white px-3 ring-1 ring-zinc-200 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => { const v = customInput.trim(); if (!v) return; toggleDamage(v); setCustomInput(""); }}
                              className="h-10 rounded-lg bg-white px-3 text-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
                            >
                              เพิ่มใหม่
                            </button>
                          </div>
                        </div>

                        <div className="max-h-64 overflow-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {DAMAGE_THAI.map((item) => {
                            const active = damages.includes(item.toLowerCase());
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleDamage(item)}
                                className={
                                  "flex items-center justify-between rounded-lg px-3 py-2 text-left ring-1 " +
                                  (active
                                    ? "bg-indigo-50 ring-indigo-200 text-indigo-700"
                                    : "bg-white ring-zinc-200 hover:bg-zinc-50")
                                }
                              >
                                <span className="text-sm">{item}</span>
                                {active && <span className="text-xs">✓</span>}
                              </button>
                            );
                          })}
                        </div>

                        <div className="p-2 border-t border-zinc-100 flex justify-end">
                          <button
                            className="h-9 rounded-lg bg-white px-3 text-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
                            onClick={() => setOpenPickerId(null)}
                          >
                            ปิด
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* footer */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-zinc-500">
          กด “บันทึก” เพื่อเก็บการแก้ไข
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <button
            className="h-10 rounded-full bg-white px-4 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
            onClick={() => saveCurrentImage(mergedBoxes)}
          >
            บันทึก
          </button>
          <button
            disabled={!canProceed}
            title={!canProceed ? "กรุณาบันทึกความเสียหายให้ครบทุกภาพก่อน" : ""}
            className={
              "h-10 rounded-full px-4 text-sm font-medium " +
              (canProceed
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-zinc-200 text-zinc-500 cursor-not-allowed")
            }
            onClick={() => { if (canProceed) onDone(); }}
            aria-disabled={!canProceed}
          >
            ดำเนินการต่อ
          </button>
        </div>
      </div>
    </div>
  );
}
