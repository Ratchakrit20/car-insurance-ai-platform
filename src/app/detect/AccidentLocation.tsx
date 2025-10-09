"use client";

import React, { useEffect, useState } from "react";
import SafeAreaSpacer from "../components/SafeAreaSpacer";
import MapPickerModal from "../components/MapPickerModal";
import MapPreview from "../components/MapPreview";

const ACC_KEY = "accidentDraft";

const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  กรุงเทพมหานคร: ["พระนคร", "ดุสิต", "หนองจอก", "บางรัก", "บางเขน", "บางกะปิ", "ปทุมวัน", "ป้อมปราบศัตรูพ่าย"],
  นนทบุรี: ["เมืองนนทบุรี", "บางบัวทอง", "ปากเกร็ด", "บางกรวย", "บางใหญ่", "ไทรน้อย"],
  ปทุมธานี: ["เมืองปทุมธานี", "คลองหลวง", "ธัญบุรี", "หนองเสือ", "ลาดหลุมแก้ว", "ลำลูกกา"],
  สมุทรปราการ: ["เมืองสมุทรปราการ", "บางบ่อ", "บางพลี", "พระประแดง", "พระสมุทรเจดีย์", "บางเสาธง"],
  ชลบุรี: ["เมืองชลบุรี", "บางละมุง", "ศรีราชา", "พานทอง", "สัตหีบ"],
  เชียงใหม่: ["เมืองเชียงใหม่", "สารภี", "สันทราย", "สันกำแพง", "แม่ริม", "หางดง"],
  นครราชสีมา: ["เมืองนครราชสีมา", "ปากช่อง", "โนนสูง", "สูงเนิน", "สีคิ้ว"],
  ขอนแก่น: ["เมืองขอนแก่น", "บ้านไผ่", "น้ำพอง", "ชุมแพ", "พล"],
  ภูเก็ต: ["เมืองภูเก็ต", "กะทู้", "ถลาง"],
};
const PROVINCES = Object.keys(DISTRICTS_BY_PROVINCE);

interface StepProps {
  onNext: () => void;
  onBack: () => void;
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
function formatDateForInput(isoString?: string) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return ""; // ไม่ใช่วันที่
  return d.toISOString().split("T")[0]; // ✅ คืนค่า YYYY-MM-DD
}
function fieldSurface({
  required, filled,
}: { required?: boolean; filled?: boolean }) {
  const base =
    "rounded-[7px] border px-3 py-2 sm:py-2.5 text-zinc-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] transition outline-none w-full ";
  if (required && !filled)
    return `${base} bg-[#D9D9D9] border-zinc-200 focus:ring-2 focus:ring-zinc-500`;
  return `${base} bg-white border-zinc-200 focus:ring-2 focus:ring-violet-500`;
}

export default function AccidentStep2({ onNext, onBack }: StepProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [road, setRoad] = useState("");
  const [areaType, setAreaType] = useState("");
  const [nearby, setNearby] = useState("");

  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    try {
      const rawAcc = localStorage.getItem(ACC_KEY);
      if (rawAcc) {
        const a = JSON.parse(rawAcc);
        setDate(formatDateForInput(a.accident_date));
        setTime(a.accident_time || "");
        setProvince(a.province || "");
        setDistrict(a.district || "");
        setRoad(a.road || "");
        setAreaType(a.areaType || ""); 
        setNearby(a.nearby || "");
        setLat(a.location?.lat?.toString() || "");
        setLng(a.location?.lng?.toString() || "");
        setAccuracy(a.location?.accuracy ?? null);
      }
    } catch { }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const oldDraft = JSON.parse(localStorage.getItem(ACC_KEY) || "{}");
    const payload = {
      ...oldDraft,
      accident_date: date,
    accident_time: time,
      province,
      district,
      road,
      areaType,    // ✅ บันทึกเป็น area_type
      nearby,

      location: { lat: Number(lat), lng: Number(lng), accuracy },
    };
    localStorage.setItem(ACC_KEY, JSON.stringify(payload));
    onNext();
  };

  return (
    <div className="acc-page box-border mx-auto max-w-5xl px-3 sm:px-4 md:px-6">
      <form onSubmit={handleSubmit} className="bg-white p-6 space-y-8">
        <h2 className="text-base sm:text-lg font-semibold text-zinc-900 text-center mb-3">
          รายละเอียดที่เกิดเหตุ
        </h2>

        {/* วันที่ / เวลา */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {labelEl("วันที่เกิดอุบัติเหตุ", true)}
            <input
              type="date"
              className={fieldSurface({ required: true, filled: !!date })}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            {labelEl("เวลาเกิดอุบัติเหตุ", true)}
            <input
              type="time"
              className={fieldSurface({ required: true, filled: !!time })}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* จังหวัด / อำเภอ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {labelEl("จังหวัด")}
            <select
              className={fieldSurface({ filled: !!province })}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              <option value="">ไม่ระบุ</option>
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            {labelEl("อำเภอ/เขต")}
            <select
              className={fieldSurface({ filled: !!district })}
              value={district}
              disabled={!province}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="">{province ? "ไม่ระบุ" : "—"}</option>
              {(DISTRICTS_BY_PROVINCE[province] || []).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ถนน */}
        <div>
          {labelEl("ถนน")}
          <input
            type="text"
            placeholder="ปล่อยว่างได้ถ้าไม่ทราบ"
            className={fieldSurface({ filled: !!road })}
            value={road}
            onChange={(e) => setRoad(e.target.value)}
          />
        </div>

        {/* ประเภทพื้นที่ / จุดสังเกต */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {labelEl("ประเภทพื้นที่", true)}
            <select
              className={fieldSurface({ required: true, filled: !!areaType })}
              value={areaType}
              onChange={(e) => setAreaType(e.target.value)}
              required
            >
              <option value="">โปรดเลือก</option>
              <option>ทางหลวง</option>
              <option>ชุมชน/หมู่บ้าน</option>
              <option>ในเมือง</option>
            </select>
          </div>
          <div>
            {labelEl("จุดสังเกตใกล้เคียง", true)}
            <textarea
              className={fieldSurface({ required: true, filled: !!nearby }) + " min-h-[96px]"}
              placeholder="เช่น ใกล้ปั๊มน้ำมัน..."
              value={nearby}
              onChange={(e) => setNearby(e.target.value)}
              required
            />
          </div>
        </div>

        {/* GPS */}
        <div>
          {labelEl("ตำแหน่งที่เกิดเหตุ (GPS/เลือกจากแผนที่)")}
          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className="mt-2 mb-2 rounded-[7px] bg-[#6D5BD0] px-8 py-2 text-sm text-white hover:bg-[#433D8B]"
          >
            ระบุตำแหน่ง
          </button>
          {lat && lng && (
            <MapPreview lat={parseFloat(lat)} lng={parseFloat(lng)} />
          )}
        </div>

        {/* ปุ่ม */}
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
            className="w-full sm:w-auto rounded-[7px] bg-[#6F47E4] hover:bg-[#6F47E4]/80 text-white px-6 py-2 font-medium"
          >
            ถัดไป
          </button>
        </div>
      </form>

      <SafeAreaSpacer />

      <MapPickerModal
        open={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        title="เลือกตำแหน่งบนแผนที่"
        value={lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null}
        onSelect={(pos) => {
          setLat(pos.lat.toFixed(6));
          setLng(pos.lng.toFixed(6));
          setAccuracy(null);
          setShowMapPicker(false);
        }}
      />
    </div>
  );
}
