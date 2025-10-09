"use client";
import React, { useEffect, useState } from "react";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  link_to?: string;
  is_read: boolean;
  created_at: string;
};

export default function MessagePage() {
  const [messages, setMessages] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 🟢 ดึง user id จาก /api/me ก่อน
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
          credentials: "include",
        });
        const meData = await meRes.json();
        if (meData.isAuthenticated) {
          setUserId(meData.user.id);
        } else {
          setUserId(null);
        }
      } catch (err) {
        console.error("โหลดผู้ใช้ล้มเหลว:", err);
      }
    })();
  }, []);

  // 🟢 โหลดข้อความแจ้งเตือนโดยใช้ userId จริง
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/notifications/${userId}`,
          { credentials: "include" }
        );
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("โหลดข้อความล้มเหลว:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-zinc-500">
        กำลังโหลดข้อความ...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 text-black">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">📩 กล่องข้อความ</h2>

        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 py-10">
            ไม่มีข้อความแจ้งเตือน
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`p-4 hover:bg-zinc-50 rounded transition ${
                  msg.is_read ? "opacity-70" : ""
                }`}
                onClick={() => {
                  if (msg.link_to) window.location.href = msg.link_to;
                }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-zinc-800">{msg.title}</h3>
                  <span className="text-xs text-zinc-400">
                    {new Date(msg.created_at).toLocaleString("th-TH")}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 mt-1">{msg.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
