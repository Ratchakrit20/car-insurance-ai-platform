"use client";

import React, { useEffect, useState, useMemo } from "react";
import EvidenceGallery from "../components/EvidenceGallery";
import MapPreview from "../components/MapPreview";
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
  areaType: string;
  nearby?: string | null;
  details?: string | null;
  location: { lat: number; lng: number; accuracy?: number | null };
  evidenceMedia?: MediaItem[];
  damagePhotos?: DamagePhoto[];
};

interface ReviewConfirmProps {
  onBack: () => void;
  onFinish: () => void;
  userId?: number;
}

// ---------- Dictionaries / Labels ----------
const DAMAGE_EN2TH: Record<string, string> = {
  "crack": "ร้าว",
  "dent": "บุบ",
  "glass shatter": "กระจกแตก",
  "lamp broken": "ไฟแตก",
  "scratch": "ขีดข่วน",
  "tire flat": "ยางแบน",
};
const toTHDamage = (s?: string) => (!s ? "" : DAMAGE_EN2TH[s] ?? s);

const CAR_KEY = "claimSelectedCar";
const ACC_KEY = "accidentDraft";

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

function normalizeStatus(s?: string): string {
  if (!s) return "pending";

  switch (s) {
    case "ข้อมูลไม่ครบ":
      return "incomplete";
    case "อนุมัติ":
      return "approved";
    case "ไม่อนุมัติ":
      return "rejected";
    default:
      return s; // ถ้าได้ค่าอังกฤษมาอยู่แล้วก็คืนกลับ
  }
}


// ---------- Component ----------
export default function ReviewConfirm({ onBack, onFinish, userId }: ReviewConfirmProps) {
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);


  const car: Car | null = useMemo(() => {
    try {
      const raw = localStorage.getItem(CAR_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
  const [draft, setDraft] = useState<AccidentDraft | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACC_KEY);
      console.log("🚗 โหลด accidentDraft:", raw);
      setDraft(raw ? JSON.parse(raw) : null);
    } catch {
      setDraft(null);
    }
  }, []);
  const claimStatus = normalizeStatus((draft as any)?.status);
  console.log("🚗 Draft claim status:", claimStatus);


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

  const handleSubmit = async () => {

    if (!agree || !car || !draft) return;

    setSubmitting(true);
    try {
      const claimId = (draft as any)?.claim_id ?? null;
      const claimStatus = normalizeStatus((draft as any)?.status);

      let url = "";
      let method: "POST" | "PUT" | "PATCH" = "POST";

      if (claimId && claimStatus === "incomplete") {
        // ✅ ถ้าเคยถูกแจ้งให้แก้ไข → ใช้ endpoint resubmit ใหม่
        url = `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/claim-requests/${claimId}/resubmit`;
        method = "PATCH";
      } else if (claimId) {
        // ✅ ถ้ามี claimId แต่ไม่ใช่ incomplete (กรณี edit draft อื่น ๆ)
        url = `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/claim-submit/update/${claimId}`;
        method = "PUT";
      } else {
        // ✅ เคสใหม่ → สร้างเคลมใหม่
        url = `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/claim-submit/submit`;
        method = "POST";
      }

      const accidentPayload = {
        ...draft,
        date: draft.accident_date,
        time: draft.accident_time,
        areaType: draft.areaType,
      };
      delete (accidentPayload as any).accident_date;
      delete (accidentPayload as any).accident_time;

      console.log("📤 Accident payload:", accidentPayload);
      console.log("✅ กำลังส่งข้อมูลแก้ไขใหม่:", {
        accident_date: draft.accident_date,
        accident_time: draft.accident_time,
        province: draft.province,
        district: draft.district,
        road: draft.road,
        details: draft.details,
      });
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          selected_car_id: car.id,
          accident: accidentPayload,
          agreed: agree,
          note: "ผู้ใช้ส่งเอกสารที่แก้ไขแล้วกลับมาใหม่",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert(data?.message || "ส่งคำขอไม่สำเร็จ");
        return;
      }

      localStorage.removeItem(ACC_KEY);
      localStorage.removeItem(CAR_KEY);
      onFinish();
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดระหว่างส่งคำขอ");
    } finally {
      setSubmitting(false);
    }
  };



  if (!car || !draft) {
    return (
      <div className="mx-auto max-w-3xl text-center p-6">
        <p className="text-zinc-300">ไม่พบข้อมูลรถหรือรายละเอียดอุบัติเหตุ</p>
        <button onClick={onBack} className="mt-4 rounded-lg bg-zinc-700 px-4 py-2">
          ย้อนกลับ
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl bg-white rounded-2xl shadow-lg p-6">

      <div className="bg-[#333333] h-auto text-white rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ซ้าย: ตรวจสอบการเคลม */}
        <div>
          <h2 className="text-lg font-bold">ตรวจสอบการเคลมของคุณ</h2>
          <p className="mt-2 text-sm">
            ผู้เอาประกัน
          </p>
          <span className="font-semibold">{car.insured_name}</span>

          <p className="text-sm">หมายเลขกรมธรรม์: {car.policy_number}</p>
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
        <div className="rounded-[7px] h-[180px] flex items-center justify-center">
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
              ? `${draft.province || ""} ${draft.district || ""} ${draft.road || ""}`.trim()
              : "ไม่ระบุ"}
          </p>
          <p className="text-sm"><span className="font-medium">ประเภทพื้นที่:</span> {draft.areaType}</p>
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
        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รูปความเสียหาย</h2>

          {/* รูปความเสียหาย */}
          {damageList.length > 0 ? (
            <div className="mt-4">
              <EvidenceGallery
                media={damageList.map((d) => ({
                  url: d.url,
                  type: d.type,
                  caption: `ด้าน: ${d.side ?? "ไม่ระบุ"}${d.total ? ` · รวม ${d.total} ตำแหน่ง` : ""}`,
                  note: d.note || "", // ✅ เพิ่ม note ของแต่ละรูป
                }))}
              />

            </div>
          ) : (
            <div className="text-sm text-zinc-500">ไม่มีข้อมูลรูปความเสียหาย</div>
          )}


        </div>
      </div>



      {/* ยืนยัน */}
      <div className="flex items-start gap-3 mt-4">
        <input
          id="agree"
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1"
        />
        <label htmlFor="agree" className="text-sm text-black">
          ตรวจสอบข้อมูลข้างต้นครบถ้วนแล้ว และยืนยันการส่งคำขอเคลม
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onBack} className=" rounded-[7px] bg-zinc-200 px-4 py-2 text-black  hover:bg-zinc-200/60">
          แก้ไขข้อมูล
        </button>
        <button
          onClick={handleSubmit}
          disabled={!agree || submitting}
          className={`rounded-lg px-4 py-2 font-medium text-white transition-colors duration-200 ${submitting
            ? "bg-gray-400 cursor-not-allowed"
            : agree
              ? "bg-[#6F47E4] hover:bg-[#5A35D1]"
              : "bg-gray-400 cursor-not-allowed"
            }`}
        >
          {submitting
            ? "กำลังส่ง..."
            : claimStatus === "incomplete"
              ? "ยืนยันการแก้ไข"
              : "ยืนยันส่งเรื่อง"}
        </button>
      </div>
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
