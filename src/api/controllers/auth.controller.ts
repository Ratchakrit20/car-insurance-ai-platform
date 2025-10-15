import { Request, Response } from 'express';
import pool from '../models/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response) => {
  const { full_name, email, password, citizen_id, phone_number, address } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, citizen_id, phone_number, address, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, email, citizen_id, phone_number, address, role`,
      [full_name, email, hashedPassword, citizen_id, phone_number, address, 'customer']
    );
    res.status(201).json({ message: 'User registered', user: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// --------------------------- LOGIN ---------------------------

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

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
      { expiresIn: '1d' }
    );

    // ✅ จุดสำคัญ 1: เปิดให้ส่ง cookie ข้ามโดเมน
    res.header("Access-Control-Allow-Credentials", "true");

    // ✅ จุดสำคัญ 2: ตั้ง cookie แบบ cross-site (Render ⇄ localhost)
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,      // ✅ Render ใช้ HTTPS
      sameSite: "none",  // ✅ ต้องใช้ none เพื่อให้ cross-domain cookie ได้
      maxAge: 24 * 60 * 60 * 1000, // 1 วัน
    });

    // ✅ ป้องกัน cache
    res.setHeader('Cache-Control', 'no-store');

    return res.json({ message: 'Login successful', role: user.role });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// --------------------------- LOGOUT ---------------------------

export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none", // ✅ ให้เคลียร์ cookie แบบเดียวกับตอนตั้ง
    });
    return res.json({ message: "Logout successful" });
  } catch (err: any) {
    return res.status(500).json({ error: "Logout failed", details: err.message });
  }
};
