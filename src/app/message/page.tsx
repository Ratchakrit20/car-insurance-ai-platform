  "use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Inbox, Loader2 } from "lucide-react";
import { Prompt, Noto_Sans_Thai } from "next/font/google";
import LoadingScreen from "@/app/components/LoadingScreen";

const headingFont = Prompt({
  subsets: ["thai", "latin"],
  weight: ["600", "700"],
  display: "swap",
});
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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

  // 🟢 ดึง user id จาก /api/me
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
          credentials: "include",
        });
        const meData = await meRes.json();
        if (meData.isAuthenticated) {
          setUserId(meData.user.id);
        }
      } catch (err) {
        console.error("โหลดผู้ใช้ล้มเหลว:", err);
      }
    })();
  }, []);

  // 🟢 โหลดข้อความแจ้งเตือน
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

  // 🕓 Loading state
 if (loading) return <LoadingScreen message="กำลังโหลดข้อความ..." />;
  // 🧠 ฟังก์ชันเมื่อคลิกข้อความ
  const handleClick = async (msg: Notification) => {
    try {
      // 🟣 1) อัปเดตสถานะข้อความใน DB
      await fetch(
        `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/notifications/${msg.id}/read`,
        { method: "PATCH", credentials: "include" }
      );

      // 🟣 2) อัปเดต state ให้จางลงทันที
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m))
      );

      // 🟣 3) รอให้เห็น transition จางลงก่อนค่อย redirect
      setTimeout(() => {
        if (msg.link_to) {
          let link = msg.link_to.startsWith("/") ? msg.link_to : `/${msg.link_to}`;
          if (link.startsWith("/reports/")) {
            const id = link.split("/reports/")[1];
            link = `/reports?claim_id=${id}`;
          }
          window.location.href = link;
        }
      }, 300);
    } catch (err) {
      console.error("อ่านข้อความล้มเหลว:", err);
    }
  };

  return (
    <div className={`${thaiFont.className} relative min-h-screen bg-white`}>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:py-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-6 h-6 text-indigo-600" />
          <h2 className={`${headingFont.className} text-2xl font-bold text-zinc-800`}>
            กล่องข้อความ
          </h2>
        </div>

        {/* Empty State */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Inbox className="w-14 h-14 text-zinc-300 mb-4" />
            <p className="text-lg font-medium">ไม่มีข้อความแจ้งเตือน</p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.li
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleClick(msg)}
                  className={`rounded-xl border bg-zinc-50/60 shadow-sm p-4 cursor-pointer transition-all duration-300 
                    ${msg.is_read
                      ? "opacity-40 border-zinc-200"
                      : "border-indigo-300 hover:shadow-md hover:bg-white"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-zinc-800 text-[15px]">
                      {msg.title}
                    </h3>
                    <span className="text-xs text-zinc-400">
                      {new Date(msg.created_at).toLocaleString("th-TH")}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1">{msg.message}</p>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
