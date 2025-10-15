import dynamic from "next/dynamic";

// ✅ โหลด ReportPage แบบ client-only (ไม่ SSR)
const ReportPage = dynamic(() => import("./ReportPage"), { ssr: false });

export default function ReportPageWrapper() {
  return <ReportPage />;
}
