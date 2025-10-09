// src/app/adminpage/reportsrequest/claim-doc/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ClaimDetail, User } from "@/types/claim";
import SafeAreaSpacer from "@/app/components/SafeAreaSpacer";

const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");

/** Utils */
const thDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const thDateTime = (iso?: string, time?: string) => {
  if (!iso) return "-";
  const date = thDate(iso);
  return time ? `${date} ${time}` : date;
};
// EN <-> TH status map
const STATUS_EN2TH: Record<string, "กำลังตรวจสอบ" | "สำเร็จ" | "เอกสารไม่ผ่านการตรวจสอบ" | "เอกสารต้องแก้ไขเพิ่มเติม"> = {
  pending: "กำลังตรวจสอบ",
  approved: "สำเร็จ",
  rejected: "เอกสารไม่ผ่านการตรวจสอบ",
  incomplete: "เอกสารต้องแก้ไขเพิ่มเติม",
};
const STATUS_TH2EN: Record<string, "pending" | "approved" | "rejected" | "incomplete"> = {
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

  /** “ตารางความเสียหาย” รวมจากทุกภาพ */
  const damageRows = useMemo(() => {
    const photos = detail?.accident?.damagePhotos ?? [];
    const rows: Array<{
      no: number;
      part: string;
      damages: string;
      severity: string;
      side?: string;
    }> = [];
    let i = 1;
    for (const p of photos) {
      const anns = (p as any)?.annotations ?? [];
      if (!anns.length) continue;
      for (const a of anns) {
        const dmgList = Array.isArray(a.damage)
          ? a.damage
          : typeof a.damage === "string" && a.damage
            ? [a.damage]
            : [];
        rows.push({
          no: i++,
          part: a.part || "-",
          damages: dmgList.length ? dmgList.join(", ") : "-",
          severity: a.severity ?? "-",
          side: (p as any)?.side,
        });
      }
    }
    return rows;
  }, [detail]);

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

      const now = new Date().toISOString();
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

      setDetail((d) => (d ? { ...d, status: STATUS_EN2TH[next] } : d));

      // ปิด modal หลังส่ง
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

  const handleReject = () => setShowReject(true);
  const handleIncomplete = () => setShowIncomplete(true);

  if (loading) return <div className="p-6 text-zinc-600">กำลังโหลดเอกสาร…</div>;
  if (err) return <div className="p-6 text-rose-600">ผิดพลาด: {err}</div>;
  if (!detail) return null;

  const car = detail.car ? detail.car : null;
  const acc = detail.accident ?? {};

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 lg:px-6 py-4 sm:py-6 print:px-0">
        {/* Header + ปุ่ม */}
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <button
            onClick={() => router.back()}
            className="h-10 rounded-xl px-4 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 w-full sm:w-auto"
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
            <button
              onClick={() => window.print()}
              className="h-10 rounded-xl px-4 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 w-full sm:w-auto"
            >
              พิมพ์เอกสาร
            </button>
          </div>
        </div>

        {/* เอกสารเคลม */}
        <div className="rounded-none bg-white p-3 ring-0 sm:rounded-xl sm:p-6 sm:ring-1 sm:ring-zinc-200 print:ring-0 print:rounded-none print:p-0 text-black">
          {/* โลโก้/ชื่อบริษัท */}
          <div className="mb-3 flex items-start gap-3 sm:mb-4 sm:items-center">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100 text-lg">🏢</div>
            <div>
              <div className="text-base font-semibold sm:text-lg">บริษัท ประกันภัย จำกัด (มหาชน)</div>
              <div className="text-xs text-zinc-600 sm:text-sm">Insurance Public Company Limited</div>
            </div>
          </div>

          <hr className="my-3 border-zinc-300 sm:my-4" />

          {/* ข้อมูลการเคลม */}
          <h3 className="mb-3 text-sm font-semibold sm:text-base">ข้อมูลการเคลม</h3>
          <div className="grid grid-cols-12 gap-3 text-sm sm:gap-4">
            <Info label="ยี่ห้อ/รุ่น" value={`${car?.car_brand ?? "-"} / ${car?.car_model ?? "-"}`} />
            <Info label="ปี" value={String(car?.car_year ?? "-")} />
            <Info label="ทะเบียน" value={car?.car_license_plate ?? "-"} />
            <Info label="เลขที่กรมธรรม์" value={car?.policy_number ?? "-"} />
            <Info label="ประเภทประกัน" value={car?.insurance_type ?? "-"} />
            <Info label="คุ้มครองถึง" value={car?.coverage_end_date ? thDate(car.coverage_end_date) : "-"} />
            <Info label="เลขที่เคลม" value={String(detail.claim_id)} />
            <Info
              label="สถานะเคลม"
              value={STATUS_EN2TH[detail.status as string] ?? (detail.status as string) ?? "-"}
            />
            <Info label="วันที่ยื่นคำขอ" value={thDate(detail.created_at)} />
          </div>

          {/* วันเวลา/สถานที่ */}
          <div className="mt-4 sm:mt-5">
            <h3 className="mb-2 text-sm font-semibold sm:text-base">วันเวลาและสถานที่เกิดเหตุ</h3>
            <div className="grid grid-cols-12 gap-3 text-sm sm:gap-4">
              <Info
                label="วันที่/เวลา"
                value={thDateTime(acc.accident_date, acc.accident_time)}
              />
              <Info label="ประเภทอุบัติเหตุ" value={(acc as any).accidentType ?? "-"} />
              <Info label="จังหวัด/อำเภอ" value={`${(acc as any).province ?? "-"} / ${(acc as any).district ?? "-"}`} />
              <Info label="ถนน/บริเวณใกล้เคียง" value={`${(acc as any).road ?? "-"} / ${(acc as any).nearby ?? "-"}`} />
              <Info label="ประเภทพื้นที่" value={(acc as any).areaType ?? "-"} />
            </div>
          </div>

          {/* รายละเอียดเหตุการณ์ */}
          <div className="mt-4 sm:mt-5">
            <h3 className="mb-2 text-sm font-semibold sm:text-base">รายละเอียดเหตุการณ์</h3>
            <div className="min-h-[72px] rounded-lg border border-zinc-200 p-3 text-sm sm:ring-1 sm:ring-zinc-200">
              {(acc as any).details || "—"}
            </div>
          </div>

          {/* ตารางความเสียหาย (responsive) */}
          <div className="mt-5 sm:mt-6">
            <h3 className="mb-2 text-sm font-semibold sm:text-base">รายการความเสียหาย</h3>

            {/* ทำให้ scroll แนวนอนบนจอเล็กได้ */}
            <div className="-mx-3 overflow-x-auto sm:mx-0">
              <table className="min-w-[640px] w-full table-auto border border-zinc-300 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <Th className="w-[64px] text-center">ลำดับ</Th>
                    <Th>ตำแหน่งชิ้นส่วน</Th>
                    <Th>ลักษณะความเสียหาย</Th>
                    <Th className="w-[120px] text-center">ระดับ (A–D)</Th>
                    <Th className="w-[120px] text-center">ด้านภาพ</Th>
                  </tr>
                </thead>
                <tbody>
                  {damageRows.length > 0 ? (
                    damageRows.map((r) => (
                      <tr key={r.no} className="border-t border-zinc-200">
                        <Td className="text-center">{r.no}</Td>
                        <Td>{r.part}</Td>
                        <Td className="whitespace-pre-wrap break-words">{r.damages}</Td>
                        <Td className="text-center font-semibold">{r.severity}</Td>
                        <Td className="text-center">{r.side ?? "-"}</Td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <Td colSpan={5} className="py-6 text-center text-zinc-500">
                        ไม่มีข้อมูลความเสียหายที่บันทึกไว้
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ลายเซ็น */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <SignBox title="บริษัทประกัน" />
            <SignBox title="ผู้เอาประกันภัย / ลูกค้า" />
          </div>

          {/* Reject Modal */}
          {showReject && (
            <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 print:hidden">
              <div className="w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-4 shadow sm:p-5">
                <h4 className="text-base font-semibold">ระบุสาเหตุที่ไม่อนุมัติ</h4>
                <p className="mt-1 text-sm text-zinc-600">ข้อความนี้จะถูกบันทึกในหมายเหตุของคำขอเคลม</p>

                <textarea
                  className="mt-3 min-h-[120px] w-full rounded-lg border border-zinc-300 p-3 outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="พิมพ์สาเหตุ…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => setShowReject(false)}
                    disabled={actionLoading === "reject"}
                    className="h-10 rounded-xl bg-zinc-100 px-4 text-sm font-medium hover:bg-zinc-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => patchStatus("rejected", rejectReason.trim())}
                    disabled={actionLoading === "reject" || !rejectReason.trim()}
                    className={`h-10 rounded-xl px-4 text-sm font-medium ${actionLoading === "reject"
                      ? "bg-rose-300 text-white"
                      : "bg-rose-600 text-white hover:bg-rose-700"
                      }`}
                  >
                    {actionLoading === "reject" ? "กำลังส่ง…" : "ยืนยันไม่อนุมัติ"}
                  </button>
                </div>
              </div>
            </div>
          )}
          <SafeAreaSpacer />
        </div>
      </div>
    </div>
  );
}

/* ---------- Components ---------- */
function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="col-span-12 sm:col-span-6 lg:col-span-4">
      <div className="text-xs text-zinc-500 sm:text-sm">{label}</div>
      <div className="text-sm font-medium sm:text-base break-words">{value || "-"}</div>
    </div>
  );
}
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-zinc-300 px-2 py-2 text-left font-semibold sm:px-3 ${className}`}>
      {children}
    </th>
  );
}
function Td({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={`border border-zinc-300 px-2 py-2 sm:px-3 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}
function SignBox({ title }: { title: string }) {
  return (
    <div className="min-h-[120px] rounded-lg border border-zinc-300 p-4">
      <div className="mb-10 text-sm text-zinc-600">{title}</div>
      <div className="text-sm text-zinc-500">ลงชื่อ ___________________________</div>
      <div className="mt-2 text-sm text-zinc-500">วันที่ ___________/___________/___________</div>
    </div>
  );
}
