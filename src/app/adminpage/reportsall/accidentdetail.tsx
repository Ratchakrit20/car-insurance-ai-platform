"use client";
import React, { useEffect, useMemo, useState } from "react";
import EvidenceGallery from "../../components/EvidenceGallery";
import MapPreview from "../../components/MapPreview";
import { useRouter } from "next/navigation";
import type { User } from "@/types/claim";

// ---------- Config ----------
const URL_PREFIX = process.env.NEXT_PUBLIC_URL_PREFIX || "";

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
  adminNote?: string;
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
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".mov") ||
    u.endsWith(".webm") ||
    u.includes("video/upload")
  );
}
function normalizeMediaItem<T extends { url: string; type?: "image" | "video" }>(
  m: string | T
): T {
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
export default function AccidentDetail({
  claimId,
  onClose,
}: {
  claimId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [car, setCar] = useState<Car | null>(null);
  const [draft, setDraft] = useState<AccidentDraft | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Load user
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${URL_PREFIX}/api/me`, {
          credentials: "include",
        });
        const data = await res.json();
        setUser(data.user ?? null);
      } catch {}
    })();
  }, []);

  // Load detail
  useEffect(() => {
    if (!claimId) return;
    (async () => {
      try {
        const res = await fetch(
          `${URL_PREFIX}/api/claim-requests/detail?claim_id=${claimId}`,
          { credentials: "include", cache: "no-store" }
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
            chassis_number: "",
            registration_province: d.registration_province,
          });
          setDraft({
            adminNote: d.admin_note,
            accidentType: d.accident_type,
            accident_date: d.accident_date,
            accident_time: d.accident_time,
            province: d.province,
            district: d.district,
            road: d.road,
            area_type: d.area_type,
            nearby: d.nearby,
            details: d.details,
            location: {
              lat: d.latitude,
              lng: d.longitude,
              accuracy: d.accuracy,
            },
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
        console.error(e);
      }
    })();
  }, [claimId]);

  const evidenceList = useMemo(() => {
    if (!draft?.evidenceMedia) return [];
    return draft.evidenceMedia.map(normalizeMediaItem);
  }, [draft]);

  const damageList = useMemo(() => {
    if (!draft?.damagePhotos) return [];
    return draft.damagePhotos.map(normalizeMediaItem);
  }, [draft]);

  if (!car || !draft) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-2xl shadow-xl w-[90%] max-w-lg text-center">
          <p className="text-zinc-500 mb-4">
            ไม่พบข้อมูลรถหรือรายละเอียดอุบัติเหตุ
          </p>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        {/* ปุ่มปิด */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-zinc-600 hover:text-black text-xl font-bold"
        >
          ✕
        </button>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="bg-[#333333] text-white rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ซ้าย */}
            <div>
              <h2 className="text-lg font-bold">รายละเอียดการเคลม</h2>
              <p className="mt-2 text-sm">ผู้เอาประกัน</p>
              <span className="font-semibold">{car.insured_name}</span>
              <p className="text-sm">{car.policy_number}</p>
            </div>

            {/* กลาง */}
            <div>
              <div className="mt-4 text-sm">
                <p>รถยนต์ที่ทำประกัน</p>
                <span className="font-semibold">
                  {car.car_brand} {car.car_model} {car.car_year}
                </span>
                <p>
                  {car.car_license_plate} {car.registration_province}
                </p>
                <p>{car.chassis_number}</p>
              </div>
            </div>

            {/* ขวา */}
            <div className="flex justify-center items-center">
              <img
                src={car.car_path}
                alt="Car"
                className="h-32 object-contain rounded-md shadow-sm"
              />
            </div>
          </div>
          {/* Admin Note */}
          {draft.adminNote && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
              <p className="font-semibold mb-1">หมายเหตุจากเจ้าหน้าที่:</p>
              <p className="whitespace-pre-line leading-relaxed">
                {draft.adminNote}
              </p>
            </div>
          )}


          {/* Content 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-black">
            {/* Col 1 */}
            <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
              <h2 className="font-semibold mb-3">รายละเอียดที่เกิดเหตุ</h2>
              <div className="w-full h-[200px] bg-zinc-200 flex items-center justify-center rounded overflow-hidden">
                <MapPreview
                  lat={parseFloat(String(draft.location.lat))}
                  lng={parseFloat(String(draft.location.lng))}
                />
              </div>
              <p className="text-sm">
                <span className="font-medium">วัน/เวลา:</span>{" "}
                {draft.accident_date} {draft.accident_time}
              </p>
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
              <p className="text-sm">
                <span className="font-medium">ประเภทพื้นที่:</span>{" "}
                {draft.area_type}
              </p>
              <p className="text-sm">
                <span className="font-medium">จุดสังเกต:</span> {draft.nearby}
              </p>
              {draft.details && (
                <p className="text-sm">
                  <span className="font-medium">รายละเอียด:</span>{" "}
                  {draft.details}
                </p>
              )}
            </div>

            {/* Col 2 */}
            <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
              <h2 className="font-semibold mb-3">รายละเอียดอุบัติเหตุ</h2>
              <p className="text-sm">
                <span className="font-medium">ประเภทอุบัติเหตุ:</span>{" "}
                {draft.accidentType}
              </p>
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

            {/* Col 3 */}
            <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
              <h2 className="font-semibold mb-3">รูปความเสียหาย</h2>
              {damageList.length > 0 && (
                <section className="mt-4">
                  <div className="grid grid-cols-1 gap-4">
                    {damageList.map((d, idx) => {
                      const hasNote = !!(d.note && d.note.trim().length > 0);
                      return (
                        <div
                          key={`${d.publicId || d.url}-${idx}`}
                          className="relative overflow-hidden rounded-xl ring-1 ring-zinc-200/70 bg-zinc-50 shadow-sm"
                        >
                          <div className="aspect-video w-full bg-black/5">
                            {d.type === "video" ? (
                              <video
                                src={d.url}
                                controls
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <img
                                src={d.url}
                                alt={`damage-${idx}`}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="absolute left-2 top-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-zinc-900/80 text-white text-xs px-2 py-1">
                              ด้าน: {formatSide(d.side)}
                            </span>
                            {d.total !== undefined && d.total !== null && (
                              <span className="rounded-full bg-indigo-600 text-white text-xs px-2 py-1">
                                รวม: {d.total} ตำแหน่ง
                              </span>
                            )}
                          </div>

                          {hasNote && (
                            <div className="p-3 text-sm">
                              <div className="text-xs text-zinc-500">
                                รายละเอียดความเสียหาย
                              </div>
                              <div className="whitespace-pre-wrap">{d.note}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* ปุ่ม */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="h-10 rounded-xl px-4 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 w-full sm:w-auto"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
