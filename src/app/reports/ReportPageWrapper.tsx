"use client";

import dynamic from "next/dynamic";

// ✅ ตอนนี้ dynamic อยู่ใน client component แล้ว → ใช้ ssr:false ได้
const ReportPage = dynamic(() => import("./ReportPage"), { ssr: false });

export default function ReportPageWrapper() {
  return <ReportPage />;
}
