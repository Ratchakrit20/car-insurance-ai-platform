"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Prompt, Noto_Sans_Thai } from "next/font/google";

const headingFont = Prompt({ subsets: ["thai", "latin"], weight: ["600", "700"], display: "swap" });
const bodyFont = Noto_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500"], display: "swap" });

const API_BASE = process.env.NEXT_PUBLIC_URL_PREFIX || "https://cdd-backend-deyv.onrender.com";

const ERROR_MAP: Record<string, string> = {
  "Invalid email or password": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  "User not found": "ไม่พบบัญชีผู้ใช้",
  "Account disabled": "บัญชีถูกระงับการใช้งาน",
  "Too many requests": "พยายามหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง",
  "Network error": "เชื่อมต่อเครือข่ายไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต",
  "Server unavailable": "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้",
};

function emailInvalidMsg(el: HTMLInputElement) {
  const v = el.validity;
  if (v.valueMissing) return "กรุณากรอกอีเมล";
  if (v.typeMismatch || v.patternMismatch) return "รูปแบบอีเมลไม่ถูกต้อง (เช่น name@example.com)";
  if (v.tooShort) return `อีเมลสั้นเกินไป (อย่างน้อย ${el.minLength} ตัวอักษร)`;
  return "กรุณากรอกอีเมลให้ถูกต้อง";
}
function passwordInvalidMsg(el: HTMLInputElement) {
  const v = el.validity;
  if (v.valueMissing) return "กรุณากรอกรหัสผ่าน";
  return "กรุณากรอกรหัสผ่านให้ถูกต้อง";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError("");

  const form = e.currentTarget;
  // ถ้าไม่ผ่าน → ให้เบราว์เซอร์โชว์ tooltip แล้วหยุด
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  setSubmitting(true);
  try {
    const emailNormalized = email.trim().toLowerCase();
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailNormalized, password }),
    });
    let data: any = null;
    try { data = await res.json(); } catch {}

    if (!res.ok || !data?.ok) {
      const raw = (data?.error as string) || (data?.message as string) || "Login failed";
      setError(ERROR_MAP[raw] || "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }

    localStorage.setItem("token", data.token);
    window.dispatchEvent(new Event("storage"));
    if (data.role === "admin") router.push("/adminpage/reportsall");
    else router.push("/");
  } catch (err) {
    console.error(err);
    setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
  } finally {
    setSubmitting(false);
  }
};


  return (
    <div className={`${bodyFont.className} min-h-screen flex items-center justify-center bg-gray-100`}>
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#F9FAFB] via-[#F1F5FF] to-[#EEF2FF]" />

      <div className="flex w-full max-w-5xl bg-white rounded-lg shadow-lg overflow-hidden m-6">
        {/* ซ้าย */}
        <div className="w-1/2 bg-[#433D8B] flex flex-col items-center justify-center text-white p-8">
          <h1 className={`${headingFont.className} text-2xl font-bold mb-4`}>ระบบตรวจจับความเสียหายรถด้วย AI</h1>
          <img src="elements/purple-car.png" alt="Car" className="w-3/4" />
          <h2 className="font-semibold mt-4">ระบบยื่นเคลมประกันรถออนไลน์</h2>
          <p className="text-center text-sm leading-relaxed mt-2">
            อัปโหลดรูปให้ AI วิเคราะห์ความเสียหาย กรอกข้อมูล ส่งเคลม<br />
            ติดตามผล และดาวน์โหลดเอกสาร
          </p>
        </div>

        {/* ขวา */}
        <div className="w-1/2 flex items-center justify-center p-8 text-black">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-6 text-[#6D5BD0]">ยินดีต้อนรับ</h2>

         <form onSubmit={handleLogin} className="space-y-4">{/* ไม่มี noValidate */} 
  <div>
    <label className="block text-sm font-semibold mb-1">อีเมล</label>
    <input
      type="email"
      inputMode="email"
      autoComplete="email"
      placeholder="กรอกอีเมล"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
      pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
      title="กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com"
      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-[#6D5BD0]"
      onInvalid={(e) => {
        const el = e.currentTarget;
        el.setCustomValidity(emailInvalidMsg(el));
        // ❌ อย่าเรียก e.preventDefault()
      }}
      onInput={(e) => e.currentTarget.setCustomValidity("")}
    />
  </div>

  <div>
    <label className="block text-sm font-semibold mb-1">รหัสผ่าน</label>
    <input
      type="password"
      autoComplete="current-password"
      placeholder="กรอกรหัสผ่าน"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      required
     
      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-[#6D5BD0]"
      onInvalid={(e) => {
        const el = e.currentTarget;
        el.setCustomValidity(passwordInvalidMsg(el));
        // ❌ อย่าเรียก e.preventDefault()
      }}
      onInput={(e) => e.currentTarget.setCustomValidity("")}
    />
  </div>

  <button
    type="submit"
    disabled={submitting}
    className="w-full bg-[#6D5BD0] hover:bg-[#6D5BD0]/90 disabled:opacity-70 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold"
  >
    {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
  </button>
</form>


            {error && (
              <p className="mt-4 text-sm text-red-500 text-center" aria-live="assertive">
                {error}
              </p>
            )}

            <p className="text-sm text-center mt-4">
              ยังไม่มีบัญชีใช่ไหม?{" "}
              <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
                สมัครสมาชิก
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
