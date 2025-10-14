"use client";

import React, { useEffect, useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import type { ClaimItem, ClaimStatus, ClaimReportRow, DamagePhoto } from "@/types/claim";

const API_PREFIX = process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, "") || "";

const statusColor: Record<ClaimStatus, string> = {
    "กำลังตรวจสอบ": "bg-[#FFB338]",
    "สำเร็จ": "bg-[#35A638]",
    "เอกสารไม่ผ่านการตรวจสอบ": "bg-[#DB4242]",
    "เอกสารต้องแก้ไขเพิ่มเติม": "bg-orange-400",
};

function thDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// 🔧 helper แปลง row → ClaimItem (เหมือนที่คุณใช้ใน ReportPage)
function normalizeStatus(s?: string | null): ClaimStatus {
    const x = (s || "").toLowerCase();
    if (x.includes("pending") || x.includes("ตรวจสอบ") || x.includes("review")) return "กำลังตรวจสอบ";
    if (x.includes("approved") || x.includes("success") || x.includes("done")) return "สำเร็จ";
    if (x.includes("rejected") || x.includes("deny")) return "เอกสารไม่ผ่านการตรวจสอบ";
    if (x.includes("incomplete") || x.includes("ข้อมูลไม่ครบ")) return "เอกสารต้องแก้ไขเพิ่มเติม";
    return "กำลังตรวจสอบ";
}

export default function LatestClaims({ userId }: { userId: number }) {
    const [claims, setClaims] = useState<ClaimItem[]>([]);

    useEffect(() => {
        const fetchClaims = async () => {
            try {
                const url = `${API_PREFIX}/api/claim-requests/list?user_id=${encodeURIComponent(String(userId))}`;
                const res = await fetch(url, { credentials: "include", cache: "no-store" });
                if (!res.ok) throw new Error(`โหลดข้อมูลการเคลมไม่สำเร็จ: ${res.status}`);

                const json = await res.json();
                const rows: ClaimReportRow[] = json?.data ?? [];

                // map row → ClaimItem (ย่อแบบเบื้องต้นพอสำหรับ card)
                const list = rows.map((r) => {
                    const item: Partial<ClaimItem> = {
                        id: String(r.claim_id),
                        status: normalizeStatus(r.status),
                        carTitle: `${r.car_brand ?? "รถ"} ${r.car_model ?? ""} ทะเบียน ${r.license_plate ?? "-"}`,
                        incidentDate: r.accident_date ?? new Date().toISOString(),
                        incidentType: r.accident_type ?? undefined,
                        province: r.province ?? "",
                        district: r.district ?? "",
                        photoUrl: r.thumbnail_url ?? undefined,
                        damageAreas: r.damage_areas ?? undefined,
                        severitySummary: r.severity_summary ?? undefined,
                        created_at: r.created_at ?? new Date().toISOString(),
                        updated_at: r.updated_at ?? new Date().toISOString(),
                    };
                    return item as ClaimItem;
                });


                setClaims(list.slice(0, 5)); // ✅ โชว์แค่ 5 รายการ
            } catch (err) {
                console.error("❌ fetchClaims error:", err);
                setClaims([]);
            }
        };

        fetchClaims();
    }, [userId]);

    if (!claims.length) {
        return <div className="text-zinc-500 text-sm">ยังไม่มีการเคลมล่าสุด</div>;
    }

    return (
        <div className="rounded-lg bg-white p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-zinc-900">รายการเคลมล่าสุด</h2>
                <a href="/reports" className="text-sm text-indigo-600 hover:underline">
                    ดูทั้งหมด
                </a>
            </div>
            <div className="space-y-3">
                {claims.map((c) => (
                    <a
                        key={c.id}
                        href={`/reports`}
                        className="flex items-center justify-between rounded-[7px] bg-[#E8E8E8] p-3 shadow-sm hover:bg-zinc-50 transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#6D5BD0] flex items-center justify-center text-white">
                                <FileText size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-zinc-900">{c.carTitle}</span>
                                <span className="text-sm font-medium text-black truncate max-w-[220px]">
                                    {Array.isArray(c.damageAreas)
                                        ? c.damageAreas.join(", ")
                                        : c.damageAreas || c.incidentType || "-"}
                                </span>
                                <span className="text-xs text-zinc-500">
                                    {c.province}, {c.district} | {thDateTime(c.incidentDate)} น.
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`h-5 px-2 rounded-full ${statusColor[c.status]} flex items-center justify-center text-xs text-white`}
                            >
                                {c.status}
                            </span>
                            <ChevronRight className="text-violet-600" size={18} />
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
}
