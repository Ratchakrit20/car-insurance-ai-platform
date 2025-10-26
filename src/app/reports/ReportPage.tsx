"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReportsView from "./ReportsView";
import LoadingScreen from "@/app/components/LoadingScreen";
import PdfRequest from "@/app/reports/PdfRequest";
import type {
  ClaimItem,
  ClaimReportRow,
  ClaimStatus,
  Car,
  AccidentDraft,
  DamagePhoto,
  User,
} from "@/types/claim";

// ---------- Fonts ----------
import { Noto_Sans_Thai } from "next/font/google";
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// ---------- Config ----------
const URL_PREFIX = process.env.NEXT_PUBLIC_URL_PREFIX ?? "";

// ---------- Utils ----------
function normalizeStatus(s?: string | null): ClaimStatus {
  const x = (s || "").toLowerCase();
  if (x.includes("pending") || x.includes("review")) return "กำลังตรวจสอบ";
  if (x.includes("approved") || x.includes("done") || x.includes("success"))
    return "สำเร็จ";
  if (x.includes("reject") || x.includes("deny")) return "เอกสารไม่ผ่านการตรวจสอบ";
  if (x.includes("incomplete") || x.includes("ข้อมูลไม่ครบ"))
    return "เอกสารต้องแก้ไขเพิ่มเติม";
  return "กำลังตรวจสอบ";
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|ogg)$/i.test(url);
}

// ---------- Fetch claims ----------
async function fetchClaimsByUser(userId: number): Promise<ClaimItem[]> {
  const url = `${URL_PREFIX}/api/claim-requests/list?user_id=${encodeURIComponent(
    String(userId)
  )}`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");

  const json = await res.json();
  const rows: ClaimReportRow[] = json?.data ?? [];

  return rows.map((r) => {
    const status = normalizeStatus(r.status);

    const damagePhotos: DamagePhoto[] = Array.isArray(r.images)
      ? r.images
        .filter((img) => !!img?.original_url)
        .map((img) => ({
          id: img.id,
          url: img.original_url ?? "",
          type: "image",
          side: ["ซ้าย", "ขวา", "หน้า", "หลัง","หน้าซ้าย" , "หลังซ้าย" , "หน้าขวา" , "หลังขวา"].includes(String(img.side))
            ? (img.side as DamagePhoto["side"])
            : "ไม่ระบุ",
          note: img.damage_note ?? undefined,
          total: null,
          perClass: null,
          annotations: [],
        }))
      : [];

    const evidenceMedia: { id: number; url: string; type: "image" | "video"; note?: string }[] = [];
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

    if (r.thumbnail_url) {
      evidenceMedia.push({
        id: r.accident_detail_id ?? 0,
        url: r.thumbnail_url,
        type:
          (r.media_type as "image" | "video") ??
          (isVideoUrl(r.thumbnail_url) ? "video" : "image"),
        note: "หลักฐานตอนเกิดเหตุ",
      });
    }

    const uniqueEvidence = Array.from(
      new Map(evidenceMedia.map((e) => [e.url, e])).values()
    );

    return {
      id: String(r.claim_id ?? r.report_id ?? r.accident_detail_id),
      status,
      created_at: r.created_at,
      updated_at: r.updated_at ?? new Date().toISOString(),
      car_path: r.car_path ?? "",
      car_brand: r.car_brand ?? "",
      car_model: r.car_model ?? "",
      carTitle:
        r.car_title ??
        `${r.car_brand ?? "รถ"} ${r.car_model ?? ""} ทะเบียน ${r.license_plate ?? "-"
        }`,
      incidentDate: r.accident_date ?? new Date().toISOString(),
      incidentType: r.accident_type ?? undefined,
      province: r.province ?? null,
      district: r.district ?? null,
      road: r.road ?? null,
      areaType: r.area_type ?? null,
      nearby: r.nearby ?? null,
      details: r.details ?? null,
      location: {
        lat: r.latitude ?? null,
        lng: r.longitude ?? null,
        accuracy: r.accuracy ?? null,
      },
      evidenceMedia: uniqueEvidence,
      damagePhotos,
      userId: r.user_id,
      selected_car_id: r.car_id,
      accident_detail_id: r.accident_detail_id,
      damageAreas: r.damage_areas ?? undefined,
      severitySummary: r.severity_summary ?? undefined,
    };
  });
}

// ---------- Component ----------
export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfDetail, setPdfDetail] = useState<any>(null);

  const selectedClaimId = searchParams.get("claim_id");

  // ---------- useEffects ----------
  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsAuthenticated(false);
          return;
        }
        const res = await fetch(`${URL_PREFIX}/api/me`, {
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
    return () => { cancelled = true; };
  }, [ready]);

  useEffect(() => {
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!user?.id) return;
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
  }, [user?.id]);

  useEffect(() => {
    if (!selectedClaimId || claims.length === 0) return;
    const found = claims.find((c) => String(c.id) === String(selectedClaimId));
    if (found) setSelectedClaim(found);
  }, [selectedClaimId, claims]);
  async function fetchClaimDetail(
  claimId: string | number
): Promise<{
  claim_id: number | string;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
}> {
  const url = `${URL_PREFIX}/api/claim-requests/detail?claim_id=${encodeURIComponent(
    String(claimId)
  )}`;
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  const json = await res.json();
  if (!res.ok || !json?.ok)
    throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");

  return {
    claim_id: json.data.claim_id,
    status: json.data.status,
    created_at: json.data.created_at,
    car: json.data.car ?? null,
    accident: json.data.accident as AccidentDraft,
  };
}
  // ---------- handlers ----------
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

  // ---------- guards ----------
  let content: React.ReactNode = null;
  if (!ready || isAuthenticated === null) {
    content = <LoadingScreen message="กำลังตรวจสอบสิทธิ์ผู้ใช้..." />;
  } else if (isAuthenticated === false) {
    content = null;
  } else if (loading) {
    content = <LoadingScreen message="กำลังโหลดข้อมูล…" />;
  } else if (error) {
    content = (
      <div className="mx-auto max-w-6xl px-4 py-10 text-rose-400">
        เกิดข้อผิดพลาด: {error}
      </div>
    );
  } else {
    content = (
      <div className={`${thaiFont.className} relative w-full min-h-[100dvh] bg-white`}>
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
          <header className="mb-4 lg:mb-6">
            <div className="flex flex-wrap md:ml-24 items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-wide text-zinc-900 sm:text-2xl">
                  รายการขอเคลมทั้งหมด
                </h1>
                <p className="mt-1 text-sm text-zinc-600">
                  ดูสถานะการเคลมทั้งหมดของคุณแบบเรียลไทม์ พร้อมเปิดรายงาน PDF ได้ทันที
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 shadow-sm">
                  ทั้งหมด {claims.length} รายการ
                </span>
              </div>
            </div>
          </header>
        </div>
        <ReportsView
          claims={claims ?? []}
          selectedClaim={selectedClaim ?? null}
          hasInitialClaimId={!!selectedClaimId}
          onSelectClaim={(c) => setSelectedClaim(c)}
          onOpenPdf={handleOpenPdf}
        />
      </div>
    );
  }

  return content;
}
