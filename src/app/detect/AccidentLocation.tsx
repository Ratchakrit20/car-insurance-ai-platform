"use client";

import React, { useEffect, useMemo, useState } from "react";
import SafeAreaSpacer from "../components/SafeAreaSpacer";
import MapPickerModal from "../components/MapPickerModal";
import MapPreview from "../components/MapPreview";
import { useLeaveConfirm } from "@/hooks/useLeaveConfirm";
import { useRouter } from "next/navigation";
const ACC_KEY = "accidentDraft";
import districts from "@/app/data/districts.json";
import provinces from "@/app/data/provinces.json";
import { MapPin, FileText, ChevronDown, ChevronUp } from "lucide-react";



// const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
//   กรุงเทพมหานคร: ["พระนคร", "ดุสิต", "หนองจอก", "บางรัก", "บางเขน", "บางกะปิ", "ปทุมวัน", "ป้อมปราบศัตรูพ่าย"],
//   นนทบุรี: ["เมืองนนทบุรี", "บางบัวทอง", "ปากเกร็ด", "บางกรวย", "บางใหญ่", "ไทรน้อย"],
//   ปทุมธานี: ["เมืองปทุมธานี", "คลองหลวง", "ธัญบุรี", "หนองเสือ", "ลาดหลุมแก้ว", "ลำลูกกา"],
//   สมุทรปราการ: ["เมืองสมุทรปราการ", "บางบ่อ", "บางพลี", "พระประแดง", "พระสมุทรเจดีย์", "บางเสาธง"],
//   ชลบุรี: ["เมืองชลบุรี", "บางละมุง", "ศรีราชา", "พานทอง", "สัตหีบ"],
//   เชียงใหม่: ["เมืองเชียงใหม่", "สารภี", "สันทราย", "สันกำแพง", "แม่ริม", "หางดง"],
//   นครราชสีมา: ["เมืองนครราชสีมา", "ปากช่อง", "โนนสูง", "สูงเนิน", "สีคิ้ว"],
//   ขอนแก่น: ["เมืองขอนแก่น", "บ้านไผ่", "น้ำพอง", "ชุมแพ", "พล"],
//   ภูเก็ต: ["เมืองภูเก็ต", "กะทู้", "ถลาง"],
// };
// const PROVINCES = Object.keys(DISTRICTS_BY_PROVINCE);

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

function fieldSurface({ required, filled }: { required?: boolean; filled?: boolean }) {
  const base =
    "rounded-[7px] border px-3 py-2 sm:py-2.5 text-zinc-900 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] transition outline-none w-full ";
  if (required && !filled)
    return `${base} bg-[#D9D9D9] border-zinc-200 focus:ring-2 focus:ring-zinc-500`;
  return `${base} bg-white border-zinc-200 focus:ring-2 focus:ring-violet-500`;
}

/* ---------------- helpers ---------------- */
const toDate = (x?: any) => {
  const d = new Date(x ?? "");
  return isNaN(d.getTime()) ? null : d;
};
const ymd = (d?: Date | null) => (d ? d.toISOString().split("T")[0] : "");
const hm = (d?: Date | null) => {
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};
const toYMD = (x?: any) => ymd(toDate(x));

/** ดึง start/end จาก object โดยลองหลายชื่อคีย์ และรองรับ nested */
function extractCoverage(obj: any) {
  if (!obj) return { start: "", end: "" };
  const candidates = [
    ["coverage_start_date", "coverage_end_date"],
    ["coverageStartDate", "coverageEndDate"],
    ["coverage_start", "coverage_end"],
    ["start_date", "end_date"],
    ["startDate", "endDate"],
    ["policy_start_date", "policy_end_date"],
  ] as const;

  for (const [k1, k2] of candidates) {
    const s = toYMD(obj?.[k1]);
    const e = toYMD(obj?.[k2]);
    if (s && e) return { start: s, end: e };
  }
  const nests = [obj?.policy, obj?.selected_car, obj?.car, obj?.insurance, obj?.vehicle];
  for (const nest of nests) {
    for (const [k1, k2] of candidates) {
      const s = toYMD(nest?.[k1]);
      const e = toYMD(nest?.[k2]);
      if (s && e) return { start: s, end: e };
    }
  }
  return { start: "", end: "" };
}

