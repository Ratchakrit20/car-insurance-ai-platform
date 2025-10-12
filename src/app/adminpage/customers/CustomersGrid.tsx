"use client";
import { ArrowRight } from "lucide-react";
import type { User } from "@/types/claim";
import { useRouter } from "next/navigation";

const thDate = (iso?: string | null) =>
  !iso ? "-" : new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function CustomersGrid({ items }: { items: (User & { policy_count?: number })[] }) {
  const router = useRouter();
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((u) => (
          <div key={u.id} className="rounded-2xl ring-1 ring-emerald-200/60 bg-white shadow-sm p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-base text-black sm:text-lg">{u.name}</h3>
                <div className="text-xs text-black">Customer</div>
              </div>
              <div className="hidden sm:flex text-xs text-black items-center gap-1">
                <span>Created</span>
                <span className="font-medium">{thDate(u.created_at)}</span>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-black">
              <div className="rounded-xl bg-zinc-50 p-3">
                <div className="text-[11px] font-medium  uppercase tracking-wide">Citizen ID</div>
                <div className="mt-1 font-medium break-all">{u.citizen_id}</div>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3">
                <div className="text-[11px] font-medium  uppercase tracking-wide">Email</div>
                <div className="mt-1 font-medium break-all">{u.email ?? "-"}</div>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3">
                <div className="text-[11px] font-medium  uppercase tracking-wide">Phone</div>
                <div className="mt-1 font-medium">{u.phone_number ?? "-"}</div>
              </div>
            </dl>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => router.push(`/adminpage/customers/detail-insurance?userId=${u.id}`)}
                className="h-10 rounded-2xl px-4 bg-emerald-600 text-white hover:bg-emerald-700 text-sm inline-flex items-center gap-2"
              >
                กรมธรรม์
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/90 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-emerald-200 min-w-[1.75rem]">
                  {u.policy_count ?? 0}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && <div className="mt-4 text-center text-sm text-black">ไม่พบลูกค้า</div>}
    </>
  );
}
