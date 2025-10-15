"use client";

import dynamic from "next/dynamic";

// ✅ โหลด ReportPage แบบ client-only
const ReportPage = dynamic(() => import("./ReportPage"), { ssr: false });

export default function ReportPageWrapper() {
  return <ReportPage />;
}