import { Pool } from "pg";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// ✅ ให้ PostgreSQL แปลง JSON / JSONB เป็น Object โดยอัตโนมัติ
const { types } = pg;
types.setTypeParser(114, (val) => JSON.parse(val));   // 114 = json
types.setTypeParser(3802, (val) => JSON.parse(val));  // 3802 = jsonb

// ✅ เพิ่ม parser สำหรับ timestamp (แก้เวลาช้า 7 ชม.)
types.setTypeParser(1114, (str) => new Date(str + " +07:00"));
// 1114 = TIMESTAMP WITHOUT TIME ZONE

// ✅ ใช้ DATABASE_URL จาก Neon (แทน host/user/password)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },  // จำเป็นสำหรับ Neon Cloud
});

// ✅ ตั้งค่า schema และ timezone ทุกครั้งที่เชื่อมต่อ
pool.on("connect", async (client) => {
  await client.query("SET search_path TO public;");
  await client.query("SET TIME ZONE 'Asia/Bangkok';");
});

export default pool;
