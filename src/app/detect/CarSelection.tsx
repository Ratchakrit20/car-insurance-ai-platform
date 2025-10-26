'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import SafeAreaSpacer from '../components/SafeAreaSpacer';
import LoadingScreen from "@/app/components/LoadingScreen";
interface CarSelectionProps {
  onNext: () => void;
  citizenId: string | undefined;
  userId?: number;
}

type CarItem = {
  id: number;
  car_path: string;
  car_brand: string;
  car_model: string;
  car_year: string | number;
  car_license_plate: string;
  registration_province: string;
  policy_number: string;
  insurance_company: string;
  insurance_type: string;
  coverage_end_date?: string;     // ✅ อนุญาตให้ optional
  coverage_start_date?: string;   // ✅ เพิ่มฟิลด์ start
};

const STORAGE_KEY = 'claimSelectedCar';
const ACC_KEY = 'accidentDraft';

export default function CarSelection({ onNext, citizenId }: CarSelectionProps) {
  const [cars, setCars] = useState<CarItem[]>([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adminNote, setAdminNote] = useState<any>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("claimAdminNote");
      if (raw) setAdminNote(JSON.parse(raw));
    } catch { }
  }, []);
  const API_PREFIX = useMemo(
    () => process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, '') || '',
    []
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // เคลียร์ข้อมูล admin note ที่ค้างจากหน้าแก้ไข
    localStorage.removeItem("claimAdminNote");
  }, []);
  useEffect(() => {
    // ✅ ล้าง draft ทุกครั้งที่เข้าหน้าเริ่มสร้างเคลม
    localStorage.removeItem(ACC_KEY);
  }, []);

  useEffect(() => {

    const fetchPolicies = async () => {
      if (!citizenId) {
        setLoading(false);
        setFetchError('ไม่พบ citizenId ของผู้ใช้');
        return;
      }

      try {
        setLoading(true);
        setFetchError(null);

        const res = await fetch(`${API_PREFIX}/api/policy/${citizenId}`, {
          credentials: 'include',
        });

        if (!res.ok) throw new Error(`โหลดข้อมูลรถไม่สำเร็จ (HTTP ${res.status})`);
        const data = (await res.json()) as CarItem[];

        // 🔹 กรองเฉพาะรถที่ยังไม่หมดอายุความคุ้มครอง
        const today = new Date();
        const validCars = (data || []).filter((car) => {
          if (!car.coverage_end_date) return true; // ถ้าไม่มีวันหมดอายุ ให้ถือว่ายังใช้ได้
          const endDate = new Date(car.coverage_end_date);
          return endDate >= today; // ถ้าเกินหรือเท่ากับวันนี้ ให้แสดง
        });

        setCars(validCars);

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const prev: CarItem = JSON.parse(saved);
          const idx = (data || []).findIndex((c) => c.id === prev.id);
          setSelectedCarIndex(idx >= 0 ? idx : data?.length ? 0 : null);
        } else {
          setSelectedCarIndex(data?.length ? 0 : null);
        }
      } catch (err: any) {
        console.error(err);
        setFetchError(err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลรถ');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, [API_PREFIX, citizenId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const selectedCar =
    selectedCarIndex !== null && selectedCarIndex >= 0 ? cars[selectedCarIndex] : undefined;

  // 🔧 helper
  const toYMD = (x?: any) => {
    if (!x) return '';
    const d = new Date(x);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  };

  // 🔧 พยายามเติม coverage_start_date ถ้า API หน้าแรกไม่ส่งมา
  const fetchCoverageIfMissing = async (carId: number) => {
    try {
      // 👉 เปลี่ยน endpoint ให้ตรงกับระบบจริง
      const res = await fetch(`${API_PREFIX}/api/policies/by-car/${carId}`, {
        credentials: 'include',
      });
      if (!res.ok) return { start: '', end: '' };
      const data = await res.json();
      const start =
        toYMD(data?.start_date || data?.startDate || data?.coverage_start_date || data?.coverageStartDate);
      const end =
        toYMD(data?.end_date || data?.endDate || data?.coverage_end_date || data?.coverageEndDate);
      return { start, end };
    } catch {
      return { start: '', end: '' };
    }
  };

  const handleNext = async () => {
    if (!selectedCar) {
      alert('กรุณาเลือกรถก่อน');
      return;
    }

    // 1) เก็บ selection ไว้หลายคีย์ เพื่อให้ step ถัดไปหาเจอแน่นอน
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCar));
    localStorage.setItem('selectedCar', JSON.stringify(selectedCar));
    localStorage.setItem('selected_car_id', String(selectedCar.id));

    // 2) เตรียมช่วงคุ้มครอง
    let coverage_start_date = toYMD(selectedCar.coverage_start_date);
    let coverage_end_date = toYMD(selectedCar.coverage_end_date);

    // ถ้าไม่มี start (หรือ end) ลองไปดึงเพิ่มจาก API
    if (!coverage_start_date || !coverage_end_date) {
      const cov = await fetchCoverageIfMissing(selectedCar.id);
      coverage_start_date = coverage_start_date || cov.start;
      coverage_end_date = coverage_end_date || cov.end;
    }

    // 3) อัปเดต accidentDraft ตั้งแต่ต้น (ให้ AccidentLocation อ่านได้ทันที)
    const draft = {
      selected_car_id: selectedCar.id,
      selected_car: {
        id: selectedCar.id,
        car_brand: selectedCar.car_brand,
        car_model: selectedCar.car_model,
        car_year: selectedCar.car_year,
        car_license_plate: selectedCar.car_license_plate,
        registration_province: selectedCar.registration_province,
        policy_number: selectedCar.policy_number,
        insurance_company: selectedCar.insurance_company,
        insurance_type: selectedCar.insurance_type,
        coverage_start_date,
        coverage_end_date,
      },
      coverage_start_date,
      coverage_end_date,
    };
    localStorage.setItem(ACC_KEY, JSON.stringify(draft));

    console.log('[SelectCar] saved:', {
      id: selectedCar.id,
      coverage_start_date,
      coverage_end_date,
    });

    onNext();
  };

  if (loading) {
    return <LoadingScreen message="กำลังโหลด..." />;
  }

  if (fetchError) {
    return (
      <div className="text-center py-12">
        <div className="text-rose-300 mb-4">{fetchError}</div>
        <button
          onClick={() => location.reload()}
          className="bg-[#635BFF] hover:bg-[#7b72ff] text-white px-4 py-2 rounded-lg"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  if (!cars.length) {
    return (
      <div className="text-center py-12">
        <div className="text-zinc-300 mb-2">ไม่มีข้อมูลรถสำหรับเลขบัตรนี้</div>
        <div className="text-zinc-400 text-sm">กรุณาตรวจสอบเลขบัตรประชาชน หรือเพิ่มรถเข้าระบบ</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 md:px-6 ">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-center text-black">
        เลือกรถที่ต้องการดำเนินการ
      </h2>

      <div className="overflow-x-auto ">
        <div className="flex justify-center">
          <div
            className="px-3 py-3 sm:px-0 chip-scroller flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#6D5BD0 #E5E7EB',
              scrollPadding: '1rem',
            }}
          >
            {cars.map((car, index) => {

              const active = index === selectedCarIndex;
              return (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => setSelectedCarIndex(index)}
                  className={[
                    'w-[260px] flex-shrink-0 rounded-2xl p-4 transition-all duration-300 m-2',
                    'flex flex-col items-center text-center',
                    active
                      ? 'bg-gradient-to-b from-[#6D5BD0] to-[#433D8B] text-white shadow-lg shadow-[#433D8B]/40 scale-105'
                      : 'bg-[#CAC9D2] text-zinc-800 hover:shadow-md hover:scale-105',
                  ].join(' ')}
                >
                  <img
                    src={car.car_path?.startsWith('http') ? car.car_path : `/${car.car_path}`}
                    alt={`${car.car_brand} ${car.car_model}`}
                    className="w-full h-48 object-cover rounded-[7px] mb-3"
                  />
                  <div className={['font-semibold', active ? 'text-white' : 'text-zinc-800'].join(' ')}>
                    {car.car_brand} {car.car_model}
                  </div>
                  <div className={['text-sm', active ? 'text-white/90' : 'text-zinc-500'].join(' ')}>
                    ปี {car.car_year}
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className={[
                'w-[260px] flex-shrink-0 rounded-2xl p-4 transition-all duration-300 m-2',
                'flex flex-col items-center justify-center text-center gap-2',
                'border-2 border-dashed border-violet-300 bg-white hover:border-violet-500 hover:shadow-md'
              ].join(' ')}
              aria-label="เพิ่มรถกรมธรรม์"
            >
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-violet-400 grid place-items-center text-2xl text-violet-600">
                +
              </div>
              <div className="font-semibold text-zinc-800">เพิ่มรถกรมธรรม์</div>

            </button>
          </div>
        </div>
      </div>

      {selectedCar && (
        <div className="rounded-[7px] bg-[#DEDCFF]/30 shadow-lg p-5 mb-6 max-w-lg mx-auto mt-8">
          <h3 className="text-base text-black font-semibold mb-3 text-center">รายละเอียดรถที่เลือก</h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-3 text-sm ">
            <Info label="ยี่ห้อ" value={selectedCar.car_brand} />
            <Info label="รุ่น" value={selectedCar.car_model} />
            <Info label="ปีที่ผลิต" value={selectedCar.car_year} />
            <Info
              label="ทะเบียน"
              value={selectedCar.car_license_plate + ' ' + selectedCar.registration_province}
            />
            <Info label="เลขกรมธรรม์" value={selectedCar.policy_number} />
            <Info label="บริษัทประกัน" value={selectedCar.insurance_company} />
            <Info label="ประเภทประกัน" value={selectedCar.insurance_type} />
            <Info
              label="หมดอายุ"
              value={
                selectedCar.coverage_end_date
                  ? new Date(selectedCar.coverage_end_date).toLocaleDateString('th-TH')
                  : '-'
              }
            />
          </div>
        </div>
      )}

      <div className="px-2 flex justify-end">
        <button
          onClick={handleNext}
          disabled={selectedCarIndex === null}
          className="w-full sm:w-auto rounded-[7px] bg-[#6F47E4] hover:bg-[#6F47E4]/90 text-white px-6 py-2 font-medium shadow-sm disabled:opacity-50"
        >
          ดำเนินการต่อ
        </button>
      </div>
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-black">เพิ่มรถกรมธรรม์</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md p-1 hover:bg-zinc-100"
                aria-label="ปิด"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm text-zinc-700 leading-6">
              กรุณาติดต่อเจ้าหน้าที่เพื่อเพิ่มรถในระบบของคุณ
              <br />
              ช่องทางติดต่อ: โทร 02-123-4567 หรืออีเมล support@example.com
            </p>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-[7px] bg-[#6F47E4] hover:bg-[#6F47E4]/90 text-white px-4 py-2 font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
      <SafeAreaSpacer />
    </div>
  );
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-zinc-600">{label}</div>
      <div className="font-medium break-all text-black">{value ?? '-'}</div>
    </div>
  );
}
