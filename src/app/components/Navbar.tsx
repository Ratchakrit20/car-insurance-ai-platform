"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Car,
  FileText,
  Mail,
  UserCheck,
  ClipboardCheck,
  LogOut,
} from "lucide-react";
import { Prompt, Noto_Sans_Thai } from "next/font/google";

const headingFont = Prompt({
  subsets: ["thai", "latin"],
  weight: ["600", "700"],
  display: "swap",
});
const bodyFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500"],
  display: "swap",
});

type Role = "admin" | "customer" | null;

type MeResponse = {
  isAuthenticated: boolean;
  user?: { id: string; role: Role; full_name?: string; email?: string };
};

type NavItem = {
  icon: React.ReactNode;
  href: string;
  label: string;
  showNotification?: boolean;
};

const navItemsCustomer: NavItem[] = [
  { icon: <Home size={20} />, href: "/", label: "หน้าหลัก" },
  { icon: <Car size={20} />, href: "/detect", label: "เริ่มสร้างเคลม" },
  { icon: <FileText size={20} />, href: "/reports", label: "การเคลมของฉัน" },
  {
    icon: <Mail size={20} />,
    href: "/message",
    label: "กล่องข้อความ",
    showNotification: true,
  },
  { icon: <UserCheck size={20} />, href: "/users", label: "ข้อมูลของฉัน" },
];

const navItemsAdmin: NavItem[] = [
  { icon: <ClipboardCheck size={20} />, href: "/adminpage/reportsall", label: "รายการเคลมทั้งหมด" },
  { icon: <ClipboardCheck size={20} />, href: "/adminpage/reportsrequest", label: "รายการเคลมที่รอการอนุมัติ" },
  { icon: <UserCheck size={20} />, href: "/adminpage/customers", label: "กรมธรรม์" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/adminpage/reportsall") return pathname === "/adminpage/reportsall";
  return pathname === href || pathname.startsWith(href + "/");
}

const BRAND = {
  base: "#ffffff",
  primary: "#6D5BD0",
  railBg: "rgba(255, 255, 255, 1)",
};

export default function Navbar({ role: roleProp }: { role?: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [notifCount, setNotifCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // 🟣 โหลดข้อมูลผู้ใช้ + แจ้งเตือน
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setMe({ isAuthenticated: false });
          setLoading(false);
          return;
        }

        // ✅ ดึงข้อมูลผู้ใช้
        const res = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: MeResponse = await res.json();

        if (!data?.isAuthenticated) {
          localStorage.removeItem("token");
          setMe({ isAuthenticated: false });
          router.replace("/login");
          return;
        }

        setMe(data);

        // ✅ โหลดแจ้งเตือนเฉพาะผู้ใช้ปัจจุบัน
        if (data.user?.id) {
          const notifRes = await fetch(
            `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/notifications/${data.user.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const notifData = await notifRes.json();
          const unreadCount = Array.isArray(notifData)
            ? notifData.filter((n: any) => !n.is_read).length
            : 0;
          setNotifCount(unreadCount);
        }
      } catch (err) {
        console.error("โหลดข้อมูลผู้ใช้ล้มเหลว:", err);
        setMe({ isAuthenticated: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 🟣 ตรวจจับ token เปลี่ยน (เช่น login / logout)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");

      // ถ้าไม่มี token (เช่น logout)
      if (!token) {
        setMe({ isAuthenticated: false });
        setNotifCount(0);
        return;
      }

      // ถ้ามี token (เช่น login)
      (async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data: MeResponse = await res.json();
          setMe(data);
        } catch (err) {
          console.error("รีโหลดข้อมูลผู้ใช้ล้มเหลว:", err);
        }
      })();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);


  // 🕒 refresh badge ทุก 10 วินาที
  useEffect(() => {
    if (!me?.user?.id) return;
    const token = localStorage.getItem("token");
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_URL_PREFIX}/api/notifications/${me.user!.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        const unread = Array.isArray(data)
          ? data.filter((n: any) => !n.is_read).length
          : 0;
        setNotifCount(unread);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [me?.user?.id]);

  const resolvedRole: Role =
    roleProp ?? (me?.user?.role ?? (me?.isAuthenticated ? "customer" : "customer"));

  const isAdmin = resolvedRole === "admin";
  const items = isAdmin ? navItemsAdmin : navItemsCustomer;

  // 🚪 Logout
  const handleLogout = async () => {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("storage")); // ✅ แจ้งว่า token หาย
    router.replace("/login");
    router.refresh();
  };

  if (loading) return null;

  return (
    <>
      {/* 🖥️ Desktop Sidebar */}
      <div className="group fixed top-0 left-0 hidden h-screen z-50 md:block">
        <aside
          className="h-full overflow-hidden transition-all duration-300 w-20 group-hover:w-64 flex flex-col"
          style={{
            background: BRAND.railBg,
            backdropFilter: "blur(6px)",
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 m-2 p-4">
            <Image src="/logocar.png" alt="Logo" width={32} height={32} />
            <span className="font-bold text-sm text-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Ai Car Damage Detection
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2 px-2 py-2 m-2">
            {items.map((item) => {
              const active = isActivePath(pathname, item.href);
              const isMessage = item.showNotification;

              return (
                <Link key={item.href} href={item.href} className="relative block">
                  <div
                    className={[
                      "relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-300",
                      active
                        ? "bg-[#6D5BD0] text-white shadow-md"
                        : "text-black hover:bg-black/10",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3 relative">
                      <div className="relative flex items-center justify-center w-6 h-6 text-[#17153B]">
                        {item.icon}
                        {isMessage && notifCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-[5px] py-[1px] rounded-full shadow-sm">
                            {notifCount > 99 ? "99+" : notifCount}
                          </span>
                        )}
                      </div>

                      <span
                        className={`${bodyFont.className}
                          whitespace-nowrap transition-all duration-300
                          group-hover:opacity-100 opacity-0
                          group-hover:ml-0 ml-[-100px]`}
                        style={{ color: active ? "#fff" : "#17153B" }}
                      >
                        {item.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Logout */}
            <button
  onClick={handleLogout}
  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-black hover:bg-black/10 transition-all duration-300 mt-4"
>
  <LogOut size={20} />
  <span
    className={`${bodyFont.className}
      whitespace-nowrap transition-all duration-300
      group-hover:opacity-100 opacity-0
      group-hover:ml-0 ml-[-100px]`}
  >
    ออกจากระบบ
  </span>
</button>
          </nav>
        </aside>
      </div>

      {/* 📱 Mobile Navbar */}
      <nav
        className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-sm md:hidden rounded-full px-4 py-2 flex justify-around items-center z-50 shadow-xl"
        style={{ backgroundColor: BRAND.base, color: "#17153B" }}
      >
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const isMessage = item.showNotification;
          return (
            <Link key={item.href} href={item.href} className="relative flex items-center justify-center">
              <div
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative p-2 rounded-full transition-all duration-200 hover:scale-110",
                  active ? "shadow-[0_0_0_3px_rgba(0,0,0,0.1)]" : "",
                ].join(" ")}
                style={{
                  backgroundColor: active ? BRAND.primary : "transparent",
                }}
              >
                {item.icon}
                {isMessage && notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-[4px] py-[1px] rounded-full">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Logout mobile */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-full hover:scale-110 transition-all duration-200"
        >
          <LogOut size={20} />
        </button>
      </nav>
    </>
  );
}
