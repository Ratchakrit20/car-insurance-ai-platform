"use client";

import React, { useMemo } from "react";
import type { ClaimItem, ClaimStatus } from "@/types/claim";
import ClaimTimeline from "../components/ClaimTimeline";
import PrintClaimButton from "../components/PrintClaim";
import MapPreview from "../components/MapPreview";
import EvidenceGallery from "../components/EvidenceGallery";
import { mapClaimData } from "./ClaimReportPreview";

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
    hour12: false,
  }) + " น.";
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
}: {
  claim: ClaimItem;
  onOpenPdf: () => void;
}) {
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

  const mapped = mapClaimData(claim);

  return (
    <div className="rounded-[8px] bg-[#F3F0FF] p-4 shadow-inner">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-black bg-white px-4 py-2 rounded-md shadow-sm">
          {claim.car_brand} {claim.car_model} ทะเบียน {claim.license_plate} · {claim.selected_car_id}
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

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-black sm:mb-40">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* ภาพความเสียหาย */}
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-2 font-semibold text-violet-700">
              ภาพถ่ายความเสียหาย
            </h3>
            <EvidenceGallery media={claim.damagePhotos ?? []} />
          </div>



          {/* รายละเอียดเหตุการณ์ + สถานที่ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* รายละเอียดเหตุการณ์ */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-violet-100 transition hover:shadow-md">
              <h3 className="mb-4 font-semibold text-violet-700 text-base">
                รายละเอียดเหตุการณ์
              </h3>
              <dl className="space-y-4 text-[15px] text-zinc-800">
                <div>
                  <dt className="font-medium text-black mb-1">ประเภทอุบัติเหตุ</dt>
                  <dd className="pl-2 text-zinc-600">{claim.incidentType ?? "-"}</dd>
                </div>

                <div>
                  <dt className="font-medium text-black mb-1">รายละเอียดเหตุการณ์</dt>
                  <dd className="pl-2 text-zinc-600 whitespace-pre-wrap">
                    {claim.details ?? "-"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* รายละเอียดสถานที่ */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-violet-100 transition hover:shadow-md">
              <h3 className="mb-4 font-semibold text-violet-700 text-base">
                รายละเอียดสถานที่
              </h3>
                 <dt className="font-medium text-black mb-1">เวลาที่เกิดเหตุ</dt>
              <dd className="pl-2 text-zinc-600">
           

                {(() => {
                  const dateTime = claim.incidentTime
                    ? `${claim.incidentDate.split("T")[0]}T${claim.incidentTime}`
                    : claim.incidentDate;
                  return thDateTime(dateTime);
                })()}
              </dd>

              <div>
                <dt className="font-medium text-black mb-1">สถานที่</dt>
                <dd className="pl-2 text-zinc-600">
                  {claim.province || claim.district || claim.road
                  ? `${claim.province || ""} ${claim.district || ""} ${
                      claim.road || ""
                    }`.trim()
                  : "ไม่ระบุ" + " (" + (claim.location?.lat && claim.location?.lng
                      ? `พิกัด: ${claim.location.lat}, ${claim.location.lng}`
                      : "ไม่มีพิกัด") + ")"}
                </dd>
              </div>

              <div>
                <dt className="font-medium text-black mb-1">ประเภทพื้นที่</dt>
                <dd className="pl-2 text-zinc-600">{claim.areaType ?? "-"}</dd>
              </div>
            <div>
                <dt className="font-medium text-black mb-1">จุดสังเกต</dt>
                <dd className="pl-2 text-zinc-600">{claim.nearby ?? "-"}</dd>
              </div>
          </div>
        </div>



        {/* ตำแหน่งที่เกิดเหตุ */}
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 font-semibold text-violet-700">
            ตำแหน่งที่เกิดเหตุ
          </h3>
          {claim.location?.lat && claim.location?.lng ? (
            <MapPreview lat={claim.location.lat} lng={claim.location.lng} />
          ) : (
            <div className="text-sm text-zinc-500">ไม่มีข้อมูลตำแหน่ง</div>
          )}
        </div>

        {/* ภาพหลักฐาน */}
        {evidenceList.length > 0 && (
          <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-2 font-semibold text-violet-700">
              ภาพหลักฐาน
            </h3>
            <EvidenceGallery media={evidenceList} />
          </div>
        )}
      </div>

      {/* Right 1/3 */}
      <div className="lg:col-span-1 space-y-4">
        {/* Timeline */}
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 font-semibold text-violet-700">สถานะเคลม</h3>
          <ClaimTimeline
            claimId={claim.id.toString()}
            status={claim.status}
            created_at={claim.created_at}
            approved_at={claim.approved_at}
            rejected_at={claim.rejected_at}
            incomplete_at={claim.incomplete_at}
            admin_note={claim.admin_note}
            incomplete_history={claim.incomplete_history || []}
            resubmitted_history={claim.resubmitted_history || []}
            car={mapped.car}
            draft={mapped.draft}
            onOpenPdf={onOpenPdf}
          />
        </div>
      </div>
    </div>
    </div >
  );
}
