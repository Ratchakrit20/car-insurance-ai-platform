"use client";

import React, { useEffect, useState, DragEvent } from "react";
import { FileVideo, Image as ImageIcon, Plus, X, UploadCloud, Trash2 } from "lucide-react";

const ACC_KEY = "accidentDraft";

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
  const [accidentType, setAccidentType] = useState<AccidentType>("ชนสัตว์");
  const [details, setDetails] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
 
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
    // ✅ ใช้ Promise.all เพื่ออัปโหลดหลายไฟล์พร้อมกัน
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
  evidenceFiles.length > 0 &&
  evidenceFiles.every((f) => f.progress === 100);


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
      <form onSubmit={handleSubmit} className="bg-white p-6 space-y-8">
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
        <div>
          {labelEl("รายละเอียดอุบัติเหตุเพิ่มเติม", true)}
          <textarea
            className={fieldSurface({ required: true, filled: !!details }) + " min-h-[96px]"}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="อธิบายเหตุการณ์โดยย่อ"
            required
          />
        </div>

        {/* Evidence Upload */}

        <div>
          {labelEl("อัปโหลดรูปหรือวิดีโอที่เกิดเหตุ", true)}

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
                    <div key={i} className="relative space-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(i)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${isActive ? "bg-violet-600 text-white" : "bg-white hover:bg-violet-100 text-zinc-700"
                          }`}
                      >
                        {f.type === "video" ? <FileVideo className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                        <span className="truncate flex-1">{f.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(i)}
                        className={` absolute top-1 right-1  rounded-[8px] transition ${isActive
                          ? "bg-[#FF4A4A] text-white hover:bg-[#e53e3e]"
                          : "bg-zinc-200 text-zinc-600 hover:bg-red-100 hover:text-red-600"
                          }`}
                      >
                        <X className="w-4 h-4  " />
                      </button>



                      {/* Progress */}
                      {f.progress !== undefined && f.progress < 100 && (
                        <div className="px-3 pb-1">
                          <div className="w-full bg-zinc-200 h-2 rounded">
                            <div className="bg-violet-600 h-2 rounded transition-all" style={{ width: `${f.progress}%` }} />
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
                className={`mt-3 cursor-pointer border-2 border-dashed rounded-md py-6 flex flex-col items-center justify-center gap-2 text-sm transition ${dragOver ? "border-violet-500 bg-violet-100" : "border-violet-300 text-violet-600 hover:bg-violet-50"
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
                <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
              </label>

              <p className="text-xs text-zinc-500 mt-2">รวมทั้งหมด {evidenceFiles.length} รายการ</p>
            </div>

            {/* Preview */}
            <div className="md:col-span-2 bg-zinc-50 rounded-lg p-3 flex items-center justify-center">
              {evidenceFiles[selectedIndex]?.url ? (
                evidenceFiles[selectedIndex].type === "video" ? (
                  <video
                    src={evidenceFiles[selectedIndex].url}
                    className="max-h-[360px] rounded"
                    controls
                    onCanPlayThrough={() => setPreviewLoaded(true)} // ✅ โหลดวิดีโอเสร็จ
                  />
                ) : (
                  <img
                    src={evidenceFiles[selectedIndex].url}
                    alt={evidenceFiles[selectedIndex].name}
                    className="max-h-[360px] rounded object-contain"
                    onLoad={() => setPreviewLoaded(true)} // ✅ โหลดรูปเสร็จ
                  />
                )
              ) : (
                <p className="text-sm text-zinc-500">ไฟล์ยังไม่พร้อมแสดงผล</p>
              )}
            </div>

          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
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
      </form>
    </div>
  );
}
