"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import type { InsurancePolicy } from "@/types/claim";
import { Noto_Sans_Thai } from "next/font/google";
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

type MediaItem = { url: string; type: "image" | "video"; publicId: string };

const label = (txt: string) => (
  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{txt}</span>
);

const timeForInput = (t?: string | null) => (t ? t.slice(0, 5) : "");
const dateForInput = (d?: string | null) => {
  if (!d) return "";
  const m = d.match(/^(\d{4}-\d{2}-\d{2})/);   // ตัดเอา 10 ตัวแรกถ้ามี
  if (m) return m[1];
  const dt = new Date(d);                      // เผื่อเคสอื่น ๆ
  if (isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const timeForSave = (t?: string | null) => (!t ? null : (t.length === 5 ? `${t}:00` : t));

async function uploadToCloudinary(file: File): Promise<MediaItem> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD!;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET!;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
  return {
    url: data.secure_url as string,
    type: data.resource_type as "image" | "video",
    publicId: data.public_id as string,
  };
}

function Section({ title }: { title: string }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</div>;
}
function Field({ labelText, children }: { labelText: string; children: React.ReactNode }) {
  return (
    <div>
      {label(labelText)}
      {children}
    </div>
  );
}

export type PolicyModalProps = {
  open: boolean;
  initial?: InsurancePolicy | null;
  citizenId: string;
  onClose: () => void;
  onSubmit: (p: InsurancePolicy) => Promise<void> | void;
};

export default function PolicyModal({
  open, initial, citizenId, onClose, onSubmit,
}: PolicyModalProps) {
  const [form, setForm] = useState<InsurancePolicy>(() =>
    initial ?? {
      policy_number: "", insurance_company: "", insured_name: "",
      citizen_id: citizenId, insurance_type: "",
      car_brand: "", car_model: "", car_license_plate: "", chassis_number: "",
      car_year: undefined as any, address: "",
      coverage_start_date: "", coverage_end_date: "",
      coverage_end_time: "", // เผื่อกรอกใหม่
      car_path: "",
      car_color: "",
      registration_province: "",
    }
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(
        initial ?? {
          policy_number: "", insurance_company: "", insured_name: "",
          citizen_id: citizenId, insurance_type: "",
          car_brand: "", car_model: "", car_license_plate: "", chassis_number: "",
          car_year: undefined as any, address: "",
          coverage_start_date: "", coverage_end_date: "",
          coverage_end_time: "",
          car_path: "",
          car_color: "",
          registration_province: "",
        }
      );
      setUploadErr(null);
    }
  }, [open, initial, citizenId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: name === "car_year" ? (value ? Number(value) : null) : value }));
  };

  const onChooseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setUploadErr(null);
      const media = await uploadToCloudinary(file);
      setForm((s) => ({ ...s, car_path: media.url }));
    } catch (err: any) {
      setUploadErr(err?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, coverage_end_time: timeForSave(form.coverage_end_time) };
      await onSubmit(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] " role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet (mobile) / Modal (>=sm) */}
      <div className="absolute inset-x-0 bottom-0 top-auto sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div className="bg-white shadow-2xl ring-1 ring-zinc-200 rounded-t-2xl sm:rounded-2xl w-full sm:w-auto sm:max-w-3xl h-[92vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 bg-white/95 backdrop-blur border-b border-zinc-200">
            <h3 className="text-base sm:text-lg text-black text-black font-semibold">{initial ? "แก้ไขกรมธรรม์" : "เพิ่มกรมธรรม์"}</h3>
            <button onClick={onClose} className="p-2 rounded-full text-black hover:bg-zinc-100" aria-label="ปิด">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={submit} className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Left */}
                <div className="space-y-4 text-black">
                  <Section title="ข้อมูลกรมธรรม์" />
                  <Field labelText="เลขกรมธรรม์">
                    <input name="policy_number" required value={form.policy_number} onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                  </Field>

                  <Field labelText="บริษัทประกัน">
                    <input name="insurance_company" required value={form.insurance_company} onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                  </Field>

                  <Field labelText="ชื่อผู้เอาประกัน">
                    <input name="insured_name" required value={form.insured_name} onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                  </Field>

                  <Field labelText="เลขบัตรประชาชน">
                    <input name="citizen_id" required value={form.citizen_id} onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                  </Field>

                  <Field labelText="ที่อยู่ผู้เอาประกัน">
                    <textarea
                      name="address"
                      value={form.address ?? ""}
                      onChange={handleChange}
                      rows={2}
                      placeholder="เช่น 123/45 แขวงบางรัก เขตบางรัก กรุงเทพมหานคร 10500"
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500 resize-y"
                    />
                  </Field>

                  <Field labelText="ประเภทประกัน">
                    <input
                      name="insurance_type"
                      value="ชั้น 1" // ✅ ล็อกให้เป็นชั้น 1
                      readOnly // ✅ ไม่ให้พิมพ์หรือแก้ไขได้
                      disabled // ✅ ปิดการโต้ตอบ (แสดงเทาเล็กน้อย)
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </Field>
                </div>

                {/* Right */}
                <div className="space-y-4 text-black">
                  <Section title="ระยะคุ้มครอง / รถ" />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      {label("วันที่เริ่มคุ้มครอง")}
                      <input type="date" name="coverage_start_date" value={dateForInput(form.coverage_start_date) ?? ""} onChange={handleChange}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      {label("วันที่สิ้นสุดคุ้มครอง")}
                      <input type="date" name="coverage_end_date" value={dateForInput(form.coverage_end_date) ?? ""} onChange={handleChange}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      {label("เวลาสิ้นสุดคุ้มครอง")}
                      <input
                        type="time"
                        name="coverage_end_time"
                        value={timeForInput(form.coverage_end_time)}
                        onChange={(e) => setForm((s) => ({ ...s, coverage_end_time: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field labelText="ยี่ห้อรถ">
                      <input name="car_brand" value={form.car_brand ?? ""} onChange={handleChange}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                    </Field>
                    <Field labelText="รุ่นรถ">
                      <input name="car_model" value={form.car_model ?? ""} onChange={handleChange}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field labelText="ทะเบียนรถ">
                      <input name="car_license_plate" value={form.car_license_plate ?? ""} onChange={handleChange}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                    </Field>
                    <Field labelText="เลขตัวถัง">
                      <input name="chassis_number" value={form.chassis_number ?? ""} onChange={handleChange}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                    </Field>
                  </div>

                  <Field labelText="ปีรถ">
                    <input type="number" name="car_year" value={form.car_year ?? ("" as any)} onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field labelText="สีรถ">
                      <input name="car_color" value={form.car_color ?? ""} onChange={handleChange}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                    </Field>
                    <Field labelText="จังหวัดจดทะเบียน">
                      <input name="registration_province" value={form.registration_province ?? ""} onChange={handleChange}
                        placeholder="เช่น กรุงเทพมหานคร"
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500" />
                    </Field>
                  </div>

                  <Section title="รูปภาพรถ" />
                  <div>
                    <div className="flex items-center justify-between">
                      {label("อัปโหลดรูป")}
                      {form.car_path && (
                        <button type="button" onClick={() => setForm((s) => ({ ...s, car_path: "" }))}
                          className="text-xs inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-800">
                          <Trash2 size={14} /> ลบรูป
                        </button>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 rounded-xl ring-1 ring-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 cursor-pointer">
                        <ImageIcon size={16} /> เลือกรูป
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={onChooseFile} />
                      </label>
                      {uploading && (
                        <span className="text-xs text-zinc-500 inline-flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" /> กำลังอัปโหลด...
                        </span>
                      )}
                      {uploadErr && <span className="text-xs text-red-600">{uploadErr}</span>}
                    </div>
                    {form.car_path && (
                      <div className="mt-2">
                        <img src={form.car_path} alt="preview"
                          className="h-28 w-full object-cover rounded-xl ring-1 ring-zinc-200" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t border-zinc-200 px-4 sm:px-6 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <div className="flex flex-col-reverse gap-2 sm:flex-row  sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-2xl px-4 ring-1 ring-zinc-300 text-zinc-700 hover:bg-zinc-50 w-full sm:w-auto"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded-2xl px-4 bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {saving && <Loader2 className="animate-spin" size={16} />} {initial ? "บันทึก" : "เพิ่ม"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
