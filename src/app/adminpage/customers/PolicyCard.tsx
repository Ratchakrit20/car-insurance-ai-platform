"use client";
import { ShieldCheck, Edit3 } from "lucide-react";
import type { InsurancePolicy } from "@/types/claim";

const thDate = (iso?: string | null) =>
  !iso ? "-" : new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function PolicyCard({
  p,
  onEdit,
}: {
  p: InsurancePolicy;
  onEdit: (p: InsurancePolicy) => void;
}) {
  return (
    <div className="rounded-2xl ring-1 ring-indigo-200/60 bg-white shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-black" size={18} />
          <h3 className="font-semibold text-base  text-black sm:text-lg">เลขกรมธรรม์: {p.policy_number}</h3>
        </div>
        <div className="hidden sm:flex text-xs text-black items-center gap-1">
          <span>สิ้นสุด</span>
          <span className="font-medium">{thDate(p.coverage_end_date)}</span>
        </div>
      </div>

      <div className="text-xs text-zinc-500 mt-1">
        ผู้เอาประกัน: <span className="font-medium text-black">{p.insured_name ?? "-"}</span>
      </div>

      <dl className="mt-3 grid grid-cols-1 text-black gap-2 text-sm">
        <div className="rounded-xl bg-zinc-50 p-3">
          <div className="text-[11px] font-medium text-black uppercase tracking-wide">บริษัทประกัน</div>
          <div className="mt-1 font-medium">{p.insurance_company ?? "-"}</div>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3">
          <div className="text-[11px] font-medium text-black uppercase tracking-wide">ประเภท</div>
          <div className="mt-1 font-medium">{p.insurance_type ?? "-"}</div>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3">
          <div className="text-[11px] font-medium text-black uppercase tracking-wide">วันเริ่มคุ้มครอง</div>
          <div className="mt-1 font-medium">{thDate(p.coverage_start_date)}</div>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3">
          <div className="text-[11px] font-medium text-black uppercase tracking-wide">วันสิ้นสุดคุ้มครอง</div>
          <div className="mt-1 font-medium">{thDate(p.coverage_end_date)}</div>
        </div>
        <div className="rounded-xl bg-zinc-50 text-black p-3">
          <div className="text-[11px] font-medium text-blackuppercase text-black tracking-wide">ทะเบียนรถ</div>
          <div className="mt-1 font-medium">{p.car_license_plate ?? "-"}</div>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3">
          <div className="text-[11px] font-medium text-black uppercase tracking-wide">ยี่ห้อ / รุ่น</div>
          <div className="mt-1 font-medium">
            {p.car_brand ?? "-"}{p.car_model ? ` / ${p.car_model}` : ""}
          </div>
        </div>
      </dl>

      <div className="mt-4 flex justify-between">
        <button
          onClick={() => onEdit(p)}
          className="h-10 rounded-2xl px-4 bg-amber-500 text-white hover:bg-amber-600 text-sm inline-flex items-center gap-2"
        >
          <Edit3 size={16} /> แก้ไข
        </button>
      </div>
    </div>
  );
}
