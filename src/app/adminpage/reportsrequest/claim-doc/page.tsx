"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ClaimDetail, User } from "@/types/claim";
import ClaimDocument from "../components/ClaimDocument"; // ✅ ใช้ ClaimDocument แทน layout เดิม
import SafeAreaSpacer from "@/app/components/SafeAreaSpacer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");

// ===== Utilities =====
const STATUS_EN2TH: Record<string, string> = {
  pending: "กำลังตรวจสอบ",
  approved: "สำเร็จ",
  rejected: "เอกสารไม่ผ่านการตรวจสอบ",
  incomplete: "เอกสารต้องแก้ไขเพิ่มเติม",
};

const STATUS_TH2EN: Record<string, string> = {
  "กำลังตรวจสอบ": "pending",
  "สำเร็จ": "approved",
  "เอกสารไม่ผ่านการตรวจสอบ": "rejected",
  "เอกสารต้องแก้ไขเพิ่มเติม": "incomplete",
};

export default function ClaimDocPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const claimId = sp.get("claim_id");

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [actionLoading, setActionLoading] = useState<
    "approve" | "reject" | "incomplete" | null
  >(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState("");

  // -------- Auth --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${URL_PREFIX}/api/me`, { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user ?? null);
        setIsAuthenticated(Boolean(data.isAuthenticated));
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  // -------- โหลดรายละเอียดเคลม --------
  useEffect(() => {
    if (!claimId) {
      setErr("ไม่พบ claim_id");
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${URL_PREFIX}/api/admin/detail?claim_id=${encodeURIComponent(claimId)}`,
          { credentials: "include", cache: "no-store" }
        );
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json?.ok)
          throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");
        setDetail(json.data as ClaimDetail);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "เกิดข้อผิดพลาด");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [claimId]);

  async function patchStatus(
    next: "approved" | "rejected" | "incomplete",
    note?: string
  ) {
    if (!detail?.claim_id) return;
    try {
      setActionLoading(
        next === "approved"
          ? "approve"
          : next === "rejected"
            ? "reject"
            : "incomplete"
      );

      const now = dayjs().tz("Asia/Bangkok").format();
      const adminId = user ? Number(user.id) : null;

      const body: Record<string, any> = {
        status: next,
        admin_note: note ?? null,
      };

      if (next === "approved") {
        body.approved_by = adminId;
        body.approved_at = now;
      } else if (next === "rejected") {
        body.rejected_by = adminId;
        body.rejected_at = now;
      } else if (next === "incomplete") {
        body.incomplete_by = adminId;
        body.incomplete_at = now;
      }

      const resp = await fetch(`${URL_PREFIX}/api/claim-requests/${detail.claim_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const j = await resp.json();
    if (!resp.ok || !j?.ok)
      throw new Error(j?.message || "อัปเดตสถานะไม่สำเร็จ");

    // ✅ เก็บ status เป็นภาษาอังกฤษตาม type เดิม
    setDetail((d) => (d ? { ...d, status: next as ClaimDetail["status"] } : d));


      if (next === "rejected") {
        setShowReject(false);
        setRejectReason("");
      } else if (next === "incomplete") {
        setShowIncomplete(false);
        setIncompleteReason("");
      }

      router.push("/adminpage/reportsrequest");
    } catch (e: any) {
      alert(e?.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setActionLoading(null);
    }
  }

  const handleApprove = () => {
    if (!confirm("ยืนยันอนุมัติการเคลมนี้?")) return;
    void patchStatus("approved");
  };

  const handleReject = () => patchStatus("rejected", "ติดต่อเจ้าหน้าที่ประกัน");

  if (loading) return <div className="p-6 text-zinc-600">กำลังโหลดเอกสาร…</div>;
  if (err) return <div className="p-6 text-rose-600">ผิดพลาด: {err}</div>;
  if (!detail) return null;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header + ปุ่ม */}
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => router.back()}
            className="h-10 rounded-xl px-4 text-black text-sm font-medium bg-zinc-100 hover:bg-zinc-200 w-full sm:w-auto"
          >
            ← กลับ
          </button>

          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            {user?.role === "admin" &&
              (STATUS_TH2EN[detail.status as string] ?? detail.status) === "pending" && (
                <>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading !== null}
                    className={`h-10 rounded-xl px-4 text-sm font-medium ${actionLoading === "reject"
                      ? "bg-rose-200 text-rose-700"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      } border border-rose-200 w-full sm:w-auto`}
                  >
                    {actionLoading === "reject" ? "กำลังปฏิเสธ…" : "ไม่อนุมัติ"}
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={actionLoading !== null}
                    className={`h-10 rounded-xl px-4 text-sm font-medium ${actionLoading === "approve"
                      ? "bg-emerald-300 text-white"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                      } w-full sm:w-auto`}
                  >
                    {actionLoading === "approve" ? "กำลังอนุมัติ…" : "อนุมัติ"}
                  </button>
                </>
              )}
          </div>
        </div>

        {/* ✅ ส่วนเอกสารแทนที่ด้วย ClaimDocument */}
        <div className="rounded-none bg-white ring-0 sm:rounded-xl sm:ring-1 sm:ring-zinc-200">
          <ClaimDocument detail={detail} />
        </div>
      </div>

      <SafeAreaSpacer />
    </div>
  );
}
