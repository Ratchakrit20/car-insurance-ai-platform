"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, DragEvent } from "react";
import { FileVideo, Image as ImageIcon, Plus, X, UploadCloud, Trash2 } from "lucide-react";
import { useLeaveConfirm } from "@/hooks/useLeaveConfirm";
const ACC_KEY = "accidentDraft";
import { Camera, Wrench, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

type AccidentType =
  | "ถูกชนขนะจอดอยู่"
  | "ถูกของตกใส่"
  | "ชนสัตว์"
  | "ชนสิ่งของ"
  // | "ไฟไหม้"
  // | "น้ำท่วม"
  | "ยางรั่ว/ยางแตก"
  | "อื่นๆ";

type EvidenceFile = {
  url: string;
  type: "image" | "video";
  publicId: string;
  name: string;
  progress?: number; // ✅ เพิ่ม progress
  loaded?: boolean; // ✅ เพิ่มตรงนี้
};

const ACCIDENT_TYPES: { key: AccidentType; label: string; image?: string }[] = [
  { key: "ถูกชนขนะจอดอยู่", label: "ถูกชนขนะจอดอยู่", image: "/accident-icons/hit.png" },
  { key: "ถูกของตกใส่", label: "ถูกของตกใส่", image: "/accident-icons/drop.png" },
  { key: "ชนสัตว์", label: "ชนสัตว์", image: "/accident-icons/animal.png" },
  { key: "ชนสิ่งของ", label: "ชนสิ่งของ", image: "/accident-icons/crash.png" },
  // { key: "ไฟไหม้", label: "ไฟไหม้", image: "/accident-icons/fire.png" },
  // { key: "น้ำท่วม", label: "น้ำท่วม", image: "/accident-icons/flood.png" },
  { key: "ยางรั่ว/ยางแตก", label: "ยางรั่ว/ยางแตก", image: "/accident-icons/wheel.png" },
  { key: "อื่นๆ", label: "อื่น ๆ", image: "/accident-icons/etc.png" },
];

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

function labelEl(text: string, required?: boolean) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="text-sm font-medium text-zinc-800">{text}</span>
      {required && (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
          จำเป็น
        </span>
      )}
    </div>
  );
}

function fieldSurface({ required, filled }: { required?: boolean; filled?: boolean }) {
  const base =
    "rounded-[7px] border px-3 py-2 sm:py-2.5 text-zinc-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] transition outline-none w-full ";
  if (required && !filled)
    return `${base} bg-[#D9D9D9] border-zinc-200 focus:ring-2 focus:ring-zinc-500`;
  return `${base} bg-white border-zinc-200 focus:ring-2 focus:ring-violet-500`;
}

// ✅ ฟังก์ชันอัปโหลดไฟล์ไป Cloudinary (มี progress)
async function uploadToCloudinary(file: File, onProgress: (p: number) => void): Promise<EvidenceFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET as string);

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD}/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status !== 200) {
        reject(new Error("Upload failed"));
        return;
      }
      const data = JSON.parse(xhr.responseText);
      resolve({
        url: data.secure_url,
        type: file.type.startsWith("video/") ? "video" : "image",
        publicId: data.public_id,
        name: file.name,
        progress: 100,
      });
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

