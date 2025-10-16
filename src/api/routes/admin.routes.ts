import { Router, Request, Response } from "express";
import pool from "../models/db"; // <-- path นี้ถูกแล้ว (routes -> models)


const router = Router();

/**
 * GET /api/admin/detail?claim_id=...
 * ดึงข้อมูล claim detail สำหรับ admin
 */
router.get("/detail", async (req: Request, res: Response) => {
  const claimId = req.query.claim_id ? Number(req.query.claim_id) : null;

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
        ip.insurance_type, ip.policy_number, ip.coverage_end_date,
        ip.car_path, ip.insurance_company, ip.insured_name,
        ip.registration_province, ip.chassis_number,

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
      WHERE cr.id = $1
      LIMIT 1
      `,
      [claimId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: "claim not found" });
    }

    const r = rows[0];

    // ✅ แปลง flat → nested ให้เหมือน /detail
    return res.json({
      ok: true,
      data: {
        claim_id: r.claim_id,
        user_id: r.user_id,
        status: r.status,
        selected_car_id: r.selected_car_id,
        accident_detail_id: r.accident_detail_id,
        created_at: r.created_at,

        car: {
          insured_name: r.insured_name,
          insurance_company: r.insurance_company,
          policy_number: r.policy_number,
          car_brand: r.car_brand,
          car_model: r.car_model,
          car_year: r.car_year,
          car_license_plate: r.license_plate,
          insurance_type: r.insurance_type,
          coverage_end_date: r.coverage_end_date,
          car_path: r.car_path,
          registration_province: r.registration_province,
          chassis_number: r.chassis_number,
        },

        accident: {
          accidentType: r.accident_type,
          accident_date: r.accident_date,
          accident_time: r.accident_time,
          areaType: r.area_type,
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
          damagePhotos: r.damage_images,
        },

        steps: r.steps,
      },
    });
  } catch (err) {
    console.error("admin claim detail error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

export default router;

