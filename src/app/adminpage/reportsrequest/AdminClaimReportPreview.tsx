"use client";

import React from "react";
import type { Car, AccidentDraft } from "@/types/claim";
import EvidenceGallery from "@/app/components/EvidenceGallery";
import MapPreview from "@/app/components/MapPreview";
import { mapAccidentDraft } from "@/mappers/accidentDraft";

type Props = {
  car: Car | null;
  draft: AccidentDraft | null;
};
function formatThaiDate(dateStr?: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(timeStr?: string) {
  if (!timeStr) return "";
  // ให้ browser ช่วย format เป็น HH:mm
  const [h, m] = timeStr.split(":");
  return `${h?.padStart(2, "0")}:${m?.padStart(2, "0")}`;
}

export default function AdminClaimReportPreview({ car, draft }: Props) {
  if (!car || !draft) {
    return (

      <div className="p-6 text-center text-zinc-500">
        ไม่พบข้อมูลสำหรับแสดงรายงาน
      </div>
    );
  }

 let mappedDraft = draft;
try {
  mappedDraft = mapAccidentDraft(draft);
} catch {
  console.warn("⚠️ mapAccidentDraft failed, using raw draft");
}
  return (
    <div className="mx-auto max-w-6xl bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="bg-[#333333] text-white rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ซ้าย: ผู้เอาประกัน */}
        <div>
          <h2 className="text-lg font-bold">รายงานคำขอเคลม</h2>
          <p className="mt-2 text-sm">ผู้เอาประกัน</p>
          <span className="font-semibold">{car.insured_name}</span>
          <p className="text-sm">{car.policy_number}</p>
        </div>

        {/* กลาง: รถยนต์ */}
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

      {/* Content 3 คอลัมน์ */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-black">
        {/* ซ้าย: รายละเอียดที่เกิดเหตุ */}
        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รายละเอียดที่เกิดเหตุ</h2>
          <div className="w-full h-[200px] bg-zinc-200 flex items-center justify-center rounded overflow-hidden">
            {mappedDraft.location?.lat && mappedDraft.location?.lng ? (
              <MapPreview
                lat={mappedDraft.location.lat}
                lng={mappedDraft.location.lng}
              />
            ) : (
              <div className="text-zinc-500">ไม่มีพิกัด</div>
            )}
          </div>
          <p className="text-sm">
            <span className="font-medium">วัน/เวลา:</span>
            {formatThaiDate(mappedDraft.accident_date)}{" "}
            {formatTime(mappedDraft.accident_time)}
          </p>
          <p className="text-sm">
            <span className="font-medium">สถานที่:</span>{" "}
            {mappedDraft.province} {mappedDraft.district} {mappedDraft.road}
          </p>
          {/* <p className="text-sm">
            <span className="font-medium">ประเภทพื้นที่:</span>{" "}
           {mappedDraft.areaType}
          </p> */}
          <p className="text-sm">
            <span className="font-medium">จุดสังเกต:</span>{" "}
            {mappedDraft.nearby}
          </p>
          {mappedDraft.details && (
            <p className="text-sm">
              <span className="font-medium">รายละเอียด:</span>{" "}
              {mappedDraft.details}
            </p>
          )}
        </div>


        {/* กลาง: รายละเอียดอุบัติเหตุ */}
        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รายละเอียดอุบัติเหตุ</h2>
          <p className="text-sm">
            <span className="font-medium">ประเภทอุบัติเหตุ:</span>{" "}
            {mappedDraft.accidentType}
          </p>
          {draft.evidenceMedia?.length ? (
            <>
              <p className="text-sm font-medium mb-1">หลักฐานภาพ/วิดีโอ</p>
              <EvidenceGallery
                media={draft.evidenceMedia?.filter(p => p?.url) ?? []}
              />
            </>
          ) : (
            <p className="text-sm text-zinc-500">ไม่มีหลักฐาน</p>
          )}
        </div>

        {/* ขวา: ความเสียหาย */}
        <div className="bg-zinc-50 rounded-lg p-4 space-y-3">
          <h2 className="font-semibold mb-3">รูปความเสียหาย</h2>
          {draft.damagePhotos?.length ? (
            <EvidenceGallery
              media={draft.damagePhotos?.filter(p => p?.url) ?? []}
            />

          ) : (
            <p className="text-sm text-zinc-500">ไม่มีข้อมูลความเสียหาย</p>
          )}
        </div>
      </div>
    </div>
  );
}
