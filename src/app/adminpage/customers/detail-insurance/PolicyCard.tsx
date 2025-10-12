"use client";

import React from "react";
import {
  ShieldCheck, Pencil, Calendar,
  Car as CarIcon, Hash, Image as ImageIcon
} from "lucide-react";
import type { InsurancePolicy } from "@/types/claim";

// ------- helpers ในไฟล์ (ให้ component ตัวนี้ใช้ได้เดี่ยว ๆ) -------
const mkLocalDate = (d?: string | null) => {
  if (!d) return null;
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day, 0, 0, 0, 0); // local time
};
export const thDate = (iso?: string | null) => {
  const dt = mkLocalDate(iso);
  return dt
    ? dt.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "-";
};
const activeAt = (start?: string | null, end?: string | null, endTime?: string | null) => {
  const startDt = mkLocalDate(start);
  const endDt = mkLocalDate(end);
  if (!startDt || !endDt) return undefined;
  if (endTime) {
    const [h, m, s] = endTime.split(":").map(Number);
    endDt.setHours(Number.isFinite(h) ? h! : 23, Number.isFinite(m) ? m! : 59, Number.isFinite(s) ? s! : 59, 999);
  } else {
    endDt.setHours(23, 59, 59, 999);
  }
  const now = new Date();
  return now >= startDt && now <= endDt;
};

// ------- UI ย่อยเล็ก ๆ (ไม่ต้องไป import ที่อื่น) -------
export function InfoRow({
  icon, labelText, value,
}: { icon: React.ReactNode; labelText: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3 text-sm">
      <div className="flex items-center gap-2 text-[11px] text-zinc-500 uppercase tracking-wide">
        {icon}<span>{labelText}</span>
      </div>
      <div className="mt-1 font-medium break-all">{value ?? "-"}</div>
    </div>
  );
}

// ------- คอมโพเนนต์หลัก -------
export default function PolicyCard({
  p, onEdit,
}: { p: InsurancePolicy; onEdit: (p: InsurancePolicy) => void }) {
  const active = activeAt(p.coverage_start_date, p.coverage_end_date, p.coverage_end_time);
  const periodText = `${thDate(p.coverage_start_date)} - ${thDate(p.coverage_end_date)}${
    p.coverage_end_time ? ` (${p.coverage_end_time})` : ""
  }`;

  return (
    <div className="rounded-2xl ring-1 ring-emerald-200/60 bg-white p-4 shadow-sm">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <div className="flex text-black  items-center gap-2">
            <ShieldCheck size={18} />
            <h4 className="font-semibold text-black break-all">{p.policy_number}</h4>
          </div>
          <div className="text-xs text-zinc-500 mt-1 sm:mt-0">{p.insurance_company}</div>
        </div>
        <div className="flex items-center gap-2">
          {typeof active !== "undefined" && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
              active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-zinc-50 text-zinc-600 ring-zinc-200"
            }`}>
              {active ? "กำลังคุ้มครอง" : "หมดอายุ"}
            </span>
          )}
          <button onClick={() => onEdit(p)} className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-sm">
            <Pencil size={16} /> แก้ไข
          </button>
        </div>
      </div>

      {/* body */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3  text-black text-sm">
        <InfoRow icon={<Hash size={14} />} labelText="ผู้เอาประกัน" value={p.insured_name} />
        <InfoRow icon={<Hash size={14} />} labelText="เลขบัตรประชาชน" value={p.citizen_id} />
        <InfoRow icon={<Hash size={14} />} labelText="บริษัทประกัน" value={p.insurance_company} />
        <InfoRow icon={<Hash size={14} />} labelText="ประเภทประกัน" value={p.insurance_type || "-"} />
        <InfoRow icon={<Calendar size={14} />} labelText="ระยะคุ้มครอง" value={periodText} />
        <InfoRow icon={<CarIcon size={14} />} labelText="รถ" value={[p.car_brand, p.car_model].filter(Boolean).join(" ") || "-"} />
        <InfoRow icon={<CarIcon size={14} />} labelText="ทะเบียน" value={p.car_license_plate || "-"} />
        <InfoRow icon={<CarIcon size={14} />} labelText="เลขตัวถัง" value={p.chassis_number || "-"} />
        <InfoRow icon={<CarIcon size={14} />} labelText="สีรถ" value={p.car_color || "-"} />
        <InfoRow icon={<CarIcon size={14} />} labelText="จังหวัดจดทะเบียน" value={p.registration_province || "-"} />
      </div>

      {/* image */}
      {p.car_path && (
        <div className="mt-3">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <ImageIcon size={14} /> รูปรถ
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.car_path} alt="car" className="h-28 w-full object-cover rounded-xl ring-1 ring-zinc-200" />
        </div>
      )}
    </div>
  );
}
