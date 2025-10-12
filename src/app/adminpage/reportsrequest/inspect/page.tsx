// src/app/adminpage/reportsrequest/inspect/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { User, Car, AccidentDraft, Annotation } from "@/types/claim";
import InspectHeader from "./InspectHeader";
import ImageList from "./ImageList";
import ImageViewer from "./ImageViewer";
import DamageTable from "./DamageTable";
import SummaryPanel from "./SummaryPanel";
import SafeAreaSpacer from "@/app/components/SafeAreaSpacer";

// ===== EN ↔ TH dictionaries =====
const DAMAGE_EN2TH: Record<string, string> = {
  "crack": "ร้าว",
  "dent": "บุบ",
  "glass_shatter": "กระจกแตก",
  "lamp_broken": "ไฟแตก",
  "scratch": "ขีดข่วน",
  "tire_flat": "ยางแบน",
};
const PART_EN2TH: Record<string, string> = {
  "Back-bumper": "กันชนหลัง",
  "Back-door": "ประตูหลัง",
  "Back-wheel": "ล้อหลัง",
  "Back-window": "หน้าต่างหลัง",
  "Back-windshield": "กระจกบังลมหลัง",
  "Fender": "บังโคลน/แก้มข้าง",
  "Front-bumper": "กันชนหน้า",
  "Front-door": "ประตูหน้า",
  "Front-wheel": "ล้อหน้า",
  "Front-window": "หน้าต่างหน้า",
  "Grille": "กระจังหน้า",
  "Headlight": "ไฟหน้า",
  "Hood": "ฝากระโปรงหน้า",
  "License-plate": "ป้ายทะเบียน",
  "Mirror": "กระจกมองข้าง",
  "Quarter-panel": "แผงบังโคลนหลัง",
  "Rocker-panel": "คิ้ว/สเกิร์ตข้าง",
  "Roof": "หลังคา",
  "Tail-light": "ไฟท้าย",
  "Trunk": "ฝากระโปรงหลัง",
  "Windshield": "กระจกบังลมหน้า",
};

// สร้าง reverse map
const DAMAGE_TH2EN = Object.fromEntries(
  Object.entries(DAMAGE_EN2TH).map(([en, th]) => [th, en])
);
const PART_TH2EN = Object.fromEntries(
  Object.entries(PART_EN2TH).map(([en, th]) => [th, en])
);

// แปลงชื่อ (กันทั้งกรณีส่งมาเป็นไทยอยู่แล้ว/ไม่รู้จัก)
const toTHDamage = (s?: string) =>
  !s ? "" : DAMAGE_EN2TH[s] ?? s;
const toENDamage = (s?: string) =>
  !s ? "" : DAMAGE_TH2EN[s] ?? s;

const toTHPart = (s?: string) =>
  !s ? "" : PART_EN2TH[s] ?? s;
const toENPart = (s?: string) =>
  !s ? "" : PART_TH2EN[s] ?? s;

/* ------------ Types ของคุณ ------------ */
type ClaimDetail = {
  claim_id: number | string;
  status?: string;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
};

/* ------------ Config ------------ */
const URL_PREFIX =
  process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");
const DETECT_API_BASE =
  process.env.NEXT_PUBLIC_DETECT_API_BASE || "http://localhost:8000";

/* ------------ Types: API /detect/analyze ------------ */
// ใกล้ ๆ บรรทัด type AnalyzeDamageResponse
type AnalyzeDamageResponse = {
  ok: boolean;
  width: number;
  height: number;
  parts: Array<{
    part: string;
    bbox: [number, number, number, number];
    // ⬇ ขยายโครงสร้าง damage ให้รองรับฟิลด์ที่รวมผลแล้ว
    damages: Array<{
      class: string;
      confidence: number;
      mask_iou: number;
      count?: number;
      mask_coverage?: number; // 0..1 ต่อชนิด
    }>;
    // ⬇ ฟิลด์ใหม่จากฝั่ง AI
    damage_coverage?: number;            // 0..1 รวมทุกดาเมจ
    damage_coverage_percent?: number;    // 0..100
  }>;
  overlay_image_b64?: string;
  overlay_mime?: string;
  message?: string;
};

