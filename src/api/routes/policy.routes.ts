// src/api/routes/policy.routes.ts
import express, { Request, Response } from "express";
import pool from "../models/db";

const router = express.Router();


// GET /api/policy (ดึงทั้งหมด)
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id, policy_number, insurance_company, insured_name, citizen_id, address,
        coverage_start_date, coverage_end_date, coverage_end_time,
        car_brand, car_license_plate, chassis_number, car_year,
        insurance_type, created_at, car_path, car_model,
        car_color, registration_province
      FROM insurance_policies
      ORDER BY created_at DESC
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /api/policy error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});
/**
 * GET /api/policy/:citizen_id
 * - ดึงรายการกรมธรรม์ทั้งหมดของ citizen_id
 */
router.get("/:citizen_id", async (req: Request, res: Response) => {
  try {
    const { citizen_id } = req.params;
    const result = await pool.query(
      `
      SELECT
        id, policy_number, insurance_company, insured_name, citizen_id, address,
        coverage_start_date, coverage_end_date, coverage_end_time,
        car_brand, car_license_plate, chassis_number, car_year,
        insurance_type, created_at, car_path, car_model, car_color, registration_province
      FROM insurance_policies
      WHERE citizen_id = $1
      ORDER BY created_at DESC, id DESC
      `,
      [citizen_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลกรมธรรม์" });
    }
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /api/insurance/:citizen_id error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});
/**
 * GET /api/policy/:car_id
 * - ดึงรายการกรมธรรม์ทั้งหมดของ car_id
 */
router.get("/by-id/:car_id", async (req: Request, res: Response) => {
  try {
    const { car_id } = req.params;
    console.log("👉 param car_id =", car_id);
    if (isNaN(Number(car_id))) {
      return res.status(400).json({ message: "car_id ไม่ถูกต้อง" });
    }

    const result = await pool.query(
      `
      SELECT
        id, policy_number, insurance_company, insured_name, citizen_id, address,
        coverage_start_date, coverage_end_date, coverage_end_time,
        car_brand, car_license_plate, chassis_number, car_year,
        insurance_type, created_at, car_path, car_model, car_color, registration_province
      FROM insurance_policies
      WHERE id = $1
      ORDER BY created_at DESC, id DESC
      `,
      [(Number(car_id))]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลกรมธรรม์" });
    }
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /api/policy/:car_id error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});



/**
 * POST /api/insurance
 * - เพิ่มกรมธรรม์ใหม่
 * body: JSON ตามคอลัมน์ในตาราง (ดู validate เบื้องต้นด้านล่าง)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      policy_number,
      insurance_company,
      insured_name,
      citizen_id,
      address,
      coverage_start_date,
      coverage_end_date,
      coverage_end_time,
      car_brand,
      car_license_plate,
      chassis_number,
      car_year,
      insurance_type,
      car_path,
      car_model,
      car_color,                       // NEW
      registration_province
    } = req.body ?? {};
    // validate เบื้องต้น (เพิ่มตามต้องการ)
    if (
      !policy_number ||
      !insurance_company ||
      !insured_name ||
      !citizen_id
    ) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ (policy_number, insurance_company, insured_name, citizen_id)" });
    }
    const result = await pool.query(`
      INSERT INTO insurance_policies (
        policy_number, insurance_company, insured_name, citizen_id, address,
        coverage_start_date, coverage_end_date, coverage_end_time,
        car_brand, car_license_plate, chassis_number, car_year,
        insurance_type, car_path, car_model,
        car_color, registration_province
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      )
      RETURNING
        id, policy_number, insurance_company, insured_name, citizen_id, address,
        coverage_start_date, coverage_end_date, coverage_end_time,
        car_brand, car_license_plate, chassis_number, car_year,
        insurance_type, created_at, car_path, car_model,
        car_color, registration_province
    `, [
      policy_number, insurance_company, insured_name, citizen_id, address ?? null,
      coverage_start_date ?? null, coverage_end_date ?? null, coverage_end_time ?? null,
      car_brand ?? null, car_license_plate ?? null, chassis_number ?? null, car_year ?? null,
      insurance_type ?? null, car_path ?? null, car_model ?? null,
      car_color ?? null, registration_province ?? null,
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/policy error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/insurance/:id
 * - แก้ไขกรมธรรม์
 * body: ฟิลด์ที่ต้องการแก้ (null ได้)
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      policy_number,
      insurance_company,
      insured_name,
      citizen_id,
      address,
      coverage_start_date,
      coverage_end_date,
      coverage_end_time,
      car_brand,
      car_license_plate,
      chassis_number,
      car_year,
      insurance_type,
      car_path,
      car_model,
      car_color,
      registration_province
    } = req.body ?? {};

    // update แบบกำหนดทุกคอลัมน์ (ถ้าต้องการ partial update ใช้ dynamic SQL ก็ได้)
    const result = await pool.query(`
      UPDATE insurance_policies SET
        policy_number=$1, insurance_company=$2, insured_name=$3, citizen_id=$4, address=$5,
        coverage_start_date=$6, coverage_end_date=$7, coverage_end_time=$8,
        car_brand=$9, car_license_plate=$10, chassis_number=$11, car_year=$12,
        insurance_type=$13, car_path=$14, car_model=$15,
        car_color=$16, registration_province=$17
      WHERE id=$18
      RETURNING
        id, policy_number, insurance_company, insured_name, citizen_id, address,
        coverage_start_date, coverage_end_date, coverage_end_time,
        car_brand, car_license_plate, chassis_number, car_year,
        insurance_type, created_at, car_path, car_model,
        car_color, registration_province
    `, [
      policy_number, insurance_company, insured_name, citizen_id, address ?? null,
      coverage_start_date ?? null, coverage_end_date ?? null, coverage_end_time ?? null,
      car_brand ?? null, car_license_plate ?? null, chassis_number ?? null, car_year ?? null,
      insurance_type ?? null, car_path ?? null, car_model ?? null,
      car_color ?? null, registration_province ?? null,
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "ไม่พบกรมธรรม์ที่ต้องการแก้ไข" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/insurance/:id error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
