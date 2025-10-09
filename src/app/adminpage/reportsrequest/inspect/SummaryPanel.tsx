"use client";

import type { Annotation } from "@/types/claim";
import { useMemo } from "react";

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
      <div className="rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm p-4">
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
          <div className="text-sm font-medium text-zinc-700 mb-2">ภาพรวมความเสียหาย</div>
          <div className="flex items-center gap-5">
            <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full ring-1 ring-zinc-200" style={donutStyle} />
            <div className="flex-1 space-y-2">
              <div className="text-sm text-zinc-600">
                พบความเสียหายทั้งหมด{" "}
                <span className="font-semibold text-zinc-900">{boxes.length}</span>{" "}
                จุด
              </div>
              <ul className="space-y-1">
                {donutData.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: d.color }} />
                    <span className="truncate">{d.label}</span>
                    <span className="ml-auto font-medium">{d.pct}%</span>
                  </li>
                ))}
                {donutData.length === 0 && (
                  <li className="text-sm sm:text-sm text-zinc-500">ยังไม่มีข้อมูล</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
        หากระบบตรวจจับไม่ครบ สามารถปรับระดับการวิเคราะห์ หรือกด “เพิ่มจุดเสียหาย” บนภาพ
      </div>
    </>
  );
}
