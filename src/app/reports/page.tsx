"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReportsView from "./ReportsView";
import LoadingScreen from "@/app/components/LoadingScreen";

import PdfRequest from "@/app/reports/PdfRequest"; // เดิมของคุณ
import type { ClaimItem, ClaimReportRow, ClaimStatus, Car, AccidentDraft, DamagePhoto, User } from "@/types/claim";
import { useSearchParams } from "next/navigation";
import { Prompt, Noto_Sans_Thai, Inter } from 'next/font/google';
const headingFont = Prompt({ subsets: ['thai', 'latin'], weight: ['600', '700'], display: 'swap' });
const bodyFont = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], display: 'swap' });
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");
type ReportsViewProps = {
  claims: ClaimItem[];
  selectedClaim?: ClaimItem | null;
  onSelectClaim?: (claim: ClaimItem) => void;
  onOpenPdf: (claimId: string) => void;
};
async function fetchAuth() {
  const res = await fetch(`${URL_PREFIX}/api/me`, { credentials: "include" });
  if (!res.ok) throw new Error("auth failed");
  return res.json() as Promise<{ user: User | null; isAuthenticated: boolean }>;
}
// map/normalize สถานะจาก backend -> ไทยที่ใช้ใน UI
function normalizeStatus(s?: string | null): ClaimStatus {
  const x = (s || "").toLowerCase();
  if (x === "pending" || x === "ตรวจสอบ" || x === "review") return "กำลังตรวจสอบ";
  if (x === "approved" || x === "success" || x === "done") return "สำเร็จ";
  if (x === "rejected" || x === "deny") return "เอกสารไม่ผ่านการตรวจสอบ";
  if (x === "incomplete" || x === "ข้อมูลไม่ครบ") return "เอกสารต้องแก้ไขเพิ่มเติม";
  return "กำลังตรวจสอบ";
}


async function fetchClaimsByUser(userId: number): Promise<ClaimItem[]> {
  const url = `${URL_PREFIX}/api/claim-requests/list?user_id=${encodeURIComponent(String(userId))}`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");

  const json = await res.json();
  const rows: ClaimReportRow[] = json?.data ?? [];

  return rows.map((r) => {
    const status = normalizeStatus(r.status);

    // ✅ 1) ภาพความเสียหายจาก r.images
    const damagePhotos: DamagePhoto[] = Array.isArray(r.images)
      ? r.images
        .filter((img) => !!img?.original_url)
        .map((img) => {
          const side: DamagePhoto["side"] =
            ["ซ้าย", "ขวา", "หน้า", "หลัง"].includes(String(img.side))
              ? (img.side as DamagePhoto["side"])
              : "ไม่ระบุ";
          return {
            id: img.id,
            url: img.original_url ?? "",
            type: "image",
            side,
            note: img.damage_note ?? undefined,
            total: null,
            perClass: null,
            annotations: [],
          };
        })
      : [];

    // ✅ 2) หลักฐานเหตุการณ์ (image/video)
    const evidenceMedia: { id: number; url: string; type: "image" | "video"; note?: string }[] = [];

    // 🟣 (1) ถ้ามี evidence_media (รองรับหลายอัน)
    const evidenceArray = (r as any).evidence_media;
    if (Array.isArray(evidenceArray) && evidenceArray.length > 0) {
      for (const e of evidenceArray) {
        if (e.url) {
          evidenceMedia.push({
            id: e.id ?? Math.random(),
            url: e.url,
            type: e.type ?? (isVideoUrl(e.url) ? "video" : "image"),
            note: e.note ?? "หลักฐานเพิ่มเติม",
          });
        }
      }
    }

    // 🟣 (2) ถ้ามี thumbnail_url (string เดียว) → แปลงให้เป็น 1 หลักฐาน
    if (r.thumbnail_url) {
      evidenceMedia.push({
        id: r.accident_detail_id ?? 0,
        url: r.thumbnail_url,
        type: (r.media_type as "image" | "video") ?? (isVideoUrl(r.thumbnail_url) ? "video" : "image"),
        note: "หลักฐานตอนเกิดเหตุ",
      });
    }

    // 🟣 (3) ป้องกันซ้ำ URL (เผื่อ backend ส่งทั้ง evidence_media และ thumbnail_url ซ้ำกัน)
    const uniqueEvidence = Array.from(
      new Map(evidenceMedia.map((e) => [e.url, e])).values()
    );

    return {
      // -------- base --------
      id: String(r.claim_id ?? r.report_id ?? r.accident_detail_id),
      status,
      created_at: r.created_at,
      updated_at: r.updated_at ?? new Date().toISOString(),
      incomplete_at: r.incomplete_at ?? null,
      admin_note: r.admin_note ?? null,
      approved_at: r.approved_at ?? null,
      rejected_at: r.rejected_at ?? null,
      incomplete_history: r.incomplete_history || [],
      resubmitted_history: r.resubmitted_history || [],

      // -------- car --------
      car_path: r.car_path ?? "",
      car_brand: r.car_brand ?? "",
      car_model: r.car_model ?? "",
      carTitle:
        r.car_title ??
        `${r.car_brand ?? "รถ"} ${r.car_model ?? ""} ทะเบียน ${r.license_plate ?? "-"}`,

      // -------- accident --------
      incidentDate: r.accident_date ?? new Date().toISOString(),
      incidentTime: r.accident_time ?? undefined,
      incidentType: r.accident_type ?? undefined,
      province: r.province ?? null,
      district: r.district ?? null,
      road: r.road ?? null,
      areaType: r.area_type ?? null,
      nearby: r.nearby ?? null,
      details: r.details ?? null,

      // ---- location ----
      location: {
        lat: r.latitude ?? null,
        lng: r.longitude ?? null,
        accuracy: r.accuracy ?? null,
      },

      // ✅ ---- media ----
      photoUrl: damagePhotos[0]?.url ?? uniqueEvidence[0]?.url ?? undefined,
      evidenceMedia: uniqueEvidence, // ✅ หลักฐานได้หลายไฟล์ (image/video)
      damagePhotos,                  // ✅ ความเสียหายแยกต่างหาก

      // -------- meta --------
      userId: r.user_id,
      selected_car_id: r.car_id,
      accident_detail_id: r.accident_detail_id,
      damageAreas: r.damage_areas ?? undefined,
      severitySummary: r.severity_summary ?? undefined,
    };
  });
}

