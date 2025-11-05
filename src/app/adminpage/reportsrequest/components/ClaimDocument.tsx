"use client";
import type { ClaimDetail, Car, AccidentDraft } from "@/types/claim";
import DamageDiagram from "../../../components/DamageDiagram";
import AnnotatedImage from "../../../components/AnnotatedImage";
/* ---------- utils ---------- */
const thDate = (iso?: string) =>
  !iso
    ? "-"
    : new Date(iso).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

type Row = {
  no: number;
  part: string;
  damages: string;
  severity: "A" | "B" | "C" | "D" | string;
  side?: string;
};
const SIDE_OVERRIDE: Record<string, string> = {
  "กระจกบังลมหน้า": "หน้า",
  "ฝากระโปรงหน้า": "หน้า",
  "กันชนหน้า": "หน้า",
  "กระจกบังลมหลัง": "หลัง",
  "ฝากระโปรงหลัง": "หลัง",
  "กันชนหลัง": "หลัง",
  "หลังคา": "บน",
  "ป้ายทะเบียน": "หลัง",
};

const PartIdMap: Record<string, string> = {
  "กระจกบังลมหน้า": "windshield",
  "กระจกบังลมหลัง": "back-windshield",
  "หน้าต่างหน้า": "front-window",
  "กระจกมองข้าง": "mirror",
  "หน้าต่างหลัง": "back-window",
  "กันชนหน้า": "front-bumper",
  "กันชนหลัง": "back-bumper",
  "กระจังหน้า": "grille",
  "ประตูหน้า": "front-door",
  "ประตูหลัง": "back-door",
  "ฝากระโปรงหน้า": "hood",
  "ฝากระโปรงหลัง": "trunk",
  "หลังคา": "roof",
  "ไฟหน้า": "headlight",
  "ไฟท้าย": "tail-light",
  "ป้ายทะเบียน": "license-plate",
  "ล้อหน้า": "front-wheel",
  "ล้อหลัง": "back-wheel",
  "บังโคลน/แก้มข้าง": "fender",
  "แผงบังโคลนหลัง": "quarter-panel",
  "คิ้ว/สเกิร์ตข้าง": "rocker-panel",
};

const UNIQUE_IDS = new Set([
  "grille", "hood", "trunk", "roof",
  "front-bumper", "back-bumper",
  "windshield", "back-windshield",
]);

