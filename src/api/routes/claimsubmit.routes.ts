// src/api/routes/claimsubmit.routes.ts
import express, { Request, Response } from "express";
import pool from "../models/db"; // <-- path นี้ถูกแล้ว (routes -> models)

const router = express.Router();

// ---------- Types จาก FE ----------
type MediaItem = { url: string; type?: "image" | "video"; publicId?: string };
type DamagePhoto = MediaItem & {
  side?: "หน้า" | "หลัง" | "ซ้าย" | "ขวา"
  | "หน้าซ้าย" | "หลังซ้าย" | "หน้าขวา" | "หลังขวา"
  | "ไม่ระบุ";
  note?: string;
};

type AccidentDraft = {
  accidentType: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm หรือ HH:mm:ss
  province: string | null;
  district: string | null;
  road?: string | null;
  areaType: string;
  nearby?: string | null;
  details?: string | null;
  location: { lat: number; lng: number; accuracy?: number | null };
  evidenceMedia?: MediaItem[];     // ภาพ/วิดีโอหลักฐาน (ไม่มี side)
  damagePhotos?: DamagePhoto[];    // รูปความเสียหาย (มี side)
};

type SubmitBody = {
  user_id: number | null;
  selected_car_id: number;
  accident: AccidentDraft;
  agreed?: boolean;
  status?: string;  // <-- เพิ่ม (optional) เผื่ออยากให้ backend อัปเดตสถานะ
};

