import { Pool } from "pg";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// ✅ เพิ่ม parser ให้ PostgreSQL แปลง json/jsonb เป็น object ทันที
const { types } = pg;
types.setTypeParser(114, (val) => JSON.parse(val));   // 114 = json
types.setTypeParser(3802, (val) => JSON.parse(val));  // 3802 = jsonb

// ✅ สร้าง pool ปกติ
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
});

export default pool;
