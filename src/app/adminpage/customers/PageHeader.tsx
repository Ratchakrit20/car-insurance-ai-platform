"use client";
import { Search, FilePlus2, Users } from "lucide-react";

type Props = {
  titleMode: "customers" | "policies";
    viewMode: "customers" | "policies";
  setViewMode: (m: "customers" | "policies") => void;
  q: string;
  setQ: (v: string) => void;
  onAddPolicy?: () => void; // แสดงเฉพาะโหมด policies
};
import { Noto_Sans_Thai } from "next/font/google";
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function PageHeader({
  titleMode, viewMode, setViewMode, q, setQ, onAddPolicy,
}: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl sm:text-2xl font-semibold text-black flex items-center gap-2">
        <Users size={20} /> {titleMode === "customers" ? "บัญชีลูกค้า" : "กรมธรรม์ประกันภัย"}
      </h1>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        {/* Toggle */}
        <div className="flex rounded-2xl bg-zinc-100 p-1">
          <button
            onClick={() => setViewMode("customers")}
            className={
              "px-4 py-2 rounded-2xl text-sm transition " +
              (viewMode === "customers" ? "bg-white shadow text-indigo-600" : "text-zinc-700")
            }
          >
            บัญชีลูกค้า
          </button>
          <button
            onClick={() => setViewMode("policies")}
            className={
              "px-4 py-2 rounded-2xl text-sm transition " +
              (viewMode === "policies" ? "bg-white shadow text-indigo-600" : "text-zinc-700")
            }
          >
            กรมธรรม์ประกันภัย
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              viewMode === "customers"
                ? "ค้นหาชื่อ/เลขบัตร/อีเมล/เบอร์โทร"
                : "ค้นหาเลขกรมธรรม์/ลูกค้า/ทะเบียนรถ"
            }
            className="w-full rounded-2xl border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
        </div>

        {/* Add policy */}
        {viewMode === "policies" && onAddPolicy && (
          <button
            onClick={onAddPolicy}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700"
          >
            <FilePlus2 size={16} /> เพิ่มกรมธรรม์
          </button>
        )}
      </div>
    </div>
  );
}
