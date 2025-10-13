import ClaimReportPreview, { mapClaimData } from "../../ClaimReportPreview";

export default async function PdfPage(props: any) {
  const id = props?.params?.id;
  let data: any = null;
  let error: string | null = null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/claim-requests/detail?claim_id=${id}`,
      { cache: "no-store", credentials: "include" }
    );

    const json = await res.json();

    if (json.ok) {
      data = mapClaimData(json.data);
    } else {
      error = json.message || "ไม่สามารถโหลดข้อมูลได้";
    }
  } catch (e: any) {
    error = e?.message ?? "เกิดข้อผิดพลาดในการโหลดข้อมูล";
  }

  if (error) {
    return (
      <div className="p-6 text-center text-rose-600">
        ❌ {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-zinc-500">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return <ClaimReportPreview car={data.car} draft={data.draft} />;
}
