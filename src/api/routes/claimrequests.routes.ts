import express, { Request, Response } from 'express';
import pool from '../models/db';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
const router = express.Router();

/**
 * POST /api/claim-requests
 * สร้างคำขอเคลมเริ่มต้น (pending)
 * ไม่ได้ใช้
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { user_id, selected_car_id } = req.body as {
      user_id?: number;
      selected_car_id?: number | null;
    };

    if (!user_id) {
      return res.status(400).json({ ok: false, message: "user_id is required" });
    }

    const result = await pool.query(
      `INSERT INTO claim_requests
        (user_id, status, approved_by, approved_at, admin_note, selected_car_id)
       VALUES ($1, 'pending', NULL, NULL, NULL, $2)
       RETURNING id, user_id, status, selected_car_id, created_at`,
      [user_id, selected_car_id ?? null]
    );

    const claim = result.rows[0];

    // 🔔 เพิ่มการแจ้งเตือน “ส่งคำขอเคลมสำเร็จ”
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link_to)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user_id,
        "ส่งคำขอเคลมสำเร็จ",
        `ระบบได้รับคำขอเคลมหมายเลข #${claim.id} แล้ว กำลังตรวจสอบโดยเจ้าหน้าที่`,
        "claim",
        `/reports/${claim.id}`,
      ]
    );

    return res.status(201).json({ ok: true, claim });
  } catch (err) {
    console.error("Create claim error:", err);
    return res.status(500).json({ ok: false, message: "internal error" });
  }
});

/**
 * ✅ PATCH /api/claim-requests/:id
 * สำหรับแอดมินเปลี่ยนสถานะ claim (approve / reject / incomplete)
 * ใช้
 */
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      status,
      admin_note,
      approved_by,
      approved_at,
      rejected_by,
      rejected_at,
      incomplete_by,
      incomplete_at,
    } = req.body as any;
    // ✅ parse admin_note (รองรับทั้ง string ธรรมดา และ JSON object)
    let adminNote = admin_note;
    if (typeof admin_note === "object") {
      try {
        adminNote = JSON.stringify(admin_note);
      } catch {
        adminNote = String(admin_note);
      }
    } else if (typeof admin_note === "string") {
      // เผื่อฝั่ง frontend ส่งเป็น JSON string มา
      try {
        JSON.parse(admin_note); // ถ้า parse ได้ แสดงว่าเป็น JSON อยู่แล้ว
        adminNote = admin_note;
      } catch {
        adminNote = admin_note; // เป็นข้อความธรรมดา
      }
    }

    const nowTH = dayjs().tz("Asia/Bangkok").format();

    const { rows: userRows } = await pool.query(
      `SELECT user_id, incomplete_history FROM claim_requests WHERE id = $1`,
      [id]
    );

    if (userRows.length === 0)
      return res.status(404).json({ ok: false, message: "claim not found" });

    const userId = userRows[0].user_id;
    const prevHistory = Array.isArray(userRows[0]?.incomplete_history)
      ? userRows[0].incomplete_history
      : [];

    let newIncompleteHistory = prevHistory;
    let newIncompleteAt = incomplete_at ?? null;

    if (status === "incomplete" && adminNote) {
      newIncompleteAt = nowTH;
      newIncompleteHistory = [
        ...prevHistory,
        { time: nowTH, note: adminNote } // ✅ ใช้ตัวที่แปลงแล้ว
      ];
    }

    const result = await pool.query(
      `
      UPDATE claim_requests
      SET
        status = COALESCE($1, status),
        admin_note = COALESCE($2, admin_note),
        approved_by = COALESCE($3, approved_by),
        approved_at = COALESCE($4, approved_at::timestamp),
        rejected_by = COALESCE($5, rejected_by),
        rejected_at = COALESCE($6, rejected_at::timestamp),
        incomplete_by = COALESCE($7, incomplete_by),
        incomplete_at = COALESCE($8, incomplete_at::timestamp),
        incomplete_history = $9::jsonb,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
      `,
      [
        status ?? null,
        adminNote ?? null,
        approved_by ?? null,
        approved_at ?? null,
        rejected_by ?? null,
        rejected_at ?? null,
        incomplete_by ?? null,
        newIncompleteAt,
        JSON.stringify(newIncompleteHistory),
        id,
      ]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ ok: false, message: "claim not found" });

    const claim = result.rows[0];

    // ✅ แจ้งเตือนผู้ใช้
    let title = "";
    let message = "";

    switch (status) {
      case "approved":
        title = "คำขอเคลมของคุณได้รับการอนุมัติแล้ว ";
        message = `คำขอเคลมหมายเลข #${id} ผ่านการตรวจสอบเรียบร้อยแล้ว`;
        break;
      case "rejected":
        title = "คำขอเคลมของคุณถูกปฏิเสธ ";
        message = `คำขอเคลมหมายเลข #${id} ถูกปฏิเสธ เนื่องจาก: ${admin_note || "ไม่มีรายละเอียดเพิ่มเติม"}`;
        break;
      case "incomplete":
        title = "เอกสารไม่ครบ กรุณาแก้ไข ";
        let shortMessage = "โปรดตรวจสอบรายละเอียด";
        try {
          const parsed = typeof admin_note === "string" ? JSON.parse(admin_note) : admin_note;
          if (parsed?.note) shortMessage = parsed.note;
        } catch { }
        message = `คำขอเคลมหมายเลข #${id} ต้องแก้ไขเพิ่มเติม: ${shortMessage}`;
        break;

      default:
        title = "สถานะเคลมของคุณได้รับการอัปเดต ";
        message = `คำขอเคลมหมายเลข #${id} มีการอัปเดตสถานะล่าสุด: ${status}`;
        break;
    }

    await pool.query(
      `
      INSERT INTO notifications (user_id, title, message, type, link_to)
      VALUES ($1, $2, $3, 'claim', $4)
      `,
      [userId, title, message, `/reports/${id}`]
    );

    return res.json({ ok: true, claim });
  } catch (err) {
    console.error("Patch claim error:", err);
    return res.status(500).json({ ok: false, message: "internal error" });
  }
});


