import { Request, Response } from "express";
import pool from "../models/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/** helpers */
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isCitizenId = (s: string) => /^\d{13}$/.test(s);
const isThaiPhone = (s: string) => /^0\d{9}$/.test(s);

export const register = async (req: Request, res: Response) => {
  const {
    full_name = "",
    email = "",
    password = "",
    citizen_id = "",
    phone_number = "",
    address = "",
  } = req.body || {};

  try {
    // --- validate ขั้นพื้นฐานให้ตรงกับฟอร์มฝั่งเว็บ ---
    if (!full_name?.trim()) return res.status(400).json({ ok: false, error: "กรอกชื่อ-นามสกุล" });
    if (!isEmail(email))   return res.status(400).json({ ok: false, error: "Invalid email" });
    if (!password)         return res.status(400).json({ ok: false, error: "กรุณากรอกรหัสผ่าน" });
    if (!isCitizenId(String(citizen_id))) return res.status(400).json({ ok: false, error: "Invalid citizen id" });
    if (!isThaiPhone(String(phone_number))) return res.status(400).json({ ok: false, error: "Invalid phone number" });
    if (!address?.trim())  return res.status(400).json({ ok: false, error: "กรอกที่อยู่" });

    // ป้องกันอีเมลซ้ำ
    const dup = await pool.query("SELECT 1 FROM users WHERE email = $1 LIMIT 1", [email.toLowerCase()]);
    if (dup.rowCount) {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, citizen_id, phone_number, address, role)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, full_name, email, citizen_id, phone_number, address, role`,
      [
        full_name.trim(),
        email.toLowerCase(),
        hashedPassword,
        String(citizen_id).replace(/\D/g, ""),
        String(phone_number).replace(/\D/g, ""),
        address.trim(),
        "customer",
      ]
    );

    return res.status(201).json({ ok: true, user: result.rows[0] });
  } catch (err: any) {
    // handle unique constraint เผื่อมี index/constraint ใน DB
    if (err?.code === "23505") {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ ok: false, error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

// --------------------------- LOGIN ---------------------------
export const login = async (req: Request, res: Response) => {
  const { email = "", password = "" } = req.body || {};
  try {
    const rs = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = rs.rows[0];
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: String(user.id),
        role: user.role,
        name: user.full_name,
        citizen_id: user.citizen_id,
        phone_number: user.phone_number,
        address: user.address,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    // หากฝั่งเว็บยังเก็บ token ใน localStorage อยู่ ให้คืน token ด้วย
    // (ถ้าจะย้ายไปใช้ cookie อย่างเดียว ก็ลบส่วนนี้และแก้ฝั่งเว็บให้ไม่เก็บ token)
    res.header("Access-Control-Allow-Credentials", "true");
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.setHeader("Cache-Control", "no-store");

    return res.json({ ok: true, role: user.role, token });
  } catch (err: any) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ ok: false, error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
};

// --------------------------- LOGOUT ---------------------------
export const logout = async (_req: Request, res: Response) => {
  try {
    res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
    return res.json({ ok: true, message: "Logout successful" });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: "Logout failed" });
  }
};
