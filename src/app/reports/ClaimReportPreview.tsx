"use client";

import React from "react";
import type { Car, AccidentDraft } from "@/types/claim";
import EvidenceGallery from "@/app/components/EvidenceGallery";
import MapPreview from "@/app/components/MapPreview";

/* ---------- Mapper สำหรับแปลงข้อมูลจาก backend ---------- */
export function mapClaimData(d: any) {
  return {
    claim_id: d.claim_id,
    status: d.status,
    created_at: d.created_at,
    admin_note: d.admin_note,
    approved_at: d.approved_at,
    rejected_at: d.rejected_at,
    incomplete_at: d.incomplete_at,
    incomplete_history: d.incomplete_history || [],
    resubmitted_history: d.resubmitted_history || [],

    // ✅ Car object
    car: {
      id: d.selected_car_id ?? 0,
      car_brand: d.car_brand ?? "-",
      car_model: d.car_model ?? "-",
      car_year: d.car_year ?? "",
      car_license_plate: d.license_plate ?? "-",
      registration_province: d.registration_province ?? "-",
      insurance_type: d.insurance_type ?? "-",
      policy_number: d.policy_number ?? "-",
      coverage_end_date: d.coverage_end_date ?? "",
      coverage_start_date: d.coverage_start_date ?? d.coverage_start ?? "", // ✅
      insured_name: d.insured_name ?? "-",
      car_path: d.car_path ?? "",
      chassis_number: d.chassis_number ?? "",

    },

    // ✅ Draft object
    draft: {
      accidentType: d.accident_type ?? "-",
      accident_date: d.accident_date ?? "",
      accident_time: d.accident_time ?? "",
      province: d.province ?? "-",
      district: d.district ?? "-",
      road: d.road ?? "-",
      areaType: d.area_type ?? "-",
      nearby: d.nearby ?? "-",
      details: d.details ?? "-",
      location: {
        lat: Number(d.latitude ?? 0),
        lng: Number(d.longitude ?? 0),
        accuracy: d.accuracy ?? null,
      },
      evidenceMedia: d.evidence_file_url
        ? [{ url: d.evidence_file_url, type: d.media_type || "image" }]
        : [],
      damagePhotos: Array.isArray(d.damage_images)
        ? d.damage_images.map((img: any) => ({
          url: img.original_url,
          note: img.damage_note,
          side: img.side,
          annotations: img.annotations,
        }))
        : [],
    },
  };
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
/* ---------- Component หลัก ---------- */
type Props = {
  car: Car | null;
  draft: AccidentDraft | null;
};

export default function ClaimReportPreview({ car, draft }: Props) {
  if (!car || !draft) {
    return (
      <div className="p-6 text-center text-zinc-500">
        ไม่พบข้อมูลสำหรับแสดงรายงาน
      </div>
    );
  }
  console.log("🚗 car:", car);
  console.log("🧾 damagePhotos:", draft.damagePhotos);
  return (
    <div className="mx-auto max-w-6xl bg-white rounded-2xl shadow-lg p-6">
      {/* ---------- Header ---------- */}
      <div className="bg-[#333333] text-white rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ซ้าย: ข้อมูลผู้เอาประกัน */}
        <div>
          <h2 className="text-lg font-bold">ตรวจสอบการเคลมของคุณ</h2>
          <p className="mt-2 text-sm">ผู้เอาประกัน</p>
          <span className="font-semibold">{car.insured_name}</span>
          <p className="text-sm">หมายเลขกรมธรรม์: {car.policy_number}</p>
        </div>

        {/* กลาง: ข้อมูลรถ */}
        <div>
          <p className="mt-2 text-sm">รถยนต์ที่ทำประกัน</p>
          <span className="font-semibold">
            {car.car_brand} {car.car_model} {car.car_year}
          </span>
          <p className="text-sm">
            {car.car_license_plate} {car.registration_province}
          </p>
          <p className="text-sm">{car.chassis_number}</p>
        </div>

        {/* ขวา: รูปรถ */}
        <div className="flex items-center justify-center">
          {car.car_path ? (
            <img
              src={car.car_path}
              alt="Car"
              className="h-[120px] object-contain rounded-md"
            />
          ) : (
            <div className="text-zinc-400">ไม่มีรูป</div>
          )}
        </div>
      </div>

      {/* ---------- Content 3 คอลัมน์ ---------- */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-black">
        {/* ซ้าย: สถานที่เกิดเหตุ */}
        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รายละเอียดที่เกิดเหตุ</h2>
          <div className="w-full h-[200px] bg-zinc-200 flex items-center justify-center rounded overflow-hidden">
            {Number(draft.location?.lat) !== 0 &&
              Number(draft.location?.lng) !== 0 ? (
              <MapPreview lat={draft.location.lat} lng={draft.location.lng} />
            ) : (
              <div className="text-zinc-500">ไม่มีพิกัด</div>
            )}
          </div>
          <p className="text-sm"><span className="font-medium">วัน/เวลา:</span>   {formatDateTime(draft.accident_date, draft.accident_time)}</p>
          <p className="text-sm">
            <span className="font-medium">สถานที่:</span>{" "}
            {draft.province || draft.district || draft.road
              ? `${draft.province || ""} ${draft.district || ""} ${draft.road || ""
                }`.trim()
              : "ไม่ระบุ" + " (" + (draft.location?.lat && draft.location?.lng
                ? `พิกัด: ${draft.location.lat}, ${draft.location.lng}`
                : "ไม่มีพิกัด") + ")"}
          </p>
          <p className="text-sm">
            <span className="font-medium">ประเภทพื้นที่:</span>{" "}
            {draft.areaType}
          </p>
          <p className="text-sm">
            <span className="font-medium">จุดสังเกต:</span>{" "}
            {draft.nearby}
          </p>
          {/* {draft.details && (
            <p className="text-sm">
              <span className="font-medium">รายละเอียด:</span>{" "}
              {draft.details}
            </p>
          )} */}
        </div>

        {/* กลาง: รายละเอียดอุบัติเหตุ */}
        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รายละเอียดอุบัติเหตุ</h2>
          <p className="text-sm">
            <span className="font-medium">ประเภทอุบัติเหตุ:</span>{" "}
            {draft.accidentType}
          </p>
          {draft.details && (
            <p className="text-sm">
              <span className="font-medium">รายละเอียด:</span>{" "}
              {draft.details}
            </p>
          )}
          {draft.evidenceMedia?.length ? (
            <>
              <p className="text-sm font-medium mb-1">
                หลักฐานภาพ/วิดีโอ
              </p>
              <EvidenceGallery media={draft.evidenceMedia} />
            </>
          ) : (
            <p className="text-sm text-zinc-500">ไม่มีหลักฐานภาพ/วิดีโอ</p>
          )}
        </div>

        {/* ขวา: รูปความเสียหาย */}
        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รูปความเสียหาย</h2>
          {draft.damagePhotos?.length ? (
            <EvidenceGallery media={draft.damagePhotos} />
          ) : (
            <p className="text-sm text-zinc-500">ไม่มีข้อมูลความเสียหาย</p>
          )}
        </div>
      </div>
    </div>
  );
}
