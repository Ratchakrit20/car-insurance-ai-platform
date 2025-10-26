"use client";
import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "./PageHeader";
import CustomersGrid from "./CustomersGrid";
import PoliciesGrid from "./PoliciesGrid";
import PolicyModal from "./detail-insurance/PolicyModal";
import SafeAreaSpacer from "@/app/components/SafeAreaSpacer";
import type { User, InsurancePolicy } from "@/types/claim";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Noto_Sans_Thai } from "next/font/google";
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

type ApiAuth = { user: User | null; isAuthenticated: boolean };

const API_BASE = process.env.NEXT_PUBLIC_URL_PREFIX || "";
const LIST_ENDPOINT = `${API_BASE}/api/customers?role=customer`;
const POLICIES_ENDPOINT = `${API_BASE}/api/policy`; // คุณใช้ /api/policy

export default function CustomersPage() {
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"customers" | "policies">("customers");
  const [q, setQ] = useState("");

  const [customers, setCustomers] = useState<(User & { policy_count?: number })[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);

  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);

  // auth
  const fetchAuth = async (): Promise<ApiAuth> => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("auth failed");
    return res.json();
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAuth();
        setIsAuthenticated(Boolean(data.isAuthenticated));
      } catch {
        setIsAuthenticated(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  // customers
    useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        const res = await fetch(`${LIST_ENDPOINT}&withPolicyCount=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        const rows: (User & { policy_count?: number })[] = await res.json();
        setCustomers(rows.filter((r) => (r.role ?? "customer") === "customer"));
      } catch (e: any) {
        setError(e?.message || "โหลดข้อมูลลูกค้าไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // policies
    const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const res = await fetch(POLICIES_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const rows: InsurancePolicy[] = await res.json();
      setPolicies(rows);
    } catch (e: any) {
      setError(e?.message || "โหลดข้อมูลกรมธรรม์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "policies" && policies.length === 0) fetchPolicies();
  }, [viewMode]);

  const filteredCustomers = useMemo(() => {
    if (!q.trim()) return customers;
    const s = q.toLowerCase();
    return customers.filter((u) =>
      [u.name, u.citizen_id, u.email, u.phone_number]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(s))
    );
  }, [q, customers]);

  const filteredPolicies = useMemo(() => {
    if (!q.trim()) return policies;
    const s = q.toLowerCase();
    return policies.filter((p) =>
      [
        p.policy_number,
        p.insurance_company,
        p.insured_name,
        p.citizen_id,
        p.car_license_plate,
        p.chassis_number,
        p.car_brand,
        p.car_model,
        p.car_color,
        p.registration_province,
      ]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(s))
    );
  }, [q, policies]);

  // modal handlers
  const openAddPolicy = () => {
    setEditingPolicy(null);
    setPolicyModalOpen(true);
  };
  const openEditPolicy = (p: InsurancePolicy) => {
    setEditingPolicy(p);
    setPolicyModalOpen(true);
  };
  const submitPolicy = async (payload: InsurancePolicy) => {
    const token = localStorage.getItem("token");
const base = `${API_BASE}/api/policy`;

const res = editingPolicy?.id
  ? await fetch(`${base}/${editingPolicy.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
  : await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = (await res.json().catch(() => ({})))?.message || `Save failed (${res.status})`;
      throw new Error(msg);
    }
    await fetchPolicies();
  };

  return (
            <div className={`${thaiFont.className} min-h-screen p-3 sm:p-6 bg-gradient-to-b from-[#F1F5FF] via-[#F7FAFF] to-white`}>

  
      <PageHeader
        titleMode={viewMode}
        viewMode={viewMode}
        setViewMode={setViewMode}
        q={q}
        setQ={setQ}
        onAddPolicy={openAddPolicy}
      />

      {loading ? (
        <div className="p-8 flex items-center justify-center text-zinc-600 gap-2">
          <Loader2 className="animate-spin" /> Loading...
        </div>
      ) : error ? (
        <div className="rounded-2xl ring-1 ring-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : viewMode === "customers" ? (
        <CustomersGrid items={filteredCustomers} />
      ) : (
        <>
          <PoliciesGrid items={filteredPolicies} onEdit={openEditPolicy} onRefresh={fetchPolicies} />
          <PolicyModal
            open={policyModalOpen}
            initial={editingPolicy}
            citizenId={editingPolicy?.citizen_id || ""}
            onClose={() => setPolicyModalOpen(false)}
            onSubmit={submitPolicy}
          />
        </>
      )}
      <SafeAreaSpacer />
    </div>
  );
}