/**
 * PATCH /api/claim-requests/:id/correction
 * ลูกค้าอัปโหลดเอกสารแก้ไข → อัปเดตสถานะเดิม + เพิ่ม timeline step
 * ไม่ได้ใช้ในหน้าเว็บ
 */
router.patch('/:id/correction', async (req: Request, res: Response) => {
  const claimId = Number(req.params.id);
  const { note } = req.body as { note?: string };

  if (!claimId) {
    return res.status(400).json({ ok: false, message: 'claim_id is required' });
  }

  try {
    // 1) อัปเดต status
    const result = await pool.query(
      `UPDATE claim_requests
         SET status = 'incomplete', updated_at = now()
       WHERE id = $1
       RETURNING id, user_id, status, updated_at`,
      [claimId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'claim not found' });
    }

    // 2) insert step
    await pool.query(
      `INSERT INTO claim_request_steps (claim_request_id, step_type, step_order, note, created_at)
       VALUES (
         $1,
         'corrected',
         COALESCE((SELECT MAX(step_order)+1 FROM claim_request_steps WHERE claim_request_id=$1), 1),
         $2,
         now()
       )`,
      [claimId, note ?? null]
    );

    return res.json({ ok: true, claim: result.rows[0] });
  } catch (err) {
    console.error('Correction error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});



/**
 * PATCH /api/claim-requests/:id
 * สำหรับ admin อัปเดตสถานะ / หมายเหตุ / ประวัติการแก้ไข
 */


/**
 * PUT /api/claim-requests/:id/accident
 * ผูก claim กับ accident_details.id
 * ไม่ได้ใช้
 */
router.put('/:id/accident', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { accident_detail_id } = req.body as { accident_detail_id?: number };

    if (!accident_detail_id) {
      return res.status(400).json({ ok: false, message: 'accident_detail_id is required' });
    }

    const result = await pool.query(
      `UPDATE claim_requests
         SET accident_detail_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [accident_detail_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    return res.json({ ok: true, claim: result.rows[0] });
  } catch (err) {
    console.error('Attach accident error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/**
 * ใช้
 */
router.get('/admin/detail', async (req: Request, res: Response) => {
  const claimId = req.query.claim_id ? Number(req.query.claim_id) : null;

  if (!claimId) {
    return res.status(400).json({ ok: false, message: 'claim_id is required' });
  }

  try {
    const result = await pool.query(
      `
      SELECT cr.id AS claim_id, cr.status, cr.created_at,
             ad.accident_type, ad.accident_date, ad.accident_time,
             ad.province, ad.district, ad.road, ad.nearby, ad.details,
             ad.latitude, ad.longitude, ad.accuracy,
             ad.file_url AS evidence_file_url, ad.media_type,
             ip.car_brand, ip.car_model, ip.car_year,
             ip.car_license_plate AS license_plate,
             ip.policy_number, ip.insured_name, ip.car_path,

             -- ✅ เพิ่ม damage photos
             (
               SELECT COALESCE(
               
                 json_agg(
                   json_build_object(
                    'image_id', ei.id,  
                     'url', ei.original_url,
                     'type', 'image',
                     'damage_note', ei.damage_note,
                     'side', ei.side
                   )
                   ORDER BY ei.id ASC
                 ), '[]'::json
               )
               FROM evaluation_images ei
               WHERE ei.claim_id = cr.id
             ) AS damage_photos

      FROM claim_requests cr
      JOIN accident_details ad ON ad.id = cr.accident_detail_id
      LEFT JOIN insurance_policies ip ON ip.id = cr.selected_car_id
      WHERE cr.id = $1
      LIMIT 1
      `,
      [claimId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'claim not found' });
    }

    const r = result.rows[0];
    return res.json({
      ok: true,
      data: {
        claim_id: r.claim_id,
        status: r.status,
        created_at: r.created_at,
        car: {
          insured_name: r.insured_name,
          policy_number: r.policy_number,
          car_brand: r.car_brand,
          car_model: r.car_model,
          car_year: r.car_year,
          car_license_plate: r.license_plate,
          car_path: r.car_path,
        },
        accident: {
          accidentType: r.accident_type,
          accident_date: r.accident_date,
          accident_time: r.accident_time,
          province: r.province,
          district: r.district,
          road: r.road,
          nearby: r.nearby,
          details: r.details,
          location: {
            lat: r.latitude,
            lng: r.longitude,
            accuracy: r.accuracy,
          },
          evidenceMedia: r.evidence_file_url
            ? [{ url: r.evidence_file_url, type: r.media_type }]
            : [],
          damagePhotos: r.damage_photos,  // ✅ ใช้ที่ดึงมา
        },
      },
    });
  } catch (err) {
    console.error('admin claim detail error:', err);
    return res.status(500).json({ ok: false, message: 'server error' });
  }
});
/**
 * ใช้
 */
router.get("/detail", async (req: Request, res: Response) => {
  const claimId = req.query.claim_id ? Number(req.query.claim_id) : null;
  const userId = req.query.user_id ? Number(req.query.user_id) : null;

  if (!claimId) {
    return res.status(400).json({ ok: false, message: "claim_id is required" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        cr.id AS claim_id,
        cr.user_id,
        cr.status,
        cr.selected_car_id,
        cr.accident_detail_id,
        cr.created_at,
        cr.admin_note,
        cr.approved_at,
        cr.rejected_at,
        cr.incomplete_at,
        cr.incomplete_history,
        cr.resubmitted_history,

        ad.accident_type,
        ad.accident_date,
        ad.accident_time,
        ad.area_type,
        ad.province, ad.district, ad.road, ad.nearby, ad.details,
        ad.latitude, ad.longitude, ad.accuracy,
        ad.file_url AS evidence_file_url,
        ad.media_type,

        ip.car_brand, ip.car_model, ip.car_year,
        ip.car_license_plate AS license_plate,
        ip.registration_province,
        ip.insurance_type, ip.policy_number, ip.coverage_end_date,ip.coverage_start_date,
        ip.car_path, ip.insured_name, ip.insurance_company,
        ip.chassis_number, 

        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', ei.id,
                'original_url', ei.original_url,
                'damage_note', ei.damage_note,
                'side', ei.side,
                'is_annotated', ei.is_annotated,
                'annotations',
                  (
                    SELECT COALESCE(
                      json_agg(
                        json_build_object(
                          'id', ia.id,
                          'part', ia.part_name,
                          'damage', ia.damage_name,
                          'severity', ia.severity,
                          'area_percent', ia.area_percent,
                          'x', ia.x, 'y', ia.y, 'w', ia.w, 'h', ia.h
                        )
                        ORDER BY ia.id ASC
                      ), '[]'::json
                    )
                    FROM image_damage_annotations ia
                    WHERE ia.evaluation_image_id = ei.id
                  )
              )
              ORDER BY ei.id ASC
            ), '[]'::json
          )
          FROM evaluation_images ei
          WHERE ei.claim_id = cr.id
        ) AS damage_images

      FROM claim_requests cr
      JOIN accident_details ad ON ad.id = cr.accident_detail_id
      LEFT JOIN insurance_policies ip ON ip.id = cr.selected_car_id
      WHERE cr.id = $1 AND ($2::int IS NULL OR cr.user_id = $2)
      LIMIT 1
      `,
      [claimId, userId]
    );

    if (rows.length === 0)
      return res.status(404).json({ ok: false, message: "claim not found" });

    const row = rows[0];

    // Helper parse JSON
    const parseMaybeJson = (v: any) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [v];
        } catch {
          return [v];
        }
      }
      return [];
    };

    const fileUrls = parseMaybeJson(row.evidence_file_url).flat();
    const mediaTypes = parseMaybeJson(row.media_type).flat();

    const evidenceMedia = fileUrls.map((url: string, i: number) => ({
      url,
      type:
        mediaTypes[i] ??
        (url.match(/\.(mp4|mov|webm|ogg)$/i) || url.includes("/video/upload/")
          ? "video"
          : "image"),
    }));

    // ✅ รวมทุกแหล่งมาไว้ array เดียว พร้อม label/time/role
    const steps: any[] = [];

    steps.push({
      step_type: "created",
      label: "สร้างเอกสารการเคลม",
      note: "รอเจ้าหน้าที่ตรวจสอบเอกสารของคุณ",
      created_at: row.created_at,
      role: "user",
    });

    const incomplete = parseMaybeJson(row.incomplete_history);
    incomplete.forEach((h: any, i: number) => {
      steps.push({
        step_type: `incomplete_${i + 1}`,
        label: `รอบที่ ${i + 1}: เจ้าหน้าที่แจ้งแก้ไขข้อมูล`,
        note: h.note || "เจ้าหน้าที่แจ้งแก้ไขข้อมูล",
        created_at: h.time,
        role: "admin",
      });
    });

    const resubmitted = parseMaybeJson(row.resubmitted_history);
    resubmitted.forEach((h: any, i: number) => {
      steps.push({
        step_type: `resubmitted_${i + 1}`,
        label: `ผู้ใช้ส่งกลับครั้งที่ ${i + 1}`,
        note: h.note || "ผู้ใช้ส่งเอกสารที่แก้ไขแล้วกลับมาใหม่",
        created_at: h.time,
        role: "user",
      });
    });

    if (row.approved_at) {
      steps.push({
        step_type: "approved",
        label: "เอกสารถูกอนุมัติ",
        note: "เจ้าหน้าที่ได้ยืนยันข้อมูลเรียบร้อยแล้ว",
        created_at: row.approved_at,
        role: "admin",
      });
    }

    if (row.rejected_at) {
      steps.push({
        step_type: "rejected",
        label: "เอกสารถูกปฏิเสธ",
        note: row.admin_note || "คำขอเคลมถูกปฏิเสธ",
        created_at: row.rejected_at,
        role: "admin",
      });
    }

    // ✅ เรียงตามเวลาแน่นอน
    steps.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // ✅ ส่งกลับผลลัพธ์
    const parsed = {
      ...row,
      accident: {
        accidentType: row.accident_type,
        accident_date: row.accident_date,
        accident_time: row.accident_time,
        areaType: row.area_type,
        province: row.province,
        district: row.district,
        road: row.road,
        nearby: row.nearby,
        details: row.details,
        location: {
          lat: row.latitude,
          lng: row.longitude,
          accuracy: row.accuracy,
        },
        evidenceMedia,
        damagePhotos: row.damage_images || [],
      },
      steps, // ✅ timeline ที่เรียงตามเวลาจริงแล้ว
    };
    let parsedAdminNote = {};
    try {
      parsedAdminNote =
        typeof row.admin_note === "string" ? JSON.parse(row.admin_note) : row.admin_note;
    } catch {
      parsedAdminNote = { text: row.admin_note || "" };
    }
    return res.json({
      ok: true,
      data: {
        ...parsed,
        admin_note: parsedAdminNote, // ✅ เพิ่มตรงนี้
      },
    });
  } catch (err) {
    console.error("❌ claim detail error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});
/**
 * ใช้
 */
router.get("/listall", async (req: Request, res: Response) => {
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;

  try {
    const { rows } = await pool.query(`
      SELECT
        cr.id AS claim_id,
        cr.user_id,
        cr.status,
        cr.selected_car_id,
        cr.accident_detail_id,
        cr.created_at,
        cr.updated_at,
        cr.approved_at,
        cr.rejected_at,
        cr.incomplete_at,
        cr.incomplete_history::jsonb AS incomplete_history,
        cr.resubmitted_history::jsonb AS resubmitted_history,
        cr.admin_note,

        ad.accident_type,
        ad.accident_date,
        ad.accident_time,
        ad.area_type,
        ad.province, ad.district, ad.road, ad.nearby, ad.details,
        ad.file_url AS thumbnail_url,
        ad.media_type,

        ip.car_brand, ip.car_model, ip.car_year,
        ip.car_license_plate AS license_plate,
        ip.car_path,

        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', ei.id,
                'original_url', ei.original_url,
                'damage_note', ei.damage_note,
                'side', ei.side
              )
              ORDER BY ei.id ASC
            ), '[]'::json
          )
          FROM evaluation_images ei
          WHERE ei.claim_id = cr.id
        ) AS images,

        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'step_type', s.step_type,
                'step_order', s.step_order,
                'note', s.note,
                'created_at', s.created_at
              )
              ORDER BY s.created_at ASC
            ), '[]'::json
          )
          FROM claim_request_steps s
          WHERE s.claim_request_id = cr.id
        ) AS steps

      FROM claim_requests cr
      JOIN accident_details ad ON ad.id = cr.accident_detail_id
      LEFT JOIN insurance_policies ip ON ip.id = cr.selected_car_id
      ORDER BY COALESCE(cr.updated_at, cr.created_at::date) DESC, cr.created_at DESC
      LIMIT $1
    `, [limit]);

    const parsed = rows.map(r => {
      console.log("🟣 listall raw =>", r.incomplete_history);
      return {
        ...r,
        incomplete_history: Array.isArray(r.incomplete_history)
          ? r.incomplete_history
          : [],
        resubmitted_history: Array.isArray(r.resubmitted_history)
          ? r.resubmitted_history
          : [],
      };
    });

    return res.json({ ok: true, data: parsed });
  } catch (err) {
    console.error("claimreport listall error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});
/**
 * ใช้
 */
router.get("/list", async (req: Request, res: Response) => {
  const userId = req.query.user_id ? Number(req.query.user_id) : null;
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;
  console.log("🟢 userId =", userId);
  try {
    const { rows } = await pool.query(`
      SELECT
        cr.id AS claim_id,
        cr.user_id,
        cr.status,
        cr.selected_car_id AS car_id,
        cr.accident_detail_id,
        cr.created_at,
        cr.updated_at,
        cr.approved_at,
        cr.rejected_at,
        cr.incomplete_at,
        cr.incomplete_history::jsonb AS incomplete_history,
        cr.resubmitted_history::jsonb AS resubmitted_history,
        cr.admin_note,

        ad.accident_type,
        ad.accident_date,
        ad.accident_time,
        ad.area_type,
        ad.province, ad.district, ad.road, ad.nearby, ad.details,
        ad.latitude, ad.longitude, ad.accuracy,
        ad.file_url AS thumbnail_url,
        ad.media_type,

        ip.car_brand, ip.car_model, ip.car_year,
        ip.car_license_plate AS license_plate,
        ip.car_path,

        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', ei.id,
                'original_url', ei.original_url,
                'damage_note', ei.damage_note,
                'side', ei.side
              )
              ORDER BY ei.id ASC
            ), '[]'::json
          )
          FROM evaluation_images ei
          WHERE ei.claim_id = cr.id
        ) AS images,

        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'step_type', s.step_type,
                'step_order', s.step_order,
                'note', s.note,
                'created_at', s.created_at
              )
              ORDER BY s.created_at ASC
            ), '[]'::json
          )
          FROM claim_request_steps s
          WHERE s.claim_request_id = cr.id
        ) AS steps

      FROM claim_requests cr
      LEFT JOIN accident_details ad ON ad.id = cr.accident_detail_id
      LEFT JOIN insurance_policies ip ON ip.id = cr.selected_car_id
      WHERE ($1::int IS NULL OR cr.user_id = $1)
      ORDER BY COALESCE(cr.updated_at, cr.created_at::date) DESC, cr.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    const parsed = rows.map(r => {
      console.log("🟢 list raw =>", r.incomplete_history);
      return {
        ...r,
        incomplete_history: Array.isArray(r.incomplete_history)
          ? r.incomplete_history
          : [],
        resubmitted_history: Array.isArray(r.resubmitted_history)
          ? r.resubmitted_history
          : [],
      };
    });

    return res.json({ ok: true, data: parsed });
  } catch (err) {
    console.error("claimreport list error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

// PATCH /api/claim-requests/:id/resubmit
router.patch("/:id/resubmit", async (req: Request, res: Response) => {
  const claimId = Number(req.params.id);
  const { note, accident } = req.body as {
    note?: string;
    accident?: {
      accidentType: string;
      date: string;
      time: string;
      province?: string | null;
      district?: string | null;
      road?: string | null;
      areaType: string;
      nearby?: string | null;
      details?: string | null;
      location?: { lat?: number; lng?: number; accuracy?: number | null };
      evidenceMedia?: { url: string; type?: string }[];
      damagePhotos?: {
        url: string;
        note?: string;
        side?: string;
      }[];
    };
  };

  if (!claimId) {
    return res.status(400).json({ ok: false, message: "claim_id is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 🟢 1) ดึง user_id และ resubmitted_history เดิม
    const { rows } = await client.query(
      `SELECT user_id, resubmitted_history, accident_detail_id
       FROM claim_requests WHERE id = $1`,
      [claimId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "ไม่พบข้อมูลการเคลม" });
    }

    const userId = rows[0].user_id;
    const accidentDetailId = rows[0].accident_detail_id;
    const prevHistory = Array.isArray(rows[0].resubmitted_history)
      ? rows[0].resubmitted_history
      : [];

    // 🟢 2) ถ้ามี accident ใหม่จากผู้ใช้ → อัปเดต accident_details
    if (accident) {
      const accTime = /^\d{2}:\d{2}(:\d{2})?$/.test(accident.time)
        ? (accident.time.length === 5 ? `${accident.time}:00` : accident.time)
        : "00:00:00";

      // ✅ เตรียม array สำหรับ file_url และ media_type
      const fileUrls = (accident.evidenceMedia ?? [])
        .map((m) => (typeof m === "string" ? m : m.url))
        .flat()
        .filter(Boolean);

      const mediaTypes = (accident.evidenceMedia ?? [])
        .map((m) => (typeof m === "object" && m.type ? m.type : "image"))
        .flat();


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
          file_url = $13::jsonb,     -- ✅ json array
          media_type = $14::jsonb,   -- ✅ json array
          updated_at = NOW()
        WHERE id = $15
        `,
        [
          accident.accidentType,
          accident.date,
          accTime,
          accident.province ?? null,
          accident.district ?? null,
          accident.road ?? null,
          accident.areaType,
          accident.nearby ?? null,
          accident.details ?? null,
          accident.location?.lat ?? null,
          accident.location?.lng ?? null,
          accident.location?.accuracy ?? null,
          JSON.stringify(fileUrls),   // ✅ เก็บเป็น JSON array
          JSON.stringify(mediaTypes), // ✅ เก็บเป็น JSON array
          accidentDetailId,
        ]
      );

      // 🟢 ลบรูปเก่าของเคลมนี้ก่อน insert ใหม่
      await client.query(`DELETE FROM evaluation_images WHERE claim_id = $1`, [claimId]);

      const damagePhotos = Array.isArray(accident.damagePhotos)
        ? accident.damagePhotos
        : [];

      for (const p of damagePhotos) {
        if (!p?.url) continue;
        await client.query(
          `
          INSERT INTO evaluation_images (claim_id, original_url, damage_note, side, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          `,
          [claimId, p.url, p.note ?? null, p.side ?? "ไม่ระบุ"]
        );
      }
    }


    // 🟢 3) เพิ่มประวัติ resubmitted_history และตั้งสถานะกลับเป็น pending
    const newRecord = {
      time: dayjs().tz("Asia/Bangkok").format(),
      note: note || "ผู้ใช้ส่งเอกสารที่แก้ไขแล้วกลับมาใหม่",
    };

    await client.query(
      `
      UPDATE claim_requests
      SET
        status = 'pending',
        resubmitted_history = $1::jsonb,
        updated_at = NOW()
      WHERE id = $2
      `,
      [JSON.stringify([...prevHistory, newRecord]), claimId]
    );

    // 🟢 4) แจ้งเตือนผู้ใช้และแอดมิน
    await client.query(
      `
  INSERT INTO notifications (user_id, title, message, type, link_to)
  VALUES 
    ($1, 'ส่งเอกสารแก้ไขเรียบร้อย ',
     'คุณได้ส่งคำขอเคลมหมายเลข #' || $2 || ' กลับมาให้เจ้าหน้าที่ตรวจสอบอีกครั้ง',
     'claim', '/reports/' || $2)
  `,
      [userId, claimId]
    );

    await client.query("COMMIT");

    return res.json({
      ok: true,
      message: "อัปเดตเอกสารและบันทึกการส่งกลับสำเร็จ",
      claim_id: claimId,
      accident_detail_id: accidentDetailId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ resubmit error:", err);
    return res
      .status(500)
      .json({ ok: false, message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  } finally {
    client.release();
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const claimId = Number(req.params.id);

  if (!claimId) {
    return res.status(400).json({ ok: false, message: "claim_id is required" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT id, status, admin_note
      FROM claim_requests
      WHERE id = $1
      `,
      [claimId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "claim not found" });
    }

    const claim = rows[0];
    let parsedNote: Record<string, any> | null = null;

    try {
      parsedNote =
        typeof claim.admin_note === "string"
          ? JSON.parse(claim.admin_note)
          : claim.admin_note;
    } catch {
      parsedNote = { text: claim.admin_note || "" };
    }

    return res.json({
      ok: true,
      id: claim.id,
      status: claim.status,
      admin_note: parsedNote,
    });
  } catch (err) {
    console.error("❌ error fetching claim note:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

export default router;
