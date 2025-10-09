"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ClaimStatus, Car, AccidentDraft, DamagePhoto, MediaItem } from "@/types/claim";
import ClaimReportPreview from "../reports/ClaimReportPreview";
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
    FaTimes as FaXmark, // ✅ ตัวนี้เปลี่ยนชื่อ
} from "react-icons/fa";


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
    onOpenPdf?: () => void;
};


function formatDateTime(iso?: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// -------------------- Mapper จาก API -> Car / AccidentDraft --------------------
type DetailAPI = {
    claim_id: string | number;
    user_id: number;
    status: string;
    selected_car_id: number;
    accident_detail_id: number;
    created_at?: string;
    accident_type?: string;
    accident_date?: string;   // ISO
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

function isVideoUrl(url?: string | null) {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.endsWith(".mp4") || u.endsWith(".mov") || u.endsWith(".webm") || u.includes("video/upload");
}

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
        chassis_number: "", // ถ้า API ไม่มี ให้เว้นว่าง
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

// -----------------------------------------------------------------------------
export default function ClaimTimeline({
    claimId,
    status,
    created_at,
    updated_at,
    approved_at,
    rejected_at,
    incomplete_at,
    admin_note,
    incomplete_history = [],
    resubmitted_history = [],
}: TimelineProps) {
    const [open, setOpen] = useState(false);
    const [car, setCar] = useState<Car | null>(null);
    const [draft, setDraft] = useState<AccidentDraft | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const safeIncomplete = Array.isArray(incomplete_history)
        ? incomplete_history
        : [];

    console.log("✅ incomplete_histor y=>", safeIncomplete);
    console.log("status =>", status);
    // เปิด/ปิด modal → ล็อคสกอลล์หน้าหลัง
    useEffect(() => {
        if (!open) return;
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `http://localhost:3001/api/claim-requests/detail?claim_id=${claimId}`,
                    { credentials: "include", cache: "no-store" }
                );

                const json = await res.json();
                if (!alive) return;
                if (!res.ok || !json?.ok) throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");
                setCar(json.data.car);
                setDraft(json.data.draft);
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

    const steps: { icon: React.ReactNode; title: string; time?: string; desc?: string; action?: React.ReactNode }[] = [];

    // สร้างเอกสาร
    if (created_at) {
        steps.push({
            icon: <FaFileAlt className="text-indigo-500" />,
            title: "สร้างเอกสารการเคลม",
            time: formatDateTime(created_at),
            desc: "รอเจ้าหน้าที่ตรวจสอบเอกสารของคุณ",
            action: (
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                >
                    <FaEye /> ดูรายงาน
                </button>
            ),
        });
    }

    // การตีกลับหลายรอบ
    // ✅ รองรับหลายรอบการแจ้งแก้ไขจากเจ้าหน้าที่
    if ((safeIncomplete && safeIncomplete.length > 0) || admin_note) {
        const allHistory: { time: string; note: string }[] = [];

        if (admin_note && incomplete_at) {
            allHistory.push({ time: incomplete_at, note: admin_note });
        }

        allHistory.push(...safeIncomplete);

        allHistory.sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );

        allHistory.forEach((item, idx) => {
            steps.push({
                icon: <FaExclamationTriangle className="text-amber-500" />,
                title: `รอบที่ ${idx + 1}: เจ้าหน้าที่แจ้งแก้ไขข้อมูล`,
                time: formatDateTime(item.time),
                desc: item.note || "-",
                action:
                    idx === allHistory.length - 1 ? (
                        <button
                            onClick={() => (window.location.href = `/claim/edit/${claimId}`)}
                            className="flex items-center gap-2 text-sm text-amber-600 hover:underline"
                        >
                            <FaEdit /> ไปหน้าแก้ไขข้อมูล
                        </button>
                    ) : undefined,
            });
        });
    }



    // การรีซับมิตหลายรอบ
    if (resubmitted_history.length > 0) {
        resubmitted_history.forEach((r, idx) => {
            steps.push({
                icon: <FaRedoAlt className="text-blue-500" />,
                title: `ผู้ใช้ส่งกลับครั้งที่ ${idx + 1}`,
                time: formatDateTime(r.time),
                desc: r.note || "ส่งเอกสารที่แก้ไขแล้วกลับมาใหม่",
            });
        });
    } else if (
        updated_at &&
        incomplete_at &&
        new Date(updated_at).getTime() > new Date(incomplete_at).getTime() &&
        status !== "approved" &&
        status !== "rejected"
    ) {
        steps.push({
            icon: <FaRedoAlt className="text-blue-500" />,
            title: "ผู้ใช้ส่งเอกสารที่แก้ไขแล้วกลับมาใหม่",
            time: formatDateTime(updated_at),
            desc: "รอเจ้าหน้าที่ตรวจสอบอีกครั้ง",
        });
    }

    // ผลการตรวจสอบสุดท้าย
    if (status === "approved" || status === "สำเร็จ") {
        steps.push({
            icon: <FaCheckCircle className="text-emerald-500" />,
            title: "เอกสารถูกอนุมัติ",
            time: formatDateTime(approved_at),
            desc: "เจ้าหน้าที่ได้ยืนยันข้อมูลเรียบร้อยแล้ว",
        });
    } else if (status === "rejected" || status === "เอกสารไม่ผ่านการตรวจสอบ") {
        steps.push({
            icon: <FaTimesCircle className="text-rose-500" />,
            title: "เอกสารถูกปฏิเสธ",
            time: formatDateTime(rejected_at),
            desc: admin_note || "-",
        });
    }


    return (
        <>
            {/* Timeline */}
            <div className="space-y-5 border-l border-zinc-200 pl-5">
                {steps.map((step, i) => (
                    <div key={i} className="relative">
                        {/* จุดกลม */}
                        <div className="absolute -left-[8px] top-1.5 h-4 w-4 rounded-full bg-white ring-2 ring-zinc-300 flex items-center justify-center">
                            {step.icon}
                        </div>

                        {/* เนื้อหา */}
                        <div className="ml-6">
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                                {step.title}
                            </div>
                            {step.time && <div className="text-xs text-zinc-500">{step.time}</div>}
                            {step.desc && (
                                <div className="mt-1 text-sm text-zinc-600 leading-relaxed">{step.desc}</div>
                            )}
                            {step.action && <div className="mt-2">{step.action}</div>}
                        </div>
                    </div>
                ))}
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
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <div className="font-semibold text-zinc-700 flex items-center gap-2">
                                <FaFileAlt /> เอกสารคำขอเคลม
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                                >
                                    <FaPrint /> พิมพ์
                                </button>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-2 rounded-md bg-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-300"
                                >
                                    <FaXmark /> ปิด
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            {loading ? (
                                <div className="py-12 text-center text-zinc-500">กำลังโหลดข้อมูล…</div>
                            ) : error ? (
                                <div className="py-12 text-center text-rose-600">{error}</div>
                            ) : (
                                <ClaimReportPreview car={car} draft={draft} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}