"use client";

import React, { useEffect, useState, useMemo } from "react";
import type { ClaimStatus, Car, AccidentDraft, DamagePhoto, MediaItem } from "@/types/claim";
import ClaimReportPreview, { mapClaimData } from "../reports/ClaimReportPreview";
import {
    FaClock,
    FaFileAlt,
    FaExclamationTriangle,
    FaRedoAlt,
    FaCheckCircle,
    FaTimesCircle,
    FaEdit,
    FaEye,
    FaPrint,
    FaTimes as FaXmark, // ✅ เปลี่ยนชื่อป้องกันซ้ำ
} from "react-icons/fa";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/* -------------------- Props -------------------- */
type TimelineProps = {
    claimId: string;
    status: ClaimStatus | "pending" | "incomplete" | "rejected" | "approved";
    created_at?: string | null;
    updated_at?: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    incomplete_at?: string | null;
    admin_note?: string | null;
    incomplete_history?: Array<{ time: string; note: string }>;
    resubmitted_history?: Array<{ time: string; note: string }>;
    car?: Car;
    draft?: AccidentDraft;
    onOpenPdf?: () => void;
};

/* -------------------- Utils -------------------- */
function formatDateTime(iso?: string | null) {
    if (!iso) return "-";
    return dayjs(iso).tz("Asia/Bangkok").format("DD/MM/YYYY HH:mm");
}

function isVideoUrl(url?: string | null) {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.endsWith(".mp4") || u.endsWith(".mov") || u.endsWith(".webm") || u.includes("video/upload");
}

/* -------------------- Mapper -------------------- */
type DetailAPI = {
    claim_id: string | number;
    user_id: number;
    status: string;
    selected_car_id: number;
    accident_detail_id: number;
    created_at?: string;
    accident_type?: string;
    accident_date?: string;
    accident_time?: string;
    area_type?: string;
    province?: string;
    district?: string;
    road?: string;
    nearby?: string;
    details?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
    accuracy?: string | number | null;
    evidence_file_url?: string | null;
    media_type?: "image" | "video" | string | null;
    car_brand?: string;
    car_model?: string;
    car_year?: number | string;
    license_plate?: string;
    insurance_type?: string;
    policy_number?: string;
    coverage_end_date?: string;
    insured_name?: string;
    car_path?: string;
    damage_images?: Array<{
        id: number;
        original_url: string;
        damage_note?: string | null;
        side?: "ซ้าย" | "ขวา" | "หน้า" | "หลัง" | string | null;
        is_annotated?: boolean;
        annotations?: any[];
    }>;
};

function mapToCar(d: DetailAPI): Car {
    return {
        id: Number(d.selected_car_id ?? 0),
        car_brand: d.car_brand ?? "-",
        car_model: d.car_model ?? "-",
        car_year: d.car_year ?? "",
        car_license_plate: d.license_plate ?? "-",
        insurance_type: d.insurance_type ?? "-",
        insured_name: d.insured_name ?? "-",
        policy_number: d.policy_number ?? "-",
        coverage_end_date: d.coverage_end_date ?? "",
        car_path: d.car_path ?? "",
        chassis_number: "",
        registration_province: d.province ?? "",
    };
}

function mapToDraft(d: DetailAPI): AccidentDraft {
    const lat = d.latitude != null ? Number(d.latitude) : NaN;
    const lng = d.longitude != null ? Number(d.longitude) : NaN;

    const evidenceMedia: MediaItem[] = [];
    if (d.evidence_file_url) {
        evidenceMedia.push({
            id: 1,
            url: d.evidence_file_url,
            type: isVideoUrl(d.evidence_file_url) ? "video" : "image",
        } as any);
    }

    const damagePhotos: DamagePhoto[] = Array.isArray(d.damage_images)
        ? d.damage_images.map((img, i) => ({
            id: img.id ?? i + 1,
            url: img.original_url,
            type: "image",
            side: (img.side as any) ?? "ไม่ระบุ",
            note: img.damage_note ?? undefined,
            total: null,
            perClass: null,
            annotations: [],
        }))
        : [];

    return {
        accidentType: d.accident_type ?? "-",
        accident_date: d.accident_date ?? "",
        accident_time: d.accident_time ?? "",
        province: d.province ?? null,
        district: d.district ?? null,
        road: d.road ?? null,
        areaType: d.area_type ?? "-",
        nearby: d.nearby ?? null,
        details: d.details ?? null,
        location: {
            lat: !Number.isNaN(lat) ? lat : (null as any),
            lng: !Number.isNaN(lng) ? lng : (null as any),
            accuracy: d.accuracy != null ? Number(d.accuracy) : null,
        },
        evidenceMedia,
        damagePhotos,
    };
}