type ModelParams = {
  conf_parts: number;
  conf_damage: number;
  imgsz: number;
  mask_iou_thresh: number;
  render_overlay: boolean;
};

/* ------------ API ------------ */
async function fetchDetail(id: string): Promise<ClaimDetail> {
  const res = await fetch(
    `${URL_PREFIX}/api/claim-requests/admin/detail?claim_id=${encodeURIComponent(id)}`,
    { credentials: "include", cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.message || "โหลดรายละเอียดไม่สำเร็จ");

  const d = json.data;

  // ✅ map โครงสร้างให้ตรงกับ type ClaimDetail
  return {
    claim_id: d.claim_id,
    status: d.status,
    created_at: d.created_at,
    car: d.car
      ? {
          id: d.car.id ?? 1,
          car_brand: d.car.car_brand,
          car_model: d.car.car_model,
          car_year: d.car.car_year,
          car_license_plate: d.car.car_license_plate,
          car_path: d.car.car_path,
          insured_name: d.car.insured_name,
          policy_number: d.car.policy_number,
        }
      : null,
    accident: d.accident
      ? {
          accidentType: d.accident.accidentType ?? "ไม่ระบุ",
          accident_date: d.accident.accident_date,
          accident_time: d.accident.accident_time,
          province: d.accident.province,
          district: d.accident.district,
          road: d.accident.road,
          nearby: d.accident.nearby,
          details: d.accident.details,
          location: d.accident.location,
          // ✅ รวม evidenceMedia และ damagePhotos เข้าไปด้วย
          evidenceMedia: d.accident.evidenceMedia ?? [],
          damagePhotos: d.accident.damagePhotos ?? [],
        }
      : null,
  } as ClaimDetail;
}


/** เรียก FastAPI /detect/analyze โดยส่งรูปจาก URL */
async function analyzeImageByUrl(
  imageUrl: string,
  params: { conf_parts?: number; conf_damage?: number; imgsz?: number; mask_iou_thresh?: number; render_overlay?: boolean } = {}
): Promise<AnalyzeDamageResponse> {
  // ดึงรูปเป็น blob (ต้องเปิด CORS ที่ที่เก็บรูป)
  const imgResp = await fetch(imageUrl, { mode: "cors" });
  if (!imgResp.ok) throw new Error("โหลดรูปจาก URL ไม่สำเร็จ");
  const blob = await imgResp.blob();
  const file = new File([blob], "upload.jpg", { type: blob.type || "image/jpeg" });

  const qs = new URLSearchParams({
    conf_parts: String(params.conf_parts ?? 0.25),
    conf_damage: String(params.conf_damage ?? 0.25),
    imgsz: String(params.imgsz ?? 640),
    mask_iou_thresh: String(params.mask_iou_thresh ?? 0.1),
    render_overlay: String(params.render_overlay ?? true),
  }).toString();

  const form = new FormData();
  form.append("file", file);

  const resp = await fetch(`${DETECT_API_BASE}/detect/analyze?${qs}`, {
    method: "POST",
    body: form,
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`วิเคราะห์ไม่สำเร็จ: ${txt}`);
  }
  const result = await resp.json();
  console.log("Analyze damage:", result);
  return result as AnalyzeDamageResponse;
}

/* ------------ Helpers ------------ */
const thDate = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const readAccidentType = (a?: AccidentDraft | null) => a?.accidentType ?? "-";
const readAccidentDate = (a?: AccidentDraft | null) => thDate(a?.accident_date);

/** แปลงผล parts + bbox → กล่อง Annotation (normalized 0..1) */
function partsToBoxes(res: AnalyzeDamageResponse): Annotation[] {
  const W = res.width || 1;
  const H = res.height || 1;
  const palette = ["#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#3B82F6", "#06B6D4", "#84CC16"];
  let idx = 0;

  return res.parts.map((p) => {
    const [x1, y1, x2, y2] = p.bbox;
    const w = Math.max(1, x2 - x1);
    const h = Math.max(1, y2 - y1);
    const color = palette[idx++ % palette.length];

    // ✅ อังกฤษไว้คำนวณ / ไทยไว้แสดง
    const enDamagesArr = (p.damages ?? []).map((d) => d.class);
    const thDamagesArr = enDamagesArr.map(toTHDamage);

    const areaPercent =
      typeof p.damage_coverage_percent === "number"
        ? p.damage_coverage_percent
        : Math.round(((w * h) / (W * H)) * 100);

    return {
      id: idx,
      part: toTHPart(p.part),                         // ไทย
      damage: thDamagesArr,                           // ไทย
      severity: calculateSeverity(enDamagesArr, areaPercent, p.part), // ← ส่งอังกฤษ + part อังกฤษ
      areaPercent,
      color,
      x: x1 / W, y: y1 / H, w: w / W, h: h / H,
    } as Annotation;
  });
}

// ✅ ฟังก์ชันคำนวณ severity จาก damages และ areaPercent
type Severity = "A" | "B" | "C" | "D";

function calculateSeverity(
  damages: string[],
  areaPercent: number,
  part?: string
): Severity {
  // 1) น้ำหนักพื้นฐาน (ใช้ร่วมกับ % พท.)
  const weight: Record<string, number> = {
    "scratch": 1,
    "crack": 2,
    "dent": 2,

    // 🔧 กลุ่มที่ "ต้องเปลี่ยนชิ้นส่วน"
    "glass shatter": 4,
    "lamp broken": 4,
    "tire flat": 5,
  };

  // 2) กำหนด “ขั้นต่ำ” ถ้ามีความเสียหายที่ต้องเปลี่ยนชิ้นส่วน
  let floor: Severity | null = null;

  const hasGlassShatter = damages.includes("glass_shatter");
  const hasLampBroken = damages.includes("lamp_broken");
  const hasTireFlat = damages.includes("tire_flat");

  // ยางแบน → ขับไม่ปลอดภัย ⇒ อย่างน้อย C
  if (hasTireFlat) floor = maxSeverity(floor, "C");

  // กระจกแตก:
  //  - ถ้าแตกที่ "Windshield" (กระจกบังลมหน้า) ⇒ อย่างน้อย C (ทัศนวิสัย/ความปลอดภัย)
  //  - ที่อื่น ๆ อย่างน้อย B
  if (hasGlassShatter) {
    if ((part || "").toLowerCase() === "windshield") {
      floor = maxSeverity(floor, "C");
    } else {
      floor = maxSeverity(floor, "B");
    }
  }

  // ไฟหน้า/ท้ายแตก ⇒ อย่างน้อย B (ทัศนวิสัย/กฎหมาย)
  if (hasLampBroken) floor = maxSeverity(floor, "B");

  // 3) คิดคะแนนรวมเพื่อจัดระดับฐาน
  const score = damages.reduce((s, d) => s + (weight[d] || 0), 0);

  // เกณฑ์ฐานจากคะแนน + พื้นที่
  let base: Severity;
  if (score <= 1 && areaPercent < 40) {
    base = "A";
  } else if (score <= 4 && areaPercent < 60) {
    base = "B";
  } else if (score <= 8 && areaPercent < 80) {
    base = "C";
  } else {
    base = "D";
  }

  // 4) ถ้ามี “ต้องเปลี่ยนชิ้นส่วน” ให้ยกระดับขั้นต่ำทับค่า base
  let sev = maxSeverity(base, floor);

  // 5) กรณีพิเศษ: มี “ต้องเปลี่ยนชิ้นส่วน” มากกว่า 1 รายการ หรือ
  //    ผสมกับ dent/crack หลายรายการ → ดันขึ้นอีก 1 ระดับ (ยกเว้น D แล้ว)
  const replacementCount =
    (hasGlassShatter ? 1 : 0) + (hasLampBroken ? 1 : 0) + (hasTireFlat ? 1 : 0);
  const toughCombo = replacementCount >= 2 || (replacementCount >= 1 && score >= 6);
  if (toughCombo && sev !== "D") sev = bump(sev);

  return sev;
}

// ——— helpers ———
function maxSeverity(a: Severity | null, b: Severity | null): Severity {
  const order: Severity[] = ["A", "B", "C", "D"];
  const pick = [a ?? "A", b ?? "A"].reduce((m, x) =>
    order.indexOf(x as Severity) > order.indexOf(m) ? (x as Severity) : m
    , "A" as Severity);
  return pick;
}
function bump(s: Severity): Severity {
  if (s === "A") return "B";
  if (s === "B") return "C";
  if (s === "C") return "D";
  return "D";
}





/* ====================================================================== */
export default function InspectPage() {
 
  const sp = useSearchParams();
  const router = useRouter();
  const claimId = sp.get("claim_id");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // รวมรูปจาก type ของคุณ → {url, side?}
  // ให้ images มี { id, url, side }
 const images = useMemo(() => {
  const acc = detail?.accident;
  if (!acc?.damagePhotos) return [];

  return acc.damagePhotos
      .filter((p: any) => p?.url)
      .map((p: any, index: number) => ({
        id: p.id ?? p.image_id ?? p.evaluation_image_id ?? `local-${index}`, // ✅ generate id เอง
        url: p.url,
        side: p.side,
        is_annotated: p.is_annotated,
        note: p.note ?? p.damage_note ?? "",
      }));
  }, [detail]);
  // -------- โหลดข้อมูลผู้ใช้ (me) --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
      const res = await fetch(`${URL_PREFIX}/api/me`, {
    credentials: "include",
  });
        const data = await res.json();
        if (cancelled) return;
        console.log("🔐 Auth data:", data);
        setUser(data.user ?? null);
        setIsAuthenticated(Boolean(data.isAuthenticated));
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // 🔒 รอให้ตรวจสอบสิทธิ์เสร็จก่อน
    if (isAuthenticated !== true) return;
    if (!claimId) {
      setErr("ไม่พบ claim_id");
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const d = await fetchDetail(String(claimId));
        if (!alive) return;
        console.log("✅ Claim detail loaded:", d);
        setDetail(d);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "เกิดข้อผิดพลาด");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [claimId, isAuthenticated]);

  useEffect(() => {
  if (!loading && detail && images.length > 0) {
    // 🔥 วิเคราะห์ภาพแรกทันทีถ้ายังไม่มีผล
    const firstImageId = images[0]?.id;
    if (firstImageId && !boxesByIndex[0]) {
      console.log("🧠 เริ่มวิเคราะห์ภาพแรกอัตโนมัติ...");
      void analyzeActiveImage(0);
    }
  }
}, [loading, detail, images]);

  //เช็คว่าตรวจสอบความเสียหายครบยังก่อนดำเนินการต่อ
  const [annotatedById, setAnnotatedById] = useState<Record<string | number, boolean>>({});

  // เติมค่าเริ่มต้นจาก detail → images
 
  // ใช้ annotatedById ใน canProceed
  const canProceed =
    images.length > 0 &&
    images.every((im) => annotatedById[im.id] ?? im.is_annotated ?? false);

  // ภาพที่เลือก + กล่องความเสียหาย + ระดับการวิเคราะห์ + overlay ต่อรูป
  const [activeIndex, setActiveIndex] = useState(0);
  const [boxesByIndex, setBoxesByIndex] = useState<Record<number, Annotation[]>>({});
  const currentBoxes = boxesByIndex[activeIndex] ?? [];
  console.log("Current boxes:", currentBoxes);
  const [addMode, setAddMode] = useState(false);
  // สีวนเล่น
  const palette = ["#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#3B82F6"];

  const [analysisLevel, setAnalysisLevel] = useState(50);
  const [overlayByIndex, setOverlayByIndex] = useState<Record<number, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // config model
  const [modelParams, setModelParams] = useState<ModelParams>({
    conf_parts: 0.25,
    conf_damage: 0.25,
    imgsz: 640,
    mask_iou_thresh: 0.1,
    render_overlay: true,
  });
  // ปรับพารามิเตอร์โมเดลaiตามระดับ (0..100)
  function paramsFromLevel(level: number): ModelParams {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const t = clamp(level, 0, 100) / 100;

    // ยิ่ง level สูง → ยิ่งละเอียด → ลด conf ลง
    const conf_parts = Number((0.6 - (0.6 - 0.2) * t).toFixed(2));  // 0→0.60, 100→0.20
    const conf_damage = Number((0.5 - (0.5 - 0.15) * t).toFixed(2)); // 0→0.50, 100→0.15

    return {
      ...modelParams,
      conf_parts,
      conf_damage,
    };
  }
  const handleChangeLevel = (lvl: number) => {
    setAnalysisLevel(lvl);
    const p = paramsFromLevel(lvl);
    setModelParams(p);
    void analyzeActiveImage(activeIndex, p, true); // บังคับวิเคราะห์ซ้ำด้วยพารามิเตอร์ใหม่
  };
  // -------- Auth --------
 
  // เรียก FastAPI วิเคราะห์ภาพที่เลือก
  async function analyzeActiveImage(index = activeIndex, override?: Partial<ModelParams>, force = false) {
    const img = images[index];
    if (!img?.url) return;
    try {
      setAnalyzing(true);
      setAnalyzeError(null);

      const used = { ...modelParams, ...override };
      const res = await analyzeImageByUrl(img.url, {
        conf_parts: used.conf_parts,
        conf_damage: used.conf_damage,
        imgsz: used.imgsz,
        mask_iou_thresh: used.mask_iou_thresh,
        render_overlay: used.render_overlay,
      });

      // กล่องจาก bbox (แทน seed เดิม)
      const newBoxes = partsToBoxes(res);
      console.log("New boxes from AI:", newBoxes);
      setBoxesByIndex((m) => ({ ...m, [index]: newBoxes }));

      // เก็บ overlay ต่อภาพ
      if (res.overlay_image_b64) {
        const overlayUrl = `data:${res.overlay_mime || "image/jpeg"};base64,${res.overlay_image_b64}`;
        setOverlayByIndex((m) => ({ ...m, [index]: overlayUrl }));
      }
    } catch (e: any) {
      setAnalyzeError(e?.message ?? "วิเคราะห์ภาพไม่สำเร็จ");
    } finally {
      setAnalyzing(false);
    }
  }

  function uniq(arr: string[]) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of arr) {
      const k = String(s).trim().toLowerCase();
      if (!k) continue;
      if (!seen.has(k)) { seen.add(k); out.push(s.trim()); }
    }
    return out;
  }

  function parseDamageName(raw: any): string[] {
    if (Array.isArray(raw)) return uniq(raw.map(String));

    if (typeof raw === "string") {
      const s = raw.trim();
      // 1) JSON array
      if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith('"') && s.endsWith('"'))) {
        try {
          const j = JSON.parse(s);
          return Array.isArray(j) ? uniq(j.map(String)) : uniq([String(j)]);
        } catch { /* fallthrough */ }
      }
      // 2) Postgres text[] => {"dent","lamp broken"}
      if (s.startsWith("{") && s.endsWith("}")) {
        const inner = s.slice(1, -1);
        // แยกด้วย , แต่รองรับเครื่องหมายคำพูด
        const items = inner
          .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
          .map((t) => t.trim().replace(/^"(.*)"$/, "$1"));
        return uniq(items);
      }
      // 3) string ปกติ
      if (s.includes(",")) return uniq(s.split(",").map((t) => t.trim()));
      return s ? [s] : [];
    }

    return [];
  }

  async function fetchSavedBoxes(imageId: number | string) {
    const r = await fetch(`${URL_PREFIX}/api/image-annotations?image_id=${encodeURIComponent(String(imageId))}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!r.ok) return [];
    const j = await r.json();
    const rows = j?.data ?? [];

    return rows.map((row: any, i: number) => ({
      id: row.id ?? i + 1,
      part: toTHPart(row.part_name),                              // ✅ ไทย
      damage: parseDamageName(row.damage_name).map(toTHDamage),  // <-- แปลงให้เป็น string[]
      severity: row.severity,
      areaPercent: row.area_percent ?? undefined,
      color: "#F59E0B",
      x: row.x, y: row.y, w: row.w, h: row.h,
    })) as Annotation[];
  }

  function round3(n: number) {
    return Math.round(n * 1000) / 1000; // ให้เข้ากับ unique index แบบปัดทศนิยม
  }

  async function saveCurrentImage(merged?: Annotation[]) {
    const img = images[activeIndex];
    const boxesRaw = boxesByIndex[activeIndex] ?? [];
    const boxes = merged ?? boxesRaw; // ✅ ใช้ merged ที่ส่งมาถ้ามี

    if (!img?.id) {
      alert("ไม่พบ image id");
      return;
    }

    // ✅ รวมกล่องที่มีชิ้นส่วน (part_name) เดียวกันก่อนบันทึก
    const mergedBoxes = Object.values(
      boxes.reduce((acc, b) => {
        const key = b.part?.trim() || `__id_${b.id}`;
        if (!acc[key]) {
          acc[key] = { ...b, damage: Array.isArray(b.damage) ? b.damage : [b.damage] };
        } else {
          // รวมความเสียหาย (ไม่ซ้ำ)
          const combined = Array.from(
            new Set([
              ...(Array.isArray(acc[key].damage) ? acc[key].damage : [acc[key].damage]),
              ...(Array.isArray(b.damage) ? b.damage : [b.damage]),
            ])
          );
          acc[key] = { ...acc[key], damage: combined };
        }
        return acc;
      }, {} as Record<string, Annotation>)
    );

    // ✅ สร้าง payload จาก mergedBoxes แทน boxes ดิบ
    const payload = {
      image_id: img.id, // = evaluation_image_id
      boxes: mergedBoxes.map((b) => ({
        part_name: b.part,
        damage_name: b.damage,
        severity: b.severity,
        area_percent: b.areaPercent ?? null,
        x: round3(b.x),
        y: round3(b.y),
        w: round3(b.w),
        h: round3(b.h),
      })),
    };

    // ✅ ส่งข้อมูลรวมแล้วไป backend
    const resp = await fetch(`${URL_PREFIX}/api/image-annotations/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const t = await resp.text();
      alert(`บันทึกไม่สำเร็จ: ${t}`);
      return;
    }

    const j = await resp.json();
    console.log("Saving image:", img);
    console.log("saved:", j);
    console.log("📦 mergedBoxes sent:", mergedBoxes);

    setAnnotatedById((m) => ({ ...m, [img.id]: mergedBoxes.length > 0 }));
    alert("บันทึกเรียบร้อย");
  }


  // ✅ ตรวจสอบสิทธิ์ผู้ใช้ก่อน render หน้า
  if (isAuthenticated === null) {
    return <div className="p-6 text-zinc-500">กำลังตรวจสอบสิทธิ์ผู้ใช้…</div>;
  }

  if (isAuthenticated === false) {
    router.replace("/login");
    return null;
  }
  // States
  if (!claimId) return <div className="p-6 text-rose-600">ไม่พบ claim_id</div>;
  if (loading) return <div className="p-6 text-zinc-600">กำลังโหลด…</div>;
  if (err) return <div className="p-6 text-rose-600">ผิดพลาด: {err}</div>;
  if (!detail) return null;

  const title =
    `${detail?.car?.car_brand ?? "รถ"} ${detail?.car?.car_model ?? ""} ` +
    `ทะเบียน ${detail?.car?.car_license_plate ?? "-"}`;

  // const mainImageUrl = overlayByIndex[activeIndex] || images[activeIndex]?.url;
  const mainImageUrl = images[activeIndex]?.url;
  const gotoClaimDoc = () => {
    if (!claimId) return;
    router.push(`/adminpage/reportsrequest/claim-doc?claim_id=${encodeURIComponent(String(claimId))}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6 py-6 lg:py-8">
        <InspectHeader
          claimId={claimId}
          title={title}
          accidentType={readAccidentType(detail?.accident)}
          accidentDate={readAccidentDate(detail?.accident)}
        />

        {/* responsive: 1 → 6 → 12 คอลัมน์ */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 lg:gap-6">

          {/* ซ้าย */}
          {user ? (
            <aside className="md:col-span-2 lg:col-span-3">
              <ImageList
                adminId={user.id}
                claimId={claimId}
                images={images.map(im => ({
                  ...im,
                  is_annotated: annotatedById[im.id] ?? im.is_annotated
                }))}
                activeIndex={activeIndex}
                onSelect={async (i) => {
                  setActiveIndex(i);
                  if (!boxesByIndex[i]) {
                    const imageId = images[i]?.id;
                    if (imageId) {
                      const saved = await fetchSavedBoxes(imageId);
                      if (saved.length) {
                        setBoxesByIndex((m) => ({ ...m, [i]: saved }));
                        setAnnotatedById((m) => ({ ...m, [imageId]: true }));
                        return;
                      } else {
                        setAnnotatedById((m) => ({ ...m, [imageId]: false }));
                      }
                    }
                    if (!overlayByIndex[i]) void analyzeActiveImage(i);
                  }
                }}
                onBack={() => router.back()}
              />
            </aside>
          ) : (
            <aside className="md:col-span-2 lg:col-span-3 flex items-center justify-center text-sm text-zinc-400 py-10">
              กำลังโหลดข้อมูลผู้ใช้…
            </aside>
          )}


          {/* กลาง */}
          <section className="md:col-span-4 lg:col-span-6">
            <ImageViewer
              imageUrl={mainImageUrl}
              imageLabel={images[activeIndex]?.side}
              imageNote={images[activeIndex]?.note}
              boxes={currentBoxes}
              startDrawExternally={addMode}
              onExitDraw={() => setAddMode(false)}
              onCreate={(rect) => {
                const nextId = (currentBoxes.at(-1)?.id ?? 0) + 1;
                const color = palette[nextId % palette.length];
                setBoxesByIndex((m) => ({
                  ...m,
                  [activeIndex]: [
                    ...(m[activeIndex] ?? []),
                    {
                      id: nextId,
                      part: `จุดที่ ${nextId}`,
                      damage: [],             // <- array
                      severity: "B",
                      areaPercent: Math.round(rect.w * rect.h * 100),
                      color,
                      ...rect,
                    },
                  ],
                }));
                setAddMode(false);
              }}
            />

            {/* Action row */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-zinc-500">
                {analyzing
                  ? "กำลังวิเคราะห์ภาพ…"
                  : analyzeError
                    ? `ผิดพลาด: ${analyzeError}`
                    : "ผลวิเคราะห์จากโมเดล YOLO จะวาดกรอบอัตโนมัติ"}
              </div>
              <button
                disabled={analyzing || !images[activeIndex]?.url}
                onClick={() => analyzeActiveImage(activeIndex)}
                className={`h-10 rounded-xl px-4 text-sm font-medium ${analyzing
                    ? "bg-zinc-200 text-zinc-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
              >
                {analyzing ? "กำลังวิเคราะห์…" : "วิเคราะห์ภาพนี้"}
              </button>
            </div>

            <DamageTable
              boxes={currentBoxes}
              onChange={(next) =>
                setBoxesByIndex((m) => ({
                  ...m,
                  [activeIndex]: (m[activeIndex] ?? []).map((x) =>
                    x.id === next.id ? next : x
                  ),
                }))
              }
              onRemove={(id) =>
                setBoxesByIndex((m) => ({
                  ...m,
                  [activeIndex]: (m[activeIndex] ?? []).filter((x) => x.id !== id),
                }))
              }
              saveCurrentImage={saveCurrentImage}
              onDone={gotoClaimDoc}
              canProceed={canProceed}
            />
          </section>

          {/* ขวา */}
          <aside className="md:col-span-6 lg:col-span-3">
            <SummaryPanel
              boxes={currentBoxes}
              analysisLevel={analysisLevel}
              onChangeLevel={handleChangeLevel}
            />
          </aside>
        </div>
      </div>
      <SafeAreaSpacer />
    </div>

  );
}
