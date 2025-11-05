"use client"; // เพื่อใช้ window.print ได้

import React from "react";
import EvidenceGallery from "../components/EvidenceGallery";
import type { Car, AccidentDraft } from "@/types/claim";

export type PdfDetail = {
  claim_id: string | number;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
};

function KV({
  k,
  v,
}: {
  k: string;
  v: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] sm:grid-cols-[180px_1fr] gap-3 text-[14px]">
      <div className="text-zinc-500">{k}</div>
      <div className="font-medium text-zinc-900">{v}</div>
    </div>
  );
}

export default function PdfRequest({ detail }: { detail: PdfDetail }) {
  const { car, accident } = detail;

  const evidenceList = Array.isArray(accident?.evidenceMedia) ? accident.evidenceMedia : [];
  const damageList = Array.isArray(accident?.damagePhotos) ? accident.damagePhotos : [];

  // รูปตัวอย่างใน hero (ถ้ามี)
  const heroThumb =
    (damageList[0]?.url as string | undefined) ||
    (evidenceList[0]?.url as string | undefined) ||
    "";

  // format helper
  const fmtThaiDate = (d?: string) => {
    if (!d) return "-";
    const dd = new Date(d);
    if (isNaN(dd.getTime())) return d; // เผื่อกรณีเป็นรูปแบบวันที่ที่ไม่ใช่ ISO
    return dd.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const fmtThaiDateTime = (d?: string) => {
    if (!d) return "-";
    const dd = new Date(d);
    if (isNaN(dd.getTime())) return d;
    return dd.toLocaleString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // สี badge ตามสถานะ (ถ้ามี)
  const status = detail.status?.trim();
  const statusStyle =
    status === "สำเร็จ"
      ? "bg-emerald-400 text-emerald-950"
      : status === "ปฏิเสธ"
        ? "bg-rose-400 text-rose-950"
        : "bg-amber-400 text-amber-950";

  const carTitle = car
    ? `${car.car_brand ?? ""} ${car.car_model ?? ""}`.trim() || "รถของผู้เอาประกัน"
    : "รถของผู้เอาประกัน";

  const plate = car?.car_license_plate || "-";
  const province = accident?.province ?? "-";
  const district = accident?.district ?? "-";
  const lat =
    typeof accident?.location?.lat === "number"
      ? accident.location.lat.toFixed(6)
      : accident?.location?.lat ?? "-";
  const lng =
    typeof accident?.location?.lng === "number"
      ? accident.location.lng.toFixed(6)
      : accident?.location?.lng ?? "-";

  return (
    <div className="mx-auto max-w-[980px] bg-white text-zinc-900 rounded-2xl shadow-[0_20px_60px_-25px_rgba(0,0,0,0.15)] print:shadow-none print:max-w-none print:rounded-none border border-zinc-200 overflow-hidden">
      {/* Toolbar (ซ่อนตอนพิมพ์) */}
      <div className="print:hidden flex justify-end gap-2 p-3 bg-zinc-50 border-b border-zinc-200">
        <button
          onClick={() => window.print()}
          className={[
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold",
            "bg-white text-[#4c3aa8] border border-violet-100",
            "transform-gpu transition-[transform,background-color,box-shadow] duration-[900ms]",
            "ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-0.5 hover:bg-violet-50",
            "hover:shadow-[0_14px_32px_-18px_rgba(76,58,168,.35)]",
            "focus:outline-none focus:ring-2 focus:ring-violet-200",
          ].join(" ")}
        >
          🖨️ พิมพ์/บันทึก PDF
        </button>
      </div>

      {/* Hero header */}
      <section className="relative px-5 py-6 sm:px-7 sm:py-7 text-white" style={{ background: "linear-gradient(135deg,#4c3aa8,#6b5de3)" }}>
        <h1 className="font-extrabold tracking-tight text-[20px] sm:text-[22px] leading-none">
          รายงานคำขอเคลมประกัน
        </h1>
        <div className="mt-2 inline-flex items-center gap-2">

          <span className="text-white/90 text-[12px] font-medium">
            เลขเคลม: <b>{String(detail.claim_id)}</b>
          </span>
          {detail.created_at ? (
            <span className="text-white/90 text-[12px] font-medium">
              ยื่นเมื่อ: <b>{fmtThaiDateTime(detail.created_at)}</b>
            </span>
          ) : null}
        </div>

        <div className="mt-3 text-[13px] opacity-95 flex flex-wrap gap-x-5 gap-y-1">
          <span><b>รถ:</b> {carTitle} <span className="opacity-90">ทะเบียน</span> {plate}</span>
          {car?.policy_number ? <span><b>เลขกรมธรรม์:</b> {car.policy_number}</span> : null}
          {car?.insurance_type ? <span><b>ประเภทประกัน:</b> {car.insurance_type}</span> : null}
        </div>

        {/* Hero thumbnail (ถ้ามี) */}

      </section>

      {/* Content */}
      <section className="p-5 sm:p-6">
        <div className="grid grid-cols-12 gap-4">
          {/* การ์ดสรุปเหตุการณ์ */}
          <div className="col-span-12 md:col-span-6 rounded-xl border border-zinc-200 p-4">
            <h3 className="text-[16px] font-bold text-zinc-900">รายละเอียดอุบัติเหตุ</h3>
            <div className="mt-3 space-y-2">
              <KV k="วันที่/เวลา" v={`${accident?.accident_date ?? "-"} • ${accident?.accident_time ?? "-"}`} />
              <KV k="ประเภทเหตุการณ์" v={accident?.accidentType ?? "-"} />
              <KV k="จังหวัด/อำเภอ" v={`${province} / ${district}`} />
              <KV k="ประเภทพื้นที่" v={accident?.areaType ?? "-"} />
              <KV k="ถนน" v={accident?.road || "-"} />
              <KV k="จุดสังเกต" v={accident?.nearby || "-"} />
              <KV k="พิกัด" v={`Lat ${lat}, Lng ${lng}`} />
            </div>

            {accident?.details ? (
              <div className="mt-3">
                <div className="text-[14px] font-semibold text-zinc-900">รายละเอียดเพิ่มเติม</div>
                <div className="text-[14px] whitespace-pre-wrap">{accident.details}</div>
              </div>
            ) : null}
          </div>

          {/* การ์ดข้อมูลรถ/กรมธรรม์ */}
          <div className="col-span-12 md:col-span-6 rounded-xl border border-zinc-200 p-4">
            <h3 className="text-[16px] font-bold text-zinc-900">ข้อมูลรถและกรมธรรม์</h3>
            <div className="mt-3 space-y-2">
              <KV k="ยี่ห้อ/รุ่น" v={car ? `${car.car_brand ?? "-"} ${car.car_model ?? ""}`.trim() || "-" : "-"} />
              <KV k="ปีผลิต" v={car?.car_year ? String(car.car_year) : "-"} />
              <KV k="ทะเบียน" v={plate} />

              <KV k="เลขที่กรมธรรม์" v={car?.policy_number || "-"} />
              <KV k="ประเภทประกัน" v={car?.insurance_type || "-"} />
              <KV k="วันหมดอายุ" v={fmtThaiDate(car?.coverage_end_date)} />
            </div>
          </div>

          {/* แกลเลอรีรูปหลักฐาน */}
          {Array.isArray(evidenceList) && evidenceList.length > 0 && (
            <div className="col-span-12 rounded-xl border border-zinc-200 p-4">
              <h3 className="text-[16px] font-bold text-zinc-900">รูปหลักฐาน</h3>
              <div className="mt-3">
                <EvidenceGallery media={evidenceList} thumbWidth={800} />
              </div>
            </div>
          )}

          {/* แกลเลอรีรูปความเสียหาย */}
          {Array.isArray(damageList) && damageList.length > 0 && (
            <div className="col-span-12 rounded-xl border border-zinc-200 p-4">
              <h3 className="text-[16px] font-bold text-zinc-900">รูปความเสียหาย</h3>
              <div className="mt-3">
                <EvidenceGallery media={damageList} thumbWidth={800} />
              </div>
            </div>
          )}

          {/* 👉 หมายเหตุ: ส่วน "สรุปความเสียหาย" และ "ลายเซ็น" จะเพิ่มภายหลังตามที่แจ้ง */}
        </div>
      </section>

      {/* ปรับสำหรับการพิมพ์ */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          /* ซ่อน toolbar ด้านบนแล้วขยายเต็มหน้า */
          .print\\:hidden {
            display: none !important;
          }
          /* ลบเงา/มุมโค้งเพื่อความเรียบร้อยของเอกสาร */
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          /* ป้องกันรูปแกลเลอรีแตกหน้าแบบแปลก ๆ */
          img {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}