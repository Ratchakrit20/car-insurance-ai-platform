"use client";

import type { Annotation } from "@/types/claim";
import { useMemo } from "react";
import { Noto_Sans_Thai } from "next/font/google";

const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function SummaryPanel({
  boxes,
  confValue,
  onChangeConf,
  preprocessEnabled,
  onTogglePreprocess,
}: {
  boxes: Annotation[];
  confValue: number; // ✅ ใช้ค่าความมั่นใจ (0.5 → 0.1)
  onChangeConf: (v: number) => void;
  preprocessEnabled: boolean;
  onTogglePreprocess: (v: boolean) => void;
}) {
  const donutData = useMemo(() => {
    const total = boxes.reduce((s, b) => s + b.areaPercent, 0) || 1;
    return boxes.map((b) => ({
      label: b.part,
      pct: Math.round((b.areaPercent / total) * 100),
      color: b.color,
    }));
  }, [boxes]);

  const donutStyle = useMemo(() => {
    let acc = 0;
    const stops = donutData.map((d) => {
      const from = acc;
      acc += d.pct;
      return `${d.color} ${from}% ${acc}%`;
    });
    return { background: `conic-gradient(${stops.join(", ")})` };
  }, [donutData]);

  return (
    <div className={`${thaiFont.className} rounded-[8px] bg-white ring-1 ring-zinc-200 shadow-sm p-4 space-y-6`}>
      
      {/* 🎚 ปรับระดับความมั่นใจของโมเดล */}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-zinc-700">
            ค่าความมั่นใจของโมเดล (Confidence)
          </div>
          <span className="text-sm font-semibold text-indigo-700 pl-1">
            {confValue.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={0.5}
          step={0.1}
          value={confValue}
          onChange={(e) => onChangeConf(parseFloat(e.target.value))}
          className="mt-2 w-full accent-indigo-600 cursor-pointer"
          list="tickmarks"
        />
        <datalist id="tickmarks">
          <option value="0.1" label="0.1" />
          <option value="0.2" label="0.2" />
          <option value="0.3" label="0.3" />
          <option value="0.4" label="0.4" />
          <option value="0.5" label="0.5" />
        </datalist>
        <p className="text-xs text-zinc-500 mt-1">
          ค่ายิ่งต่ำ → ตรวจละเอียดมากขึ้น (ใช้เวลามากขึ้น)
        </p>
      </div>

      {/* 🧠 ปุ่มเปิด/ปิด Preprocessing */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
        <div>
          <div className="text-sm font-medium text-zinc-700">การเตรียมภาพก่อนวิเคราะห์</div>
          <p className="text-xs text-zinc-500">
            ปรับขนาด 640×640, หมุนภาพอัตโนมัติ, ปรับคอนทราสต์ (Histogram Equalization)
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={preprocessEnabled}
            onChange={(e) => onTogglePreprocess(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
        </label>
      </div>

      {/* 🧩 Donut Chart */}
      <div className="mt-6">
        <div className="text-sm font-medium text-black mb-2">ภาพรวมความเสียหาย</div>
        <div className="flex flex-col items-center justify-center gap-4">
          <div
            className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full ring-1 ring-zinc-200"
            style={donutStyle}
          />

          <div className="w-full sm:w-[250px] space-y-2 text-center">
            <div className="text-sm text-zinc-600">
              พบความเสียหายทั้งหมด{" "}
              <span className="font-semibold text-zinc-900">{boxes.length}</span>{" "}
              จุด
            </div>

            <ul className="space-y-1">
              {donutData.map((d, i) => (
                <li key={i} className="flex items-center justify-between text-black text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="truncate">{d.label}</span>
                  </div>
                  <span className="font-medium">{d.pct}%</span>
                </li>
              ))}
              {donutData.length === 0 && (
                <li className="text-sm text-zinc-500">ยังไม่มีข้อมูล</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
