// src/app/reportsrequest/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminClaimReportPreview from "../reportsrequest/AdminClaimReportPreview";
import LoadingScreen from "@/app/components/LoadingScreen";
import { CalendarDays, CarFront, Wrench } from "lucide-react";
import type {
  ClaimItem,
  ClaimReportRow,
  ClaimStatus,
  Car,
  AccidentDraft,
  User,
  DamagePhoto,
} from "@/types/claim";
import { Noto_Sans_Thai } from "next/font/google";
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

import PdfRequest from "@/app/reports/PdfRequest";
import { it } from "node:test";

// ---------- Config ----------
const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");

// ---------- Types ----------
type ApiAuth = { user: User | null; isAuthenticated: boolean };
type PdfDetail = {
  claim_id: number | string;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;

  policy_number?: string;
  insurer_name?: string;
  coverage_start?: string;
  coverage_end?: string;
};

// ---------- Helpers ----------
const thDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// map/normalize สถานะจาก backend -> ไทยที่ใช้ใน UI
function normalizeStatus(s?: string | null): ClaimStatus {
  const x = (s || "").toLowerCase();
  if (["pending", "ตรวจสอบ", "review"].includes(x)) return "กำลังตรวจสอบ";
  if (["approved", "success", "done"].includes(x)) return "สำเร็จ";
  if (["rejected", "deny"].includes(x)) return "เอกสารไม่ผ่านการตรวจสอบ";
  if (["incomplete", "need_correction"].includes(x)) return "เอกสารต้องแก้ไขเพิ่มเติม";
  return "กำลังตรวจสอบ";
}


