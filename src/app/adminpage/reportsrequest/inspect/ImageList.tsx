"use client";

import { useState,useEffect,} from "react";
import { useRouter } from "next/navigation";
import { Prompt, Noto_Sans_Thai, Inter } from 'next/font/google';
const headingFont = Prompt({ subsets: ['thai', 'latin'], weight: ['600', '700'], display: 'swap' });
const bodyFont = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], display: 'swap' });
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
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
  const [incompleteData, setIncompleteData] = useState({
    damage: [] as { url: string; side?: string; comment: string; checked: boolean }[],
    note: "",
  });
  
  // ✅ ฟังก์ชันอัปเดตสถานะ (ครบทั้ง approve / reject / incomplete)
  // ✅ ฟังก์ชันอัปเดตสถานะ (ครบทั้ง approve / reject / incomplete)
 async function patchStatus(
  next: "approved" | "rejected" | "incomplete",
  note?: string // note จะถูกส่งเป็น JSON.stringify(incompleteData)
) {
  if (!claimId) return;
  try {
    setActionLoading(
      next === "approved"
        ? "approve"
        : next === "rejected"
        ? "reject"
        : "incomplete"
    );

    const now = new Date().toISOString();
    const admin = adminId ? Number(adminId) : null;

    // ✅ เตรียม body สำหรับส่งไป backend
    const body: Record<string, any> = {
      status: next,
      admin_note: note ?? null, // note จะเป็น JSON string จาก incompleteData
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

      // ✅ ดึง incomplete_history เดิมจาก backend
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${URL_PREFIX}/api/claim-requests/detail?claim_id=${claimId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      const json = await res.json();
      const prevHistory = json?.data?.incomplete_history || [];

      // ✅ เพิ่มรอบใหม่เข้าไปในประวัติ พร้อมเก็บ note (JSON string)
      body.incomplete_history = [
        ...prevHistory,
        {
          time: now,
          note: note ?? "", // เก็บ JSON ที่ serialize แล้ว
        },
      ];
    }

    // ✅ ส่ง PATCH ไป backend
    const token = localStorage.getItem("token");
    const resp = await fetch(`${URL_PREFIX}/api/claim-requests/${claimId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const j = await resp.json();
    if (!resp.ok || !j?.ok) throw new Error(j?.message || "อัปเดตสถานะไม่สำเร็จ");

    // ✅ ปิด modal เมื่อบันทึก incomplete สำเร็จ
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

useEffect(() => {
  if (showIncomplete) {
    setIncompleteData({
      damage: images.map((img) => ({
        url: img.url,
        side: img.side,
        checked: false,
        comment: "",
      })),
      note: "",
    });
  }
}, [showIncomplete, images]);

  return (
    <div className={`${thaiFont.className} rounded-[8px] bg-white ring-1 ring-zinc-200 shadow-sm p-3`}>

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
              className={`w-full flex items-center gap-3 rounded-[8px] p-2 ring-1 transition
                ${i === activeIndex
                  ? "bg-[#DEDCFF] ring-[#6F47E4]"
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
        className="mt-3 h-11 w-full rounded-[8px] bg-[#F59E0B]  
                  text-sm font-semibold text-white shadow-md 
                  hover:bg-[#D97706]
                  "
      >
        รูปภาพไม่ชัด
      </button>

      {/* ปุ่มย้อนกลับ */}
      <button
        className="mt-3 w-full h-11 rounded-[8px] bg-[#D9D9D9]
                  text-sm font-semibold text-black shadow-md 
                  hover:bg-[#D9D9D9]/50
                  "
        onClick={onBack}
      >
        ย้อนกลับ
      </button>

      {/* Modal: ข้อมูลไม่ครบ */}
      {showIncomplete && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="w-[calc(100%-2rem)] max-w-3xl rounded-2xl bg-white shadow-xl p-6 relative">
      <h4 className="text-lg font-semibold text-amber-600 mb-4">
        ข้อมูลไม่ครบ / ภาพไม่ชัด
      </h4>

      <p className="text-sm text-gray-700 mb-6">
        โปรดเลือกภาพที่ต้องการให้ลูกค้าแก้ไข พร้อมระบุรายละเอียด
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-auto">
        {images.map((img, i) => (
          <div
            key={i}
            className="rounded-lg bg-white border border-gray-200 p-2 shadow-sm"
          >
            <img
              src={img.url}
              alt={`damage-${i}`}
              className="rounded-md w-full h-32 object-cover"
            />
            <p className="text-xs text-gray-600 mt-1">{img.side || "ไม่ระบุ"}</p>

            <label className="flex items-center gap-2 mt-2 text-black text-sm">
              <input
                type="checkbox"
                className="accent-[#F59E0B]"
                onChange={(e) =>
                  setIncompleteData((prev) => {
                    const newDamage = [...prev.damage];
                    newDamage[i].checked = e.target.checked;
                    return { ...prev, damage: newDamage };
                  })
                }
              />
              ต้องแก้ไข
            </label>

            <textarea
              placeholder="ระบุปัญหา เช่น ภาพเบลอ / ถ่ายไม่เห็นชัด"
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white p-1 text-xs text-gray-800 focus:ring-2 focus:ring-[#F59E0B]/40 outline-none transition"
              onChange={(e) =>
                setIncompleteData((prev) => {
                  const newDamage = [...prev.damage];
                  newDamage[i].comment = e.target.value;
                  return { ...prev, damage: newDamage };
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
        <button
          onClick={() => setShowIncomplete(false)}
          className="h-10 rounded-lg px-4 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          ยกเลิก
        </button>
        <button
onClick={() => patchStatus("incomplete", JSON.stringify(incompleteData))}
          disabled={actionLoading === "incomplete"}
          className={`h-10 rounded-lg px-6 text-sm font-semibold text-white shadow-sm transition ${
            actionLoading === "incomplete"
              ? "bg-[#FCD34D] cursor-wait"
              : "bg-[#F59E0B] hover:bg-[#D97706]"
          }`}
        >
          {actionLoading === "incomplete" ? "กำลังส่ง…" : "ยืนยันข้อมูลไม่ครบ"}
        </button>
      </div>
    </div>
  </div>
)}


    </div>
  );
}
