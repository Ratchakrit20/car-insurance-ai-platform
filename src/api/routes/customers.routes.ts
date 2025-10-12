import express, { Request, Response } from "express";
import pool from "../models/db";
import bcrypt from "bcryptjs";

const router = express.Router();

/**
 * GET /api/customers?role=customer
 * - ดึงผู้ใช้ทั้งหมด โดยกรอง role ได้ผ่าน query (default = 'customer')
 */
router.get("/", async (req, res) => {
  try {
    const role = (req.query.role as string) || "customer";
    const withCount = String(req.query.withPolicyCount || "") === "1";

    const sql = withCount
      ? `
        SELECT
          u.id, u.full_name AS name, u.citizen_id, u.email, u.phone_number, u.address,
          u.role, u.created_at,
          COALESCE(p.cnt, 0) AS policy_count
        FROM users u
        LEFT JOIN (
          SELECT citizen_id, COUNT(*)::int AS cnt
          FROM insurance_policies
          GROUP BY citizen_id
        ) p ON p.citizen_id = u.citizen_id
        WHERE u.role = $1
        ORDER BY u.created_at DESC, u.id DESC
      `
      : `
        SELECT id, full_name AS name, citizen_id, email, phone_number, address, role, created_at
        FROM users
        WHERE role = $1
        ORDER BY created_at DESC, id DESC
      `;

    const result = await pool.query(sql, [role]);
    return res.json(result.rows);
  } catch (e) {
    console.error("GET /api/customers error:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 🔹 ดึงข้อมูลผู้ใช้จาก users
    const userResult = await pool.query(
      `
      SELECT 
        u.id, u.full_name AS name, u.citizen_id, u.email, u.phone_number, u.address, 
        u.role, u.created_at,
        p.policy_number, p.insurance_company, p.insurance_type,
        p.coverage_start_date, p.coverage_end_date
      FROM users u
      LEFT JOIN insurance_policies p ON p.citizen_id = u.citizen_id
      WHERE u.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const user = userResult.rows[0];

    // 🔹 ดึงรถทั้งหมดในกรมธรรม์
    const carsResult = await pool.query(
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
      [user.citizen_id]
    );

    // 🔹 เตรียม base URL สำหรับรูป
    const baseURL =
      process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, "") ||
      process.env.BASE_URL ||
      "http://localhost:3001";

    const cars = carsResult.rows.map((r) => ({
      id: r.car_id,
      title: `${r.car_brand ?? ""} ${r.car_model ?? ""}`.trim(),
      plate: r.registration_province
        ? `${r.car_license_plate} ${r.registration_province}`
        : r.car_license_plate,
      year: r.car_year,
      color: r.car_color ?? "-",
      thumb: r.car_path
        ? r.car_path.startsWith("http")
          ? r.car_path
          : `${baseURL}/${r.car_path.replace(/^\/+/, "")}`
        : "/car-placeholder.png",
      policyNo: r.policy_number,
      company: r.insurance_company,
      insuranceType: r.insurance_type,
      startDate: r.coverage_start_date,
      endDate: r.coverage_end_date,
    }));

    // 🔹 รวมข้อมูล
    return res.json({
      id: user.id,
      name: user.name,
      citizen_id: user.citizen_id,
      email: user.email,
      phone_number: user.phone_number,
      address: user.address,
      policy_number: user.policy_number,
      insurance_company: user.insurance_company,
      insurance_type: user.insurance_type,
      coverage_start_date: user.coverage_start_date,
      coverage_end_date: user.coverage_end_date,
      cars,
    });
  } catch (err: any) {
    console.error("GET /api/customers/:id error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// ===================================================================
// SECTION 3️⃣: อัปเดตข้อมูล + แจ้งเตือน
// ===================================================================
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { phone_number, address, currentPassword, newPassword } = req.body;

    // ✅ 1. อัปเดตเบอร์โทรศัพท์
    if (phone_number && !address && !currentPassword && !newPassword) {
      await pool.query(
        `UPDATE users SET phone_number = $1 WHERE id = $2`,
        [phone_number, id]
      );

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link_to)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          "อัปเดตเบอร์โทรศัพท์สำเร็จ 📞",
          "คุณได้ทำการเปลี่ยนเบอร์โทรศัพท์เรียบร้อยแล้ว",
          "profile",
          "/users",
        ]
      );

      return res.json({ message: "อัปเดตเบอร์โทรศัพท์เรียบร้อย" });
    }

    // ✅ 2. อัปเดตที่อยู่
    if (address && !phone_number && !currentPassword && !newPassword) {
      await pool.query(`UPDATE users SET address = $1 WHERE id = $2`, [
        address,
        id,
      ]);

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link_to)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          "อัปเดตที่อยู่เรียบร้อย 🏠",
          "คุณได้ทำการเปลี่ยนที่อยู่เรียบร้อยแล้ว",
          "profile",
          "/users",
        ]
      );

      return res.json({ message: "อัปเดตที่อยู่เรียบร้อย" });
    }

    // ✅ 3. อัปเดตรหัสผ่าน
    if (currentPassword && newPassword) {
      const { rows } = await pool.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [id]
      );
      if (rows.length === 0)
        return res.status(404).json({ message: "User not found" });

      const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!match)
        return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });

      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
        hashed,
        id,
      ]);

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link_to)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          "เปลี่ยนรหัสผ่านสำเร็จ 🔐",
          "คุณได้ทำการเปลี่ยนรหัสผ่านเรียบร้อยแล้ว",
          "account",
          "/users",
        ]
      );

      return res.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อย" });
    }

    // ⚠ ไม่มีข้อมูลใดให้แก้ไข
    if (!phone_number && !address && !currentPassword && !newPassword) {
      return res.status(400).json({ message: "กรุณาระบุข้อมูลที่ต้องการอัปเดต" });
    }

    // ✅ 4. ถ้ามีหลายอย่างพร้อมกัน
    if (phone_number && address) {
      await pool.query(
        `UPDATE users SET phone_number = $1, address = $2 WHERE id = $3`,
        [phone_number, address, id]
      );

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link_to)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          "อัปเดตข้อมูลติดต่อเรียบร้อย ✅",
          "คุณได้ทำการอัปเดตข้อมูลติดต่อ (เบอร์โทร/ที่อยู่) แล้ว",
          "profile",
          "/users",
        ]
      );

      return res.json({ message: "อัปเดตข้อมูลติดต่อเรียบร้อย" });
    }

    res.json({ message: "อัปเดตข้อมูลเรียบร้อย" });
  } catch (err: any) {
    console.error("PATCH /api/customers/:id error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;

