// components/ReviewConfirm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import EvidenceGallery from "../../../components/EvidenceGallery";
import MapPreview from "../../../components/MapPreview";
import { useRouter, useSearchParams } from "next/dist/client/components/navigation";
import Link from "next/dist/client/link";
import type { User } from "@/types/claim";

const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");

// ---------- Types ----------
type Car = {
  id: number;
  car_brand: string;
  car_model: string;
  car_year: string | number;
  car_license_plate: string;
  insurance_type: string;
  insured_name: string;
  policy_number: string;
  coverage_end_date: string;
  car_path?: string;
  chassis_number: string;
  registration_province: string;
};

type MediaItem = { url: string; type?: "image" | "video"; publicId?: string };

type DamagePhoto = MediaItem & {
  side?: "ซ้าย" | "ขวา" | "หน้า" | "หลัง" | "ไม่ระบุ";
  total?: number | null;
  perClass?: Record<string, number> | null;
  note?: string;
};

type AccidentDraft = {
  accidentType: string;
  accident_date: string;
  accident_time: string;
  province: string | null;
  district: string | null;
  road?: string | null;
  area_type: string;
  nearby?: string | null;
  details?: string | null;
  location: { lat: number; lng: number; accuracy?: number | null };
  evidenceMedia?: MediaItem[];
  damagePhotos?: DamagePhoto[];
};




// ---------- Helpers ----------
function isVideoUrl(url: string) {
  const u = url.toLowerCase();
  return u.endsWith(".mp4") || u.endsWith(".mov") || u.endsWith(".webm") || u.includes("video/upload");
}
function normalizeMediaItem<T extends { url: string; type?: "image" | "video" }>(m: string | T): T {
  if (typeof m === "string") {
    return { url: m, type: isVideoUrl(m) ? "video" : "image" } as T;
  }
  if (!m.type) {
    return { ...m, type: isVideoUrl(m.url) ? "video" : "image" };
  }
  return m;
}
function formatSide(side?: DamagePhoto["side"]) {
  return side ?? "ไม่ระบุ";
}

function topClasses(perClass?: Record<string, number> | null, topN = 5) {
  if (!perClass) return [];
  return Object.entries(perClass)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, topN);
}


