"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import type { ClaimStatus, Car, AccidentDraft, DamagePhoto, MediaItem } from "@/types/claim";
import ClaimReportPreview, { mapClaimData } from "../reports/ClaimReportPreview";
import {
    FaFileAlt,
    FaExclamationTriangle,
    FaRedoAlt,
    FaCheckCircle,
    FaTimesCircle,
    FaEdit,
    FaEye,
    FaTimes as FaXmark,
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
    const date = dayjs(iso).isValid() ? dayjs(iso) : dayjs(iso.replace("+07:00", ""));
    return date.tz("Asia/Bangkok").format("DD/MM/YYYY HH:mm");
}

/* -------------------- Component -------------------- */
export default function ClaimTimeline({
    claimId,
    status,
    created_at,
    approved_at,
    rejected_at,
}: TimelineProps) {
    const [open, setOpen] = useState(false);
    const [remote, setRemote] = useState<{ car: Car; draft: AccidentDraft } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [incompleteHistory, setIncompleteHistory] = useState<any[]>([]);
    const [incompleteAt, setIncompleteAt] = useState<string | null>(null);
    const [adminNote, setAdminNote] = useState<string | null>(null);
    const [resubmittedHistory, setResubmittedHistory] = useState<any[]>([]);
    const fetchIdRef = useRef(0);
    const [approvedAt, setApprovedAt] = useState<string | null>(null);
    const [rejectedAt, setRejectedAt] = useState<string | null>(null);
    /* -------------------- Fetch data -------------------- */
    useEffect(() => {
        const controller = new AbortController();
        const currentFetchId = ++fetchIdRef.current;
        function resolveBaseUrl(raw?: string) {
            // ดีฟอลต์ฝั่งโปรดักชัน
            const DEFAULT = "https://cdd-backend-deyv.onrender.com";
            if (!raw || !raw.trim()) return DEFAULT;

            let u = raw.trim();

            // ถ้าเป็น ":3001" หรือ "3001" ให้ประกอบกับ host ปัจจุบัน
            if (u.startsWith(":") || /^\d+$/.test(u)) {
                const { protocol, hostname } = window.location;
                if (/^\d+$/.test(u)) u = `:${u}`;
                return `${protocol}//${hostname}${u}`;
            }

            // ถ้าไม่มี protocol เติมให้ครบ
            if (!/^https?:\/\//i.test(u)) return `https://${u}`;

            return u;
        }
        async function loadDetail() {
            try {
                setLoading(true);
                setError(null);
                const rawBase = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_URL_PREFIX;
                const base = resolveBaseUrl(rawBase);
                const token = localStorage.getItem("token") || "";

                const res = await fetch(`${base}/api/claim-requests/detail?claim_id=${claimId}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    signal: controller.signal,
                    cache: "no-store",
                });

                // เช็ค network/HTTP error ชัดๆ
                if (!res.ok) {
                    const text = await res.text().catch(() => "");
                    throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status}) ${text || ""}`);
                }

                let json: any;
                try {
                    json = await res.json();
                } catch {
                    throw new Error("รูปแบบข้อมูลตอบกลับไม่ถูกต้อง");
                }

                if (!json.ok) throw new Error(json.message || "ไม่สามารถโหลดข้อมูลได้");
                const data = json.data;
                const mapped = mapClaimData(data);

                setApprovedAt(data.approved_at || null);
                setRejectedAt(data.rejected_at || null);
                setRemote({ car: mapped.car, draft: mapped.draft });
                setIncompleteHistory(data.incomplete_history || []);
                setIncompleteAt(data.incomplete_at || null);
                setAdminNote(data.admin_note || null);
                setResubmittedHistory(data.resubmitted_history || []);
            } catch (err: any) {
                if (err.name === "AbortError") return;
                setError(err.message || "เกิดข้อผิดพลาดขณะโหลดข้อมูล");
            } finally {
                setLoading(false);
            }
        }

        loadDetail();
        return () => controller.abort();
    }, [claimId]);

    const carToUse = remote?.car ?? null;
    const draftToUse = remote?.draft ?? null;
    const hasData = !!carToUse && !!draftToUse;

    /* -------------------- รวมเหตุการณ์ -------------------- */
    const steps = useMemo(() => {
        const combined: {
            icon: React.ReactNode;
            title: string;
            time: string;
            desc?: string;
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
        const allIncomplete = [...(incompleteHistory || [])];
        if (
            adminNote &&
            incompleteAt &&
            !allIncomplete.some(
                (x) =>
                    dayjs(x.time).isSame(incompleteAt) ||
                    (x.note && x.note.trim() === adminNote.trim())
            )
        ) {
            allIncomplete.push({ time: incompleteAt, note: adminNote });
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
        resubmittedHistory.forEach((r, i) => {
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
                time: formatDateTime(approvedAt),
                desc: "เจ้าหน้าที่ได้ยืนยันข้อมูลเรียบร้อยแล้ว",
            });
        } else if (status === "rejected" || status === "เอกสารไม่ผ่านการตรวจสอบ") {
            combined.push({
                icon: <FaTimesCircle className="text-rose-500" />,
                title: "เอกสารถูกปฏิเสธ",
                time: formatDateTime(rejectedAt),
                desc: adminNote || "-",
            });
        }

        // ✅ เรียงลำดับเวลา
        combined.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        // ✅ ปุ่มแก้ไขข้อมูล
        const lastIncompleteIndex = combined.findLastIndex((s) =>
            s.title.includes("เจ้าหน้าที่แจ้งแก้ไขข้อมูล")
        );
        if (lastIncompleteIndex !== -1 && status !== "approved" && status !== "rejected") {
            combined[lastIncompleteIndex].action = (
                <button
                    onClick={() => (window.location.href = `/claim/edit/${claimId}`)}
                    className="flex items-center gap-2 text-sm text-amber-600 hover:underline"
                >
                    <FaEdit /> ไปหน้าแก้ไขข้อมูล
                </button>
            );
        }

        // ✅ ปุ่มดูรายงาน
        const viewButton = (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
            >
                <FaEye /> ดูรายงาน
            </button>
        );
        combined[0].action = viewButton; // ใส่ไว้ขั้นแรก

        return combined;
    }, [created_at, incompleteHistory, resubmittedHistory, approved_at, rejected_at, status, adminNote, incompleteAt, claimId]);

    /* -------------------- Render -------------------- */
    return (
        <>
            {/* Timeline */}
            <div className="ml-6 mt-4">
                <div className="relative">
                    <div className="absolute left-[13px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-zinc-300 to-zinc-300" />
                    <div className="space-y-8">
                        {steps.map((step, i) => (
                            <div key={i} className="relative flex items-start gap-4">
                                <div className="relative z-10 flex flex-col items-center">
                                    <div
                                        className={`h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${i === steps.length - 1
                                            ? "border-zinc-200 bg-white text-white shadow-lg scale-110 ring-2 ring-indigo-400"
                                            : "border-zinc-200 bg-white text-zinc-600"
                                            }`}
                                    >
                                        {step.icon}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-sm text-zinc-800">{step.title}</div>
                                    {step.time && <div className="text-xs text-zinc-500">{step.time}</div>}
                                    {step.desc && (
                                        <div className="mt-1 text-sm text-zinc-600 leading-relaxed">{step.desc}</div>
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
                            <button
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2 rounded-md bg-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-300"
                            >
                                <FaXmark /> ปิด
                            </button>
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
