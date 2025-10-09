import express from "express";
import pool from "../models/db";

const router = express.Router();

// 🔹 ดึงข้อความแจ้งเตือนของผู้ใช้
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  res.json(rows);
});

// 🔹 สร้างแจ้งเตือนใหม่
router.post("/", async (req, res) => {
  const { user_id, title, message, type, link_to } = req.body;
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, link_to) VALUES ($1,$2,$3,$4,$5)`,
    [user_id, title, message, type, link_to]
  );
  res.json({ success: true });
});

// 🔹 อัปเดตสถานะอ่านข้อความ
router.patch("/:id/read", async (req, res) => {
  await pool.query(`UPDATE notifications SET is_read = TRUE WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

export default router;