export default function AccidentStep1({ onNext, onBack }: StepProps) {

  const router = useRouter();
  const [accidentType, setAccidentType] = useState<AccidentType>("ชนสัตว์");
  const [details, setDetails] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<any>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("claimAdminNote");
      if (raw) setAdminNote(JSON.parse(raw));
    } catch { }
  }, []);


  const MAX_IMAGE_MB = 10;          // แนะนำ 2–5MB แต่เพดาน 10MB
  const MAX_VIDEO_MB = 100;         // ถ้าอยากเร็ว ตั้ง 50MB
  const MAX_FILES_PER_CASE = 20;    // หรือรวมไม่เกิน ~500MB ตามนโยบาย
  const MAX_TOTAL_MB = 500;

  const ACCEPT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  const ACCEPT_VIDEO_TYPES = ["video/mp4"]; // (H.264/AAC)

  const MAX_VIDEO_DURATION_SEC = 120; // 60–120 วินาที
  const MAX_IMAGE_LONG_EDGE_PX = 3000; // อนุโลม 3Kpx (อัปแล้วค่อยลดเหลือ ~2048px ด้านยาวฝั่งเซิร์ฟเวอร์จะชัวร์กว่า)

  const bytesToMB = (n: number) => n / (1024 * 1024);
  const [showAdminPanel, setShowAdminPanel] = useState(true);
  const isAcceptedType = (file: File) => {
    if (file.type.startsWith("image/")) return ACCEPT_IMAGE_TYPES.includes(file.type);
    if (file.type.startsWith("video/")) return ACCEPT_VIDEO_TYPES.includes(file.type);
    return false;
  };

  // ตรวจขนาด/จำนวนรวม
  const calcCurrentTotalMB = (files: EvidenceFile[]) =>
    files.reduce((sum, f) => {
      // ไม่มี size เก็บไว้ใน EvidenceFile จึงนับเฉพาะไฟล์ใหม่จาก input ด้านล่าง
      return sum;
    }, 0);













  useLeaveConfirm({
    hasUnsavedChanges: evidenceFiles.length > 0 || details.trim().length > 0,
    onConfirmLeave: (url: string) => {
      setNextUrl(url);
      setShowLeaveConfirm(true);
    },
  });

  // useEffect(() => {
  //   try {
  //     const raw = localStorage.getItem(ACC_KEY);
  //     if (raw) {
  //       const draft = JSON.parse(raw);
  //       setAccidentType(draft.accidentType ?? "ชนสัตว์");
  //       setDetails(draft.details ?? "");

  //       // ✅ เติมค่าที่หายไป (normalize data)
  //       const normalized = (draft.evidenceMedia ?? []).map((f: any, i: number) => ({
  //         url: f.url,
  //         type: f.type ?? "image",
  //         publicId: f.publicId ?? "",
  //         name: f.name ?? `ไฟล์ที่-${i + 1}`,
  //         progress: f.progress ?? 100, // ถือว่าอัปโหลดเสร็จแล้ว
  //       }));

  //       setEvidenceFiles(normalized);
  //     }
  //   } catch (e) {
  //     console.warn("load accident draft failed", e);
  //   }
  // }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACC_KEY);
      if (!raw) return;

      const draft = JSON.parse(raw);
      setAccidentType(draft.accidentType ?? "ชนสัตว์");
      setDetails(draft.details ?? "");

      let normalized: EvidenceFile[] = [];

      if (Array.isArray(draft.evidenceMedia)) {
        if (draft.evidenceMedia.length && Array.isArray(draft.evidenceMedia[0]?.url)) {
          const urls = draft.evidenceMedia[0].url ?? [];
          const types = draft.evidenceMedia[0].type ?? [];
          normalized = urls.map((u: string, i: number) => ({
            url: u,
            type: types[i] ?? "image",
            publicId: "",
            name: `ไฟล์ที่-${i + 1}`,
            progress: 100,
          }));
        } else {
          normalized = draft.evidenceMedia.map((f: any, i: number) => ({
            url: f.url,
            type: f.type ?? "image",
            publicId: f.publicId ?? "",
            name: f.name ?? `ไฟล์ที่-${i + 1}`,
            progress: f.progress ?? 100,
          }));
        }
      }

      setEvidenceFiles(normalized);

      // ✅ ถือว่าพร้อมแสดงผลแล้ว
      if (normalized.length > 0) setPreviewLoaded(true);
    } catch (e) {
      console.warn("load accident draft failed", e);
    }
  }, []);






  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (details.trim().length === 0) {
      setDetailsError(true);
      setTimeout(() => setDetailsError(false), 3000); // ให้เตือน 3 วิแล้วหาย
      window.scrollTo({ top: 200, behavior: "smooth" });
      return;
    }
    window.removeEventListener("beforeunload", () => { }); // <-- เพิ่มบรรทัดนี้
    window.onbeforeunload = null; // <-- กัน browser popup ซ้ำ

    const oldDraft = JSON.parse(localStorage.getItem(ACC_KEY) || "{}");
    const payload = {
      ...oldDraft,
      accidentType,
      details,
      evidenceMedia: evidenceFiles,
    };
    localStorage.setItem(ACC_KEY, JSON.stringify(payload));
    onNext();
  };

  const handleFilesUpload = async (files: File[]) => {

    setUploadError(null);

    // นับจำนวน (เดิม + ใหม่)
    if (evidenceFiles.length + files.length > MAX_FILES_PER_CASE) {
      setUploadError(`อัปโหลดได้ไม่เกิน ${MAX_FILES_PER_CASE} ไฟล์ต่อเคส`);
      return;
    }

    // รวมขนาดไฟล์ใหม่ (เพราะไฟล์เดิมเราไม่มี size แล้ว)
    const newTotalMB = files.reduce((s, f) => s + bytesToMB(f.size), 0);
    if (newTotalMB > MAX_TOTAL_MB) {
      setUploadError(`ขนาดรวมไฟล์ใหม่เกิน ${MAX_TOTAL_MB} MB`);
      return;
    }

    // ตรวจไฟล์ทีละตัว
    for (const f of files) {
      if (!isAcceptedType(f)) {
        setUploadError("ชนิดไฟล์ที่รับ: รูป JPEG/PNG/HEIC/WebP และวิดีโอ MP4 เท่านั้น");
        return;
      }
      if (f.type.startsWith("image/") && bytesToMB(f.size) > MAX_IMAGE_MB) {
        setUploadError(`รูปภาพต้องไม่เกิน ${MAX_IMAGE_MB} MB/ไฟล์`);
        return;
      }
      if (f.type.startsWith("video/") && bytesToMB(f.size) > MAX_VIDEO_MB) {
        setUploadError(`วิดีโอต้องไม่เกิน ${MAX_VIDEO_MB} MB/ไฟล์`);
        return;
      }
    }

    // (ออปชัน) ตรวจความยาววิดีโอแบบเร็ว ๆ ก่อนอัป
    const checkVideoDuration = (file: File) =>

      new Promise<void>((resolve, reject) => {
        if (!file.type.startsWith("video/")) return resolve();
        const url = URL.createObjectURL(file);
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          if (v.duration > MAX_VIDEO_DURATION_SEC) {
            reject(new Error(`วิดีโอยาวเกิน ${MAX_VIDEO_DURATION_SEC} วินาที`));
          } else resolve();
        };
        v.onerror = () => reject(new Error("ไม่สามารถอ่านข้อมูลวิดีโอได้"));
        v.src = url;
      });

    try {
      // เช็กความยาววิดีโอก่อน
      for (const f of files) await checkVideoDuration(f);
    } catch (err: any) {
      setUploadError(err?.message || "ไฟล์วิดีโอไม่ผ่านเกณฑ์");
      return;
    }
    const uploads = files.map((file, i) => {
      const temp: EvidenceFile = {
        url: "",
        type: file.type.startsWith("video/") ? "video" : "image",
        publicId: "",
        name: file.name,
        progress: 0,
      };

      // ✅ เพิ่ม temp เข้า state ก่อน เพื่อให้เห็น progress ทุกภาพ
      let currentIndex = -1;
      setEvidenceFiles((prev) => {
        const newArr = [...prev, temp];
        currentIndex = newArr.length - 1; // index ของภาพนี้
        return newArr;
      });

      // ✅ เริ่มอัปโหลด Cloudinary
      return uploadToCloudinary(file, (p) => {
        // อัปเดต progress แบบเรียลไทม์
        setEvidenceFiles((prev) =>
          prev.map((f, idx) =>
            idx === currentIndex ? { ...f, progress: p } : f
          )
        );
      })
        .then((uploaded) => {
          // ✅ แทนค่าใหม่เมื่ออัปโหลดเสร็จ
          setEvidenceFiles((prev) =>
            prev.map((f, idx) =>
              idx === currentIndex
                ? { ...uploaded, name: file.name, progress: 100 }
                : f
            )
          );

          // ✅ เลือกภาพล่าสุดอัตโนมัติ
          setSelectedIndex(currentIndex);
        })
        .catch((err) => {
          console.error("upload error", err);
          // ❌ ถ้าอัปโหลด fail → แสดงว่า fail
          setEvidenceFiles((prev) =>
            prev.map((f, idx) =>
              idx === currentIndex
                ? { ...f, progress: 0, name: file.name }
                : f
            )
          );
        });
    });

    // ✅ รอให้อัปโหลดทุกไฟล์เสร็จ (ไม่บังคับแต่ช่วยให้รอจบ)
    await Promise.allSettled(uploads);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFilesUpload(files);
    }
    // ✅ reset value เพื่อให้อัปโหลดไฟล์ชื่อซ้ำได้
    e.target.value = "";
  };
  const canProceed =
    details.trim().length > 0 &&
    (evidenceFiles.length === 0 ||
      evidenceFiles.every((f) => f.progress === 100 && f.loaded));



  const handleRemove = (i: number) => {
    const updated = evidenceFiles.filter((_, idx) => idx !== i);
    setEvidenceFiles(updated);
    if (selectedIndex >= updated.length) setSelectedIndex(updated.length - 1);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFilesUpload(files);
  };

  return (
    <div className="acc-page box-border mx-auto max-w-5xl px-3 sm:px-4 md:px-6">
      <form onSubmit={handleSubmit} noValidate className="bg-white p-6 space-y-8">
        {/* 🔧 กล่องแสดงคำแนะนำของเจ้าหน้าที่ */}
        {/* แสดง Admin Panel เฉพาะเมื่อมี accident หรือ evidence data จริงๆ */}
        {(adminNote?.accident?.comment?.trim() ||
          (Array.isArray(adminNote?.evidence) && adminNote.evidence.some((e: any) => e.checked))) && (
            <div className="border border-violet-300 bg-violet-50/80 text-gray-800 px-5 py-4 rounded-2xl shadow-sm mb-6 transition-all duration-200 hover:shadow-md">
              {/* Header + toggle */}
              <div
                className="flex justify-between items-center cursor-pointer select-none"
                onClick={() => setShowAdminPanel((prev) => !prev)}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-violet-500 w-5 h-5" />
                  <p className="font-semibold text-sm sm:text-base text-gray-900">
                    เจ้าหน้าที่แจ้งให้แก้ไขในส่วน{" "}
                    <span className="text-violet-700">"รายละเอียดอุบัติเหตุ"</span>
                  </p>
                </div>
                {showAdminPanel ? (
                  <ChevronUp className="w-4 h-4 text-violet-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-violet-600" />
                )}
              </div>

              {/* ✅ เนื้อหาที่พับได้ */}
              {showAdminPanel && (
                <div className="mt-4 space-y-5 text-sm sm:text-base">
                  {/* ✅ หมายเหตุหลัก */}
                  {adminNote?.accident?.comment?.trim() && (
                    <div className="bg-white border-l-4 border-violet-500 rounded-lg p-3 shadow-sm">
                      <p className="text-gray-800 leading-relaxed">
                        <span className="font-semibold text-violet-700">หมายเหตุ:</span>{" "}
                        {adminNote.accident.comment}
                      </p>
                    </div>
                  )}

                  {/* ✅ ภาพหรือวิดีโอหลักฐาน */}
                  {Array.isArray(adminNote?.evidence) &&
                    adminNote.evidence.some((e: any) => e.checked) && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="w-4 h-4 text-violet-600" />
                          <p className="font-semibold text-gray-900">
                            ภาพหรือวิดีโอหลักฐานที่ต้องแก้ไข:
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {adminNote.evidence
                            .filter((e: any) => e.checked)
                            .flatMap((e: any, i: number) =>
                              (Array.isArray(e.url) ? e.url : [e.url]).map(
                                (u: string, j: number) => (
                                  <div
                                    key={`${i}-${j}`}
                                    className="relative rounded-xl overflow-hidden border border-violet-200 bg-white shadow-sm hover:shadow-md transition-all duration-150"
                                  >
                                    {/\.(mp4|mov|webm)$/i.test(u) ? (
                                      <video
                                        src={u}
                                        controls
                                        className="w-full h-40 object-cover bg-black"
                                      />
                                    ) : (
                                      <img
                                        src={u}
                                        alt={`evidence-${i}-${j}`}
                                        className="w-full h-40 object-cover"
                                      />
                                    )}
                                    {e.comment?.trim() && (
                                      <p className="text-xs text-gray-700 bg-violet-50 p-2 border-t border-violet-100">
                                        <span className="font-semibold text-violet-700">
                                          หมายเหตุ:
                                        </span>{" "}
                                        {e.comment}
                                      </p>
                                    )}
                                  </div>
                                )
                              )
                            )}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

        {/* Accident Type */}
        <div className="mb-5">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-900 text-center mb-3">
            ระบุอุบัติเหตุ
          </h2>
          <div className="-mx-3 px-3 py-3 flex gap-3 overflow-x-auto chip-scroller">
            {ACCIDENT_TYPES.map((t) => {
              const active = accidentType === t.key;
              return (
                <div key={t.key} className="flex flex-col items-center w-[150px] sm:w-[180px] shrink-0 p-2">
                  <button
                    type="button"
                    onClick={() => setAccidentType(t.key)}
                    className={[
                      "w-full h-[150px] rounded-[12px] ring-1 flex items-center justify-center transition-all duration-300",
                      active
                        ? "bg-gradient-to-b from-[#6D5BD0] to-[#433D8B] text-white ring-violet-300 scale-105 shadow-lg"
                        : "bg-[#C6C6C6] text-zinc-700 ring-zinc-200 hover:bg-[#d8d8d8]",
                    ].join(" ")}
                  >
                    {t.image && <img src={t.image} alt={t.label} className="object-contain" />}
                  </button>
                  <span
                    className={`mt-2 text-sm font-semibold ${active ? "text-[#433D8B]" : "text-zinc-800"}`}
                  >
                    {t.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accident Details */}
        {/* -------------------- รายละเอียดอุบัติเหตุเพิ่มเติม -------------------- */}
        {labelEl("รายละเอียดอุบัติเหตุเพิ่มเติม", true)}

        {/* 🔹 Preset ตามประเภทอุบัติเหตุ */}
        <div className="space-y-2 mb-3">
          <p className="text-sm text-zinc-600">เลือกตัวอย่างข้อความที่ใกล้เคียง</p>

          <div className="flex flex-wrap gap-2">
            {accidentType === "ถูกชนขนะจอดอยู่" &&
              [
                "จอดรถไว้ริมถนน แล้วมีรถคันอื่นขับมาชนบริเวณด้านหลัง",
                "จอดอยู่ในลานจอดรถ แล้วมีรถอีกคันเฉี่ยวชนแล้วหนี",
                "ไม่เห็นเหตุการณ์ตอนเกิดชน พบว่ารถมีรอยบุบ/ขูดตอนกลับมา",
                "กล้องหน้ารถบันทึกไว้ พบว่ามีรถเก๋งชนแล้วขับออกไป",
              ].map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDetails(example)}
                  className="px-3 py-1.5 rounded-[7px] bg-[#DEDCFF]/50 hover:bg-[#DEDCFF] 
                     text-sm text-[#433D8B] transition"
                >
                  {example}
                </button>
              ))}

            {accidentType === "ถูกของตกใส่" &&
              [
                "มีของตกจากอาคารสูงตกใส่ฝากระโปรงหน้า",
                "ป้ายโฆษณาหล่นใส่รถขณะฝนตกหนัก",
                "ต้นไม้หักล้มใส่หลังคารถขณะจอดอยู่",
                "เศษวัสดุก่อสร้างตกลงมาใส่กระจกหน้า",
              ].map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDetails(example)}
                  className="px-3 py-1.5 rounded-[7px] bg-[#DEDCFF]/50 hover:bg-[#DEDCFF] 
                     text-sm text-[#433D8B] transition"
                >
                  {example}
                </button>
              ))}

            {accidentType === "ชนสัตว์" &&
              [
                "ขับรถอยู่ในเส้นทางชนบท มีสุนัขวิ่งตัดหน้าและเบรกไม่ทัน",
                "ขณะขับรถกลางคืน มีสัตว์วิ่งตัดหน้า ทำให้เฉี่ยวชน",
                "ขับรถบนถนนสายหลัก มีนกชนกระจกหน้า",
                "ชนวัว/สุนัขบริเวณถนน ไม่มีคู่กรณีอื่น",
              ].map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDetails(example)}
                  className="px-3 py-1.5 rounded-[7px] bg-[#DEDCFF]/50 hover:bg-[#DEDCFF] 
                     text-sm text-[#433D8B] transition"
                >
                  {example}
                </button>
              ))}

            {accidentType === "ชนสิ่งของ" &&
              [
                "ถอยรถชนเสาไฟในลานจอดรถ",
                "เลี้ยวแล้วเฉี่ยวกำแพงด้านข้าง",
                "ขับชนขอบฟุตบาท ทำให้ล้อแม็กเสียหาย",
                "เฉี่ยวแบริเออร์ขณะเปลี่ยนเลน",
              ].map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDetails(example)}
                  className="px-3 py-1.5 rounded-[7px] bg-[#DEDCFF]/50 hover:bg-[#DEDCFF] 
                     text-sm text-[#433D8B] transition"
                >
                  {example}
                </button>
              ))}

            {accidentType === "ยางรั่ว/ยางแตก" &&
              [
                "ขับรถแล้วเหยียบตะปูทำให้ยางรั่ว",
                "ยางหลังแตกขณะขับบนทางด่วน ต้องจอดข้างทาง",
                "สงสัยว่ายางรั่วจากเศษโลหะบนถนน",
                "ขับมาได้สักพักยางแบนโดยไม่ทราบสาเหตุ",
              ].map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDetails(example)}
                  className="px-3 py-1.5 rounded-[7px] bg-[#DEDCFF]/50 hover:bg-[#DEDCFF] 
                     text-sm text-[#433D8B] transition"
                >
                  {example}
                </button>
              ))}

            {accidentType === "อื่นๆ" &&
              [
                "ไม่แน่ใจสาเหตุ พบว่ารถมีรอยขูดบริเวณประตูฝั่งซ้าย",
                "เกิดเหตุเฉี่ยวชนเล็กน้อยกับสิ่งไม่ทราบชนิด",
                "มีเสียงดังขณะขับแต่ไม่พบคู่กรณี",
                "ต้องการให้เจ้าหน้าที่ตรวจสอบเพิ่มเติม",
              ].map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDetails(example)}
                  className="px-3 py-1.5 rounded-[7px] bg-[#DEDCFF]/50 hover:bg-[#DEDCFF] 
                     text-sm text-[#433D8B] transition"
                >
                  {example}
                </button>
              ))}
          </div>
        </div>

        {/* 🔹 Textarea สำหรับแก้ไข */}
        <textarea
          className={
            fieldSurface({ required: true, filled: !!details }) +
            " min-h-[120px] rounded-[7px] border w-full p-3 " +
            (detailsError ? "border-red-500" : "border-zinc-300")
          }
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="เช่น จอดอยู่แล้วมีรถคันอื่นมาชนด้านหลัง / ถอยชนเสาในลานจอด / ขณะขับมีสุนัขวิ่งตัดหน้า"
        />
        {detailsError && (
          <p className="text-sm text-red-600 mt-1">
            ⚠ กรุณากรอกรายละเอียดอุบัติเหตุก่อนดำเนินการต่อ
          </p>
        )}




        {/* Evidence Upload */}

        {/* Sidebar */}         {labelEl("อัปโหลดหลักฐานภาพถ่ายหรือวิดีโอของเหตุการณ์ (ถ้ามี) ")}
        <br />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="bg-violet-50 rounded-lg p-4 flex flex-col">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-violet-600" /> รายการอัปโหลด
            </h3>

            <div className="flex-1 space-y-3 overflow-y-auto">
              {evidenceFiles.map((f, i) => {
                const isActive = i === selectedIndex;
                return (
                  <div key={i} className="relative space-y-1 group">
                    {/* ปุ่มเลือกรูป */}
                    <button
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition relative
                ${isActive
                          ? "bg-[#6F47E4] text-white ring-2 ring-violet-400"
                          : "bg-white hover:bg-violet-100 text-zinc-700"
                        }`}
                      title="คลิกเพื่อดูภาพนี้ทางขวา"
                    >
                      {f.type === "video" ? (
                        <FileVideo className="w-4 h-4" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      <span className="truncate flex-1">{f.name}</span>
                    </button>

                    {/* ปุ่มลบ */}
                    <button
                      type="button"
                      onClick={() => handleRemove(i)}
                      className={`absolute top-1 right-1 rounded-[8px] transition 
                ${isActive
                          ? "bg-[#FF4A4A] text-white hover:bg-[#e53e3e]"
                          : "bg-zinc-200 text-zinc-600 hover:bg-red-100 hover:text-red-600"
                        }`}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Label แสดงภาพปัจจุบัน */}


                    {/* Progress Bar */}
                    {f.progress !== undefined && f.progress < 100 && (
                      <div className="px-3 pb-1">
                        <div className="w-full bg-zinc-200 h-2 rounded">
                          <div
                            className="bg-violet-600 h-2 rounded transition-all"
                            style={{ width: `${f.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{f.progress}%</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Drag area */}
            <label
              className={`mt-3 cursor-pointer border-2 border-dashed rounded-md py-6 flex flex-col items-center justify-center gap-2 text-sm transition
             ${dragOver
                  ? "border-violet-500 bg-violet-100"
                  : "border-violet-300 text-violet-600 hover:bg-violet-50"
                }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >

              <UploadCloud className="w-6 h-6" />
              {evidenceFiles.length === 0 ? (
                <span>ลากไฟล์มาวาง หรือกดเพื่อเลือก</span>
              ) : (
                <span>+ เพิ่มรูปภาพ</span>
              )}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,video/mp4"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <p className="text-xs text-zinc-500 mt-2">
              รวมทั้งหมด {evidenceFiles.length} รายการ
            </p>
            {uploadError && (
              <p className="mt-2 text-sm text-red-600">{uploadError}</p>
            )}

            <p className="mt-3 text-xs text-zinc-500 leading-5">
              <b>แนะนำการอัปโหลด</b><br />
              รูป: ≤10MB (เหมาะ 2–5MB), ด้านยาว ≤3000px<br />
              วิดีโอ: MP4 ≤100MB, ยาว 1–2 นาที, สูงสุด 1080p<br />
              รวมต่อเคส: ≤500MB หรือ ≤20 ไฟล์<br />
              รองรับไฟล์: JPEG/PNG/HEIC/WebP, MP4
            </p>
          </div>

          {/* Preview (อยู่ขวา กิน 2 ช่อง) */}
          <div className="md:col-span-2 bg-zinc-50 rounded-lg p-3 flex flex-col items-center justify-center">
            {evidenceFiles[selectedIndex]?.url ? (
              <div
                key={evidenceFiles[selectedIndex].url}
                className="animate-fadeIn scale-100 transition-all duration-300 ease-in-out flex flex-col items-center"
              >

                {/* 🔹 ชื่อไฟล์ */}
                <p
                  className="text-sm text-white m-3 truncate max-w-[80%] px-3  py-1 bg-[#6F47E4] rounded-full"
                  title={evidenceFiles[selectedIndex].name}
                >
                  {evidenceFiles[selectedIndex].name}
                </p>
                {evidenceFiles[selectedIndex].type === "video" ? (
                  <video
                    src={evidenceFiles[selectedIndex].url}
                    className="max-h-[360px] rounded mb-3 border-3 border-[#6F47E4]"
                    controls
                    onCanPlayThrough={() => {
                      setEvidenceFiles((prev) =>
                        prev.map((f, i) =>
                          i === selectedIndex ? { ...f, loaded: true } : f
                        )
                      );
                    }}
                  />
                ) : (
                  <img
                    src={evidenceFiles[selectedIndex].url}
                    alt={evidenceFiles[selectedIndex].name}
                    className="max-h-[360px] rounded object-contain mb-3 border-3 border-[#6F47E4]"
                    onLoad={() => {
                      setEvidenceFiles((prev) =>
                        prev.map((f, i) =>
                          i === selectedIndex ? { ...f, loaded: true } : f
                        )
                      );
                    }}

                  />

                )}
                {!evidenceFiles.every((f) => f.loaded) && (
                  <p className="text-sm text-zinc-500 text-center mt-2">
                    กำลังโหลดภาพ/วิดีโอ เพื่อแสดงผล กรุณารอสักครู่...
                  </p>
                )}

              </div>
            ) : (
              <p className="text-sm text-zinc-500">ไฟล์ยังไม่พร้อมแสดงผล</p>
            )}
          </div>

        </div>



        {/* Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                if (evidenceFiles.length > 0 || details.trim().length > 0) {
                  // ถ้ามีข้อมูล → แสดง modal เดียวกัน
                  setNextUrl("back");
                  setShowLeaveConfirm(true);
                } else {
                  // ถ้าไม่มีข้อมูล → ย้อนกลับได้เลย
                  onBack?.();
                }
              }}
              className="w-full sm:w-auto rounded-[7px] text-black bg-zinc-200 px-6 py-2 hover:bg-zinc-200/60"
            >
              ย้อนกลับ
            </button>

          )}
          <button
            type="submit"
            disabled={!canProceed} // ✅ ถ้ายังอัปโหลดไม่เสร็จ หรือไม่มีไฟล์ → disable
            className={`w-full sm:w-auto rounded-[7px] px-6 py-2 font-medium 
              ${canProceed
                ? "bg-[#6F47E4] hover:bg-[#6F47E4]/80 text-white"
                : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
              }`}
          >
            ถัดไป
          </button>
        </div>
        {showLeaveConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-sm text-center space-y-4">
              <h2 className="text-lg font-semibold text-zinc-800">
                ออกจากหน้านี้หรือไม่?
              </h2>
              <p className="text-sm text-zinc-600">
                หากออกจากหน้านี้ ข้อมูลการอัปโหลดจะไม่ถูกบันทึกไว้
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowLeaveConfirm(false);
                    setNextUrl(null);
                  }}
                  className="px-5 py-2 rounded-[7px] bg-zinc-200 hover:bg-zinc-300 text-zinc-700"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    setShowLeaveConfirm(false);
                    if (nextUrl) {
                      if (nextUrl === "back") {
                        onBack?.(); // ✅ เรียกฟังก์ชันย้อนกลับจริง ๆ
                      } else {
                        router.push(nextUrl);
                      }
                    }
                  }}
                  className="px-5 py-2 rounded-[7px] bg-[#6F47E4] hover:bg-[#5d3fd6] text-white"
                >
                  ออกจากหน้า
                </button>
              </div>
            </div>
          </div>
        )}

      </form>

    </div>

  );
}