// POST /api/claim-submit/submit
router.post("/submit", async (req: Request, res: Response) => {
  const body = req.body as SubmitBody;

  if (!body?.selected_car_id || !body?.accident) {
    return res.status(400).json({ ok: false, message: "selected_car_id & accident are required" });
  }

  const userId = body.user_id ?? null;
  const carId = Number(body.selected_car_id);
  const draft = body.accident;
  const agreed = body.agreed ?? true;

  if (!draft?.accidentType || !draft?.date || !draft?.time || !draft?.areaType || !draft?.location) {
    return res.status(400).json({ ok: false, message: "invalid accident payload" });
  }

  const accidentTime = /^\d{2}:\d{2}(:\d{2})?$/.test(draft.time)
    ? (draft.time.length === 5 ? `${draft.time}:00` : draft.time)
    : "00:00:00";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ---------- 1) accident_details ----------
    const insertAccidentSql = `
      INSERT INTO accident_details
        (accident_type, accident_date, accident_time,
         province, district, road, area_type, nearby, details,
         latitude, longitude, accuracy, file_url, agreed,
         created_at, updated_at, media_type)
      VALUES
        ($1, $2, $3, $4,
         $5, $6, $7, $8, $9, $10,
         $11, $12, $13::jsonb, $14,
         NOW(), NOW(), $15::jsonb)
      RETURNING id
    `;

    // ✅ แปลง evidenceMedia เป็น array ของ url/type
    const fileUrls = Array.isArray(draft.evidenceMedia)
      ? draft.evidenceMedia.map(m => m.url)
      : [];

    const mediaTypes = Array.isArray(draft.evidenceMedia)
      ? draft.evidenceMedia.map(m => m.type ?? "image")
      : [];
    console.log("[claim-submit] evidenceMedia:", draft.evidenceMedia);
    console.log("[claim-submit] fileUrls:", fileUrls);

    const toNum = (v: any) => (Number.isFinite(+v) ? +v : null);
    const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp;

    const lat = toNum(draft.location?.lat);
    const lng = toNum(draft.location?.lng);
    let acc = toNum(draft.location?.accuracy);
    if (acc != null) {
      acc = Math.min(Math.max(0, Math.abs(acc)), 9999.99);
      acc = round(acc, 2);
    }

    const latSafe = lat == null ? null : round(lat, 6);
    const lngSafe = lng == null ? null : round(lng, 6);
    console.log("[claim-submit] lat/lng/acc:", { latSafe, lngSafe, acc });

    const accRes = await client.query(insertAccidentSql, [
      draft.accidentType,
      draft.date,
      accidentTime,
      draft.province,
      draft.district,
      draft.road ?? null,
      draft.areaType,
      draft.nearby ?? null,
      draft.details ?? null,
      latSafe,
      lngSafe,
      acc,
      JSON.stringify(fileUrls ?? []),
      agreed,
      JSON.stringify(mediaTypes ?? []),
    ]);

    const accidentDetailId: number = accRes.rows[0].id;

    // ---------- 2) claim_requests ----------
    const claimRes = await client.query(
      `
      INSERT INTO claim_requests
        (user_id, status, approved_by, approved_at, admin_note,
         selected_car_id, accident_detail_id, created_at, updated_at)
      VALUES
        ($1, 'pending', NULL, NULL, NULL,
         $2, $3, NOW(), NOW())
      RETURNING id
      `,
      [userId, carId, accidentDetailId]
    );
    const claimId: number = claimRes.rows[0].id;

    // ---------- 3) evaluation_images ----------
    const photos: DamagePhoto[] = Array.isArray(draft.damagePhotos) ? draft.damagePhotos : [];
    if (photos.length > 0) {
      const insertImgSql = `
        INSERT INTO evaluation_images (claim_id, original_url, damage_note, side, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      for (const p of photos) {
        if (!p?.url) continue;
        await client.query(insertImgSql, [claimId, p.url, p.note ?? null, p.side ?? "ไม่ระบุ"]);
      }
    }

    // ---------- 4) แจ้งเตือนการสร้างเคลม ----------
    await client.query(
      `
      INSERT INTO notifications (user_id, title, message, type, link_to)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        userId,
        "ส่งคำขอเคลมสำเร็จ ",
        `ระบบได้รับคำขอเคลมหมายเลข #${claimId} แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่`,
        "claim",
        `/reports/${claimId}`,
      ]
    );
    console.log(`[claim-submit] 🟢 Notification created for user ${userId}, claim ${claimId}`);

    await client.query("COMMIT");
    return res.status(201).json({
      ok: true,
      data: {
        accident_detail_id: accidentDetailId,
        claim_id: claimId,
        inserted_image_damage: photos.length,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("claim submit error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  } finally {
    client.release();
  }
});

// PUT /api/claim-submit/update/:id
// PUT /api/claim-submit/update/:id
router.put("/update/:id", async (req: Request, res: Response) => {
  const claimId = Number(req.params.id);
  const body = req.body as SubmitBody;

  if (!claimId || !body?.accident) {
    return res.status(400).json({ ok: false, message: "invalid payload" });
  }

  const draft = body.accident;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🟢 1) เตรียมเวลาและ array
    const accidentTime = /^\d{2}:\d{2}(:\d{2})?$/.test(draft.time)
      ? (draft.time.length === 5 ? `${draft.time}:00` : draft.time)
      : "00:00:00";

    // ✅ เตรียม array สำหรับ file_url / media_type (jsonb)
    const fileUrls = Array.isArray(draft.evidenceMedia)
      ? draft.evidenceMedia.map(m => m.url)
      : [];

    const mediaTypes = Array.isArray(draft.evidenceMedia)
      ? draft.evidenceMedia.map(m => m.type ?? "image")
      : [];


    // 🟢 2) อัปเดต accident_details
    await client.query(
      `
      UPDATE accident_details
      SET
        accident_type = $1,
        accident_date = $2,
        accident_time = $3,
        province = $4,
        district = $5,
        road = $6,
        area_type = $7,
        nearby = $8,
        details = $9,
        latitude = $10,
        longitude = $11,
        accuracy = $12,
        file_url = $13::jsonb,     -- ✅ update JSONB array
        media_type = $14::jsonb,   -- ✅ update JSONB array
        updated_at = NOW()
      WHERE id = (
        SELECT accident_detail_id FROM claim_requests WHERE id=$15
      )
      `,
      [
        draft.accidentType,
        draft.date,
        accidentTime,
        draft.province,
        draft.district,
        draft.road ?? null,
        draft.areaType,
        draft.nearby ?? null,
        draft.details ?? null,
        draft.location?.lat ?? null,
        draft.location?.lng ?? null,
        draft.location?.accuracy ?? null,
        JSON.stringify(fileUrls ?? []),
        JSON.stringify(mediaTypes ?? []),
        claimId,
      ]
    );

    // 🟢 3) ลบรูปเก่า + insert ใหม่ใน evaluation_images
    await client.query(`DELETE FROM evaluation_images WHERE claim_id=$1`, [claimId]);
    const photos: DamagePhoto[] = Array.isArray(draft.damagePhotos) ? draft.damagePhotos : [];
    for (const p of photos) {
      if (!p?.url) continue;
      await client.query(
        `INSERT INTO evaluation_images (claim_id, original_url, damage_note, side, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [claimId, p.url, p.note ?? null, p.side ?? "ไม่ระบุ"]
      );
    }

    // 🟢 4) update claim_requests
    await client.query(
      `
      UPDATE claim_requests
      SET
        status = 'pending',
        approved_by = NULL,
        approved_at = NULL,
        admin_note = NULL,
        updated_at = NOW()
      WHERE id = $1
      `,
      [claimId]
    );

    // 🟢 5) แจ้งเตือนการอัปเดต
    const userRes = await client.query(`SELECT user_id FROM claim_requests WHERE id=$1`, [claimId]);
    const userId = userRes.rows?.[0]?.user_id;
    await client.query(
      `
      INSERT INTO notifications (user_id, title, message, type, link_to)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        userId,
        "อัปเดตคำขอเคลมเรียบร้อย 🔧",
        `คุณได้ส่งข้อมูลแก้ไขคำขอเคลมหมายเลข #${claimId} แล้ว`,
        "claim",
        `/reports/${claimId}`,
      ]
    );
    console.log(`[claim-update] 🟢 Notification created for user ${userId}, claim ${claimId}`);

    await client.query("COMMIT");
    return res.json({ ok: true, claim_id: claimId, updated_images: photos.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("claim update error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  } finally {
    client.release();
  }
});



export default router;
