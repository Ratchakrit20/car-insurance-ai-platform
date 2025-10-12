import express, { Request, Response } from "express";
import pool from "../models/db";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

/**
 * GET /api/customer-cars/:citizen_id
 * ดึงรายการรถ + ข้อมูลกรมธรรม์ ด้วยเลขบัตรประชาชนของลูกค้า
 */
router.get("/:citizen_id", async (req: Request, res: Response) => {
  const citizenId = req.params.citizen_id;

  if (!citizenId) {
    return res.status(400).json({ ok: false, message: "citizen_id is required" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        id AS car_id,
        car_brand,
        car_model,
        car_color,
        car_license_plate,
        registration_province,
        car_year,
        policy_number,
        insurance_company,
        insurance_type,
        coverage_start_date,
        coverage_end_date,
        car_path
      FROM insurance_policies
      WHERE citizen_id = $1
      ORDER BY car_year DESC, id ASC
      `,
      [citizenId]
    );

    const baseURL =
      process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, "") ||
      process.env.BASE_URL ||
      "http://localhost:3001";

    const cars = rows.map((r) => {
      // ✅ ตรวจว่าเป็น URL เต็มหรือไม่
      let thumbUrl: string;
      if (!r.car_path) {
        thumbUrl = "/car-placeholder.png";
      } else if (r.car_path.startsWith("http")) {
        // เป็น Cloudinary หรือ external URL
        thumbUrl = r.car_path;
      } else {
        // เป็น local path เช่น uploads/cars/...
        thumbUrl = `${baseURL}/${r.car_path.replace(/^\/+/, "")}`;
      }

      return {
        id: r.car_id,
        title: `${r.car_brand ?? ""} ${r.car_model ?? ""}`.trim(),
        plate: r.registration_province
          ? `${r.car_license_plate} ${r.registration_province}`
          : r.car_license_plate,
        year: r.car_year,
        color: r.car_color ?? "-",
        thumb: thumbUrl,
        policyNo: r.policy_number,
        company: r.insurance_company,
        insuranceType: r.insurance_type,
        startDate: r.coverage_start_date,
        endDate: r.coverage_end_date,
      };
    });

    return res.json({ ok: true, data: cars });
  } catch (err: any) {
    console.error("get customer cars error:", err.message);
    return res.status(500).json({ ok: false, message: "internal error" });
  }
});

export default router;