// ---------- API ----------
async function fetchAuth(): Promise<ApiAuth> {
  const token = localStorage.getItem("token");
  if (!token) return { isAuthenticated: false, user: null };
  const res = await fetch(`${URL_PREFIX}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function fetchClaimsByUser(userId: number): Promise<ClaimItem[]> {
  const url = `${URL_PREFIX}/api/claim-requests/listall`;
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
  const json = await res.json();
  const rows: ClaimReportRow[] = json?.data ?? [];

  return rows.map((r) => {
    const status = normalizeStatus(r.status);
    console.log("r.images =", r.images);
    // map evaluation_images → DamagePhoto[]
    const damagePhotos: DamagePhoto[] = Array.isArray(r.images)
      ? r.images.map((img) => {
        const side: DamagePhoto["side"] =
          img.side === "ซ้าย" ||
            img.side === "ขวา" ||
            img.side === "หน้า" ||
            img.side === "หลัง"
            ? img.side
            : "ไม่ระบุ";

        return {
          id: img.id,
          url: img.original_url ?? "",
          type: "image",
          side,
          note: img.damage_note ?? undefined,
        };
      })
      : [];
    return {
      id: String(r.claim_id ?? r.report_id ?? r.accident_detail_id),
      carTitle: r.car_title ?? `${r.car_brand ?? "รถ"} ${r.car_model ?? ""} ทะเบียน ${r.license_plate ?? "-"}`,
      incidentDate: r.accident_date ?? r.created_at ?? new Date().toISOString(),
      incidentType: r.accident_type ?? undefined,
      damageAreas: r.damage_areas ?? undefined,
      severitySummary: r.severity_summary ?? undefined,
      status,
      steps: r.steps ?? [],   // <-- เก็บ timeline
      photoUrl: r.thumbnail_url ?? r.first_image_url ?? (Array.isArray(r.images) ? r.images[0]?.original_url : undefined),
      car_path: r.car_path,
      damagePhotos: damagePhotos,
    } as ClaimItem;
  });
}

async function fetchClaimDetail(claimId: string | number): Promise<PdfDetail> {
  const url = `${URL_PREFIX}/api/claim-requests/admin/detail?claim_id=${encodeURIComponent(String(claimId))}`;
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");
  return json.data;
}



// ---------- Small UI pieces ----------
function StatusChip({ status }: { status: ClaimStatus }) {
  const map: Record<ClaimStatus, string> = {
    กำลังตรวจสอบ: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    เอกสารต้องแก้ไขเพิ่มเติม: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-300",
    สำเร็จ: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    เอกสารไม่ผ่านการตรวจสอบ: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",


  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[status] || "bg-zinc-100 text-zinc-600"
        }`}
    >
      {status}
    </span>
  );
}
function formatDateTime(dateStr?: string, timeStr?: string) {
  if (!dateStr) return "ไม่ระบุ";
  try {
    // แปลงเป็น Date แล้วปรับ timezone ให้เป็นเวลาท้องถิ่นไทย
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // ถ้ามีเวลา ให้แสดงด้วย
    if (timeStr) {
      // ตัดเฉพาะ HH:mm
      const formattedTime = timeStr.slice(0, 5);
      return `${formattedDate} เวลา ${formattedTime} น.`;
    }

    return formattedDate;
  } catch {
    return dateStr; // fallback
  }
}
function RequestCard({
  item,
  onOpenPdf,
}: {
  item: ClaimItem;
  onOpenPdf: (id: string) => void;
}) {
  return (
    <div className={`${thaiFont.className} group relative overflow-hidden rounded-[8px] border  bg-white shadow-sm hover:shadow-md hover:border-[#6F47E4] transition-all duration-200`}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="truncate text-lg font-semibold text-black">
          {item.carTitle}
        </h3>
        <StatusChip status={item.status} />
      </div>

      {/* Divider */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#DEDCFF] to-transparent mb-3" />


      <div className="flex gap-5 px-5 pb-5 group bg-white rounded-2xl shadow-md hover:shadow-lg border border-[#DEDCFF]/60 transition-all duration-300">
        {/* 🔹 รูปรถ */}
        <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-xl bg-[#F9F8FF] ring-1 ring-[#DEDCFF]">
          {item.car_path ? (
            <img
              src={
                item.car_path?.startsWith("http")
                  ? item.car_path
                  : `/${item.car_path}`
              }
              alt={item.carTitle}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400 text-sm">
              ไม่มีรูป
            </div>
          )}
        </div>

        {/* 🔹 รายละเอียด */}
        <div className="flex-1 space-y-3 text-sm text-zinc-700">
          {/* วันที่แจ้งเคลม */}
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#6F47E4]" />
            <span className="text-zinc-500">วันที่แจ้งเคลม:</span>
            <span className="font-medium text-zinc-800">
              {formatDateTime(item.incidentDate)}
            </span>
          </div>

          {/* ประเภทอุบัติเหตุ */}
          <div className="flex items-center gap-2">
            <CarFront className="w-4 h-4 text-[#6F47E4]" />
            <span className="text-zinc-500">ประเภทอุบัติเหตุ:</span>
            <span className="font-medium text-zinc-800">
              {item.incidentType ?? "-"}
            </span>
          </div>

          {/* ความเสียหาย */}
          <div className="flex items-start gap-2">
            <Wrench className="w-4 h-4 text-[#6F47E4] mt-[2px]" />
            <div>
              <span className="text-zinc-500">ความเสียหาย:</span>{" "}
              <span className="font-medium text-zinc-800">
                {item.damagePhotos && item.damagePhotos.length > 0
                  ? item.damagePhotos
                    .map((d) => d.note?.trim())
                    .filter((n) => n && n.length > 0)
                    .join(", ") || "ไม่ระบุ"
                  : "ไม่ระบุ"}
              </span>
            </div>
          </div>

          {/* เส้นคั่น */}
          <div className="my-2 h-[1px] bg-gradient-to-r from-transparent via-[#DEDCFF] to-transparent" />

          {/* ปุ่ม */}
          <div className="flex justify-end">
            <Link
              href={`/adminpage/reportsrequest/accidentcheck?claim_id=${item.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#6F47E4]  px-5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:from-[#5B3ACB] hover:to-[#3A2FE0] active:scale-[0.98] transition-all duration-200"
            >
              ตรวจสอบความเสียหาย
            </Link>
          </div>
        </div>
      </div>


      {/* Timeline (ถ้ามี) */}
      {Array.isArray(item.steps) && item.steps.length > 0 && (
        <div className="px-6 pb-4 border-t border-zinc-100 bg-zinc-50/50">
          <div className="text-xs font-medium text-zinc-500 mb-1">📍 ขั้นตอนล่าสุด:</div>
          <ul className="space-y-1 text-xs text-zinc-600">
            {item.steps.slice(0, 3).map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-zinc-400">•</span>
                <span>
                  {thDate(s.created_at)} • {normalizeStatus(s.step_type)}{" "}
                  {s.note ? `(${s.note})` : ""}
                </span>
              </li>
            ))}
            {item.steps.length > 3 && (
              <li className="text-zinc-400 italic">...ดูเพิ่มเติมในหน้าเคลม</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}


// ---------- Page ----------
export default function ReportsRequestPage() {
  const router = useRouter();

  // auth
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // data
  const [allClaims, setAllClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // pdf modal
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDetail, setPdfDetail] = useState<PdfDetail | null>(null);

  // โหลดสิทธิ์
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAuth();
        if (cancelled) return;
        setUser(data.user ?? null);
        setIsAuthenticated(Boolean(data.isAuthenticated));
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  // โหลดรายการทั้งหมด → ค่อยกรองใน memo
  useEffect(() => {
    if (isAuthenticated !== true || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchClaimsByUser(Number(user.id));
        if (!cancelled) setAllClaims(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Load error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // กรองเฉพาะ "กำลังตรวจสอบ"
  // กรองเฉพาะเคลมที่กำลังตรวจสอบ (ค่าไทยอยู่แล้ว)
  const pendingClaims = useMemo(
    () => allClaims.filter((c) => c.status === "กำลังตรวจสอบ"),
    [allClaims]
  );

  // เปิด PDF
  const handleOpenPdf = async (claimId: string) => {
    try {
      setPdfLoading(true);
      const detail = await fetchClaimDetail(claimId);
      setPdfDetail(detail);
      setPdfOpen(true);
    } catch (e: any) {
      alert(e?.message ?? "โหลดเอกสารไม่สำเร็จ");
    } finally {
      setPdfLoading(false);
    }
  };

  // -------- states --------
  if (isAuthenticated === null) {
    return (
      <LoadingScreen message="กำลังตรวจสอบสิทธิ์ผู้ใช้..." />

    );
  }
  if (isAuthenticated === false) return null;

  if (loading) {
    return (

      <div className="min-h-screen bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
          <Header count={0} />
          <SkeletonList />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-rose-500">
        เกิดข้อผิดพลาด: {error}
      </div>
    );
  }

  // -------- render --------
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 lg:py-8">
        <Header count={pendingClaims.length} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
          {pendingClaims.length === 0 ? (
            <EmptyState />
          ) : (
            pendingClaims.map((item) => (
              <RequestCard key={item.id} item={item} onOpenPdf={handleOpenPdf} />
            ))
          )}
        </div>
      </div>

      {/* Modal PDF */}
      {pdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[8px] bg-white shadow-2xl ring-1 ring-black/5">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-zinc-200/70 bg-white/90 px-4 py-3 backdrop-blur">
              <div className="text-sm font-medium text-zinc-700">เอกสารรายงานเคลม</div>
              <button
                onClick={() => setPdfOpen(false)}
                className="rounded-lg bg-zinc-900/5 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-900/10"
              >
                ปิด
              </button>
            </div>
            <div className="px-4 pb-6 pt-2">
              {pdfLoading || !pdfDetail ? (
                <div className="p-6 text-zinc-600">กำลังเตรียมเอกสาร…</div>
              ) : (

                <AdminClaimReportPreview car={pdfDetail.car} draft={pdfDetail.accident} />

              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Sub-components ----------
function Header({ count }: { count: number }) {
  return (
    <>
      <header className="mb-4 lg:mb-6">

        <div className={`${thaiFont.className} flex flex-wrap items-center justify-between gap-3`}>

          <div className="flex items-start gap-3">

            <div>
              <h1 className="text-xl font-semibold tracking-wide text-zinc-900 sm:text-2xl">
                เคลมที่กำลังตรวจสอบ
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                ดูรายการที่อยู่ระหว่างการตรวจสอบแบบเรียลไทม์ พร้อมเปิดเอกสาร PDF ได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 shadow-sm">
              ทั้งหมด {count} รายการ
            </span>
          </div>
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
      </header>
    </>
  );
}

function SkeletonList() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-3xl border border-zinc-200 bg-white/60 p-4"
        >
          <div className="flex gap-4">
            <div className="h-28 w-40 rounded-xl bg-zinc-200" />
            <div className="flex-1">
              <div className="h-5 w-2/3 rounded bg-zinc-200" />
              <div className="mt-2 h-4 w-1/2 rounded bg-zinc-200" />
              <div className="mt-2 h-4 w-1/3 rounded bg-zinc-200" />
              <div className="mt-4 h-8 w-40 rounded-full bg-zinc-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full">
      <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
        ยังไม่มีรายการที่กำลังตรวจสอบ
      </div>
    </div>
  );
}
