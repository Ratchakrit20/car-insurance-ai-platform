import dynamic from "next/dynamic";

// ห่อ component จริงไว้ไม่ให้ SSR
const ReportPage = dynamic(() => import("./ReportPage"), { ssr: false });

export default ReportPage;
