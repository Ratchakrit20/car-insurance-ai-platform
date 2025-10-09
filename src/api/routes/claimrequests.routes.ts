import express, { Request, Response } from 'express';
import pool from '../models/db';

const router = express.Router();

/**
 * POST /api/claim-requests
 * สร้างคำขอเคลมเริ่มต้น (pending)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, selected_car_id } = req.body as {
      user_id?: number;
      selected_car_id?: number | null;
    };

    if (!user_id) {
      return res.status(400).json({ ok: false, message: 'user_id is required' });
    }

    const result = await pool.query(
      `INSERT INTO claim_requests
          (user_id, status, approved_by, approved_at, admin_note, selected_car_id)
       VALUES ($1, 'pending', NULL, NULL, NULL, $2)
       RETURNING id, user_id, status, selected_car_id, created_at`,
      [user_id, selected_car_id ?? null]
    );

    return res.status(201).json({ ok: true, claim: result.rows[0] });
  } catch (err) {
    console.error('Create claim error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/**
 * PATCH /api/claim-requests/:id/correction
 * ลูกค้าอัปโหลดเอกสารแก้ไข → อัปเดตสถานะเดิม + เพิ่ม timeline step
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
 * GET /api/claimreport/listall
 * ดึงรายการรายงานเคลมทั้งหมด (ทุก user)
 */
router.get('/listall', async (req: Request, res: Response) => {
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;

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
        cr.updated_at,

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

        -- evaluation images
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

        -- timeline steps
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
      `,
      [limit]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('claimreport list error:', err);
    return res.status(500).json({ ok: false, message: 'server error' });
  }
});

/**
 * GET /api/claimreport/list?user_id=xxx
 * ดึงรายการรายงานเคลมของผู้ใช้
 */
router.get('/list', async (req: Request, res: Response) => {
  const userId = req.query.user_id ? Number(req.query.user_id) : null;
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 100;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        cr.id AS claim_id,
        cr.user_id,
        cr.status,
        cr.selected_car_id as car_id,
        cr.accident_detail_id,
        cr.created_at,
        cr.updated_at,

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

        -- evaluation images
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

        -- timeline steps
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
      WHERE ($1::int IS NULL OR cr.user_id = $1)
      ORDER BY COALESCE(cr.updated_at, cr.created_at::date) DESC, cr.created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('claimreport list error:', err);
    return res.status(500).json({ ok: false, message: 'server error' });
  }
});

/**
 * GET /api/claimreport/detail
 * รายละเอียด 1 รายการ
 */
router.get('/detail', async (req: Request, res: Response) => {
  const claimId = req.query.claim_id ? Number(req.query.claim_id) : null;
  const userId = req.query.user_id ? Number(req.query.user_id) : null;

  if (!claimId) {
    return res.status(400).json({ ok: false, message: 'claim_id is required' });
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

        ad.accident_type ,
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
        ip.insurance_type, ip.policy_number, ip.coverage_end_date,
        ip.car_path, ip.insured_name,

        -- images + annotations
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
        ) AS damage_images,

        -- timeline steps
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
      WHERE cr.id = $1 AND ($2::int IS NULL OR cr.user_id = $2)
      LIMIT 1
      `,
      [claimId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'claim not found' });
    }

    return res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('claimreport detail error:', err);
    return res.status(500).json({ ok: false, message: 'server error' });
  }
});

/**
 * PATCH /api/claim-requests/:id
 * สำหรับ admin อัปเดต status/note
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, admin_note, approved_by, approved_at } = req.body as {
      status?: 'pending' | 'approved' | 'rejected' | 'incomplete';
      admin_note?: string | null;
      approved_by?: number | null;
      approved_at?: string | null;
    };

    const result = await pool.query(
      `UPDATE claim_requests SET
         status = COALESCE($1, status),
         admin_note = COALESCE($2, admin_note),
         approved_by = COALESCE($3, approved_by),
         approved_at = COALESCE($4, approved_at::timestamp),
         updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status ?? null, admin_note ?? null, approved_by ?? null, approved_at ?? null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'not found' });
    }
    return res.json({ ok: true, claim: result.rows[0] });
  } catch (err) {
    console.error('Patch claim error:', err);
    return res.status(500).json({ ok: false, message: 'internal error' });
  }
});

/**
 * PUT /api/claim-requests/:id/accident
 * ผูก claim กับ accident_details.id
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




export default router;
