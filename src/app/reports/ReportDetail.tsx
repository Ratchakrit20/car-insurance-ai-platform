"use client";

import React, { useMemo } from "react";
import type { ClaimItem, ClaimStatus } from "@/types/claim";
import ClaimTimeline from "../components/ClaimTimeline";
import PrintClaimButton from "../components/PrintClaim";
import MapPreview from "../components/MapPreview";
import EvidenceGallery from "../components/EvidenceGallery";
import { useRouter } from "next/navigation";

type MediaItem = { url: string; type?: "image" | "video"; publicId?: string };

function thDateTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function isVideoUrl(url: string) {
  const u = url.toLowerCase();
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".mov") ||
    u.endsWith(".webm") ||
    u.includes("video/upload")
  );
}
function normalizeMediaItem<T extends { url: string; type?: "image" | "video" }>(
  m: string | T
): T {
  if (typeof m === "string") {
    return { url: m, type: isVideoUrl(m) ? "video" : "image" } as T;
  }
  if (!m.type) {
    return { ...m, type: isVideoUrl(m.url) ? "video" : "image" };
  }
  return m;
}

const statusChip: Record<ClaimStatus, string> = {
  "กำลังตรวจสอบ": "bg-[#FFB338] text-black",
  "สำเร็จ": "bg-[#35A638] text-white",
  "เอกสารไม่ผ่านการตรวจสอบ": "bg-[#DB4242] text-white",
  "เอกสารต้องแก้ไขเพิ่มเติม":
    "bg-orange-100 text-orange-700 ring-1 ring-orange-300",
};

export default function ReportDetail({
  claim,
  onOpenPdf,
  onDetail,
}: {
  claim: ClaimItem;
  onOpenPdf: () => void;
  onDetail?: () => void;
}) {
  const router = useRouter();
  console.log("🧩 item.incomplete_history =>", claim.incomplete_history);
  const evidenceList: (string | MediaItem)[] = useMemo(() => {
    if (!claim) return [];
    if (
      Array.isArray((claim as any).evidenceMedia) &&
      (claim as any).evidenceMedia.length > 0
    ) {
      return (claim as any).evidenceMedia.map(normalizeMediaItem);
    }
    return [];
  }, [claim]);

  return (
    <div className="rounded-[8px] bg-[#F3F0FF] p-4 shadow-inner mb-30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-black bg-white px-3 py-1 rounded-md shadow-sm">
          {claim.carTitle} · {claim.selected_car_id}
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`shrink-0 rounded-full px-4 py-1 text-xs font-bold shadow ${statusChip[claim.status]}`}
          >
            {claim.status}
          </span>
          <PrintClaimButton claimId={claim.id} status={claim.status} />
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-black">
        {/* ซ้าย (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* ภาพถ่ายความเสียหาย */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold text-violet-700">ภาพถ่ายความเสียหาย</h3>
            <EvidenceGallery media={claim.damagePhotos ?? []} />
          </div>

          {/* รายละเอียดเหตุการณ์ + สถานที่ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* รายละเอียดเหตุการณ์ */}
            <div className="rounded-lg bg-white p-4 text-sm shadow-sm">
              <h3 className="mb-3 font-semibold text-violet-700">รายละเอียดเหตุการณ์</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="font-medium">ประเภทอุบัติเหตุ:</dt>
                  <dd>{claim.incidentType ?? "-"}</dd>
                </div>
                <div>
                  <dt className="font-medium">รายละเอียดเหตุการณ์:</dt>
                  <dd className="whitespace-pre-wrap">{claim.details ?? "-"}</dd>
                </div>
              </dl>
            </div>

            {/* รายละเอียดสถานที่ */}
            <div className="rounded-lg bg-white p-4 text-sm shadow-sm">
              <h3 className="mb-3 font-semibold text-violet-700">รายละเอียดสถานที่</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="font-medium">วัน/เวลา:</dt>
                  <dd>
                    {thDateTime(claim.incidentDate)} {claim.incidentTime ?? ""}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">สถานที่:</dt>
                  <dd>
                    {claim.province ?? "-"} {claim.district ?? ""} {claim.road ?? ""}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">ประเภทพื้นที่:</dt>
                  <dd>{claim.areaType ?? "-"}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* หลักฐานภาพ/วิดีโอ */}
          {evidenceList.length > 0 && (
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h3 className="mb-2 font-semibold text-violet-700">ภาพหลักฐาน</h3>
              <EvidenceGallery media={evidenceList} />
            </div>
          )}
        </div>

        {/* ขวา (1/3) */}
        <div className="lg:col-span-1 space-y-4">
          {/* Timeline */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold text-violet-700">สถานะเคลม</h3>
            <ClaimTimeline
              claimId={claim.id}
              status={claim.status}
              created_at={claim.created_at}
              updated_at={claim.updated_at}
              approved_at={claim.approved_at}
              rejected_at={claim.rejected_at}
              incomplete_at={claim.incomplete_at}
              admin_note={claim.admin_note}
              incomplete_history={claim.incomplete_history || []}
              resubmitted_history={claim.resubmitted_history || []}
              onOpenPdf={onOpenPdf}

            />

          </div>

          {/* Map */}
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold text-violet-700">ตำแหน่งที่เกิดเหตุ</h3>
            {claim.location?.lat && claim.location?.lng ? (
              <MapPreview lat={claim.location.lat} lng={claim.location.lng} />
            ) : (
              <div className="text-sm text-zinc-500">ไม่มีข้อมูลตำแหน่ง</div>
            )}
          </div>
        </div>
      </div>
    </div>

  );
}
