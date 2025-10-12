// src/app/users/page.tsx
"use client";
import CarList from "../components/CarList"; // ✅ import
import React, { useEffect, useState } from "react";
import { Prompt, Noto_Sans_Thai, Inter } from 'next/font/google';
const headingFont = Prompt({ subsets: ['thai', 'latin'], weight: ['600', '700'], display: 'swap' });
const bodyFont = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], display: 'swap' });
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
type User = {
  id: string;
  fullName: string;
  citizenId: string;
  email: string;
  phone: string;
  address: string;
  policyNo?: string;
  insuranceCompany?: string;
  insuranceType?: string;
  insuranceStart?: string;
  insuranceEnd?: string;
  avatarUrl?: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [data, setData] = useState<any>(null);
  // cars (ตัวอย่าง mock data — ถ้าไม่มีจริงสามารถลบออก)

  const [cars, setCars] = useState<
    {
      id: string;
      title: string;
      plate: string;
      year?: string;
      color?: string;
      thumb?: string;
      policyNo?: string;
      company?: string;
      insuranceType?: string;
      startDate?: string;
      endDate?: string;
    }[]
  >([]);
  // โหลด user จาก backend จริง

  useEffect(() => {
    async function loadUser() {
      try {
        const meRes = await fetch(`http://localhost:3001/api/me`, {
          credentials: "include",
        });
        const meData = await meRes.json();
        if (meData?.isAuthenticated) {
          const userId = meData.user.id;
          const res = await fetch(`http://localhost:3001/api/customers/${userId}`, {
            credentials: "include",
          });
          const json = await res.json();
          if (json) {
            setUser({
              id: json.id,
              fullName: json.name,
              citizenId: json.citizen_id,
              email: json.email,
              phone: json.phone_number,
              address: json.address,
              policyNo: json.policy_number,
              insuranceCompany: json.insurance_company,
              insuranceType: json.insurance_type,
              insuranceStart: json.coverage_start_date,
              insuranceEnd: json.coverage_end_date,
            });
            setCars(json.cars || []);
          }
        }
      } catch (err) {
        console.error("❌ Error loading user:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);



  async function saveContact() {
    if (!user) {
      alert("ยังไม่ได้โหลดข้อมูลผู้ใช้");
      return;
    }
    setSavingInfo(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/customers/${user.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ phone_number: phone, address }),
        }
      );

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed");
      setUser((u) => (u ? { ...u, phone, address } : u));
      alert("อัปเดตข้อมูลเรียบร้อย");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSavingInfo(false);
    }
  }

  function validatePasswordForm() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg("กรุณากรอกข้อมูลให้ครบ");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg("รหัสผ่านใหม่และยืนยันรหัสไม่ตรงกัน");
      return false;
    }

    // ❌ ไม่ตรวจความยาวหรือรูปแบบแล้ว
    setPasswordMsg("");
    return true;
  }

  async function changePassword() {
    if (!validatePasswordForm() || !user) return;
    setSavingPw(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/customers/${user.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed");
      alert("เปลี่ยนรหัสผ่านเรียบร้อย");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSavingPw(false);
    }
  }
  function formatDate(dateStr?: string | null) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-"; // ✅ ป้องกัน Invalid Date
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-zinc-500">กำลังโหลดข้อมูล...</div>
    );
  }

  return (
    <div className={`${thaiFont.className} relative w-full overflow-x-hidden`}>
      <div className="fixed inset-0 -z-10 bg-white"></div>
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6 py-4 lg:py-8">

        <div className="w-full flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">

            {/* left card */}
            <div className=" rounded-lg  bg-[#F5F6FA] shadow p-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-zinc-300 flex items-center justify-center text-2xl text-white">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="avatar"
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    user?.fullName?.[0] ?? "U"
                  )}
                </div>
                <div>
                  <div className="text-lg text-black font-medium">{user?.fullName}</div>

                </div>
              </div>

              <hr className="my-5" />

              <div className="space-y-4 text-sm text-zinc-600">
                <div>
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-violet-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM2 20a10 10 0 0 1 20 0H2z" />
                    </svg>
                    <div className="font-medium text-zinc-800">ข้อมูลส่วนตัว</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 items-center">
                    <div className="text-zinc-500">เลขบัตรประชาชน</div>
                    <div className="col-span-2 text-right text-zinc-800">
                      {user?.citizenId}
                    </div>

                    <div className="text-zinc-500">อีเมล</div>
                    <div className="col-span-2 text-right text-zinc-800">
                      {user?.email}
                    </div>

                    <div className="text-zinc-500">เบอร์โทรศัพท์</div>
                    <div className="col-span-2 text-right text-zinc-800">
                      {user?.phone}
                    </div>

                    <div className="text-zinc-500">ที่อยู่</div>
                    <div className="col-span-2 text-right text-zinc-800">
                      {user?.address}
                    </div>
                  </div>
                </div>

                <div>


                  {/* 🔹 แสดงรายการรถ + กรมธรรม์ ใต้ข้อมูลส่วนตัว */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <svg
                        className="w-5 h-5 text-violet-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <div className="font-medium text-zinc-800">รายการรถที่ลงทะเบียนในกรมธรรม์</div>
                    </div>

                    <div className="space-y-3">
                      {cars.length === 0 ? (
                        <div className="text-sm text-zinc-500">ไม่พบข้อมูลรถยนต์ในระบบ</div>
                      ) : (
                        cars.map((car) => (
                          <details
                            key={car.id}
                            className="group border border-zinc-200 rounded-lg bg-zinc-50 shadow-sm overflow-hidden"
                          >
                            <summary className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-zinc-100 transition">
                              <span className="font-medium text-zinc-800">{car.title} {car.year}</span>
                              <svg
                                className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </summary>

                            <div className="px-4 py-3 bg-white border-t border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* รูปรถ */}
                              <div className="flex justify-center items-center bg-white rounded-md overflow-hidden">
                                <img
                                  src={car.thumb}
                                  alt={car.title}
                                  className="w-full h-44 object-cover"
                                />
                              </div>

                              {/* รายละเอียดกรมธรรม์ */}
                              <div className="text-sm text-zinc-700 space-y-1">
                                <div className="font-medium text-zinc-800 text-base mb-1">{car.title}</div>
                                <div>ปี {car.year ?? "-"} | สี {car.color ?? "-"}</div>
                                <div>ทะเบียน {car.plate ?? "-"}</div>
                                <div>เลขกรมธรรม์ {car.policyNo ?? "-"}</div>
                                <div>บริษัท {car.company ?? "-"}</div>
                                <div>ประเภทประกัน {car.insuranceType ?? "-"}</div>
                                <div>วันเริ่มกรมธรรม์ {formatDate(car.startDate) ?? "-"}</div>
                                <div>วันสิ้นสุดกรมธรรม์ {formatDate(car.endDate) ?? "-"}</div>
                              </div>
                            </div>
                          </details>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* right card */}
            <div className=" bg-[#F5F6FA] rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-black mb-4">เปลี่ยนแปลงรหัสผ่าน</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <label className="text-sm  text-black">รหัสผ่านปัจจุบัน</label>
                <input
                  className="md:col-span-2 text-black border border-zinc-300 bg-white rounded px-3 py-2"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type="password"
                />

                <label className="text-sm text-black">รหัสผ่านใหม่</label>
                <input
                  className="md:col-span-2 text-black bg-white border border-zinc-300  rounded px-3 py-2"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                />

                <label className="text-sm text-black">ยืนยันรหัสผ่านใหม่</label>
                <input
                  className="md:col-span-2 text-black bg-white border border-zinc-300 rounded px-3 py-2"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                />
              </div>

              {passwordMsg && (
                <div className="mb-3 text-sm text-red-600">{passwordMsg}</div>
              )}

              <div className="flex gap-3 mb-6">
                <button
                  onClick={changePassword}
                  disabled={savingPw}
                  className="bg-[#6F47E4] text-white px-4 py-2 rounded-[8px] shadow hover:bg-[#6F47E4]/90"
                >
                  {savingPw ? "กำลังบันทึก..." : "อัปเดตรหัสผ่าน"}
                </button>
                <button
                  onClick={() => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordMsg("");
                  }}
                  className="bg-white text-black  px-4 py-2 rounded-[8px] hover:bg-black/10"
                >
                  ล้างค่า
                </button>
              </div>

              <hr />

              <h3 className="text-lg text-black font-semibold my-4">แก้ไขข้อมูลติดต่อ</h3>

              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm  text-black">เบอร์โทรศัพท์</label>
                <input
                  className="border border border-zinc-300 rounded bg-white px-3 text-zinc-600 py-2"
                  value={phone}
                  placeholder={user?.phone ? `${user.phone}` : "กรอกที่อยู่ของคุณ"}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"

                />

                <label className="text-sm text-black">ที่อยู่</label>
                <textarea
                  className="border border-zinc-300 bg-white rounded text-zinc-600 px-3 py-2"
                  rows={3}
                  placeholder={user?.address ? `${user.address}` : "กรอกที่อยู่ของคุณ"}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={saveContact}
                  disabled={savingInfo}
                  className="bg-[#6F47E4] text-white px-4 py-2 rounded-[8px] shadow hover:bg-[#6F47E4]/90"
                >
                  {savingInfo ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
                <button
                  onClick={() => {
                    setPhone(user?.phone ?? "");
                    setAddress(user?.address ?? "");
                  }}
                  className="bg-white text-black px-4 py-2 rounded-[8px] hover:bg-black/10"
                >
                  ยกเลิก
                </button>
              </div>



            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

