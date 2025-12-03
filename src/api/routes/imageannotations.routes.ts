// src/api/routes/imageannotations.routes.ts
import express, { Request, Response } from "express";
import pool from "../models/db";

const router = express.Router();

/* ---------- Types จาก FE ---------- */
type AnnotationInput = {
  part_name: string;
  damage_name: string | string[];        // ⬅️ รับได้ทั้งเดี่ยว/อาเรย์
  severity?: "A" | "B" | "C" | "D";
  area_percent?: number | null;
  x: number; y: number; w: number; h: number;
  confidence?: number | null;
  mask_iou?: number | null;
  source?: "manual" | "model" | "legacy";
};

type SaveBody = {
  image_id: number;               // = evaluation_images.id
  created_by?: number | null;     // users.id ถ้ามี
  boxes: AnnotationInput[];
};

/* ---------- Utils ---------- */
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const allowedSev = new Set(["A","B","C","D"]);
const clampSeverity = (v: any): "A"|"B"|"C"|"D" =>
  allowedSev.has(String(v).toUpperCase()) ? (String(v).toUpperCase() as any) : "A";

const normDamage = (v: any): string[] => {
  const arr = Array.isArray(v) ? v : (v == null || v === "") ? [] : [v];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of arr) {
    const k = String(it).trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(k); }
  }
  return out;
};

function normBox(b: AnnotationInput): AnnotationInput & { damage_name: string[]; severity: "A"|"B"|"C"|"D" } {
  return {
    ...b,
    damage_name: normDamage(b.damage_name),          // ⬅️ เป็น array เสมอ
    severity: clampSeverity(b.severity ?? "A"),      // ⬅️ กันค่าพลาด
    area_percent: b.area_percent == null ? null : Math.max(0, Math.min(100, Math.round(b.area_percent))),
    x: round3(clamp01(b.x)),
    y: round3(clamp01(b.y)),
    w: round3(Math.max(0.0001, Math.min(1, b.w))),
    h: round3(Math.max(0.0001, Math.min(1, b.h))),
    // confidence: b.confidence ?? null,
    // mask_iou: b.mask_iou == null ? null : Math.max(0, Math.min(1, b.mask_iou)),
    source: (b.source ?? "manual") as "manual" | "model" | "legacy",
  };
}

/* =========================================================================
 * GET /api/image-annotations/by-image?image_id=123
 *  -> อ่านกล่องทั้งหมดของรูปนั้น
 * ========================================================================= */
router.get("/by-image", async (req: Request, res: Response) => {
  const imageId = Number(req.query.image_id);
  if (!imageId) return res.status(400).json({ ok: false, message: "image_id required" });

  try {
    const { rows } = await pool.query(
      `SELECT id, evaluation_image_id, part_name, damage_name, severity,
              area_percent, x, y, w, h, created_at, updated_at
       FROM image_damage_annotations
       WHERE evaluation_image_id = $1
       ORDER BY id ASC`,
      [imageId]
    );
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("annotations by-image error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});



/* =========================================================================
 * POST /api/image-annotations/save
 * body: { image_id, boxes:[{...}] }
 * กลยุทธ์: REPLACE ทั้งชุดของรูปนั้น (ลบเก่า-ใส่ใหม่) ภายใต้ transaction
 *  - ปัดทศนิยม x/y/w/h เป็น 3 ตำแหน่ง ให้ตรงกับ unique index แบบ rounded
 * ========================================================================= */
router.post("/save", async (req: Request, res: Response) => {
  const body = req.body as SaveBody;
  const imageId = Number(body?.image_id);
  const boxes = Array.isArray(body?.boxes) ? body.boxes.map(normBox) : [];
  if (!imageId) {
    return res.status(400).json({ ok: false, message: "image_id required" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // ลบของเก่าในรูปนี้ก่อน
    await client.query(
      `DELETE FROM image_damage_annotations WHERE evaluation_image_id = $1`,
      [imageId]
    );

    if (boxes.length > 0) {
      // ใส่ใหม่แบบ bulk
      const cols =
        "(evaluation_image_id, part_name, damage_name, severity, area_percent, x, y, w, h, created_at)";
      const placeholders: string[] = [];
      const values: any[] = [imageId];
      let p = 2; // $1 ใช้ imageId ไปแล้ว

      for (const b of boxes) {
        placeholders.push(
          `($1, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, NOW())`
        );
        values.push(
          b.part_name,
          b.damage_name,
          b.severity ,
          b.area_percent ?? null,
          b.x, b.y, b.w, b.h
        );
      }

      await client.query(
        `INSERT INTO image_damage_annotations ${cols} VALUES ${placeholders.join(",")}`,
        values
      );
    }
    // 👇 อัปเดตสถานะให้ชัดเจนตามจำนวนกล่องที่บันทึก
    const isAnnotated = boxes.length > 0;
    await client.query(
      `UPDATE evaluation_images SET is_annotated = $2 WHERE id = $1`,
      [imageId, isAnnotated]
    );
    await client.query("COMMIT");
    return res.status(201).json({ ok: true, saved: boxes.length, is_annotated: isAnnotated });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("annotations save error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  } finally {
    client.release();
  }
});

/* =========================================================================
 * PATCH /api/image-annotations/:id   (ตัวเลือก: แก้ทีละกล่อง)
 * ========================================================================= */
router.patch("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "id required" });

  const b = normBox(req.body as AnnotationInput);
  try {
    const { rowCount } = await pool.query(
      `UPDATE image_damage_annotations
       SET part_name=$1, damage_name=$2, severity=$3, area_percent=$4,
           x=$5, y=$6, w=$7, h=$8, source=$9, updated_at=NOW()
       WHERE id=$10`,
      [
        b.part_name, b.damage_name, b.severity ?? "A", b.area_percent ?? null,
        b.x, b.y, b.w, b.h,
        b.source ?? "manual",
        id
      ]
    );
    return res.json({ ok: true, affected: rowCount });
  } catch (err) {
    console.error("annotations patch error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

/* =========================================================================
 * DELETE /api/image-annotations/:id  (ตัวเลือก)
 * ========================================================================= */
router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "id required" });

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM image_damage_annotations WHERE id = $1`,
      [id]
    );
    return res.json({ ok: true, affected: rowCount });
  } catch (err) {
    console.error("annotations delete error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

export default router;
