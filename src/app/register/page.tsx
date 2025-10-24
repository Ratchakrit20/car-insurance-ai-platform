"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type RegisterForm = {
  full_name: string;
  email: string;
  password: string;
  citizen_id: string;
  phone_number: string;
  address: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_URL_PREFIX || "https://cdd-backend-deyv.onrender.com";

const ERROR_MAP: Record<string, string> = {
  "Email already exists": "อีเมลนี้ถูกใช้งานแล้ว",
  "Invalid email": "รูปแบบอีเมลไม่ถูกต้อง",
  "Invalid citizen id": "เลขบัตรประชาชนไม่ถูกต้อง",
  "Invalid phone number": "รูปแบบเบอร์โทรไม่ถูกต้อง",
};

function emailInvalid(el: HTMLInputElement) {
  const v = el.validity;
  if (v.valueMissing) return "กรุณากรอกอีเมล";
  if (v.typeMismatch || v.patternMismatch) return "รูปแบบอีเมลไม่ถูกต้อง (เช่น name@example.com)";
  return "กรุณากรอกอีเมลให้ถูกต้อง";
}
function passwordInvalid(el: HTMLInputElement) {
  if (el.validity.valueMissing) return "กรุณากรอกรหัสผ่าน";
  return "กรุณากรอกรหัสผ่านให้ถูกต้อง";
}
function citizenInvalid(el: HTMLInputElement) {
  const { valueMissing, patternMismatch } = el.validity;
  if (valueMissing) return "กรุณากรอกเลขบัตรประชาชน";
  if (patternMismatch) return "กรุณากรอกเลขบัตรประชาชน 13 หลัก (ตัวเลขเท่านั้น)";
  return "กรุณากรอกเลขบัตรประชาชนให้ถูกต้อง";
}
function phoneInvalid(el: HTMLInputElement) {
  const { valueMissing, patternMismatch } = el.validity;
  if (valueMissing) return "กรุณากรอกเบอร์โทรศัพท์";
  if (patternMismatch) return "กรุณากรอกเบอร์โทร 10 หลักขึ้นต้นด้วย 0";
  return "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง";
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    full_name: "",
    email: "",
    password: "",
    citizen_id: "",
    phone_number: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // sanitize ข้อมูลก่อนส่ง
    const payload: RegisterForm = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password, // ไม่บังคับความยาวฝั่ง client
      citizen_id: form.citizen_id.replace(/\D/g, ""), // เอา non-digits ออก
      phone_number: form.phone_number.replace(/\D/g, ""),
      address: form.address.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || data?.ok === false) {
        const raw = (data?.error as string) || (data?.message as string) || "Registration failed";
        setError(ERROR_MAP[raw] || "สมัครสมาชิกไม่สำเร็จ");
        // โฟกัสช่องแรกที่ไม่ผ่าน ถ้ามี
        const firstInvalid = (e.target as HTMLFormElement).querySelector(
          ":invalid"
        ) as HTMLInputElement | null;
        firstInvalid?.focus();
        return;
      }

      router.push("/login");
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-md text-black">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-indigo-700">
          สร้างบัญชีผู้ใช้
        </h2>

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <input
            name="full_name"
            type="text"
            placeholder="ชื่อ-นามสกุล"
            value={form.full_name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            required
          />

          <input
            name="email"
            type="email"
            inputMode="email"
            placeholder="อีเมล"
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            required
            pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
            title="กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com"
            onInvalid={(e) => {
              const el = e.currentTarget;
              el.setCustomValidity(emailInvalid(el));
            }}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />

          <input
            name="password"
            type="password"
            placeholder="รหัสผ่าน"
            value={form.password}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            required
            onInvalid={(e) => {
              const el = e.currentTarget;
              el.setCustomValidity(passwordInvalid(el));
            }}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />

          <input
            name="citizen_id"
            type="text"
            placeholder="เลขบัตรประชาชน (13 หลัก)"
            value={form.citizen_id}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            required
            pattern="^\d{13}$"
            onInvalid={(e) => {
              const el = e.currentTarget;
              el.setCustomValidity(citizenInvalid(el));
            }}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />

          <input
            name="phone_number"
            type="text"
            placeholder="เบอร์โทรศัพท์ (ขึ้นต้น 0 จำนวน 10 หลัก)"
            value={form.phone_number}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            required
            pattern="^0\d{9}$"
            onInvalid={(e) => {
              const el = e.currentTarget;
              el.setCustomValidity(phoneInvalid(el));
            }}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />

          <textarea
            name="address"
            placeholder="ที่อยู่"
            value={form.address}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            required
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-500 text-center" aria-live="assertive">
            {error}
          </p>
        )}

        <p className="text-sm text-center mt-4">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}