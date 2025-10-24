"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_URL_PREFIX ||
  "https://cdd-backend-deyv.onrender.com";

export default function ClaimEditPage() {
  const { id } = useParams(); // claim_id
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

        const res = await fetch(
          `${API_BASE}/api/claim-requests/detail?claim_id=${encodeURIComponent(String(id))}`,
          {
            // ถ้า backend ใช้ Bearer token ให้ส่ง; ถ้าใช้คุ้กกี้ค่อยใส่ credentials: "include"
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: "no-store",
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status}) ${text || ""}`);
        }

        const json = await res.json();
        if (!json.ok) throw new Error(json.message || "โหลดข้อมูลไม่สำเร็จ");

        const d = json.data;

        // ✅ เก็บข้อมูลรถ (สำหรับ Step 0)
        const car = {
          id: d.selected_car_id,
          car_brand: d.car_brand,
          car_model: d.car_model,
          car_year: d.car_year,
          car_license_plate: d.license_plate,
          registration_province: d.registration_province,
          policy_number: d.policy_number,
          insurance_company: "ไม่ระบุ",
          insurance_type: d.insurance_type,
          coverage_end_date: d.coverage_end_date,
          car_path: d.car_path,
        };
        localStorage.setItem("claimSelectedCar", JSON.stringify(car));

        // ✅ เก็บ draft อุบัติเหตุ (สำหรับ Step 1–3)
        const accidentDraft = {
          accidentType: d.accident_type,
          accident_date: d.accident_date,
          accident_time: d.accident_time,
          province: d.province,
          district: d.district,
          road: d.road,
          areaType: d.area_type,
          nearby: d.nearby,
          details: d.details,
          location: {
            lat: Number(d.latitude),
            lng: Number(d.longitude),
            accuracy: d.accuracy,
          },
          evidenceMedia: d.evidence_file_url
            ? [{ url: d.evidence_file_url, type: d.media_type || "image" }]
            : [],
          damagePhotos: Array.isArray(d.damage_images)
            ? d.damage_images.map((img: { id: number; original_url: string; side?: string | null; damage_note?: string | null; }) => ({
                id: img.id,
                url: img.original_url,
                type: "image",
                side: img.side || "ไม่ระบุ",
                note: img.damage_note || "",
              }))
            : [],
          claim_id: d.claim_id, // ✅ เก็บไว้ใช้ตอน submit update
          status: d.status, // ✅ ให้ ReviewConfirm ตรวจว่าเป็น incomplete
        };

        localStorage.setItem("accidentDraft", JSON.stringify(accidentDraft));

        // ✅ ไปหน้า detect flow เดิม พร้อมโหลดข้อมูลเก่า
        router.push("/detect?step=4");
      } catch (e: any) {
        console.error(e);
        setError(e.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-zinc-600">
        กำลังโหลดข้อมูลคำขอเคลม...
      </div>
    );

  if (error)
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center">
        <p className="text-red-500 mb-2">{error}</p>
        <button
          onClick={() => location.reload()}
          className="rounded-md bg-violet-600 text-white px-4 py-2 hover:bg-violet-700"
        >
          ลองใหม่
        </button>
      </div>
    );

  return null;
}