/* -------------------- Component -------------------- */
export default function ClaimTimeline({
    claimId,
    status,
    created_at,
    approved_at,
    rejected_at,
    incomplete_at,
    admin_note,
    incomplete_history = [],
    resubmitted_history = [],
    car,
    draft,
}: TimelineProps) {
    const [open, setOpen] = useState(false);
    const [remote, setRemote] = useState<{ car: Car; draft: AccidentDraft } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const base = process.env.NEXT_PUBLIC_URL_PREFIX || "http://localhost:3001";
                const res = await fetch(`${base}/api/claim-requests/detail?claim_id=${claimId}`, {
                    credentials: "include",
                    cache: "no-store",
                });
                const json = await res.json();

                if (!alive) return;
                if (!res.ok || !json?.ok) throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");

                const mapped = mapClaimData(json.data);
                setRemote({ car: mapped.car, draft: mapped.draft });
            } catch (e: any) {
                if (alive) setError(e?.message ?? "เกิดข้อผิดพลาด");
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [open, claimId]);
    const carToUse = remote?.car ?? car ?? null;
    const draftToUse = remote?.draft ?? draft ?? null;
    const hasData = !!carToUse && !!draftToUse;

    /* -------------------- รวมเหตุการณ์ -------------------- */
    const steps = useMemo(() => {
        const combined: {
            icon: React.ReactNode;
            title: string;
            time: string;
            desc?: string;
            order?: number;
            action?: React.ReactNode;
        }[] = [];

        // 1️⃣ สร้างเอกสาร
        if (created_at) {
            combined.push({
                icon: <FaFileAlt className="text-indigo-500" />,
                title: "สร้างเอกสารการเคลม",
                time: formatDateTime(created_at),
                desc: "รอเจ้าหน้าที่ตรวจสอบเอกสารของคุณ",
            });
        }

        // 2️⃣ แจ้งแก้ไขข้อมูล
        const allIncomplete = [...(incomplete_history || [])];
        if (
            admin_note &&
            incomplete_at &&
            !allIncomplete.some(
                (x) =>
                    dayjs(x.time).isSame(incomplete_at) ||
                    (x.note && x.note.trim() === admin_note.trim())
            )
        ) {
            allIncomplete.push({ time: incomplete_at, note: admin_note });
        }

        allIncomplete.forEach((item, i) => {
            combined.push({
                icon: <FaExclamationTriangle className="text-amber-500" />,
                title: `รอบที่ ${i + 1}: เจ้าหน้าที่แจ้งแก้ไขข้อมูล`,
                time: formatDateTime(item.time),
                desc: item.note || "-",
            });
        });

        // 3️⃣ ผู้ใช้ส่งกลับ
        const allResubmit = [...(resubmitted_history || [])];
        allResubmit.forEach((r, i) => {
            combined.push({
                icon: <FaRedoAlt className="text-blue-500" />,
                title: `ผู้ใช้ส่งกลับครั้งที่ ${i + 1}`,
                time: formatDateTime(r.time),
                desc: r.note || "ส่งเอกสารที่แก้ไขแล้วกลับมาใหม่",
            });
        });

        // 4️⃣ ผลสุดท้าย
        if (status === "approved" || status === "สำเร็จ") {
            combined.push({
                icon: <FaCheckCircle className="text-emerald-500" />,
                title: "เอกสารถูกอนุมัติ",
                time: approved_at ?? new Date().toISOString(),
                desc: "เจ้าหน้าที่ได้ยืนยันข้อมูลเรียบร้อยแล้ว",
            });
        } else if (status === "rejected" || status === "เอกสารไม่ผ่านการตรวจสอบ") {
            combined.push({
                icon: <FaTimesCircle className="text-rose-500" />,
                title: "เอกสารถูกปฏิเสธ",
                time: formatDateTime(rejected_at),
                desc: admin_note || "-",
            });
        }

        // ✅ เรียงลำดับเวลา
        combined.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        // ✅ เงื่อนไขปุ่ม "ไปหน้าแก้ไขข้อมูล"
        const lastIncompleteIndex = combined.findLastIndex((s) =>
            s.title.includes("เจ้าหน้าที่แจ้งแก้ไขข้อมูล")
        );

        const canEdit =
            status !== "approved" &&
            status !== "rejected" &&
            status !== "สำเร็จ" &&
            status !== "เอกสารไม่ผ่านการตรวจสอบ";

        if (lastIncompleteIndex !== -1 && canEdit) {
            combined[lastIncompleteIndex].action = (
                <button
                    onClick={() => (window.location.href = `/claim/edit/${claimId}`)}
                    className="flex items-center gap-2 text-sm text-amber-600 hover:underline"
                >
                    <FaEdit /> ไปหน้าแก้ไขข้อมูล
                </button>
            );
        }

        // ✅ เงื่อนไขปุ่ม "ดูรายงาน"
        const lastResubmitIndex = combined.findLastIndex((s) =>
            s.title.includes("ผู้ใช้ส่งกลับครั้งที่")
        );

        const viewButton = (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
            >
                <FaEye /> ดูรายงาน
            </button>
        );

        if (lastResubmitIndex !== -1) {
            // เคยส่งกลับ → ใส่ปุ่มไว้ที่ "ผู้ใช้ส่งกลับครั้งล่าสุด"
            combined[lastResubmitIndex].action = viewButton;
        } else {
            // ยังไม่เคยส่งกลับ → ใส่ปุ่มไว้ที่ "สร้างเอกสารการเคลม"
            const createIndex = combined.findIndex((s) =>
                s.title.includes("สร้างเอกสารการเคลม")
            );
            if (createIndex !== -1) {
                combined[createIndex].action = viewButton;
            }
        }

        return combined;
    }, [
        created_at,
        incomplete_history,
        resubmitted_history,
        approved_at,
        rejected_at,
        status,
        admin_note,
        incomplete_at,
        claimId,
    ]);



    /* -------------------- Render -------------------- */
    return (
        <>
           {/* Timeline */}
<div className="ml-6 mt-4">
  <div className="relative">
    {/* เส้นแนวหลักของ timeline */}
    <div className="absolute left-[13px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-zinc-300  to-zinc-300 animate-[drawLine_0.8s_ease-out_forwards]" />

    <div className="space-y-8">
      {steps.map((step, i) => (
        <div key={i} className="relative flex items-start gap-4">
          {/* จุดสถานะ */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                i === steps.length - 1
                  ? "border-zinc-200 bg-white text-white shadow-lg scale-110"
                  : "border-zinc-200 bg-white text-zinc-600"
              }`}
            >
              {step.icon}
            </div>
          </div>

          {/* เนื้อหา */}
          <div className="flex-1">
            <div className="font-medium text-sm text-zinc-800">{step.title}</div>
            {step.time && <div className="text-xs text-zinc-500">{step.time}</div>}
            {step.desc && (
              <div className="mt-1 text-sm text-zinc-600 leading-relaxed">
                {step.desc}
              </div>
            )}
            {step.action && <div className="mt-2">{step.action}</div>}
          </div>
        </div>
      ))}
    </div>
  </div>
</div>




            {/* Modal */}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-xl bg-white shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <div className="font-semibold text-zinc-700 flex items-center gap-2">
                                <FaFileAlt /> เอกสารคำขอเคลม
                            </div>
                            <div className="flex gap-2">
                                
                                <button
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-2 rounded-md bg-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-300"
                                >
                                    <FaXmark /> ปิด
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            {error ? (
                                <div className="py-12 text-center text-rose-600">{error}</div>
                            ) : loading && !hasData ? (
                                <div className="py-12 text-center text-zinc-500">กำลังโหลดข้อมูล...</div>
                            ) : hasData ? (
                                <ClaimReportPreview car={carToUse!} draft={draftToUse!} />
                            ) : (
                                <div className="py-12 text-center text-zinc-500">⚙️ ไม่มีข้อมูลในระบบ</div>
                            )}
                        </div>
                        
                    </div>
                    
                </div>
                
            )}
            
        </>
        
    );
    
}
