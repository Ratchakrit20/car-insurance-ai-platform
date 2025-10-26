// src/app/reportsreviewed/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User, ClaimItem, ClaimReportRow, ClaimStatus, Car, AccidentDraft, DamagePhoto } from "@/types/claim";
import AccidentDetail from "@/app/adminpage/reportsall/accidentdetail";
import ClaimDocument from "@/app/components/ClaimDocument";
import LoadingScreen from "@/app/components/LoadingScreen";
import { CalendarDays, CarFront, Wrench } from "lucide-react";
// ---------- Config ----------
const URL_PREFIX = process.env.NEXT_PUBLIC_URL_PREFIX || "";
import { Noto_Sans_Thai } from "next/font/google";
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// ---------- Types ----------
type ApiAuth = { user: User | null; isAuthenticated: boolean };
type PdfDetail = {
  claim_id: number | string;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
};


// ---------- Helpers ----------
const thDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
};

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
  if (!res.ok) throw new Error("auth failed");
  return res.json();
}

async function fetchClaimsAll(): Promise<ClaimItem[]> {
  // ใช้ listall เดิม แล้ว normalize ฟิลด์ให้เป็น ClaimItem
  const token = localStorage.getItem("token");
  const res = await fetch(`${URL_PREFIX}/api/claim-requests/listall`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("โหลดรายการไม่สำเร็จ");
  const json = await res.json();
  const rows: ClaimReportRow[] = json?.data ?? [];

  return rows.map((r: any) => {
    const status = normalizeStatus(r.status);
    // map evaluation_images → DamagePhoto[]
    const damagePhotos: DamagePhoto[] = Array.isArray(r.images)
      ? r.images.map((img: { id: number; original_url?: string; damage_note?: string; side?: string }) => {
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
      carTitle:
        r.car_title ??
        `${r.car_brand ?? "รถ"} ${r.car_model ?? ""}  ทะเบียน ${r.license_plate ?? "-"}`,
      incidentDate: r.accident_date ?? r.created_at ?? new Date().toISOString(),
      incidentType: r.accident_type ?? undefined,
      damageAreas: r.damage_areas ?? undefined,
      severitySummary: r.severity_summary ?? undefined,
      status, // ไทย
      photoUrl:
        r.thumbnail_url ??
        r.first_image_url ??
        (Array.isArray(r.images) ? r.images[0]?.original_url : undefined),
      car_path: r.car_path,
      damagePhotos: damagePhotos,
    } as ClaimItem;
  });
}

async function fetchClaimDetail(claimId: string | number): Promise<PdfDetail> {
  const token = localStorage.getItem("token");
  const url = `${URL_PREFIX}/api/claim-requests/detail?claim_id=${encodeURIComponent(String(claimId))}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");
  return {
    claim_id: json.data.claim_id,
    status: json.data.status,
    created_at: json.data.created_at,
    car: json.data.car ?? null,
    accident: json.data.accident as AccidentDraft,
  };
}

function ClaimDocumentWrapper({ claimId }: { claimId: string }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/claim-requests/detail?claim_id=${claimId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (json.ok) {
          setDetail(json.data);
        }
      } catch (err) {
        console.error("โหลดรายละเอียดล้มเหลว", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [claimId]);

  if (loading) {
    return <div className="text-zinc-500 p-4 text-center">กำลังโหลด...</div>;
  }
  if (!detail) {
    return <div className="text-rose-500 p-4 text-center">ไม่พบข้อมูลรายละเอียด</div>;
  }

  return <ClaimDocument detail={detail} />;
}

// ---------- Small UI ----------
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

function ReviewedCard({
  item,
}: {
  item: ClaimItem;
}) {
  const isApproved = item.status === "สำเร็จ";
  const isRejected = item.status === "เอกสารไม่ผ่านการตรวจสอบ";
  const isIncomplete = item.status === "เอกสารต้องแก้ไขเพิ่มเติม";
  const [openId, setOpenId] = useState<string | null>(null);

  // สีกรอบตามสถานะ
  const borderColor = isApproved
    ? "border-emerald-300 bg-white"
    : isRejected
      ? "border-rose-300 bg-white"
      : "border-amber-300 bg-white";

  // สีปุ่มหลักตามสถานะ
  const mainButtonColor = isRejected
    ? "from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
    : isIncomplete
      ? "from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
      : "";

  return (
        <div className={`${thaiFont.className} group relative overflow-hidden rounded-[8px] border ${borderColor} shadow-sm hover:shadow-md transition-all duration-200`}>

   

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="truncate text-lg font-semibold text-emerald-800">
          {item.carTitle}
        </h3>
        <StatusChip status={item.status} />
      </div>

      {/* Divider */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#DEDCFF] to-transparent mb-3" />

      <div className="flex gap-5 px-5 pb-5 group bg-white rounded rounded-[8px] shadow-md hover:shadow-lg border border-[#DEDCFF]/60 transition-all duration-300">
        {/* 🔹 รูปภาพรถ */}
        <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-[8px] s bg-[#F9F8FF] ring-1 ring-[#DEDCFF]">
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

        {/* 🔹 ข้อมูลหลัก */}
        <div className="flex-1 space-y-3 text-sm text-zinc-700">
          {/* วันที่แจ้งเคลม */}
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-black" />
            <span className="text-zinc-500">วันที่แจ้งเคลม:</span>
            <span className="font-medium text-zinc-800">
              {thDate(item.incidentDate)}
            </span>
          </div>

          {/* ประเภทอุบัติเหตุ */}
          <div className="flex items-center gap-2">
             <CarFront className="w-4 h-4 text-black" />
            <span className="text-zinc-500">ประเภทอุบัติเหตุ:</span>
            <span className="font-medium text-zinc-800">
              {item.incidentType ?? "-"}
            </span>
          </div>

          {/* ความเสียหาย */}
          <div className="flex items-start gap-2">
            <Wrench className="w-4 h-4 text-black mt-[2px]" />
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
          <div className="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-[#DEDCFF] to-transparent" />

          {/* ปุ่มแอ็กชัน */}
          <div className="flex justify-end">
            {(isRejected || isIncomplete || isApproved) && (
              <button
                onClick={() => setOpenId(item.id)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all duration-200 ${isApproved
                    ? "bg-emerald-500 hover:bg-emerald-300"
                    : isRejected
                      ? "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
                      : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                  }`}
              >
                {isApproved ? " เปิดรายละเอียด" : "ดูรายงาน"}
              </button>
            )}
          </div>
        </div>
      </div>

      {openId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-[95vh] w-full max-w-[820px] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
            {/* header modal */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-zinc-200 bg-white/90 px-4 py-2 backdrop-blur">
              <div className="text-sm font-medium text-zinc-700">
                📄 รายงานรายละเอียดเคลม
              </div>
              <button
                onClick={() => setOpenId(null)}
                className="rounded-md bg-zinc-900/5 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-900/10"
              >
                ปิด
              </button>
            </div>

            {/* body modal */}
            <div className="p-4">
              {isApproved ? (
                <ClaimDocumentWrapper claimId={openId} />
              ) : (
                <AccidentDetail claimId={openId} onClose={() => setOpenId(null)} />
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}



// ---------- Page ----------
export default function ReportsReviewedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // const tab = (searchParams.get("tab") as "approved" | "rejected" | "incomplete" | null) ?? "approved";

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
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAuth();
        if (!data.isAuthenticated) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }
        setUser(data.user ?? null);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("token");
        router.replace("/login");
      }
    })();
  }, [router]);
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isAuthenticated !== true) return;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchClaimsAll();
        setAllClaims(list);
      } catch (e: any) {
        setError(e?.message ?? "Load error");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  // filter เฉพาะที่พิจารณาแล้ว → approved / rejected / incomplete
  const reviewedClaims = useMemo(
    () =>
      allClaims.filter(
        (c) => c.status === "สำเร็จ" || c.status === "เอกสารไม่ผ่านการตรวจสอบ" || c.status === "เอกสารต้องแก้ไขเพิ่มเติม"
      ),
    [allClaims]
  );

  const approvedClaims = useMemo(
    () => reviewedClaims.filter((c) => c.status === "สำเร็จ"),
    [reviewedClaims]
  );
  const rejectedClaims = useMemo(
    () => reviewedClaims.filter((c) => c.status === "เอกสารไม่ผ่านการตรวจสอบ"),
    [reviewedClaims]
  );
  const incompleteClaims = useMemo(
    () => reviewedClaims.filter((c) => c.status === "เอกสารต้องแก้ไขเพิ่มเติม"),
    [reviewedClaims]
  );

  const tab = (searchParams.get("tab") as "approved" | "rejected" | "incomplete" | null) ?? "approved";

  const visible =
    tab === "approved"
      ? approvedClaims
      : tab === "rejected"
        ? rejectedClaims
        : incompleteClaims;

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
    return <LoadingScreen message="กำลังตรวจสอบสิทธิ์ผู้ใช้..." />;
  }


  if (loading) return <PageSkeleton />;

  if (error) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-rose-500">เกิดข้อผิดพลาด: {error}</div>;
  }

  // -------- render --------
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 lg:py-8">
        <Header
          totals={{
            all: reviewedClaims.length,
            approved: approvedClaims.length,
            rejected: rejectedClaims.length,
            incomplete: incompleteClaims.length,
          }}
        />

        {/* Tabs */}
        <div className="mb-4 flex gap-2 text-black">
          <Link
            href="?tab=approved"
            className={`px-4 py-2 rounded-full text-sm font-medium ring-1 ring-zinc-200 ${tab === "approved" ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50"
              }`}
          >
            เฉพาะอนุมัติแล้ว
          </Link>
          <Link
            href="?tab=rejected"
            className={`px-4 py-2 rounded-full text-sm font-medium ring-1 ring-zinc-200 ${tab === "rejected" ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50"
              }`}
          >
            เฉพาะถูกปฏิเสธ
          </Link>
          <Link
            href="?tab=incomplete"
            className={`px-4 py-2 rounded-full text-sm font-medium ring-1 ring-zinc-200 ${tab === "incomplete" ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50"
              }`}
          >
            เฉพาะข้อมูลไม่ครบ
          </Link>
        </div>


        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
          {visible.length === 0 ? (
            <EmptyState label={tab === "approved" ? "ยังไม่มีรายการที่อนุมัติ" : "ยังไม่มีรายการที่ถูกปฏิเสธ"} />
          ) : (
            visible.map((item) => (
              <ReviewedCard key={item.id} item={item} />
            ))
          )}
        </div>
      </div>

      {/* Modal PDF */}
      {/* {pdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
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
                <AccidentDetail detail={pdfDetail} />
              )}
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}

// ---------- Sub-components ----------
function Header({ totals }: { totals: { all: number; approved: number; rejected: number; incomplete: number } }) {
  return (
    <>
        <header className={`${thaiFont.className} mb-4 lg:mb-6`}>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">

            <div>
              <h1 className="text-xl font-semibold tracking-wide text-zinc-900 sm:text-2xl">
                เคสที่พิจารณาแล้ว (อนุมัติ/ปฏิเสธ/ข้อมูลไม่ครบ)
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                สรุปรายการที่ได้รับการพิจารณาเรียบร้อย สามารถเปิดเอกสาร PDF และรายละเอียดได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 shadow-sm">
              ทั้งหมด {totals.all} รายการ
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
              อนุมัติ {totals.approved}
            </span>
            <span className="rounded-full bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
              ปฏิเสธ {totals.rejected}
            </span>
            <span className="rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-800 ring-1 ring-yellow-300">
              ข้อมูลไม่ครบ {totals.incomplete}
            </span>
          </div>
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
      </header>
    </>
  );
}


function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-3xl border border-zinc-200 bg-white/60 p-4">
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
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full">
      <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
        {label}
      </div>
    </div>
  );
}
