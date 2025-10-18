"use client";

import React, { useEffect, useState } from "react";
import DamagePhotosPanel, { DamagePhotoItem } from "../components/DamagePhotosPanel";
import SafeAreaSpacer from "../components/SafeAreaSpacer";
import type {
    MediaItem
} from "@/types/claim";

const ACC_KEY = "accidentDraft";






interface StepProps {
    onNext: () => void;
    onBack: () => void;
}

export default function AccidentStep3({ onNext, onBack }: StepProps) {
    const [damageItems, setDamageItems] = useState<DamagePhotoItem[]>([]);
    // const [agreed, setAgreed] = useState(false);

    // ฟังก์ชันอัปโหลดไฟล์ไป Cloudinary
    async function uploadToCloudinary(file: File): Promise<MediaItem> {
        const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD!;
        const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET!;
        const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", preset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
        return { url: data.secure_url as string, type: data.resource_type as "image" | "video", publicId: data.public_id as string };
    }


    // โหลด draft
    useEffect(() => {
        try {
            const rawAcc = localStorage.getItem(ACC_KEY);
            if (rawAcc) {
                const a = JSON.parse(rawAcc);
                if (Array.isArray(a.damagePhotos)) {
  const normalized = a.damagePhotos.map((d: any) => ({
    id: d.publicId || crypto.randomUUID(),
    file: null, // ✅ ไม่ต้องอัปโหลดใหม่
    previewUrl: d.url,
    side: d.side ?? "ไม่ระบุ",
    total: d.total ?? undefined,
    perClass: d.perClass ?? undefined,
    note: d.note ?? "",
    detecting: false,
    type: d.type ?? "image",
    ready: true, // ✅ เพิ่ม flag ว่าไฟล์นี้พร้อมใช้แล้ว
  }));
  setDamageItems(normalized);
}

                // setAgreed(a.agreed || false);
            }
        } catch { }
    }, []);

    // ✅ ย้าย await มาที่นี่
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const oldDraft = JSON.parse(localStorage.getItem(ACC_KEY) || "{}");

        const damagePhotos = await Promise.all(
            damageItems.map(async (it) => {
                if (it.file) {
                    const up = await uploadToCloudinary(it.file);
                    return {
                        url: up.url,
                        type: up.type,
                        publicId: up.publicId,
                        side: it.side,
                        total: it.total,
                        perClass: it.perClass,
                        note: it.note,
                    };
                }
                return {
                    url: it.previewUrl,
                    type: "image",
                    publicId: it.id,
                    side: it.side,
                    total: it.total,
                    perClass: it.perClass,
                    note: it.note,
                };
            })
        );

        const payload = {
            ...oldDraft,
            damagePhotos,
            // agreed,
        };

        localStorage.setItem(ACC_KEY, JSON.stringify(payload));
        onNext();
    };

    const isValid =
  damageItems.length > 0 &&
  damageItems.every(d => d.previewUrl || (d as any).ready);


useEffect(() => {
  if (damageItems.length > 0) {
    // ตรวจว่าทุกไฟล์พร้อมใช้งาน
    const ready = damageItems.every(d => d.previewUrl || (d as any).ready);
    if (ready) {
      // อัปเดต state เพื่อให้ React render ปุ่มใหม่
      // ทำให้ isValid = true ทันที
      setDamageItems(prev => prev.map(d => ({ ...d, ready: true })));
    }
  }
}, [damageItems.length]);





    return (
        <div className="acc-page box-border mx-auto max-w-5xl px-3 sm:px-4 md:px-6">
            <form onSubmit={handleSubmit} className="bg-white p-6 space-y-8">
                <div className="mb-5 text-center">
                    <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
                        อัปโหลดภาพรถยนต์ที่เกิดความเสียหาย
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                        ถ่ายภาพให้เห็นชัดเจนในที่แสงสว่าง และระยะห่างประมาณ 1 เมตรจากจุดที่เสียหายบนชิ้นส่วน
                    </p>
                </div>

                {/* Damage Photos Panel */}
                <div className="mt-6 min-w-0">
                    <div className="rounded-[7px] overflow-hidden">
                        <DamagePhotosPanel
                            apiBaseUrl={process.env.NEXT_PUBLIC_DETECT_API_URL as string}
                            onChange={setDamageItems}
                            value={damageItems}
                        />
                    </div>
                </div>



                {/* ปุ่ม */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-full sm:w-auto rounded-[7px] bg-zinc-200 text-zinc-800 hover:bg-zinc-300 px-6 py-3 sm:py-2"
                    >
                        ย้อนกลับ
                    </button>
                    <button
                        type="submit"
                        disabled={!isValid}
                        className={`w-full sm:w-auto rounded-[7px] px-6 py-2 font-medium shadow-sm ${isValid
                            ? "bg-[#6D5BD0] hover:bg-[#433D8B] text-white"
                            : "bg-zinc-400 cursor-not-allowed text-white"
                            }`}
                    >
                        ดำเนินการต่อ
                    </button>
                </div>
            </form>

            <SafeAreaSpacer />
        </div>
    );
}