// ✅ helper ตรวจว่าเป็นวิดีโอหรือไม่
function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|ogg)$/i.test(url);
}





type PdfDetail = {
  claim_id: number | string;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
};

async function fetchClaimDetail(claimId: string | number): Promise<PdfDetail> {
  const url = `${URL_PREFIX}/api/claim-requests/detail?claim_id=${encodeURIComponent(String(claimId))}`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
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

export default function ReportPage() {
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF modal
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDetail, setPdfDetail] = useState<PdfDetail | null>(null);


  const searchParams = useSearchParams();
  const selectedClaimId = searchParams.get("claim_id");
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);
  useEffect(() => {
    if (selectedClaimId && claims.length > 0) {
      const match = claims.find(c => String(c.id) === String(selectedClaimId));
      if (match) setSelectedClaim(match);
    }
  }, [selectedClaimId, claims]);
  // auth
  // -------- Auth --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return setIsAuthenticated(false);

        const res = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (cancelled) return;

        if (data.isAuthenticated) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("token");
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  // ✅ guard ก่อน render
  if (isAuthenticated === null)
    return <LoadingScreen message="กำลังตรวจสอบสิทธิ์ผู้ใช้..." />;

  if (isAuthenticated === false) return null;


  // fetch claims
  useEffect(() => {
    if (isAuthenticated !== true || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchClaimsByUser(Number(user.id));
        if (!cancelled) setClaims(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Load error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

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


  if (loading) {
    return <LoadingScreen message="กำลังโหลดข้อมูล…." />;

  }
  if (error) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-rose-300">เกิดข้อผิดพลาด: {error}</div>;
  }

  return (
    <div className={`${thaiFont.className} relative w-full min-h-[100dvh] bg-white`}>
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
        {/* Page Header */}
        <header className="mb-4 lg:mb-6">
          <div className="flex flex-wrap md:ml-24 items-center justify-between gap-3">
            <div className="flex items-start gap-3">

              <div>
                <h1 className="text-xl font-semibold tracking-wide text-zinc-900 sm:text-2xl">
                  รายการขอเคลมทั้งหมด
                </h1>
                <p className="mt-1 text-sm text-zinc-600">
                  ดูสถานะการเคลมทั้งหมดของคุณแบบเรียลไทม์ พร้อมเปิดรายงาน PDF ได้ทันที
                </p>
              </div>
            </div>

            {/* Summary badge */}
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 shadow-sm">
                ทั้งหมด {claims.length} รายการ
              </span>
            </div>
          </div>

          <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
        </header>
      </div>
      {/* Content */}
      <ReportsView
        claims={claims ?? []}
        selectedClaim={selectedClaim ?? null}
        hasInitialClaimId={!!selectedClaimId}
        onSelectClaim={(c) => setSelectedClaim(c)}
        onOpenPdf={handleOpenPdf}
      />
    </div>

  );

  {/* Modal PDF */ }
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
                <PdfRequest detail={pdfDetail} />
              )}
            </div>
          </div>
        </div>
      )} */}


}
