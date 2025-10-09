// src/app/users/page.tsx
"use client";
import CarList from "../components/CarList"; // ✅ import
import React, { useEffect, useState } from "react";

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

  // cars (ตัวอย่าง mock data — ถ้าไม่มีจริงสามารถลบออก)
  const [cars, setCars] = useState<
    { id: string; title: string; plate: string; thumb?: string }[]
  >([]);

  // โหลด user จาก backend จริง
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
          credentials: "include",
        });
        const meData = await meRes.json();
        if (!meData.isAuthenticated) {
          setLoading(false);
          return;
        }

        const userId = meData.user.id;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/customers/${userId}`,
          { credentials: "include" }
        );
        const data = await res.json();

        setUser({
          id: data.id,
          fullName: data.name,
          citizenId: data.citizen_id,
          email: data.email,
          phone: data.phone_number,
          address: data.address,

          // 🔧 ใช้ชื่อที่ backend ส่งมา แล้ว map มาเป็น field ของ frontend
          policyNo: data.policy_number,
          insuranceCompany: data.insurance_company,
          insuranceType: data.insurance_type,
          insuranceStart: data.coverage_start_date,
          insuranceEnd: data.coverage_end_date,

          avatarUrl: null,
        });



        setPhone(data.phone_number);
        setAddress(data.address);
      } catch (err) {
        console.error("โหลด user ล้มเหลว:", err);
      } finally {
        setLoading(false);
      }
    })();
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
  function formatDate(dateStr?: string) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  if (loading) {
    return (
      <div className="p-6 text-center text-zinc-500">กำลังโหลดข้อมูล...</div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 text-black">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* left card */}
        <div className="bg-white rounded-lg shadow p-6">
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
              <div className="text-lg font-medium">{user?.fullName}</div>
              <div className="text-sm text-zinc-500">{user?.policyNo}</div>
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
              <div className="flex items-center gap-2 mt-4">
                <svg
                  className="w-5 h-5 text-violet-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 7a2 2 0 0 1 2-2h3V4a4 4 0 10-8 0v1h3zM6 15a2 2 0 012-2h3v-1a4 4 0 00-8 0v1h3z" />
                </svg>
                <div className="font-medium text-zinc-800">ข้อมูลประกัน</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 items-center text-sm text-zinc-600">
                <div className="text-zinc-500">เลขกรมธรรม์</div>
                <div className="col-span-2 text-right text-zinc-800">
                  {user?.policyNo ?? "-"}
                </div>

                <div className="text-zinc-500">บริษัท</div>
                <div className="col-span-2 text-right text-zinc-800">
                  {user?.insuranceCompany ?? "-"}
                </div>

                <div className="text-zinc-500">ประเภทประกัน</div>
                <div className="col-span-2 text-right text-zinc-800">
                  {user?.insuranceType ?? "-"}
                </div>

                <div className="text-zinc-500">วันเริ่มกรมธรรม์</div>
                <div className="col-span-2 text-right text-zinc-800">
                  {formatDate(user?.insuranceStart)}
                </div>

                <div className="text-zinc-500">วันสิ้นสุดกรมธรรม์</div>
                <div className="col-span-2 text-right text-zinc-800">
                  {formatDate(user?.insuranceEnd)}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* right card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">เปลี่ยนแปลงรหัสผ่าน</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <label className="text-sm text-zinc-600">รหัสผ่านปัจจุบัน</label>
            <input
              className="md:col-span-2 border rounded px-3 py-2"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
            />

            <label className="text-sm text-zinc-600">รหัสผ่านใหม่</label>
            <input
              className="md:col-span-2 border rounded px-3 py-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
            />

            <label className="text-sm text-zinc-600">ยืนยันรหัสผ่านใหม่</label>
            <input
              className="md:col-span-2 border rounded px-3 py-2"
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
              className="bg-violet-600 text-white px-4 py-2 rounded shadow"
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
              className="bg-zinc-100 px-4 py-2 rounded"
            >
              ล้างค่า
            </button>
          </div>

          <hr />

          <h3 className="text-lg font-semibold my-4">แก้ไขข้อมูลติดต่อ</h3>

          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm text-zinc-600">เบอร์โทรศัพท์</label>
            <input
              className="border rounded px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="081-234-5678"
            />

            <label className="text-sm text-zinc-600">ที่อยู่</label>
            <textarea
              className="border rounded px-3 py-2"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={saveContact}
              disabled={savingInfo}
              className="bg-violet-600 text-white px-4 py-2 rounded shadow"
            >
              {savingInfo ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
            <button
              onClick={() => {
                setPhone(user?.phone ?? "");
                setAddress(user?.address ?? "");
              }}
              className="bg-zinc-100 px-4 py-2 rounded"
            >
              ยกเลิก
            </button>
          </div>

          <hr className="my-6" />
          <h3 className="text-lg font-semibold mb-3">รายการรถยนต์</h3>
          {user?.citizenId ? (
            <CarList citizenId={user.citizenId} />
          ) : (
            <div className="text-sm text-zinc-500">ไม่พบข้อมูลลูกค้า</div>
          )}
        </div>
      </div>
    </div>
  );
}
