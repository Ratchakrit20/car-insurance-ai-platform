// ---------------- Types ----------------
export type User = {
  id: number;
  name: string;
  citizen_id: string;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  role?: string | null;
  created_at?: string | null;
};

export type InsurancePolicy = {
  id?: number;
  policy_number: string;
  insurance_company: string;
  insured_name: string;
  citizen_id: string;
  address?: string | null;
  coverage_start_date?: string | null;
  coverage_end_date?: string | null;
  coverage_end_time?: string | null;
  car_brand?: string | null;
  car_license_plate?: string | null;
  chassis_number?: string | null;
  car_year?: number | null;
  insurance_type?: string | null;
  car_model?: string | null;
  car_path?: string | null;
  created_at?: string | null;
  car_color?: string | null;
  registration_province?: string | null;
};

export type ClaimDetail = {
  claim_id: number | string;
  status?: ClaimStatus;
  created_at?: string;
  car: Car | null;
  accident: AccidentDraft;
}

export type Annotation = {
  id: number;
  part: string;
  damage: string[];
  severity: "A" | "B" | "C" | "D";
  areaPercent: number;
  color: string;
  x: number; y: number; w: number; h: number; // 0..1
};
// Centralized types for Claim/Accident across pages
// --------------------------------------------------
export type ClaimStatus =
  | "กำลังตรวจสอบ"
  | "สำเร็จ"
  | "เอกสารไม่ผ่านการตรวจสอบ"
  | "เอกสารต้องแก้ไขเพิ่มเติม";

export type MediaItem = {
  id?: number;
  url: string;
  type?: "image" | "video";
  publicId?: string;
};

export type DamagePhoto = MediaItem & {
  side?: "ซ้าย" | "ขวา" | "หน้า" | "หลัง" | "ไม่ระบุ";
  // optional metadata จาก detection pipelines
  total?: number | null;
  perClass?: Record<string, number> | null;
  note?: string;
  // ⬇️ เพิ่ม: annotations ที่ backend แนบมา (ถ้ามี)
  annotations?: Annotation[];

  original_url?: string | null;
  is_annotated?: boolean;
};

export type Car = {
  id: number;
  car_brand: string;
  car_model: string;
  car_year: string | number;
  car_license_plate: string;
  insurance_type: string;
  policy_number: string;
  coverage_end_date: string; // ISO date
  insured_name?: string;            // ชื่อผู้เอาประกัน
  insurance_company?: string;      // บริษัทประกัน
  registration_province?: string;   // จังหวัดที่จดทะเบียน
  chassis_number?: string;          // เลขตัวถัง
  car_path?: string
};

export type AccidentDraft = {
  accidentType: string;
  accident_date: string;   // ✅ เพิ่ม
  accident_time: string;
  province: string | null;
  district: string | null;
  road?: string | null;
  areaType: string;
  nearby?: string | null;
  details?: string | null;
  location: { lat: number; lng: number; accuracy?: number | null };
  evidenceMedia?: MediaItem[]; // general evidence (no side)
  damagePhotos?: DamagePhoto[]; // damage photos (may include side)
};

// Minimal UI model used by lists/cards in ReportPage
export interface ClaimItem {
  id: string; // claim_id/report_id/accident_detail_id as string
  carTitle: string;
  incidentDate: string;
  // ISO
  incidentTime?: string;
  incidentType?: string;
  damageAreas?: string;
  severitySummary?: string;
  status: ClaimStatus;
  photoUrl?: string;
 license_plate?: string | null;




  province?: string | null;
  district?: string | null;
  road?: string | null;
  areaType?: string | null;
  nearby?: string | null;
  details?: string | null;
  evidenceMedia?: MediaItem[];
  damagePhotos?: DamagePhoto[];

  car_path: string;

  location?: {
    lat: number | null;
    lng: number | null;
    accuracy?: number | null;
  };

  selected_car_id?: number;
  accident_detail_id?: number;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
  rejected_at?: string | null;
  incomplete_at?: string | null;
  admin_note?: string | null;
  car_model: string;
  car_brand: string;
  incomplete_history?: Array<{ note: string; time: string }>;
  resubmitted_history?: Array<{ note: string; time: string }>;

  steps?: ClaimStep[];
}
type ClaimStep = {
  step_type: string;
  created_at: string;
  note?: string;
  step_order?: number;
};
// Shape coming back from /api/claimreport/list (server row). Keep optional to be tolerant to schema changes.
export interface ClaimReportRow {
  report_id?: number;
  claim_id?: number;
  accident_detail_id?: number;
  user_id?: number;
  status?: ClaimStatus | string;
  created_at?: string;
  updated_at?: string;
  approved_at?: string | null;
  incomplete_history?: Array<{ note: string; time: string }>;
  resubmitted_history?: Array<{ note: string; time: string }>;

  rejected_at?: string | null;
  incomplete_at?: string | null;
  admin_note?: string | null;
  // accident_details
  accident_type?: string;
  accident_date?: string;
  accident_time?: string;
  area_type?: string;
  province?: string | null;
  district?: string | null;
  road?: string | null;
  nearby?: string | null;
  details?: string | null;
  thumbnail_url?: string | null;
  media_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;

  // cars (optional join)
  car_id?: number;
  car_brand?: string | null;
  car_model?: string | null;
  car_year?: string | number | null;
  car_path: string;
  license_plate?: string | null;
  steps?: ClaimStep[];
  // images aggregated as JSON array
  images?: Array<{
    id: number;
    original_url: string | null;
    damage_note: string | null;
    side: string | null;
  }>;

  // optional fields commonly used by UI
  car_title?: string | null;
  first_image_url?: string | null;
  pdf_url?: string | null;
  damage_areas?: string | null;
  severity_summary?: string | null;
}
