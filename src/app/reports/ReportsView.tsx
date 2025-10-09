"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ClaimItem } from "@/types/claim";
import { Search, ChevronDown, ArrowLeft } from "lucide-react";
import ReportDetail from "./ReportDetail";

const cx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

function thDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ReportsView({
  claims,
  onOpenPdf,
}: {
  claims: ClaimItem[];
  onOpenPdf: (id: string) => void;
}) {
  // const defaultSelected =
  //   [...claims].sort(
  //     (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)
  //   )[0]?.id ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // useEffect(() => setSelectedId(defaultSelected), [defaultSelected]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ทั้งหมด" | "กำลังตรวจสอบ" | "สำเร็จ" | "ปฏิเสธ" | "ข้อมูลไม่ครบ"
  >("ทั้งหมด");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return claims.filter((c) => {
      const matchText =
        !q ||
        c.carTitle?.toLowerCase().includes(q) ||
        c.incidentType?.toLowerCase().includes(q) ||
        c.damageAreas?.toString().toLowerCase().includes(q) ||
        c.severitySummary?.toLowerCase().includes(q) ||
        thDateTime(c.incidentDate).includes(q);
      const matchStatus =
        statusFilter === "ทั้งหมด" || c.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [claims, query, statusFilter]);

  const selected = useMemo(
    () => claims.find((c) => c.id === selectedId) ?? null,
    [claims, selectedId]
  );

  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* --- Mobile Mode (stack, toggle list/detail) --- */}
      <div className="md:hidden">
        {!selected ? (
          // 📌 Mobile: List full screen
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหารายการเคลม"
                  className="w-full rounded-lg bg-white px-10 py-2 text-sm text-zinc-800 placeholder-zinc-400
                    ring-1 ring-zinc-200 focus:ring-2 focus:ring-violet-400 shadow-sm outline-none"
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow hover:bg-black/10"
                >
                  {statusFilter}
                  <ChevronDown size={16} />
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-44 rounded-lg bg-white shadow-lg ring-1 ring-black/10 z-10">
                    {(
                      ["ทั้งหมด", "กำลังตรวจสอบ", "สำเร็จ", "ปฏิเสธ", "ข้อมูลไม่ครบ"] as const
                    ).map((s) => (
                      <div
                        key={s}
                        onClick={() => {
                          setStatusFilter(s);
                          setOpen(false);
                        }}
                        className="cursor-pointer px-4 py-2 text-sm text-zinc-700 hover:bg-violet-100"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-3 flex-1 overflow-y-auto max-h-[calc(80dvh-9rem)] pb-[env(safe-area-inset-bottom)]">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className="flex items-center gap-3 rounded-lg bg-white px-3 py-3 shadow cursor-pointer hover:bg-violet-100"
                >
                  <div className="h-12 w-12 rounded-md overflow-hidden bg-zinc-200">
                    {item.car_path ? (
                      <img
                        src={item.car_path}
                        alt={item.carTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-zinc-500">ภาพ</span>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-semibold truncate text-black">
                      {item.car_brand} {item.car_model}
                    </p>
                    <span className="text-xs text-black">
                      {thDateTime(item.incidentDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        ) : (
          // 📌 Mobile: Detail overlay (เวอร์ชันชัวร์สุด)
          <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Header กลับ */}
            <div className="sticky top-0 bg-white border-b z-10">
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-2 px-4 py-3 text-sm text-violet-600 hover:underline"
              >
                <ArrowLeft size={16} /> กลับไปเลือกเคลม
              </button>
            </div>

            {/* เนื้อหา scroll ได้แน่นอน */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 touch-pan-y">
              <ReportDetail
                claim={selected}
                onOpenPdf={() =>
                  window.open(
                    `http://localhost:3001/api/claim-requests/detail?claim_id=${selected.id}`,
                    "_blank"
                  )

                }
              />
            </div>
          </div>
        )}
      </div>

      {/* --- Desktop Mode (2 panel side by side) --- */}
      <div className="hidden md:ml-24 md:grid gap-6 grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr] min-[1378px]:grid-cols-[300px_1fr] h-[calc(100vh-6rem)]">
        <div
          className="flex flex-col space-y-3 overflow-y-auto overscroll-contain"
          style={{ height: "calc(90dvh - 9rem)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className="flex items-center gap-3 rounded-lg bg-white px-3 py-3 shadow cursor-pointer hover:bg-violet-100"
            >
              <div className="h-12 w-12 rounded-md overflow-hidden bg-zinc-200">
                {item.car_path ? (
                  <img
                    src={item.car_path}
                    alt={item.carTitle}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-zinc-500">ภาพ</span>
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="font-semibold truncate text-black">
                  {item.car_brand} {item.car_model}
                </p>
                <span className="text-xs text-black">
                  {thDateTime(item.incidentDate)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <section className="overflow-y-auto pl-2">
          {selected ? (
            <ReportDetail
              claim={selected}
              onOpenPdf={() =>
                window.open(
                  `http://localhost:3001/api/claim-requests/detail?claim_id=${selected.id}`,
                  "_blank"
                )


              }
            />
          ) : (
            <div className="p-6 text-zinc-500">
              เลือกรายการจากด้านซ้ายเพื่อดูรายละเอียด
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