const LR_IDS = new Set([
  "headlight", "tail-light",
  "front-wheel", "back-wheel",
  "front-door", "back-door",
  "front-window", "back-window",
  "mirror", "rocker-panel",
  "fender", "quarter-panel",
]);
export default function ClaimDocument({ detail }: { detail: any }) {
  // ✅ Map ฟิลด์ flat จาก detail ให้เป็น car / accident objects
  const car: Car = {
    id: detail.car?.id ?? detail.selected_car_id ?? 0,
    car_brand: detail.car?.car_brand ?? "-",
    car_model: detail.car?.car_model ?? "-",
    car_license_plate: detail.car?.car_license_plate ?? "-",
    registration_province: detail.car?.registration_province ?? "-",
    insurance_type: detail.car?.insurance_type ?? "-",
    policy_number: detail.car?.policy_number ?? "-",
    coverage_end_date: detail.car?.coverage_end_date ?? null,
    coverage_start_date: detail.car?.coverage_start_date ?? null,
    car_year: detail.car?.car_year ?? "-",
    car_path: detail.car?.car_path ?? "",
    insured_name: detail.car?.insured_name ?? "-",
    insurance_company: detail.car?.insurance_company ?? "-",
    chassis_number: detail.car?.chassis_number ?? "-"
  };



  const acc: AccidentDraft = {
    accidentType: detail.accident?.accidentType ?? "ไม่ระบุ",
    accident_date: detail.accident?.accident_date ?? null,
    accident_time: detail.accident?.accident_time ?? "-",
    province: detail.accident?.province ?? "ไม่ระบุ",
    district: detail.accident?.district ?? "ไม่ระบุ",
    road: detail.accident?.road ?? "-",
    nearby: detail.accident?.nearby ?? "-",
    areaType: detail.accident?.areaType ?? "-",
    details: detail.accident?.details ?? "-",
    location: {
      lat: parseFloat(detail.accident?.location?.lat ?? "0"),
      lng: parseFloat(detail.accident?.location?.lng ?? "0"),
      accuracy: parseFloat(detail.accident?.location?.accuracy ?? "0"),
    },
    damagePhotos: detail.accident?.damagePhotos ?? [],
  };

  console.log("✅ Claim detail loaded:", detail);
  console.log("🚗 Car mapped:", car);
  console.log("💥 Accident mapped:", acc);

  /* ---------- รวมรายการความเสียหาย ---------- */
  const rawRows: Row[] = [];
  let i = 1;
  for (const p of acc.damagePhotos ?? []) {
    for (const a of p.annotations ?? []) {
      const dmg = Array.isArray(a.damage) ? a.damage.join(", ") : a.damage || "-";
      rawRows.push({
        no: i++,
        part: a.part || "-",
        damages: dmg,
        severity: a.severity || "-",
        side: p.side,
      });
    }
  }

  /* ---------- รวมข้อมูลชิ้นส่วนซ้ำ ---------- */
  const mergeSeverity = (a: string, b: string) => {
    const order = ["A", "B", "C", "D"];
    const ai = order.indexOf(String(a).toUpperCase());
    const bi = order.indexOf(String(b).toUpperCase());
    return order[Math.max(ai, bi)] || a;
  };

  const mergedMap = new Map<string, Row>();
  // ✅ Normalize ด้าน เช่น "หน้าขวา" → "ขวา", "หลังซ้าย" → "ซ้าย"
  const normalizeSide = (side?: string): string => {
    if (!side) return "ไม่ระบุ";
    if (side.includes("ซ้าย")) return "ซ้าย";
    if (side.includes("ขวา")) return "ขวา";
    if (side.includes("หน้า")) return "หน้า";
    if (side.includes("หลัง")) return "หลัง";
    return side;
  };
  for (const r of rawRows) {
    const partId = PartIdMap[r.part] || r.part;

    // 🔹 Normalize ด้าน
    const normalizedSide = normalizeSide(r.side);

    const key =
      UNIQUE_IDS.has(partId)
        ? partId // unique → ไม่แยกซ้ายขวา
        : LR_IDS.has(partId)
          ? `${partId}_${normalizedSide}`
          : `${partId}_${normalizedSide}`; // default กำหนดให้มีด้านชัดเจน

    const existing = mergedMap.get(key);
    if (existing) {
      // ✅ รวม damage ไม่ให้ซ้ำ
      const allDamages = new Set([
        ...existing.damages.split(",").map((s) => s.trim()).filter(Boolean),
        ...r.damages.split(",").map((s) => s.trim()).filter(Boolean),
      ]);
      mergedMap.set(key, {
        ...existing,
        damages: Array.from(allDamages).join(", "),
        severity: mergeSeverity(existing.severity, r.severity),
      });
    } else {
      mergedMap.set(key, { ...r, side: normalizedSide }); // ✅ ใช้ด้านที่ normalize แล้ว
    }
  }


  /* ---------- สร้าง rows สุดท้าย ---------- */
  const rows: Row[] = Array.from(mergedMap.values()).map((r, idx) => ({
    ...r,
    no: idx + 1,
  }));

  console.log("🖼️ damagePhotos:", acc.damagePhotos);
  const uniqueParts = Array.from(new Set(rows.map((r) => r.part))).filter(Boolean);

  return (
    <div id="print-root" className="mx-auto w-full max-w-[794px] bg-white p-0 print:max-w-none">
      <style jsx global>{`
  @page {
    size: A4;
    margin: 10mm 10mm 12mm 10mm;
  }

  @media print {
    html, body {
      background: #fff !important;
    }
    #print-root, #print-root * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      visibility: visible !important;
    }
    body * {
      visibility: hidden !important;
    }
    #print-root {
      position: absolute;
      inset: 0;
      margin: 0;
    }
    .no-print, .print-hide, [class*="fixed"], [class*="sticky"], [data-floating] {
      display: none !important;
    }
    *:focus {
      outline: none !important;
      box-shadow: none !important;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .break-before {
      break-before: page;
      page-break-before: always;
    }
  }

  /* ===== ตาราง ===== */
  .doc-table {
    border-collapse: collapse;
    width: 100%;
  }
  .doc-table th,
  .doc-table td {
    padding: 4px 6px !important;
    font-size: 12px !important;
    line-height: 1.2 !important;
    border-bottom: 1px solid #e5e7eb;
  }
  .doc-th {
    background: #f8fafc;
    font-weight: 600;
    color: #111827;
  }
  .doc-box {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #ffffff;
    box-shadow: 0 0 0 1px #f3f4f6 inset;
  }

  /* ===== Legend สี ===== */
  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 9999px;
    display: inline-block;
    border: 1px solid #111827;
    box-shadow: 0 0 0 0.5px rgba(0,0,0,0.1);
  }

  /* ===== Radio วงกลม ===== */
  .radio-cell {
    width: 16px;
    height: 16px;
    border: 1.6px solid #111827;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    margin: 0 auto;
  }
  .radio-fill {
    width: 8px;
    height: 8px;
    background: #111827;
    border-radius: 9999px;
    display: block;
  }

  /* ===== Label & Value ===== */
  .doc-box .info-label {
    color: #6b7280;
    font-size: 12px;
    line-height: 1.25;
    letter-spacing: -0.1px;
  }
  .doc-box .info-value {
    font-weight: 500;
    color: #1f2937;
    font-size: 13px;
    line-height: 1.35;
    letter-spacing: -0.1px;
    word-break: break-word;
  }

  /* ===== ส่วนหัวเอกสาร ===== */
  .header-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.3px;
  }
  .header-sub {
    font-size: 14px;
    color: #374151;
    font-weight: 600;
  }

  /* ===== กล่องลายเซ็น ===== */
  .sign-box {
    border: 1px solid #d4d4d8;
    border-radius: 8px;
    padding: 8px 12px;
    background: #fafafa;
  }
  .sign-title {
    font-weight: 600;
    font-size: 12.5px;
    color: #374151;
    margin-bottom: 6px;
  }
  .sign-line {
    color: #4b5563;
    font-size: 12px;
    letter-spacing: 0.2px;
  }

  /* ===== Print Font ปรับเล็กลงนิดตอนพิมพ์ ===== */
  @media print {
    .doc-table th,
    .doc-table td {
      padding: 3px 5px !important;
      font-size: 11px !important;
    }
    .doc-th {
      background: #f3f4f6 !important;
    }
    #print-root, #print-root * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
      `}</style>



      {/* ---------- Header ---------- */}
      <div className="rounded-xl p-4 sm:p-5 text-black">
        <div className="mb-2 flex items-center gap-3">

          <div>
            <div className="text-[22px] font-extrabold leading-tight">
              {car.insurance_company}
            </div>
            {/* <div className="text-[15px] font-semibold text-zinc-800">
              Insurance Public Company Limited
            </div> */}
          </div>
        </div>
        <div className="my-2 h-px bg-zinc-300" />





        {/* ---------- กล่องข้อมูลเคลม ---------- */}
        <div className="doc-box p-4 text-[13px] avoid-break">
          <div className="text-center border-b border-zinc-300 bg-[#F6F8FB] px-3 py-2 text-[13px] font-semibold">
            ข้อมูลการเคลม
          </div>

          {/* ข้อมูลรถยนต์ */}
          <div className="grid grid-cols-3 gap-y-1.5 gap-x-6 text-[13px] print:grid-cols-3">
            <Info label="ชื่อ" value={car.insured_name} />
            <Info label="ยี่ห้อรถ" value={car.car_brand} />
            <Info label="รุ่น" value={car.car_model} />
            <Info label="ทะเบียน" value={car.car_license_plate + " " + car.registration_province} />
            <Info label="ประเภทประกัน" value={car.insurance_type} />
            <Info label="เลขที่กรมธรรม์" value={car.policy_number} />
            <Info label="เลขตัวถัง" value={car.chassis_number} />
            <Info
              label="เริ่มคุ้มครอง"
              value={car.coverage_start_date ? thDate(car.coverage_start_date) : "-"}
            />
            <Info
              label="คุ้มครองถึง"
              value={car.coverage_end_date ? thDate(car.coverage_end_date) : "-"}
            />
          </div>
          <div className="my-2 h-px bg-zinc-200" />

          {/* ข้อมูลอุบัติเหตุ */}
          <div className="grid grid-cols-3 gap-y-1.5 gap-x-6 text-[13px] print:grid-cols-3">
            <Info label="วันที่ยื่นคำขอ" value={thDate(detail.created_at)} />
            <Info label="วันที่เกิดเหตุ" value={thDate(acc.accident_date)} />
            <Info label="เวลาที่เกิดเหตุ" value={acc.accident_time ?? "-"} />
            <Info label="ประเภทอุบัติเหตุ" value={acc.accidentType ?? "-"} />
            <Info label="จังหวัด" value={acc.province ?? "-"} />
            <Info label="อำเภอ" value={acc.district ?? "-"} />
            <Info
              label="ถนน/บริเวณใกล้เคียง"
              value={`${acc.road ?? "-"} / ${acc.nearby ?? "-"}`}
            />
            <Info label="ประเภทพื้นที่" value={acc.areaType ?? "-"} />
            <Info label="รายละเอียด" value={acc.details ?? "-"} />
          </div>
        </div>



        {/* ---------- รายการความเสียหาย ---------- */}
        <div className="mt-4 doc-box avoid-break">
          <div className="text-center border-b border-zinc-300 bg-[#F6F8FB] px-3 py-2 text-[13px] font-semibold">
            แผนภาพชิ้นส่วนที่เสียหาย
          </div>

          {/* ✅ แบ่งสองส่วน: Diagram ใหญ่ + Legend */}
          <div className="grid grid-cols-12">
            {/* Diagram ใหญ่เต็มกลาง */}
            <div className="col-span-12 sm:col-span-9 border-b border-zinc-300 sm:border-b-0 sm:border-r p-3 flex justify-center items-center">
              <div className="text-center">

                <DamageDiagram rows={rows} />
              </div>
            </div>

            {/* Legend ด้านขวา (เล็กลง) */}
            <div className="col-span-12 sm:col-span-3 p-3">
              <div className="mb-2 text-[12px] font-semibold">ลักษณะความเสียหาย</div>
              {[
                ["#FCD34D", "รอยขีดข่วน"],
                ["#F97316", "รอยบุบ"],
                ["#3B82F6", "ร้าว"],
                ["#DC2626", "กระจกแตก"],
                ["#9333EA", "ไฟแตก"],
                ["#6B7280", "ยางแบน"],
                ["#22C55E", "อื่นๆ"],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-2 text-[12px] leading-[1.4]">
                  <span
                    className="legend-dot"
                    style={{
                      background: color as string,
                      width: "14px",
                      height: "14px",
                      borderWidth: "1px",
                    }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* ---------- ตาราง ---------- */}
        <div className="mt-4 doc-box avoid-break">
          <div className="text-center border-b border-zinc-200 bg-[#F6F8FB] px-2 py-1.5 text-[12px] font-semibold">
            รายการชิ้นส่วนที่เสียหาย
          </div>

          <div className="overflow-x-auto">
            <table className="doc-table text-[11px] w-full text-left border-collapse leading-tight">
              <thead>
                <tr>
                  <th className="doc-th text-center w-[30px] py-[2px]">ลำดับ</th>
                  <th className="doc-th py-[2px]">รายการ</th>
                  <th className="doc-th w-[12%] text-center py-[2px]">ด้าน</th>
                  <th className="doc-th w-[30%] py-[2px]">สภาพ</th>
                  <th className="doc-th text-center py-[2px]" colSpan={4}>ระดับความเสียหาย</th>
                </tr>
                <tr className="bg-[#fafafa] text-center">
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  {["A", "B", "C", "D"].map((lv) => (
                    <th key={lv} className="doc-th w-8 py-[1px] text-[10px]">{lv}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.length > 0 ? (
                  rows.map((r) => (
                    <tr key={r.no} className="even:bg-[#fafafa]">
                      <td className="text-center py-[1px]">{r.no}</td>
                      <td className="py-[1px]">{r.part}</td>
                      <td className="text-center py-[1px]">
                        {SIDE_OVERRIDE[r.part] ?? r.side ?? "-"}
                      </td>
                      <td className="py-[1px]">{r.damages}</td>
                      {["A", "B", "C", "D"].map((lv) => (
                        <td key={lv} className="text-center align-middle py-[1px]">
                          <span
                            className="radio-cell"
                            style={{
                              width: "10px",
                              height: "10px",
                              borderWidth: "1.2px",
                            }}
                          >
                            {String(r.severity).toUpperCase() === lv && (
                              <span
                                className="radio-fill"
                                style={{ width: "5px", height: "5px" }}
                              ></span>
                            )}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-3 text-center text-zinc-500 text-[11px]">
                      ไม่มีข้อมูลความเสียหาย
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


        {/* ---------- ลายเซ็น ---------- */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between gap-4 sm:gap-6 avoid-break">
          <SignBox title="บริษัทประกัน" />
          <SignBox title="ผู้เอาประกันภัย / ลูกค้า" />
        </div>


      </div>


      {/* ---------- หน้าที่ 2: ภาพความเสียหาย ---------- */}
      <div className="break-before mt-6 doc-box">
        <div className="text-center border-b text-black border-zinc-300 bg-[#F6F8FB] px-3 py-2 text-[13px] font-semibold">
          ภาพความเสียหายของรถยนต์ (ก่อนและหลังตรวจจับ)
        </div>

        <div className="p-3 space-y-6">
          {acc.damagePhotos?.length ? (
            acc.damagePhotos.map((photo, idx) => (
              <div key={idx} className="avoid-break">
                <div className="mb-2 text-[12.5px] font-medium text-zinc-700">
                  ภาพที่ {idx + 1} {photo.side ? `(${photo.side})` : ""}
                </div>

                {/* === ภาพคู่แบบ 2 คอลัมน์เท่ากัน === */}
                <div className="grid grid-cols-2 gap-3">
                  {/* --- ต้นฉบับ --- */}
                  <div className="border border-zinc-300 rounded-md bg-white overflow-hidden">
                    <div className="bg-zinc-100 text-black text-center text-[11.5px] py-1 font-semibold border-b border-zinc-200">
                      ภาพต้นฉบับ
                    </div>
                    <div className="flex items-center justify-center bg-zinc-50">
                      <img
                        src={
                          photo.original_url || photo.url || "" // ✅ ลองใช้ original_url ก่อน
                        }
                        alt={`original-${idx}`}
                        className="object-contain h-[330px] w-full"
                      />

                    </div>
                  </div>

                  {/* --- หลังตรวจจับ --- */}
                  <div className="border border-zinc-300 rounded-md bg-white overflow-hidden">
                    <div className="bg-zinc-100 text-black text-center text-[11.5px] py-1 font-semibold border-b border-zinc-200">
                      หลังตรวจจับความเสียหาย
                    </div>
                    <div className="flex items-center justify-center bg-zinc-50">
                      <AnnotatedImage photo={photo} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-[12px] text-zinc-500 py-10">
              ไม่มีภาพความเสียหายที่อัปโหลด
            </div>
          )}
        </div>
      </div>





    </div>

  );
}

/* ---------- subs ---------- */
function Info({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-[12px] text-zinc-500 leading-tight">{label}</span>
      <span className="text-[13px] font-medium text-zinc-900 leading-snug break-words">
        {value || "-"}
      </span>
    </div>
  );
}


function SignBox({ title }: { title: string; }) {
  return (
    <div className="flex-1 w-full border border-zinc-300 rounded-md p-3 text-[12px]">

      <div className="mb-2 font-semibold text-zinc-700">{title}</div>
      <div>ลงชื่อ ___________________________</div>
      <div className="mt-1">วันที่ ___________/___________/___________</div>
    </div>
  );
}