/** พยายาม map response จาก API ให้ได้ start/end ไม่ว่ารูปแบบไหน */
function normalizeCoverageFromAPI(data: any) {
  // บาง API คืนเป็น { coverage: {start_date, end_date} }
  if (data?.coverage) return extractCoverage(data.coverage);
  // ตรง ๆ บน root
  const direct = extractCoverage(data);
  if (direct.start && direct.end) return direct;
  // รถหรือกรมธรรม์ด้านใน
  const nests = [data?.car, data?.policy, data?.selected_car, data?.insurance, data?.vehicle];
  for (const n of nests) {
    const got = extractCoverage(n);
    if (got.start && got.end) return got;
  }
  return { start: "", end: "" };
}

export default function AccidentStep2({ onNext, onBack }: StepProps) {
  const router = useRouter();
  const STEP1_URL = "/detect";

  // form states
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

  // coverage
  const [coverageStart, setCoverageStart] = useState<string>("");
  const [coverageEnd, setCoverageEnd] = useState<string>("");
  const [covLoading, setCovLoading] = useState(false);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const localYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const localHM = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const todayYMD = useMemo(() => localYMD(new Date()), []);
  const nowHM = useMemo(() => localHM(new Date()), [])
  const [adminNote, setAdminNote] = useState<any>(null);


const provinceList = provinces.map((p) => p.name_th);
const districtList = useMemo(() => {
  const selected = provinces.find((p) => p.name_th === province);
  if (!selected) return [];
  return districts
    .filter((d) => d.province_id === selected.id)
    .map((d) => d.name_th);
}, [province]);




  useEffect(() => {
    try {
      const raw = localStorage.getItem("claimAdminNote");
      if (raw) setAdminNote(JSON.parse(raw));
    } catch { }
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("claimAdminNote");
      if (raw) {
        const parsed = JSON.parse(raw);
        setAdminNote(parsed);
        console.log("Admin Note:", parsed);
        console.log("Has incident?", !!parsed?.incident);
        console.log("Incident data:", parsed?.incident);
      }
    } catch (e) {
      console.error("Error parsing admin note:", e);
    }
    console.log("Should show admin panel?",
      !!adminNote?.incident &&
      adminNote.incident !== null &&
      typeof adminNote.incident === 'object' &&
      Object.keys(adminNote.incident).length > 0
    );
  }, []);
  const [isSaved, setIsSaved] = useState(false);
  const hasUnsaved = useMemo(() => {
    // มีค่าใด ๆ ถูกกรอก/เลือก ถือว่ายังไม่เซฟ
    return !isSaved && (
      !!date || !!time || !!province || !!district || !!road ||
      !!areaType || !!nearby || !!lat || !!lng
    );
  }, [isSaved, date, time, province, district, road, areaType, nearby, lat, lng]);

  // 🔧 ใหม่: modal ยืนยันออกหน้า + url ปลายทาง
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  // const reset = (e: React.) => {
  //   e.preventDefault
  //   setDate(e.target.value);
  //   setTime("");
  // }
  // Auto-save function
  const autoSave = () => {
    const snapshot = {
      accident_date: date,
      accident_time: time,
      province,
      district,
      road,
      areaType,
      nearby,
      location: {
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        accuracy
      },
      coverage_start_date: coverageStart,
      coverage_end_date: coverageEnd,
    };

    try {
      const oldDraft = JSON.parse(localStorage.getItem(ACC_KEY) || "{}");
      localStorage.setItem(ACC_KEY, JSON.stringify({ ...oldDraft, ...snapshot }));
    } catch (error) {
      console.warn("Auto-save failed:", error);
    }
  };

  useLeaveConfirm({
    hasUnsavedChanges: hasUnsaved,
    onConfirmLeave: (url) => {
      // ✅ ยกเว้นปุ่ม Back ของเบราว์เซอร์ → กลับ step1 ได้เลยโดยไม่เตือน
      if (url === "back") {
        setIsSaved(true);
        onBack();
        return;
      }
      // ✅ ยกเว้นลิงก์/นำทางที่พาไป AccidentStep1
      if (url && url.startsWith(STEP1_URL)) {
        setIsSaved(true);
        router.push(url);
        return;
      }
      // อื่นๆ ค่อยเปิด modal ยืนยันตามเดิม
      setNextUrl(url);
      setShowLeaveConfirm(true);
    },
    onAutoSave: autoSave, // เพิ่ม auto-save callback
  });

  // โหลด draft + ยิง API หา coverage
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(ACC_KEY);
        const draft = raw ? JSON.parse(raw) : {};

        // เติมค่าเดิม
        const d = toDate(draft.accident_date);
        setDate(d ? ymd(d) : "");
        setTime(draft.accident_time || "");
        setProvince(draft.province || "");
        setDistrict(draft.district || "");
        setRoad(draft.road || "");
        setAreaType(draft.areaType || "");
        setNearby(draft.nearby || "");
        setLat(draft.location?.lat?.toString() || "");
        setLng(draft.location?.lng?.toString() || "");
        setAccuracy(draft.location?.accuracy ?? null);

        // ❌ ไม่เรียก API — ใช้เฉพาะข้อมูลใน draft/selectedCar
        let start = "";
        let end = "";
        const fromDraft = extractCoverage(draft);
        if (fromDraft.start && fromDraft.end) {
          start = fromDraft.start;
          end = fromDraft.end;
        } else {
          const rawSel = localStorage.getItem("selectedCar");
          if (rawSel) {
            const selectedCar = JSON.parse(rawSel);
            const fromSel = extractCoverage(selectedCar);
            if (fromSel.start && fromSel.end) {
              start = fromSel.start;
              end = fromSel.end;
            }
          }
        }

        setCoverageStart(start || "");
        setCoverageEnd(end || "");

        const merged = {
          ...draft,
          coverage_start_date: start || draft.coverage_start_date || "",
          coverage_end_date: end || draft.coverage_end_date || "",
        };
        localStorage.setItem(ACC_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn("init failed:", e);
      }
    })();
  }, []);

  // ✅ Auto-save: เซฟข้อมูลทุกครั้งที่ฟอร์มเปลี่ยนแปลง
  useEffect(() => {
    if (date || time || province || district || road || areaType || nearby || lat || lng) {
      autoSave();
    }
  }, [date, time, province, district, road, areaType, nearby, lat, lng]);

  // สำหรับคุม min/max ของ TIME เมื่อวันที่ชน start/end
  const startDT = useMemo(() => toDate(coverageStart), [coverageStart]);
  const endDT = useMemo(() => toDate(coverageEnd), [coverageEnd]);

  // ถ้า API คืนมาเป็น date-only เราจะถือเวลาเป็น 00:00 -> 23:59 โดยปริยาย
  const startYMD = useMemo(() => ymd(startDT), [startDT]);
  const endYMD = useMemo(() => ymd(endDT), [endDT]);

  const inferredStartHM = useMemo(() => hm(startDT), [startDT]);
  const inferredEndHM = useMemo(() => hm(endDT), [endDT]);

  // min/max ของ date
  const dateMin = coverageStart ? startYMD : undefined;
  const [showAdminPanel, setShowAdminPanel] = useState(true);

  const dateMax = useMemo(() => {
    if (coverageEnd) return (coverageEnd < todayYMD ? coverageEnd : todayYMD);
    return todayYMD;
  }, [coverageEnd, todayYMD]);

  // min/max ของ time เฉพาะตอนเลือกวันชนขอบ
  const timeMin = useMemo(() => {
    if (!date || !startYMD) return undefined;
    if (date !== startYMD) return undefined;
    return inferredStartHM || "00:00";
  }, [date, startYMD, inferredStartHM]);

  const timeMax = useMemo(() => {
    if (!date) return undefined;

    const caps: string[] = [];

    // 1) ถ้าเลือก "วันนี้" → จำกัดไม่ให้เกินเวลาปัจจุบัน
    if (date === todayYMD) caps.push(nowHM);

    // 2) ถ้าเลือกวัน = วันสิ้นสุดคุ้มครอง และคุณมีเวลาสิ้นสุดของวันนั้น (เช่น coverageEndHM) ให้ push มาเทียบด้วย
    // ถ้าไม่มีเวลาในคุ้มครอง: ปล่อย 23:59 เป็นค่าเริ่มต้น
    // ตัวอย่าง (ถ้าวันนี้คุณยังไม่มี coverageEndHM):
    // if (date === coverageEndYMD && coverageEndHM) caps.push(coverageEndHM);

    // 3) ค่าเริ่มต้น
    caps.push("23:59");

    // คืนค่าน้อยสุด
    return caps.sort()[0];
  }, [date, todayYMD, nowHM /*, coverageEndHM*/]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ป้องกันเมื่อยังโหลดช่วงคุ้มครองไม่เสร็จ
    if (covLoading) {
      alert("กำลังโหลดช่วงคุ้มครองจากระบบ โปรดลองอีกครั้งในชั่วขณะ");
      return;
    }

    // ตรวจเข้ม: date/time ต้องอยู่ในช่วงคุ้มครอง
    if (startYMD && endYMD && date) {
      const picked = toDate(`${date}T${time || "00:00"}`);
      const startBound = toDate(`${startYMD}T${inferredStartHM || "00:00"}`)!;
      const endBound = toDate(`${endYMD}T${inferredEndHM || "23:59"}`)!;

      console.log("[Picked]", picked?.toISOString());
      console.log("[Allowed Range]", startBound.toISOString(), "→", endBound.toISOString());

      if (!picked || isNaN(picked.getTime())) {
        alert("รูปแบบวันที่/เวลาไม่ถูกต้อง");
        return;
      }
      if (picked < startBound || picked > endBound) {
        alert("วันที่/เวลาอยู่นอกช่วงคุ้มครองของกรมธรรม์");
        return;
      }
      if (!lat || !lng) {
        alert("โปรดระบุตำแหน่งที่เกิดเหตุก่อนดำเนินการต่อ");
        return; // ❌ หยุดการ submit
      }
      
    }

    const oldDraft = JSON.parse(localStorage.getItem(ACC_KEY) || "{}");
    const payload = {
      ...oldDraft,
      accident_date: date,
      accident_time: time,
      province,
      district,
      road,
      areaType, // map เป็น area_type ตอนส่ง backend ได้
      nearby,
      location: { lat: Number(lat), lng: Number(lng), accuracy },
      coverage_start_date: coverageStart || oldDraft.coverage_start_date || "",
      coverage_end_date: coverageEnd || oldDraft.coverage_end_date || "",
    };
    localStorage.setItem(ACC_KEY, JSON.stringify(payload));
    setIsSaved(true);
    onNext();
  };

  return (
    <div className="acc-page box-border mx-auto max-w-5xl px-3 sm:px-4 md:px-6">
      <form onSubmit={handleSubmit} className="bg-white p-6 space-y-8">

        {adminNote?.incident &&
          adminNote.incident !== null &&
          typeof adminNote.incident === 'object' &&
          Object.keys(adminNote.incident).length > 0 && (
            (adminNote.incident.comment?.trim()?.length > 0 ||
              (adminNote.incident.lat && adminNote.incident.lng) ||
              adminNote.incident.province?.trim()?.length > 0 ||
              adminNote.incident.district?.trim()?.length > 0 ||
              adminNote.incident.road?.trim()?.length > 0)
          ) && (
            <div className="border border-violet-300 bg-violet-50/80 text-gray-800 px-5 py-4 rounded-2xl shadow-sm mb-6 transition-all duration-200 hover:shadow-md">
              {/* Header + toggle */}
              <div
                className="flex justify-between items-center cursor-pointer select-none"
                onClick={() => setShowAdminPanel?.((prev: boolean) => !prev)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-600" />
                  <p className="font-semibold text-sm sm:text-base text-gray-900">
                    เจ้าหน้าที่แนะนำให้แก้ไขในส่วน{" "}
                    <span className="text-violet-700">"รายละเอียดที่เกิดเหตุ"</span>
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
                <div className="mt-4 space-y-3 text-sm sm:text-base">
                  {/* ✅ หมายเหตุ */}
                  {adminNote.incident.comment?.trim()?.length > 0 && (
                    <div className="bg-white border-l-4 border-violet-500 rounded-lg p-3 shadow-sm">
                      <p className="text-gray-800 leading-relaxed">
                        <span className="font-semibold text-violet-700">หมายเหตุ:</span>{" "}
                        {adminNote.incident.comment}
                      </p>
                    </div>
                  )}

                  {/* ✅ พิกัด lat/lng */}
                  {(adminNote.incident.lat && adminNote.incident.lng) && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="w-4 h-4 text-violet-600" />
                      <p>
                        <span className="font-semibold text-violet-700">พิกัดที่แนะนำ:</span>{" "}
                        {adminNote.incident.lat}, {adminNote.incident.lng}
                      </p>
                    </div>
                  )}

                  {/* ✅ จังหวัด / อำเภอ / ถนน */}
                  {(adminNote.incident.province?.trim()?.length > 0 ||
                    adminNote.incident.district?.trim()?.length > 0 ||
                    adminNote.incident.road?.trim()?.length > 0) && (
                      <div className="bg-white border border-violet-100 rounded-xl p-3 shadow-sm">
                        <p className="font-semibold text-violet-700 mb-1 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-violet-600" />
                          พื้นที่ที่แนะนำให้ตรวจสอบ
                        </p>
                        <ul className="ml-5 list-disc space-y-1 text-gray-800 text-sm">
                          {adminNote.incident.province?.trim()?.length > 0 && (
                            <li>จังหวัด: {adminNote.incident.province}</li>
                          )}
                          {adminNote.incident.district?.trim()?.length > 0 && (
                            <li>อำเภอ/เขต: {adminNote.incident.district}</li>
                          )}
                          {adminNote.incident.road?.trim()?.length > 0 && <li>ถนน: {adminNote.incident.road}</li>}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

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
              min={startYMD}
              max={dateMax}
              required
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("กรุณาระบุวันที่เกิดอุบัติเหตุ")}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
              onChange={(e) => {
                setDate(e.target.value);
                setTime("");
              }}
            />
            {!coverageStart || !coverageEnd ? (
              <p className="mt-1 text-xs text-amber-600">
                ⚠️ ยังไม่พบช่วงคุ้มครอง — โปรดเลือก/โหลดรถที่คุ้มครองก่อน
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">
                เลือกได้เฉพาะช่วงคุ้มครอง: {startYMD} – {endYMD}
              </p>
            )}

          </div>

          <div>
            {labelEl("เวลาเกิดอุบัติเหตุ", true)}
            <input
              type="time"
              className={fieldSurface({ required: true, filled: !!time })}
              value={time}
              min={timeMin}
              max={timeMax}   // ❗ ถ้าเลือกวันนี้ → ห้ามเกินเวลาปัจจุบัน
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("กรุณาระบุเวลาเกิดอุบัติเหตุใหม่")}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
              onChange={(e) => setTime(e.target.value)}
              required
            />
            {date && (timeMin || timeMax) && (
              <p className="mt-1 text-xs text-zinc-500">
                เวลาในวันที่เลือกต้องอยู่ช่วง {timeMin || "00:00"}–{timeMax || "23:59"}
              </p>
            )}
          </div>
        </div>

      
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div> */}
        {/* จังหวัด / อำเภอ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {labelEl("จังหวัด")}
            <select
              className={fieldSurface({ filled: !!province })}
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setDistrict(""); // รีเซ็ตเมื่อเปลี่ยนจังหวัด
              }}
            >
              <option value="">ไม่ระบุ</option>
              {provinceList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
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
              {districtList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
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
              required
              onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity("กรุณาเลือกประเภทพื้นที่")}
              onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity("")}
              onChange={(e) => setAreaType(e.target.value)}
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
              required
              onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity("กรุณาระบุจุดสังเกตใกล้เคียง")}
              onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity("")}
              onChange={(e) => setNearby(e.target.value)}
            />
          </div>
        </div>

        {/* GPS */}
        <div>
          {labelEl("ตำแหน่งที่เกิดเหตุ (GPS/เลือกจากแผนที่)", true)}
          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className="mt-2 mb-2 rounded-[7px] bg-[#6D5BD0] px-8 py-2 text-sm text-white hover:bg-[#433D8B]"
          >
            ระบุตำแหน่ง
          </button>
          {lat && lng && <MapPreview lat={parseFloat(lat)} lng={parseFloat(lng)} />}
        </div>

        {/* ปุ่ม */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                // เซฟสถานะว่า 'ไม่ต้องเตือน' แล้วกลับเลย
                setIsSaved(true);
                onBack();
              }}
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
                  else if (nextUrl) router.push(nextUrl);
                }}
                className="px-5 py-2 rounded-[7px] bg-[#6F47E4] hover:bg-[#5d3fd6] text-white"
              >
                ออกจากหน้า
              </button>
            </div>
          </div>
        </div>
      )}

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