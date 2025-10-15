"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Prompt, Noto_Sans_Thai } from 'next/font/google';
const headingFont = Prompt({ subsets: ['thai', 'latin'], weight: ['600', '700'], display: 'swap' });
const bodyFont = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], display: 'swap' });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json", // ✅ เพิ่มบรรทัดนี้
  },
  body: JSON.stringify({ email, password }),
  credentials: "include",
});
console.log("API base:", process.env.NEXT_PUBLIC_URL_PREFIX);

    const data = await res.json();
    console.log("Login response:", data);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    setError("");

    // ✅ ตรวจ role แล้ว redirect พร้อม refresh
    if (data.role === "admin") {
      router.push("/adminpage/reportsall");
    } else {
      router.push("/");
    }

    router.refresh(); // ✅ refresh state ให้แน่ใจว่าหน้าแรกโหลดใหม่
  } catch (err) {
    console.error(err);
    setError("Something went wrong");
  }
};


  return (
    <div className={`${bodyFont.className} min-h-screen flex items-center justify-center bg-gray-100`}>
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#F9FAFB] via-[#F1F5FF] to-[#EEF2FF]" />

      {/* กล่องใหญ่ */}
      <div className="flex w-full max-w-5xl bg-white rounded-lg shadow-lg overflow-hidden m-6">

        {/* ฝั่งซ้าย (ม่วง) */}
        <div className="w-1/2 bg-[#433D8B] flex flex-col items-center justify-center text-white p-8 ">
          <h1 className="text-2xl font-bold mb-4">AI Car Damage Detection</h1>
          <img src="elements/purple-car.png" alt="Car" className="w-3/4 " />
          <h2 className="font-semibold"> ระบบยื่นเคลมประกันรถออนไลน์</h2>
          <p className="text-center text-sm leading-relaxed">
           
           <br />
            
            อัปโหลดรูปเพื่อให้ AI วิเคราะห์ความเสียหาย กรอกข้อมูล ส่งเคลม<br />
            ติดตามผล และดาวน์โหลดเอกสาร
          </p>
        </div>

        {/* ฝั่งขวา (ฟอร์ม) */}
        <div className="w-1/2 flex items-center justify-center p-8 text-black ">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-6 text-[#6D5BD0]">Welcome back</h2>
            <form onSubmit={handleLogin} className="space-y-4 ">
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-[#6D5BD0]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-[#6D5BD0]"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#6D5BD0] hover:bg-[#6D5BD0]/90 text-white py-2 rounded-lg font-semibold"
              >
                Login
              </button>
            </form>
           {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}
        <p className="text-sm text-center mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
            Register
          </Link>
        </p>
          </div>
        </div>

      </div>
    </div>


  );
}
