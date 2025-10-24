"use client";

import React, { useEffect, useMemo, useState } from "react";
import DamagePhotosPanel, { DamagePhotoItem } from "../components/DamagePhotosPanel";
import SafeAreaSpacer from "../components/SafeAreaSpacer";
import { useLeaveConfirm } from "@/hooks/useLeaveConfirm";
import type {
    MediaItem
} from "@/types/claim";

const ACC_KEY = "accidentDraft";

const STEP2_URL = "/detect/step2";





interface StepProps {
    onNext: () => void;
    onBack: () => void;
}
type MediaKind = "image" | "video";
const inferType = (item: DamagePhotoItem): MediaKind => {
    const anyItem = item as any;
    // ถ้า state เคยเก็บไว้ใน any (เช่นหลังโหลดจาก localStorage) ก็ใช้ได้
    if (anyItem.type === "image" || anyItem.type === "video") return anyItem.type;
    if (item.file?.type?.startsWith?.("video/")) return "video";
    return "image";
};

// เดาประเภทจาก URL (เช่น Cloudinary จะมี /image/upload/ หรือ /video/upload/)
const typeFromUrl = (url: string): MediaKind => {
    if (!url) return "image";
    if (/\/video\//i.test(url) || /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url)) return "video";
    return "image";
};
export default function AccidentStep3({ onNext, onBack }: StepProps) {
    const [damageItems, setDamageItems] = useState<DamagePhotoItem[]>([]);
    const [isSaved, setIsSaved] = useState(false);
    const hasUnsaved = useMemo(() => {
        return !isSaved && (
            damageItems.length > 0 &&
            damageItems.some(d => !!d.previewUrl || !!d.file) // มีอย่างน้อย 1 ไฟล์
        );
    }, [isSaved, damageItems]);

    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [nextUrl, setNextUrl] = useState<string | null>(null);
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

  useLeaveConfirm({
  hasUnsavedChanges: hasUnsaved,
  onConfirmLeave: (url) => {
    // ย้อนกลับผ่านปุ่ม/ปุ่ม back → ไม่เตือน
    if (url === "back" || (url && url.startsWith(STEP2_URL))) {
      setIsSaved(true);
      if (url === "back") onBack();
      else window.location.href = url; // หรือ router.push(url)
      return;
    }
    // อื่น ๆ → เปิด modal ยืนยัน
    setNextUrl(url || "");
    setShowLeaveConfirm(true);
  },
  onAutoSave: () => {
    const snapshot = damageItems.map(d => ({
      url: d.previewUrl,
      type: inferType(d),
      publicId: d.id,
      side: d.side,
      total: d.total,
      perClass: d.perClass,
      note: d.note,
    }));
    const oldDraft = JSON.parse(localStorage.getItem(ACC_KEY) || "{}");
    localStorage.setItem(ACC_KEY, JSON.stringify({ ...oldDraft, damagePhotos: snapshot }));
  },
});


    // โหลด draft
    useEffect(() => {
        try {
            const rawAcc = localStorage.getItem(ACC_KEY);
            if (rawAcc) {
                const a = JSON.parse(rawAcc);
                if (Array.isArray(a.damagePhotos)) {
                    const normalized = a.damagePhotos.map((d: any) => ({
                        id: d.publicId || crypto.randomUUID(),
                        file: null,
                        previewUrl: d.url,
                        side: d.side ?? "ไม่ระบุ",
                        total: d.total ?? undefined,
                        perClass: d.perClass ?? undefined,
                        note: d.note ?? "",
                        detecting: false,
                        type: d.type ?? "image",
                        ready: true,
                    }));
                    setDamageItems(normalized);
                }
            }
        } catch { }
    }, []);
    // ✅ Auto-save: เซฟรูปทุกครั้งที่ damageItems เปลี่ยน
    useEffect(() => {
        if (!damageItems || damageItems.length === 0) return;

        const snapshot = damageItems.map((d) => ({
            url: d.previewUrl,
            type: inferType(d),
            publicId: d.id,
            side: d.side,
            total: d.total,
            perClass: d.perClass,
            note: d.note,
        }));

        try {
            const oldDraft = JSON.parse(localStorage.getItem(ACC_KEY) || "{}");
            localStorage.setItem(ACC_KEY, JSON.stringify({ ...oldDraft, damagePhotos: snapshot }));
        } catch { }
    }, [damageItems]);


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
        setIsSaved(true);
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
                        onClick={() => {
                            setIsSaved(true); // บอกว่าเซฟแล้ว → ไม่ต้องเตือน
                            onBack();
                        }}
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
            {showLeaveConfirm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-sm text-center space-y-4">
                        <h2 className="text-lg font-semibold text-zinc-800">ออกจากหน้านี้หรือไม่?</h2>
                        <p className="text-sm text-zinc-600">คุณมีข้อมูลที่ยังไม่ได้บันทึก หากออก ข้อมูลอาจสูญหาย</p>
                        <div className="flex justify-center gap-3 mt-4">
                            <button
                                onClick={() => { setShowLeaveConfirm(false); setNextUrl(null); }}
                                className="px-5 py-2 rounded-[7px] bg-zinc-200 hover:bg-zinc-300 text-zinc-700"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => {
                                    setShowLeaveConfirm(false);
                                    if (nextUrl === "back") onBack();
                                    else if (nextUrl) window.location.href = nextUrl; // หรือ router.push(nextUrl)
                                }}
                                className="px-5 py-2 rounded-[7px] bg-[#6D5BD0] hover:bg-[#433D8B] text-white"
                            >
                                ออกจากหน้า
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SafeAreaSpacer />
        </div>
    );
}
