"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";

import type { ClaimStatus, Car, AccidentDraft, DamagePhoto, MediaItem } from "@/types/claim";
import {
    FileText,
    MapPin,
    Paperclip,
    Image as ImageIcon,
    StickyNote,
} from "lucide-react";
import { Car as CarIcon } from "lucide-react";
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
                setAdminNote(
                    typeof data.admin_note === "string"
                        ? data.admin_note
                        : JSON.stringify(data.admin_note || "")
                ); setResubmittedHistory(data.resubmitted_history || []);
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
    const [showAdminNoteModal, setShowAdminNoteModal] = useState(false);
    const [selectedAdminNote, setSelectedAdminNote] = useState<any>(null);

    /* -------------------- รวมเหตุการณ์ -------------------- */
    const steps = useMemo(() => {
        const combined: {
            icon: React.ReactNode;
            title: string;
            time: string;      // สำหรับแสดง
            rawTime: string;   // สำหรับ sort จริง
            desc?: React.ReactNode;
            action?: React.ReactNode;
        }[] = [];

        // 1️⃣ สร้างเอกสาร
        if (created_at) {
            combined.push({
                icon: <FaFileAlt className="text-indigo-500" />,
                title: "สร้างเอกสารการเคลม",
                time: formatDateTime(created_at),
                rawTime: created_at,
                desc: "รอเจ้าหน้าที่ตรวจสอบเอกสารของคุณ",
            });
        }

        // 2️⃣ แจ้งแก้ไขข้อมูล
        const allIncomplete = [...(incompleteHistory || [])];
        if (
            adminNote &&
            incompleteAt &&
            !allIncomplete.some((x) => dayjs(x.time).isSame(incompleteAt))
        ) {
            allIncomplete.push({ time: incompleteAt, note: adminNote });
        }

        allIncomplete.forEach((item, i) => {
            combined.push({
                icon: <FaExclamationTriangle className="text-amber-500" />,
                title: `รอบที่ ${i + 1}: เจ้าหน้าที่แจ้งแก้ไขข้อมูล`,
                time: formatDateTime(item.time),
                rawTime: item.time,
                desc: (
                    <div className="space-y-2">
                        <p>
                            {(() => {
                                try {
                                    // ถ้า note เป็น JSON string ให้แสดงข้อความสั้น ๆ แทน
                                    const parsed = JSON.parse(item.note);
                                    if (parsed.note || parsed.comment) {
                                        return parsed.note || parsed.comment;
                                    }
                                    return "เจ้าหน้าที่ได้แจ้งแก้ไขรายละเอียดบางส่วน";
                                } catch {
                                    // ถ้าไม่ใช่ JSON ก็แสดงข้อความตามปกติ
                                    return item.note || "-";
                                }
                            })()}
                        </p>
                        <button
                            onClick={() => {
                                try {
                                    let parsed: any = null;
                                    if (typeof item.note === "string") parsed = JSON.parse(item.note);
                                    else if (typeof item.note === "object" && item.note !== null) parsed = item.note;
                                    else throw new Error("invalid note format");

                                    setSelectedAdminNote(parsed);
                                    setShowAdminNoteModal(true);
                                } catch (err) {
                                    console.error("❌ Failed to parse admin note:", err);
                                    alert("ไม่สามารถเปิดรายละเอียดการแก้ไขได้ (รูปแบบข้อมูลไม่ถูกต้อง)");
                                }
                            }}
                            className="flex items-center gap-2 text-sm text-amber-600 hover:underline"
                        >
                            <FaEye />
                            ดูแจ้งแก้ไขข้อมูล
                        </button>

                    </div>
                ),
            });
        });

        // 3️⃣ ผู้ใช้ส่งกลับ
        resubmittedHistory.forEach((r, i) => {
            combined.push({
                icon: <FaRedoAlt className="text-blue-500" />,
                title: `ผู้ใช้ส่งกลับครั้งที่ ${i + 1}`,
                time: formatDateTime(r.time),
                rawTime: r.time,
                desc: r.note || "ส่งเอกสารที่แก้ไขแล้วกลับมาใหม่",
            });
        });

        // 4️⃣ ผลสุดท้าย
        if (status === "approved" || status === "สำเร็จ") {
            combined.push({
                icon: <FaCheckCircle className="text-emerald-500" />,
                title: "เอกสารถูกอนุมัติ",
                time: formatDateTime(approvedAt),
                rawTime: approvedAt || "",
                desc: "เจ้าหน้าที่ได้ยืนยันข้อมูลเรียบร้อยแล้ว",
            });
        } else if (status === "rejected" || status === "เอกสารไม่ผ่านการตรวจสอบ") {
    let noteText: string = "-";

    try {
        if (typeof adminNote === "string") {
            const parsed = JSON.parse(adminNote);
            // 👇 ตรวจให้แน่ใจว่า parsed เป็น object ที่มี text
            if (parsed && typeof parsed === "object" && "text" in parsed) {
                noteText = (parsed as { text?: string }).text || "-";
            } else {
                noteText = adminNote;
            }
        } else if (adminNote && typeof adminNote === "object" && "text" in adminNote) {
            noteText = (adminNote as { text?: string }).text || "-";
        } else {
            noteText = String(adminNote || "-");
        }
    } catch {
        noteText = String(adminNote || "-");
    }

    combined.push({
        icon: <FaTimesCircle className="text-rose-500" />,
        title: "เอกสารถูกปฏิเสธ",
        time: formatDateTime(rejectedAt),
        rawTime: rejectedAt || "",
        desc: noteText,
    });
}



        // เรียงลำดับตามเวลา (เก่าก่อนใหม่ทีหลัง)
        combined.sort((a, b) => new Date(a.rawTime).getTime() - new Date(b.rawTime).getTime());

        //ย้าย "สร้างเอกสารการเคลม" ขึ้นบนสุด
        const indexCreate = combined.findIndex((s) => s.title === "สร้างเอกสารการเคลม");
        if (indexCreate > 0) {
            const [createStep] = combined.splice(indexCreate, 1);
            combined.unshift(createStep);
        }

        //  ปุ่มดูรายงาน
        const viewButton = (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
            >
                <FaEye /> ดูรายงาน
            </button>
        );

        // ถ้ามี “ผู้ใช้ส่งกลับครั้งที่ ...” → ใส่ปุ่มไว้ที่รายการล่าสุด
        const lastResubIndex = combined.findLastIndex((s) =>
            s.title.includes("ผู้ใช้ส่งกลับครั้งที่")
        );

        if (lastResubIndex !== -1) {
            combined[lastResubIndex].action = viewButton;
        } else {
            // ถ้าไม่มีการส่งกลับเลย ให้ปุ่มอยู่ที่ "สร้างเอกสารการเคลม"
            const createIndex = combined.findIndex((s) => s.title === "สร้างเอกสารการเคลม");
            if (createIndex !== -1) combined[createIndex].action = viewButton;
        }

        // ปุ่มแก้ไขข้อมูล
        const lastIncompleteIndex = combined.findLastIndex((s) =>
            s.title.includes("เจ้าหน้าที่แจ้งแก้ไขข้อมูล")
        );
         const isFinalStatus = status === "approved" || status === "rejected" || 
                         status === "สำเร็จ" || status === "เอกสารไม่ผ่านการตรวจสอบ";
          if (lastIncompleteIndex !== -1 && !isFinalStatus) {
        combined[lastIncompleteIndex].action = (
            <button
                onClick={() => (window.location.href = `/claim/edit/${claimId}`)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium 
         text-white bg-amber-500 border 
         hover:bg-amber-400 hover:text-white transition shadow-sm"
            >
                <FaEdit className="text-white" />
                แก้ไขข้อมูล
            </button>
        );
    }

        return combined;
    }, [
    created_at,
    incompleteHistory,
    resubmittedHistory,
    approved_at,
    rejected_at,
    status,
    adminNote,
    incompleteAt,
    claimId,
]);


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
            {showAdminNoteModal && selectedAdminNote && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowAdminNoteModal(false)}
                >
                    <div
                        className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-y-auto max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center border-b p-4">
                            <h2 className="font-semibold text-lg text-zinc-800">
                                รายงานการแก้ไขของเจ้าหน้าที่
                            </h2>
                            <button
                                onClick={() => setShowAdminNoteModal(false)}
                                className="text-zinc-600 hover:text-zinc-800 text-sm"
                            >
                                ✕ ปิด
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5 text-sm text-zinc-800 leading-relaxed">

                            {/* 🔹 1.1 รายละเอียดที่เกิดเหตุ */}
                            {selectedAdminNote.incident?.comment?.trim() && (
                                <div className="border border-zinc-200 bg-white p-4 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2 mb-2 text-zinc-700 font-semibold">
                                        <MapPin className="w-4 h-4 text-zinc-600" />
                                        <span>รายละเอียดที่เกิดเหตุ</span>
                                    </div>
                                    <p className="text-zinc-700">หมายเหตุ: {selectedAdminNote.incident.comment}</p>
                                </div>
                            )}

                            {/* 🔹 1.2 รายละเอียดอุบัติเหตุ */}
                            {selectedAdminNote.accident?.comment?.trim() && (
                                <div className="border border-zinc-200 bg-white p-4 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2 mb-2 text-zinc-700 font-semibold">
                                        <CarIcon className="w-4 h-4 text-zinc-600" />
                                        <span>รายละเอียดอุบัติเหตุ</span>
                                    </div>
                                    <p className="text-zinc-700">หมายเหตุ: {selectedAdminNote.accident.comment}</p>
                                </div>
                            )}

                            {/* 🔹 หมวดที่ 2: ภาพหรือวิดีโอหลักฐาน */}
                            {Array.isArray(selectedAdminNote.evidence) &&
                                selectedAdminNote.evidence.some((e: any) => e.checked) && (
                                    <div className="border border-zinc-200 bg-white p-4 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-2 mb-3 text-zinc-700 font-semibold">
                                            <Paperclip className="w-4 h-4 text-zinc-600" />
                                            <span>ภาพหรือวิดีโอหลักฐานที่ต้องแก้ไข</span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {selectedAdminNote.evidence
                                                .filter((e: any) => e.checked)
                                                .flatMap((e: any, i: number) => {
                                                    const urls = Array.isArray(e.url) ? e.url : [e.url];
                                                    return urls.map((u: string, j: number) => (
                                                        <div
                                                            key={`${i}-${j}`}
                                                            className="p-2 bg-zinc-50 border border-zinc-200 rounded-md"
                                                        >
                                                            {/\.(mp4|mov|webm)$/i.test(u) ? (
                                                                <video
                                                                    src={u}
                                                                    controls
                                                                    className="w-full h-32 object-cover rounded bg-black"
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={u}
                                                                    alt={`evidence-${i}-${j}`}
                                                                    className="w-full h-32 object-cover rounded"
                                                                />
                                                            )}
                                                            {e.comment?.trim() && (
                                                                <p className="mt-2 text-xs text-zinc-700">
                                                                    หมายเหตุ: {e.comment}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ));
                                                })}
                                        </div>
                                    </div>
                                )}

                            {/* 🔹 หมวดที่ 3: รูปความเสียหาย */}
                            {Array.isArray(selectedAdminNote.damage) &&
                                selectedAdminNote.damage.some((d: any) => d.checked) && (
                                    <div className="border border-zinc-200 bg-white p-4 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-2 mb-3 text-zinc-700 font-semibold">
                                            <ImageIcon className="w-4 h-4 text-zinc-600" />
                                            <span>ภาพความเสียหายที่ต้องแก้ไข</span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {selectedAdminNote.damage
                                                .filter((d: any) => d.checked)
                                                .map((d: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className="p-2 bg-zinc-50 border border-zinc-200 rounded-md"
                                                    >
                                                        <img
                                                            src={d.url}
                                                            alt={`damage-${i}`}
                                                            className="w-full h-32 object-cover rounded"
                                                        />
                                                        {d.side && (
                                                            <p className="mt-1 text-xs text-zinc-600">
                                                                ด้าน: {d.side}
                                                            </p>
                                                        )}
                                                        {d.comment?.trim() && (
                                                            <p className="mt-1 text-xs text-zinc-700">
                                                                หมายเหตุ: {d.comment}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                            {/* 🔹 หมายเหตุเพิ่มเติม */}
                            {selectedAdminNote.note?.trim() && (
                                <div className="border border-zinc-200 bg-white p-4 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2 mb-2 text-zinc-700 font-semibold">
                                        <StickyNote className="w-4 h-4 text-zinc-600" />
                                        <span>หมายเหตุเพิ่มเติม</span>
                                    </div>
                                    <p className="text-zinc-700">{selectedAdminNote.note}</p>
                                </div>
                            )}

                            {/* 🔹 ไม่มีหลักฐานหรือภาพที่ต้องแก้ไข */}
                            {Array.isArray(selectedAdminNote.evidence) &&
                                selectedAdminNote.evidence.every((e: any) => !e.checked) &&
                                !selectedAdminNote.damage?.some((d: any) => d.checked) &&
                                !selectedAdminNote.incident?.comment?.trim() &&
                                !selectedAdminNote.accident?.comment?.trim() && (
                                    <div className="text-sm text-zinc-500 italic">
                                        ไม่มีหลักฐานหรือภาพที่ต้องแก้ไข
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            )}


        </>
    );
}
