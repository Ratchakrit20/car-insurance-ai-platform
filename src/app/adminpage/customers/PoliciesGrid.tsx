"use client";
import type { InsurancePolicy } from "@/types/claim";
import PolicyCard from "./PolicyCard";

export default function PoliciesGrid({
  items,
  onEdit,
  onRefresh,
}: {
  items: InsurancePolicy[];
  onEdit: (p: InsurancePolicy) => void;
  onRefresh?: () => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((p) => (
          <PolicyCard key={p.id} p={p} onEdit={onEdit} />
        ))}
      </div>

      {items.length === 0 && <div className="mt-4 text-center text-sm text-zinc-600">ไม่พบกรมธรรม์</div>}

      {onRefresh && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onRefresh}
            className="rounded-2xl px-4 py-2 text-sm text-black ring-1 ring-indigo-200 hover:bg-indigo-50"
          >
            รีเฟรชรายการกรมธรรม์
          </button>
        </div>
      )}
    </>
  );
}
