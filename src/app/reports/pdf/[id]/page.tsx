import ClaimReportPreview, { mapClaimData } from "../../ClaimReportPreview";

export default async function PdfPage({ params }: { params: { id: string } }) {
  const id = params.id;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/claim-requests/detail?claim_id=${id}`,
      { cache: "no-store", credentials: "include" }
    );
    const json = await res.json();

    if (!json.ok) {
      return (
        <div className="p-6 text-center text-rose-600">
          ❌ {json.message || "ไม่สามารถโหลดข้อมูลได้"}
        </div>
      );
    }

    const data = mapClaimData(json.data);
    return <ClaimReportPreview car={data.car} draft={data.draft} />;
  } catch (e: any) {
    return (
      <div className="p-6 text-center text-rose-600">
        ❌ {e?.message ?? "เกิดข้อผิดพลาดในการโหลดข้อมูล"}
      </div>
    );
  }
}
