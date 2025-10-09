"use client";
import { useEffect } from "react";
import CarDiagram from "@/assets/car-frame.svg";

const DAMAGE_EN2TH: Record<string, string> = {
  "crack": "ร้าว",
  "dent": "บุบ",
  "glass shatter": "กระจกแตก",
  "lamp broken": "ไฟแตก",
  "scratch": "ขีดข่วน",
  "tire flat": "ยางแบน",
};

const DAMAGE_COLOR: Record<string, string> = {
  "ขีดข่วน": "#FCD34D",   // เหลืองอ่อน — ความเสียหายเล็กน้อย
  "บุบ": "#F97316",       // ส้มสด — บุบจากแรงกระแทกระดับปานกลาง
  "ร้าว": "#3B82F6",      // น้ำเงินสด — โครงสร้างแตกร้าว
  "กระจกแตก": "#DC2626",  // แดงสด — อันตราย ต้องเปลี่ยนชิ้นส่วน
  "ไฟแตก": "#9333EA",     // ม่วงสด — ความเสียหายจากแสง/ไฟ
  "ยางแบน": "#6B7280",    // เทากลาง — ความเสื่อม ไม่รุนแรง
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

const FB_IDS = new Set(["license-plate"]);

type Row = {
  part: string;
  damages: string;
  side?: string;
};

export default function DamageDiagram({ rows }: { rows: Row[] }) {
  useEffect(() => {
    // ✅ ฟังก์ชัน apply สี (รองรับหลายสีด้วย gradient)
    const apply = (id: string, damages: string[]) => {
      const el = document.getElementById(id);
      if (!el) return;

      // แปลงเป็นสีทั้งหมดจาก DAMAGE_COLOR
      const colors = damages
        .map((d) => DAMAGE_COLOR[d] || null)
        .filter((c): c is string => Boolean(c));

      let fillStyle = "white";

      // ✅ ทำ gradient เหมือนเดิม
      if (colors.length > 1) {
        const gradientId = `grad-${id}`;
        const svg = el.closest("svg");
        if (svg) {
          const oldGrad = svg.querySelector(`#${gradientId}`);
          if (oldGrad) oldGrad.remove();

          const defs =
            svg.querySelector("defs") ||
            svg.insertBefore(
              document.createElementNS("http://www.w3.org/2000/svg", "defs"),
              svg.firstChild
            );

          const grad = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "linearGradient"
          );
          grad.setAttribute("id", gradientId);
          grad.setAttribute("x1", "0%");
          grad.setAttribute("x2", "100%");
          grad.setAttribute("y1", "0%");
          grad.setAttribute("y2", "0%");
          const step = 100 / (colors.length - 1);
          colors.forEach((color, i) => {
            const stop = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "stop"
            );
            stop.setAttribute("offset", `${i * step}%`);
            stop.setAttribute("stop-color", color);
            grad.appendChild(stop);
          });
          defs.appendChild(grad);
          fillStyle = `url(#${gradientId})`;
        }
      } else if (colors.length === 1) {
        fillStyle = colors[0]!;
      }

      const paths =
        el.tagName.toLowerCase() === "path" ? [el] : el.querySelectorAll("path");

      paths.forEach((p) => {
        p.setAttribute("fill", fillStyle);
        p.setAttribute("opacity", "1");

        // ✅ เพิ่มเส้นขอบให้คมขึ้น
        p.setAttribute("stroke", "#111827");
        p.setAttribute("stroke-width", "0.8");
        p.setAttribute("vector-effect", "non-scaling-stroke"); // ป้องกัน stroke เบลอเวลา zoom

        (p as any).style.transition = "fill 0.4s ease, opacity 0.4s ease";
      });

      el.setAttribute("opacity", "1");
    };


    // ✅ loop ทุกแถว
    rows.forEach((r) => {
      const baseId = PartIdMap[r.part];
      if (!baseId) return;

      // แยก damage หลายตัว เช่น “ขีดข่วน, บุบ”
      const damageList = r.damages
        .split(",")
        .map((d) => (DAMAGE_EN2TH[d.trim().toLowerCase()] || d.trim()))
        .filter(Boolean);

      console.log("🧱 part:", r.part, "| side:", r.side, "| 🆔 id:", baseId, "| 💥 damage:", damageList);

      // 🎯 1) ชิ้นส่วนกลาง
      if (UNIQUE_IDS.has(baseId)) {
        apply(baseId, damageList);
        return;
      }

      // 🎯 2) ซ้าย/ขวา
      if (LR_IDS.has(baseId)) {
        if (r.side?.includes("ซ้าย")) {
          apply(`${baseId}-left`, damageList);
          return;
        }
        if (r.side?.includes("ขวา")) {
          apply(`${baseId}-right`, damageList);
          return;
        }
        // ไม่มีด้าน → ระบายทั้งคู่
        apply(`${baseId}-left`, damageList);
        apply(`${baseId}-right`, damageList);
        return;
      }

      // 🎯 3) หน้า/หลัง
      if (FB_IDS.has(baseId)) {
        if (r.side?.includes("หน้า")) {
          apply(`${baseId}-front`, damageList);
          return;
        }
        if (r.side?.includes("หลัง")) {
          apply(`${baseId}-back`, damageList);
          return;
        }
        apply(`${baseId}-front`, damageList);
        apply(`${baseId}-back`, damageList);
        return;
      }

      // 🎯 Default
      apply(baseId, damageList);
    });
  }, [rows]);

  return (
    <div className="w-[340px] max-w-full mx-auto my-2  contrast-[100%]">
      <CarDiagram className="w-full h-auto" />
    </div>
  );

}
