// ✅ ClaimEditPage.tsx (เวอร์ชัน redirect อัตโนมัติ)
"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingScreen from "@/app/components/LoadingScreen";

const API_BASE =
  process.env.NEXT_PUBLIC_URL_PREFIX ||
  "https://cdd-backend-deyv.onrender.com";

export default function ClaimEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/claim-requests/detail?claim_id=${id}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.message || "โหลดข้อมูลไม่สำเร็จ");

        const d = json.data;

        // ✅ เก็บข้อมูล admin note และ accidentDraft ลง localStorage
        localStorage.setItem("claimAdminNote", JSON.stringify(d.admin_note || {}));

        const car = {
          id: d.selected_car_id,
          car_path:d.car_path,
          insured_name:d.insured_name,
          car_brand: d.car_brand,
          car_model: d.car_model,
          car_year: d.car_year,
          car_license_plate: d.license_plate,
          registration_province: d.registration_province,
          policy_number: d.policy_number,
          insurance_type: d.insurance_type,
          coverage_end_date: d.coverage_end_date,
          chassis_number:d. chassis_number
        };
        localStorage.setItem("claimSelectedCar", JSON.stringify(car));

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
            ? d.damage_images.map((img: any) => ({
                id: img.id,
                url: img.original_url,
                type: "image",
                side: img.side || "ไม่ระบุ",
                note: img.damage_note || "",
              }))
            : [],
          claim_id: d.claim_id,
          status: d.status,
        };
        localStorage.setItem("accidentDraft", JSON.stringify(accidentDraft));

        // ✅ ไปหน้ากรอกข้อมูลเคลมโดยอัตโนมัติ
        router.push("/detect?step=4");
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading)
    return (

      <div className="p-8 text-center text-zinc-600">
          <LoadingScreen message="กำลังโหลดข้อมูลคำขอเคลม..." />;
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center text-red-500">
        เกิดข้อผิดพลาด: {error}
      </div>
    );

  return null; // ❌ ไม่ต้องแสดงหน้าใด ๆ
}
