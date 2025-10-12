"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  link_to?: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/notifications/${userId}`)
      .then((res) => res.json())
      .then(setNotifications)
      .catch(console.error);
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative">
        <Bell className="w-6 h-6 text-violet-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg border">
          <div className="p-3 font-semibold border-b">การแจ้งเตือน</div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-4 text-center text-zinc-500 text-sm">
                ไม่มีการแจ้งเตือน
              </div>
            )}

            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 border-b cursor-pointer hover:bg-zinc-50 ${
                  n.is_read ? "opacity-70" : ""
                }`}
                onClick={() => {
                  if (n.link_to) {
                    let link = n.link_to.startsWith("/")
                      ? n.link_to
                      : `/${n.link_to}`;

                    if (link.startsWith("/reports/")) {
                      const id = link.split("/reports/")[1];
                      link = `/reports?claim_id=${id}`;
                    }

                    window.location.href = link;
                  }
                }}
              >
                <div className="font-medium text-zinc-800">{n.title}</div>
                <div className="text-sm text-zinc-500">{n.message}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  {new Date(n.created_at).toLocaleString("th-TH")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
