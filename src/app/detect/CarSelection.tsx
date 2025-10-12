'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import SafeAreaSpacer from '../components/SafeAreaSpacer';

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
  coverage_end_date: string;
};

const STORAGE_KEY = 'claimSelectedCar';

export default function CarSelection({ onNext, citizenId }: CarSelectionProps) {
  const [cars, setCars] = useState<CarItem[]>([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const API_PREFIX = useMemo(
    () => process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, '') || '',
    []
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
useEffect(() => {
    // ✅ ล้างข้อมูลทุกครั้งที่เข้าหน้าเริ่มสร้างเคลม
    localStorage.removeItem("accidentDraft");
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
        setCars(data || []);

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

  const selectedCar =
    selectedCarIndex !== null && selectedCarIndex >= 0 ? cars[selectedCarIndex] : undefined;

  const handleNext = () => {
    if (!selectedCar) {
      alert('กรุณาเลือกรถก่อน');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCar));
    onNext();
  };

  if (loading) {
    return <div className="text-center py-12">กำลังโหลด...</div>;
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
     
      {/* แถวแนวนอน scroll ได้ */}
      <div className="overflow-x-auto ">
        <div className="flex justify-center">
          <div
            className="px-3 py-3 sm:px-0 chip-scroller flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#6D5BD0 #E5E7EB",
              scrollPadding: "1rem", // ✅ บังคับให้เลื่อนแล้วเห็นเต็ม
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
                    "w-[260px] flex-shrink-0 rounded-2xl p-4 transition-all duration-300 m-2",
                    "flex flex-col items-center text-center",
                    active
                      ? "bg-gradient-to-b from-[#6D5BD0] to-[#433D8B] text-white shadow-lg shadow-[#433D8B]/40 scale-105"
                      : "bg-[#CAC9D2] text-zinc-800 hover:shadow-md hover:scale-105"
                  ].join(" ")}
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
                  {/* <span
                    className={[
                      'mt-2 inline-block rounded-[7px] px-3 py-1 text-sm',
                      active ? 'bg-[#6D5BD0] text-white' : 'bg-[#CAC9D2] text-black',
                    ].join(' ')}
                  >
                    {car.car_license_plate}
                  </span> */}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* รายละเอียดรถที่เลือก */}
      {selectedCar && (

        <div className="rounded-[7px] bg-[#DEDCFF]/30 shadow-lg p-5 mb-6 max-w-lg mx-auto mt-8">


          <h3 className="text-base text-black font-semibold mb-3 text-center">รายละเอียดรถที่เลือก</h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-3 text-sm ">
            <Info label="ยี่ห้อ" value={selectedCar.car_brand} />
            <Info label="รุ่น" value={selectedCar.car_model} />
            <Info label="ปีที่ผลิต" value={selectedCar.car_year} />
            <Info label="ทะเบียน" value={selectedCar.car_license_plate + " " + selectedCar.registration_province} />
            <Info label="เลขกรมธรรม์" value={selectedCar.policy_number} />
            <Info label="บริษัทประกัน" value={selectedCar.insurance_company} />
            <Info label="ประเภทประกัน" value={selectedCar.insurance_type} />
            <Info
              label="หมดอายุ"
              value={new Date(selectedCar.coverage_end_date).toLocaleDateString('th-TH')}
            />
          </div>
        </div>
      )}
      {/* ปุ่มดำเนินการต่อ */}
      <div className="px-2 flex justify-end">
        <button
          onClick={handleNext}
          disabled={selectedCarIndex === null}
          className="w-full sm:w-auto rounded-[7px] bg-[#6F47E4] hover:bg-[#6F47E4]/90 text-white px-6 py-2 font-medium shadow-sm disabled:opacity-50"
        >
          ดำเนินการต่อ
        </button>
      </div>


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
