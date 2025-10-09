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

/**
 * GET /api/customers/:id
 * - ดึงข้อมูลลูกค้ารายบุคคลตาม id + กรมธรรม์
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `
      SELECT 
        u.id, u.full_name AS name, u.citizen_id, u.email, u.phone_number, u.address, u.role, u.created_at,
        p.policy_number, p.insurance_company, p.insurance_type,
        p.coverage_start_date, p.coverage_end_date
      FROM users u
      LEFT JOIN insurance_policies p ON p.citizen_id = u.citizen_id
      WHERE u.id = $1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.json(rows[0]);
  } catch (err: any) {
    console.error("GET /api/customers/:id error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// 🧩 PATCH /api/customers/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { phone_number, address, currentPassword, newPassword } = req.body;

    // ------------------------
    // ✅ 1. อัปเดตเบอร์โทรศัพท์
    // ------------------------
    if (phone_number && !address && !currentPassword && !newPassword) {
      await pool.query(
        `UPDATE users SET phone_number = $1 WHERE id = $2`,
        [phone_number, id]
      );

      // 🔔 เพิ่มแจ้งเตือน
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

    // ------------------------
    // ✅ 2. อัปเดตที่อยู่
    // ------------------------
    if (address && !phone_number && !currentPassword && !newPassword) {
      await pool.query(
        `UPDATE users SET address = $1 WHERE id = $2`,
        [address, id]
      );

      // 🔔 เพิ่มแจ้งเตือน
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

    // ------------------------
    // ✅ 3. อัปเดตรหัสผ่าน
    // ------------------------
    if (currentPassword && newPassword) {
      // 1️⃣ ดึงรหัสผ่านเดิมจาก DB มาก่อน
      const { rows } = await pool.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [id]
      );
      if (rows.length === 0)
        return res.status(404).json({ message: "User not found" });

      // 2️⃣ ตรวจว่ารหัสผ่านเดิมตรงกันไหม
      const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!match)
        return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });

      // 3️⃣ สร้าง hash ใหม่ และอัปเดต
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
        hashed,
        id,
      ]);

      // 🔔 เพิ่มแจ้งเตือน
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

    // ------------------------
    // ⚠ ไม่มีข้อมูลใดให้แก้ไข
    // ------------------------
    if (!phone_number && !address && !currentPassword && !newPassword) {
      return res
        .status(400)
        .json({ message: "กรุณาระบุข้อมูลที่ต้องการอัปเดต" });
    }

    // ถ้ามีหลายอย่างพร้อมกัน (เช่น ทั้ง phone + address)
    if (phone_number && address) {
      await pool.query(
        `UPDATE users SET phone_number = $1, address = $2 WHERE id = $3`,
        [phone_number, address, id]
      );

      // 🔔 แจ้งเตือนรวม
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