// ---------- Component ----------
export default function accidentCheck() {
  const sp = useSearchParams();
  const router = useRouter();
  const claimId = sp.get("claim_id");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState("");
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | "incomplete" | null>(null);
  const [submitting, setSubmitting] = useState(false);




  // เพิ่ม state
  const [car, setCar] = useState<Car | null>(null);
  const [draft, setDraft] = useState<AccidentDraft | null>(null);

  // -------- Auth --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsAuthenticated(false);
          return;
        }
        const res = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
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
  if (isAuthenticated === false) {
    router.replace("/login");
  }
}, [isAuthenticated, router]);
  // ดึงจาก API
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/claim-requests/detail?claim_id=${claimId}`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const json = await res.json();
        if (json.ok) {
          const d = json.data;

          setCar({
            id: d.selected_car_id,
            car_brand: d.car_brand,
            car_model: d.car_model,
            car_year: d.car_year,
            car_license_plate: d.license_plate,
            insurance_type: d.insurance_type,
            insured_name: d.insured_name,
            policy_number: d.policy_number,
            coverage_end_date: d.coverage_end_date,
            car_path: d.car_path,
            chassis_number: "", // ใส่เพิ่มถ้า schema มี
            registration_province: d.registration_province,
          });

          setDraft({
            accidentType: d.accident_type,
            accident_date: d.accident_date,
            accident_time: d.accident_time,
            province: d.province,
            district: d.district,
            road: d.road,
            area_type: d.area_type,
            nearby: d.nearby,
            details: d.details,
            location: { lat: d.latitude, lng: d.longitude, accuracy: d.accuracy },
            evidenceMedia: d.evidence_file_url
              ? [{ url: d.evidence_file_url, type: d.media_type }]
              : [],
            damagePhotos: d.damage_images?.map((img: any) => ({
              url: img.original_url,
              side: img.side,
              note: img.damage_note,
              type: "image",
            })),
          });
        }
      } catch (e) {
        console.error("fetch claim detail failed", e);
      }
    };
    fetchDetail();
  }, [claimId]);


  // รูปหลักฐาน (เดิม) -> ใช้ PrettyEvidenceGallery แทน เพื่อความสวยงาม + modal
  const evidenceList: (string | MediaItem)[] = useMemo(() => {
    if (!draft) return [];
    if (Array.isArray(draft.evidenceMedia) && draft.evidenceMedia.length > 0) {
      return draft.evidenceMedia.map(normalizeMediaItem);
    }
    return [];
  }, [draft]);

  // รูปความเสียหาย: เก็บ metadata (side/total/perClass/note)
  const damageList: DamagePhoto[] = useMemo(() => {
    if (!draft?.damagePhotos || draft.damagePhotos.length === 0) return [];
    return draft.damagePhotos
      .filter((d) => !!d?.url)
      .map((d, idx) =>
        normalizeMediaItem<DamagePhoto>({
          url: d.url,
          type: d.type,
          publicId: d.publicId || `damage-${idx}`,
          side: d.side,
          total: d.total,
          perClass: d.perClass,
          note: d.note,
        })
      );
  }, [draft?.damagePhotos]);


  async function patchStatus(
    next: "approve" | "reject" | "incomplete",
    note?: string
  ) {
    if (!claimId) return;
    try {
      setActionLoading(next);

      const now = new Date().toISOString();
      const adminId = user ? Number(user.id) : null;

      const body: Record<string, any> = {
        status: next,
        admin_note: note ?? null,
      };

      if (next === "approve") {
        body.approved_by = adminId;
        body.approved_at = now;
      } else if (next === "reject") {
        body.rejected_by = adminId;
        body.rejected_at = now;
      } else if (next === "incomplete") {
        body.incomplete_by = adminId;
        body.incomplete_at = now;

        // ✅ ดึงประวัติเก่าก่อนจะ append
        const token = localStorage.getItem("token");
        const res = await fetch(`${URL_PREFIX}/api/claim-requests/detail?claim_id=${claimId}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();
        const prevHistory = json?.data?.incomplete_history || [];

        body.incomplete_history = [
          ...prevHistory,
          { time: now, note: note || "" },
        ];
      }

      const token = localStorage.getItem("token");
      const resp = await fetch(`${URL_PREFIX}/api/claim-requests/${claimId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const j = await resp.json();
      if (!resp.ok || !j?.ok) throw new Error(j?.message || "อัปเดตสถานะไม่สำเร็จ");

      if (next === "incomplete") {
        setShowIncomplete(false);
        setIncompleteReason("");
      }

      router.push("/adminpage/reportsrequest");
    } catch (e: any) {
      alert(e?.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(null);
    }
  }





  if (!car || !draft) {
    return (
      <div className="mx-auto max-w-3xl text-center p-6">
        <p className="text-zinc-300">ไม่พบข้อมูลรถหรือรายละเอียดอุบัติเหตุ</p>
        <Link
          href={`/adminpage/reportsrequest`}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          กลับไปหน้ารายการเคลม
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl bg-white rounded-2xl shadow-lg p-6">

      <div className="bg-[#333333] h-auto text-white rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ซ้าย: ตรวจสอบการเคลม */}
        <div>
          <h2 className="text-lg font-bold">ตรวจสอบการเคลม</h2>
          <p className="mt-2 text-sm">
            ผู้เอาประกัน
          </p>
          <span className="font-semibold">{car.insured_name}</span>

          <p className="text-sm"> {car.policy_number}</p>
        </div>

        {/* กลาง: รถยนต์ที่ทำประกัน */}
        <div>
          <div><br /></div>
          <p className="mt-2 text-sm">
            รถยนต์ที่ทำประกัน
          </p>
          <span className="font-semibold">{car.car_brand} {car.car_model} {car.car_year}</span>
          <p className="text-sm">{car.car_license_plate} {car.registration_province}</p>
          <p className="text-sm">{car.chassis_number}</p>


        </div>

        {/* ขวา: รูปรถ */}
<div className="rounded-[7px] h-[150px] flex items-center justify-center">
          <img
            src={car.car_path}
            alt="Car"
            className="h-full object-contain rounded-md"
          />
        </div>
      </div>

      {/* Content 3 Columns */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-black">

        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รายละเอียดที่เกิดเหตุ</h2>
          <div className="w-full h-[200px] bg-zinc-200 flex items-center justify-center rounded overflow-hidden">
            <MapPreview
              lat={parseFloat(String(draft.location.lat))}
              lng={parseFloat(String(draft.location.lng))}
            />
          </div>
          <p className="text-sm"><span className="font-medium">วัน/เวลา:</span> {draft.accident_date} {draft.accident_time}</p>
          <p className="text-sm">
            <span className="font-medium">สถานที่:</span>{" "}
                {draft.province || draft.district || draft.road
                  ? `${draft.province || ""} ${draft.district || ""} ${
                      draft.road || ""
                    }`.trim()
                  : "ไม่ระบุ" + " (" + (draft.location?.lat && draft.location?.lng
                      ? `พิกัด: ${draft.location.lat}, ${draft.location.lng}`
                      : "ไม่มีพิกัด") + ")"}
          </p>
          <p className="text-sm"><span className="font-medium">ประเภทพื้นที่:</span> {draft.area_type}</p>
          <p className="text-sm"><span className="font-medium">จุดสังเกต:</span> {draft.nearby}</p>
          {draft.details && (
            <p className="text-sm"><span className="font-medium">รายละเอียด:</span> {draft.details}</p>
          )}
        </div>

        {/* กลาง: ประเภทอุบัติเหตุ */}
        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รายละเอียดอุบัติเหตุ</h2>

          <p className="text-sm"><span className="font-medium">ประเภทอุบัติเหตุ:</span> {draft.accidentType}</p>
          <div>
            <p className="text-sm font-medium">รายละเอียดเพิ่มเติม:</p>
            <p className="text-sm">{draft.details}</p>
          </div>
          {evidenceList.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">หลักฐานภาพ/วิดีโอ</p>
              <EvidenceGallery media={evidenceList} />
            </div>
          )}
        </div>

        {/* ขวา: ความเสียหาย */}
        {/* ขวา: ความเสียหาย */}
        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รูปความเสียหาย</h2>

          {damageList.length > 0 ? (
            <EvidenceGallery
              className="mt-4"
              media={damageList.map((d) => ({
                url: d.url,
                type: d.type,
                caption: d.side ? `ด้าน ${d.side}` : undefined,
                note: d.note || undefined,
              }))}
            />
          ) : (
            <p className="text-sm text-zinc-500">ไม่มีข้อมูลความเสียหาย</p>
          )}
        </div>

      </div>





      <div className="mt-6 flex justify-end gap-3">
        {/* ปุ่มย้อนกลับ */}
        <button
          onClick={() => router.back()}
          className="h-10 rounded-xl px-4 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 w-full sm:w-auto"
        >
          ย้อนกลับ
        </button>

        {/* ปุ่มข้อมูลไม่ครบ */}
        <button
          onClick={() => setShowIncomplete(true)}
          disabled={actionLoading !== null}
          className={`h-10 rounded-xl px-4 text-sm font-medium ${actionLoading === "incomplete"
            ? "bg-amber-200 text-amber-800"
            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            } border border-amber-200 w-full sm:w-auto`}
        >
          {actionLoading === "incomplete" ? "กำลังบันทึก…" : "ข้อมูลไม่ครบ"}
        </button>

        {/* ปุ่มตรวจสอบความเสียหาย */}
        <button
          onClick={() => router.push(`/adminpage/reportsrequest/inspect?claim_id=${claimId}`)}
          disabled={submitting}
          className={`rounded-lg px-4 py-2 font-medium text-white ${submitting
            ? "bg-[#6F47E4]"
            : "bg-[#6F47E4] hover:bg-[#6F47E4]/80"
            }`}
        >
          ตรวจสอบความเสียหาย
        </button>
      </div>
      {showIncomplete && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 print:hidden">
          <div className="w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-4 text-black shadow sm:p-5">
            <h4 className="text-base font-semibold ">ข้อมูลไม่ครบ / ภาพไม่ชัด</h4>
            <p className="mt-1 text-sm text-zinc-600">
              โปรดระบุสาเหตุหรือสิ่งที่ต้องการให้ลูกค้าแก้ไขเพิ่มเติม
            </p>

            <textarea
              className="mt-3 min-h-[120px] w-full rounded-lg border border-zinc-300 p-3 outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="พิมพ์รายละเอียด…"
              value={incompleteReason}
              onChange={(e) => setIncompleteReason(e.target.value)}
            />

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowIncomplete(false)}
                disabled={actionLoading === "incomplete"}
                className="h-10 rounded-xl bg-zinc-100 px-4 text-sm font-medium hover:bg-zinc-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => patchStatus("incomplete", incompleteReason.trim())}
                disabled={actionLoading === "incomplete" || !incompleteReason.trim()}
                className={`h-10 rounded-xl px-4 text-sm font-medium ${actionLoading === "incomplete"
                  ? "bg-amber-400 text-white"
                  : "bg-amber-600 text-white hover:bg-amber-700"
                  }`}
              >
                {actionLoading === "incomplete" ? "กำลังส่ง…" : "ยืนยันข้อมูลไม่ครบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Small presentational helpers ----------
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <div className="text-zinc-500">{k}</div>
      <div className="font-medium text-right">{v}</div>
    </div>
  );
}
