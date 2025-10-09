"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ClaimDocument from "@/app/components/ClaimDocument";
import type { ClaimDetail } from "@/types/claim";

const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");

export default function ClaimDocPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const claimId = sp.get("claim_id");
  const autoPrint = sp.get("autoprint") === "1";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  
  useEffect(() => {
    if (!claimId) { setErr("ไม่พบ claim_id"); setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${URL_PREFIX}/api/claim-requests/detail?claim_id=${encodeURIComponent(claimId)}`,
          { credentials: "include", cache: "no-store" }
        );
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json?.ok) throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");
        setDetail(json.data as ClaimDetail);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "เกิดข้อผิดพลาด");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [claimId]);

  // autoprint
  useEffect(() => {
    if (!loading && !err && detail && autoPrint) {
      setTimeout(() => window.print(), 300);
    }
  }, [loading, err, detail, autoPrint]);

  if (loading) return <div className="p-6 text-zinc-600">กำลังโหลดเอกสาร…</div>;
  if (err || !detail) return <div className="p-6 text-rose-600">ผิดพลาด: {err || "ไม่พบข้อมูล"}</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* แถบปุ่มบนเฉพาะตอนไม่พิมพ์ */}
      <div className="no-print mx-auto max-w-[794px] px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="rounded-lg text-black bg-zinc-100 px-3 py-1.5 text-sm hover:bg-zinc-200">
          ← กลับ
        </button>
        <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">
          พิมพ์เอกสาร
        </button>
      </div>

      <ClaimDocument detail={detail} />
    </div>
  );
}
<style jsx global>{`
  @page {
    size: A4 portrait;
    margin: 8mm;
  }

  @media print {
    html,
    body {
      background: #fff !important;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
      zoom: 0.85; /* ✅ ลดขนาดทั้งหมดให้อยู่ในหน้าเดียว */
    }

    #print-root {
      width: 100%;
      max-width: 794px;
      min-height: 100%;
      page-break-inside: avoid;
      overflow: hidden;
    }

    .doc-box,
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .doc-table {
      font-size: 11px; /* ✅ ย่อฟอนต์ */
    }

    .legend-dot {
      width: 10px;
      height: 10px;
    }

    .no-print,
    .print-hide {
      display: none !important;
    }

    /* ✅ ลดระยะ padding และ spacing */
    .p-3,
    .p-4,
    .p-5 {
      padding: 6px !important;
    }
    .mt-4,
    .mt-5,
    .mt-6 {
      margin-top: 8px !important;
    }

    /* ✅ ปิดเงา / สีฟุ่มเฟือย */
    .drop-shadow-sm,
    .drop-shadow-md {
      filter: none !important;
    }
  }
`}</style>