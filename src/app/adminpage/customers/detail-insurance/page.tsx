"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Pencil,
  FilePlus2,
  X,
  Loader2,
  Calendar,
  Car as CarIcon,
  Hash,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import PolicyModal from "./PolicyModal";
import PolicyCard, { InfoRow, thDate } from "./PolicyCard";

import type { User, InsurancePolicy } from "@/types/claim";
import { Noto_Sans_Thai } from "next/font/google";
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// ---------------- Types (local) ----------------
type ApiAuth = { user: User | null; isAuthenticated: boolean };
export type MediaItem = { url: string; type: "image" | "video"; publicId: string };

// ---------------- Config ----------------
const URL_PREFIX = process.env.NEXT_PUBLIC_URL_PREFIX || (typeof window !== "undefined" ? "" : "");


// ---------------- User summary ----------------
function UserSummary({ user }: { user: User }) {
  return (
        <div className={`${thaiFont.className} rounded-2xl ring-1 ring-emerald-200/60 bg-white shadow-sm p-4 sm:p-5`}>

  
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl text-black font-semibold">{user.name}</h2>
          <div className="text-xs text-black">Customer</div>
        </div>
        <div className="hidden sm:flex items-center text-xs text-black gap-1">
          <span>Created</span>
          <span className="font-medium">{thDate(user.created_at)}</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-black gap-3">
        <InfoRow icon={<Hash size={14} />} labelText="Citizen ID" value={user.citizen_id} />
        <InfoRow icon={<CarIcon size={14} />} labelText="Phone" value={user.phone_number || "-"} />
        <InfoRow icon={<CarIcon size={14} />} labelText="Email" value={user.email || "-"} />
        <InfoRow icon={<CarIcon size={14} />} labelText="Address" value={user.address || "-"} />
      </div>
    </div>
  );
}







// =====================================================================
// Page
// =====================================================================
export default function CustomerPoliciesPage() {
  // auth
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userAuth, setUserAuth] = useState<User | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId");

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState<InsurancePolicy | null>(null);

  async function fetchAuth(): Promise<ApiAuth> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${URL_PREFIX}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("auth failed");
  return res.json();
}


  // โหลดสิทธิ์
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAuth();
        if (cancelled) return;
        setUserAuth(data.user ?? null);
        setIsAuthenticated(Boolean(data.isAuthenticated));
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!userId) return;
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const resU = await fetch(`${URL_PREFIX}/api/customers/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resU.ok) throw new Error("โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
        const u: User = await resU.json();
        setUser(u);

        const resP = await fetch(`${URL_PREFIX}/api/policy/${encodeURIComponent(u.citizen_id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }); if (resP.status === 404) {
          setPolicies([]);
        } else if (!resP.ok) {
          throw new Error("โหลดกรมธรรม์ไม่สำเร็จ");
        } else {
          const rows: InsurancePolicy[] = await resP.json();
          setPolicies(rows);
          console.log("policies:", rows);
        }
      } catch (e: any) {
        setError(e?.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userId]);

  const handleAdd = async (payload: InsurancePolicy) => {
    const token = localStorage.getItem("token");
const res = await fetch(`${URL_PREFIX}/api/policy`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(payload),
});
    if (!res.ok) throw new Error("เพิ่มกรมธรรม์ล้มเหลว");
    const created = await res.json();
    setPolicies((cur) => [created, ...cur]);
  };

 const handleEdit = async (payload: InsurancePolicy) => {
  if (!payload.id) return;
  const token = localStorage.getItem("token");
  const res = await fetch(`${URL_PREFIX}/api/policy/${payload.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("อัปเดตกกรมธรรม์ล้มเหลว");
  const updated = await res.json();
  setPolicies((cur) => cur.map((p) => (p.id === updated.id ? updated : p)));
};

   
  const count = policies.length;

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="mx-auto w-full max-w-6xl p-3 sm:p-6">
        {/* Header bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/adminpage/customers")}
              className="h-10 rounded-2xl text-black px-3 ring-1 ring-zinc-300 hover:bg-zinc-50 inline-flex items-center gap-2 text-sm"
            >
              <ArrowLeft size={16} /> กลับ
            </button>
            <h1 className="text-xl sm:text-2xl text-black font-semibold flex items-center gap-2">
              <ShieldCheck size={20} /> กรมธรรม์ของลูกค้า
              {user && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-emerald-200 min-w-[1.75rem]">
                  {count}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button onClick={() => setOpenAdd(true)} className="h-10 rounded-2xl px-4 bg-emerald-600 text-white hover:bg-emerald-700 text-sm inline-flex items-center gap-2">
                <FilePlus2 size={16} /> เพิ่มกรมธรรม์
              </button>
            )}
          </div>
        </div>

        {/* User summary */}
        {user && <UserSummary user={user} />}

        {/* Policies list */}
        <div className="mt-6">
          {loading ? (
            <div className="p-8 flex items-center justify-center text-zinc-600 gap-2">
              <Loader2 className="animate-spin" /> Loading...
            </div>
          ) : error ? (
            <div className="rounded-2xl ring-1 ring-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : policies.length === 0 ? (
            <div className="rounded-2xl ring-1 ring-zinc-200 bg-white p-6 text-sm text-zinc-600 text-center">ยังไม่มีข้อมูลกรมธรรม์สำหรับลูกค้าคนนี้</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((p) => (
                <PolicyCard key={p.id} p={p} onEdit={(x) => setEditItem(x)} />
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        {user && (
          <>
            <PolicyModal open={openAdd} citizenId={user.citizen_id} onClose={() => setOpenAdd(false)} onSubmit={handleAdd} />
            <PolicyModal open={!!editItem} initial={editItem ?? undefined} citizenId={user.citizen_id} onClose={() => setEditItem(null)} onSubmit={handleEdit} />
          </>
        )}
      </div>
    </div>
  );
}
