"use client";

import React from "react";
import type { ClaimStatus } from "@/types/claim";
import { FileText } from "lucide-react";

export default function PrintClaimButton({
  claimId,
  status,
  docPath = "/reports/claim-doc",
  className = "",
}: {
  claimId: string | number;
  status: ClaimStatus;
  docPath?: string;
  className?: string;
}) {
  // แสดงเฉพาะเมื่อสถานะสำเร็จ
  if (status !== "สำเร็จ") return null;

  const handlePrint = () => {
    const iframeId = "claim-print-frame";
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;

    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    const url = `${docPath}?claim_id=${encodeURIComponent(String(claimId))}&autoprint=0`;

    iframe.src = url;

    iframe.onload = () => {
      setTimeout(() => {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      }, 800); // ✅ รอให้โหลดเนื้อหาก่อนค่อยสั่งพิมพ์
    };
  };

  return (
    <button
      onClick={handlePrint}
      className={`inline-flex items-center gap-2 rounded-[7px] px-3.5 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm ${className}`}
      title="ดู/พิมพ์เอกสารการเคลม"
    >
      <FileText className="h-4 w-4" />
      เอกสารการเคลม
    </button>
  );
}
