"use client";

import React, { useEffect, useState } from "react";
import ClaimReportPreview, { mapClaimData } from "../../ClaimReportPreview";

export default function PdfPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `http://localhost:3001/api/claim-requests/detail?claim_id=${params.id}`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (json.ok) {
          const mapped = mapClaimData(json.data);
          setData(mapped);
        } else {
          setError(json.message || "ไม่สามารถโหลดข้อมูลได้");
        }
      } catch (e: any) {
        setError(e?.message ?? "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    }
    fetchData();
  }, [params.id]);

  if (error)
    return (
      <div className="p-6 text-center text-rose-600">
        ❌ {error}
      </div>
    );

  if (!data)
    return (
      <div className="p-6 text-center text-zinc-500">
        กำลังโหลดข้อมูล...
      </div>
    );

  return <ClaimReportPreview car={data.car} draft={data.draft} />;
}
