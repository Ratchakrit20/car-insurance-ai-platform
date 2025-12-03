import { Pool } from "pg";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// ✅ PostgreSQL JSON / JSONB → JS Object อัตโนมัติ
const { types } = pg;
types.setTypeParser(114, (val) => JSON.parse(val));   // json
types.setTypeParser(3802, (val) => JSON.parse(val));  // jsonb

// ✅ Timestamp → แก้ Timezone ให้เป็น Asia/Bangkok
types.setTypeParser(1114, (str) => new Date(str + " +07:00")); 

// ตรวจว่าใช้ Neon หรือ Local
const isNeon = process.env.DATABASE_URL?.includes("neon.tech");

// === NEW: เพิ่ม log ว่าใช้งานฐานข้อมูลตัวไหน ===
const dbUrl = process.env.DATABASE_URL || "";
const safeDbUrl = dbUrl.replace(/:(.*?)@/, ":****@"); // ซ่อน password

console.log("====================================");
console.log("📡 DATABASE CONNECTION CONFIG");
console.log("→ Mode:", isNeon ? "Neon Cloud 🌐" : "Local PostgreSQL 🖥️");
console.log("→ Using:", safeDbUrl);
console.log("====================================");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isNeon ? { rejectUnauthorized: false } : false,
});

// ตั้งค่า schema และ timezone ทุกครั้งที่เปิด connection
pool.on("connect", async (client) => {
  await client.query("SET search_path TO public;");
  await client.query("SET TIME ZONE 'Asia/Bangkok';");
});

export default pool;
