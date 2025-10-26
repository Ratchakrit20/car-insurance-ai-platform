"use client";

import type { Annotation } from "@/types/claim";
import { useMemo } from "react";
import { Prompt, Noto_Sans_Thai, Inter } from 'next/font/google';
const headingFont = Prompt({ subsets: ['thai', 'latin'], weight: ['600', '700'], display: 'swap' });
const bodyFont = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], display: 'swap' });
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
export default function SummaryPanel({
  boxes,
  analysisLevel,
  onChangeLevel,
}: {
  boxes: Annotation[];
  analysisLevel: number;
  onChangeLevel: (v: number) => void;
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
    <>
        <div className={`${thaiFont.className} rounded-[8px] bg-white ring-1 ring-zinc-200 shadow-sm p-4`}>

      
        {/* <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-zinc-700">ระดับความละเอียดของการวิเคราะห์</div>
          <span className="text-sm font-semibold text-indigo-700 pl-1">{analysisLevel}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={analysisLevel}
          onChange={(e) => onChangeLevel(Number(e.target.value))}
          className="mt-3 w-full accent-indigo-600"
        /> */}

       <div className="mt-6">
  <div className="text-sm font-medium text-black mb-2">ภาพรวมความเสียหาย</div>

  <div className="flex flex-col items-center justify-center gap-4">
    {/* วงกลม donut chart */}
    <div
      className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full ring-1 ring-zinc-200"
      style={donutStyle}
    />

    {/* ข้อมูลสรุป donutData */}
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
              <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: d.color }} />
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

    </>
  );
}
