"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Img = {
  url: string;
  side?: string;
  is_annotated?: boolean; // ✅ มีสถานะ
};

const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");

const STATUS_EN2TH: Record<string, "กำลังตรวจสอบ" | "สำเร็จ" | "ปฏิเสธ" | "ข้อมูลไม่ครบ"> = {
  pending: "กำลังตรวจสอบ",
  approved: "สำเร็จ",
  rejected: "ปฏิเสธ",
  incomplete: "ข้อมูลไม่ครบ",
};

export default function ImageList({
  adminId,
  claimId,
  images,
  activeIndex,
  onSelect,
  onBack,
}: {
  adminId: number;
  claimId: string;
  images: Img[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onBack: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<
    "approve" | "reject" | "incomplete" | null
  >(null);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState("");
  const router = useRouter();

  // ✅ ฟังก์ชันอัปเดตสถานะ (ครบทั้ง approve / reject / incomplete)
    // ✅ ฟังก์ชันอัปเดตสถานะ (ครบทั้ง approve / reject / incomplete)
  async function patchStatus(
    next: "approved" | "rejected" | "incomplete",
    note?: string
  ) {
    if (!claimId) return;
    try {
      setActionLoading(
        next === "approved" ? "approve" : next === "rejected" ? "reject" : "incomplete"
      );

      const now = new Date().toISOString();
      const admin = adminId ? Number(adminId) : null;

      // ✅ เตรียม body ตามสถานะ
      const body: Record<string, any> = {
        status: next,
        admin_note: note ?? null,
      };

      if (next === "approved") {
        body.approved_by = admin;
        body.approved_at = now;
      } else if (next === "rejected") {
        body.rejected_by = admin;
        body.rejected_at = now;
      } else if (next === "incomplete") {
        body.incomplete_by = admin;
        body.incomplete_at = now;

        // ✅ ดึง incomplete_history เดิมจาก backend มาก่อน
        const res = await fetch(`${URL_PREFIX}/api/claim-requests/detail?claim_id=${claimId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        const prevHistory = json?.data?.incomplete_history || [];

        // ✅ เพิ่มรอบใหม่ลงไป
        body.incomplete_history = [
          ...prevHistory,
          { time: now, note: note || "" },
        ];
      }

      // ✅ ส่ง PATCH ไป backend
      const resp = await fetch(`${URL_PREFIX}/api/claim-requests/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const j = await resp.json();
      if (!resp.ok || !j?.ok) throw new Error(j?.message || "อัปเดตสถานะไม่สำเร็จ");

      if (next === "incomplete") {
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


  return (
    <div className="rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm p-3">
      <div className="mb-2 text-sm font-medium text-zinc-700">รายการรูปภาพ</div>

      <div className="space-y-2 max-h-72 sm:max-h-[60vh] overflow-auto p-1">
        {images.length === 0 && (
          <div className="text-zinc-500 text-sm">ยังไม่มีรูป</div>
        )}

        {images.map((img, i) => {
          const saved = !!img.is_annotated;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`w-full flex items-center gap-3 rounded-2xl p-2 ring-1 transition
                ${
                  i === activeIndex
                    ? "bg-emerald-50 ring-emerald-200"
                    : "bg-white ring-zinc-200 hover:bg-zinc-50"
                }`}
              title={img.side || `ภาพที่ ${i + 1}`}
            >
              <div className="h-12 w-16 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </div>

              <div className="min-w-0 flex-1 text-left">
                <div className="text-xs text-zinc-500">ภาพที่ {i + 1}</div>
                <div className="truncate text-sm text-zinc-800">
                  {img.side ?? "ไม่ระบุด้าน"}
                </div>
              </div>

              {saved ? (
                <span
                  className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200"
                  title="รูปนี้บันทึกข้อมูลแล้ว"
                >
                  บันทึกแล้ว
                </span>
              ) : (
                <span
                  className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200"
                  title="ยังไม่ได้บันทึกข้อมูลรูปนี้"
                >
                  ยังไม่บันทึก
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ปุ่มเปิด modal “รูปภาพไม่ชัด” */}
      <button
        onClick={() => setShowIncomplete(true)}
        className="mt-3 h-11 w-full rounded-xl bg-gradient-to-r from-red-500 to-red-600 
                  text-sm font-semibold text-white shadow-md 
                  hover:from-red-600 hover:to-red-700 
                  focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
      >
        🚫 รูปภาพไม่ชัด
      </button>

      {/* ปุ่มย้อนกลับ */}
      <button
        className="mt-3 w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600
                  text-sm font-semibold text-white shadow-md 
                  hover:from-indigo-600 hover:to-indigo-700 
                  focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
        onClick={onBack}
      >
        ⬅️ ย้อนกลับ
      </button>

      {/* Modal: ข้อมูลไม่ครบ */}
      {showIncomplete && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 print:hidden">
          <div className="w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-4 shadow sm:p-5">
            <h4 className="text-base font-semibold">ข้อมูลไม่ครบ / ภาพไม่ชัด</h4>
            <p className="mt-1 text-sm text-zinc-600">
              โปรดระบุสาเหตุหรือสิ่งที่ต้องการให้ลูกค้าแก้ไขเพิ่มเติม
            </p>

            <textarea
              className="mt-3 min-h-[120px] w-full rounded-lg border border-zinc-300 p-3 outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="พิมพ์รายละเอียด…"
              value={incompleteReason}
              onChange={(e) => setIncompleteReason(e.target.value)}
            />

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {/* ยกเลิก */}
              <button
                onClick={() => setShowIncomplete(false)}
                disabled={actionLoading === "incomplete"}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-4 
                              text-sm font-medium text-zinc-700 shadow-sm
                              hover:bg-zinc-50 hover:border-zinc-400
                              disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ยกเลิก
              </button>

              {/* ยืนยัน */}
              <button
                onClick={() => patchStatus("incomplete", incompleteReason.trim())}
                disabled={
                  actionLoading === "incomplete" || !incompleteReason.trim()
                }
                className={`h-10 rounded-lg px-5 text-sm font-semibold text-white shadow-md
                      ${
                        actionLoading === "incomplete"
                          ? "bg-red-400 cursor-wait"
                          : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                      }`}
              >
                {actionLoading === "incomplete"
                  ? "⏳ กำลังส่ง…"
                  : "✔️ ยืนยันข้อมูลไม่ครบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
