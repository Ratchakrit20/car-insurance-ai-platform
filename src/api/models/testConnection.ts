import { Pool } from "pg";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// ✅ เพิ่ม parser ให้ PostgreSQL แปลง json/jsonb เป็น object ทันที
const { types } = pg;
types.setTypeParser(114, (val) => JSON.parse(val));   // 114 = json
types.setTypeParser(3802, (val) => JSON.parse(val));  // 3802 = jsonb


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },  // สำคัญมากสำหรับ Neon Cloud
});

export default pool;
