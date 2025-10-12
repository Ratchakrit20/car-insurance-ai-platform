// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ClaimItem } from "@/types/claim";
import { Prompt, Noto_Sans_Thai, Inter } from 'next/font/google';
import ScrollButton from "@/app/components/ScrollButton";
import CarList from "@/app/components/CarList";
import LatestClaims from "@/app/components/LatestClaims";
const headingFont = Prompt({ subsets: ['thai', 'latin'], weight: ['600', '700'], display: 'swap' });
const bodyFont = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], display: 'swap' });
const interFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
type CarItem = {
  id: number;
  car_path: string;
  car_brand: string;
  car_model: string;
  car_year: number | string;
  car_license_plate: string;
};
import {
  PlusCircle,
  Car,
  FileText,
  Mail,
  ChevronRight,
} from "lucide-react";

/** เรียก /api/me เพื่อรู้ user.id จาก server component */
async function getMe(token: string): Promise<{ id: number; citizen_id?: string } | null> {

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL_PREFIX}/api/me`, {
      headers: { Cookie: `token=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = await res.json();
    const id = Number(json?.user?.id ?? json?.user_id);
    const citizen_id = json?.user?.citizen_id ?? json?.citizen_id;
    return Number.isFinite(id) ? { id, citizen_id } : null;
  } catch {
    return null;
  }
}





export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  const me = await getMe(token);
  if (!me?.id) redirect("/login");


  return (

    <div className={`${thaiFont.className} relative min-h-screen`}>
      <div className="fixed inset-0 -z-10 bg-white" />
      <div className="mx-auto max-w-6xl p-6  space-y-8  ">
        {/* Hero */}
        <section
          className="rounded-[7px] text-black px-6 py-8 md:px-10 md:py-10 relative overflow-hidden 
             flex flex-col md:flex-row gap-8 md:gap-6 
             items-center md:items-start text-center md:text-left"
        >
          {/* ฝั่งข้อความ */}
          <div className="flex-1">
            <h1 className={`${interFont.className}text-[36px]  md:text-[64px] leading-none font-extrabold tracking-tigh`}>
              <span className="text-[#6F47E4]">Ai</span> Car Damage Detection
            </h1>
            <div className="mt-10">
              <p className="mt-3 text-sm  opacity-95 max-w-xl mx-auto md:mx-0">
                ประหยัดเวลา รวดเร็ว ติดตามสถานะได้แบบเรียลไทม์
              </p>
              <p className="mt-1 text-base">เคลมง่ายๆเพียง 5 ขั้นตอน</p>
            </div>


            <div className="mt-10 flex flex-row  gap-4 justify-center md:justify-start">
              {/* ปุ่ม ดูขั้นตอน */}
              <ScrollButton
                targetId="steps"
                duration={1000}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#DEDCFF] 
               text-black font-semibold px-6 py-3 
               transform transition-all duration-300 ease-out 
               hover:-translate-y-1 hover:brightness-105"
              >
                ดูขั้นตอน
              </ScrollButton>


              {/* ปุ่ม เริ่มสร้างเคลม */}
              <a
                href="/detect"
                className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#6F47E4] 
                   text-white font-semibold px-6 py-3 
                   shadow-[0_8px_24px_rgba(111,71,228,0.45)]
                   transform transition-all duration-300 ease-out 
                   hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(111,71,228,0.6)]"
              >
                เริ่มสร้างเคลม
                <ChevronRight size={18} />
              </a>
            </div>

          </div>

          {/* ฝั่งรูป */}
          <div className="flex-1 flex justify-center md:justify-end ">
            <img
              src="elements/insure-car.png"
              alt="car"
              className="max-h-64  md:max-h-100 drop-shadow-[0_6px_24px_rgba(0,0,0,0.25)]"
            />
          </div>
        </section>

        {/* why us */}
        <section className="px-6 md:px-10  max-w-6xl mx-auto">
          {/* หัวข้อ */}
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10 text-black">
            จุดเด่นของเรา
          </h2>

          {/* Grid Card */}
          <div className="grid grid-cols-1  md:grid-cols-3 gap-6 text-black">
            {/* Card 1 */}
            <div className=" bg-[#DEDCFF]/30 rounded-xl shadow-md p-6 flex flex-col items-center text-center 
                    transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
              <img
                src="/elements/whyus/ai.png"
                alt="AI"
                className="h-24 md:h-36 mb-4"
              />
              <h3 className="text-lg font-semibold mb-2">AI ช่วยตรวจจับความเสียหาย</h3>
              <p className="text-sm text-zinc-600">
                วิเคราะห์จากภาพถ่ายเพื่อลดความผิดพลาด
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#DEDCFF]/30 rounded-xl shadow-md p-6 flex flex-col items-center text-center 
                    transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
              <img
                src="/elements/whyus/report.png"
                alt="Report"
                className="h-24 md:h-36 mb-4"
              />
              <h3 className="text-lg font-semibold mb-2">สร้างรายงานเคลมได้ง่าย</h3>
              <p className="text-sm text-zinc-600">
                ดำเนินการง่าย เพียง 5 ขั้นตอน
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#DEDCFF]/30 rounded-xl shadow-md p-6 flex flex-col items-center text-center 
                    transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
              <img
                src="/elements/whyus/fast.png"
                alt="Fast"
                className="h-24 md:h-36 mb-4"
              />
              <h3 className="text-lg font-semibold mb-2">จัดทำเอกสารเคลมอย่างรวดเร็ว</h3>
              <p className="text-sm text-zinc-600">
                ระบบช่วยเตรียมเอกสารเพื่อส่งต่อให้เจ้าหน้าที่อุบัติเหตุ
              </p>
            </div>
          </div>
        </section>





        <section id="steps" className="mt-16 max-w-6xl mx-auto px-6">
          {/* หัวข้อ */}
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-12 text-black">
            ขั้นตอนการเคลม
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* ฝั่งรูป */}
            <div className="flex justify-center">
              <img
                src="/elements/car-insurance.png"
                alt="car-check"
                className="w-72 md:w-96"
              />
            </div>

            {/* ฝั่งข้อความ */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-zinc-900 mb-6">
                เริ่มต้นการเคลมง่ายๆ เพียง 5 ขั้นตอน
              </h3>

              <ol className="space-y-4">
                <StepItem n={1} title="เลือกรถ" desc="กรอกข้อมูลเบื้องต้นเกี่ยวกับรถที่ต้องการทำรายการเคลม" />
                <StepItem n={2} title="กรอกรายละเอียดอุบัติเหตุ" desc="บันทึกข้อมูลเหตุการณ์และเวลาเกิดอุบัติเหตุ" />
                <StepItem n={3} title="กรอกรายละเอียดสถานที่" desc="เพิ่มสถานที่เกิดเหตุเพื่อความถูกต้อง" />
                <StepItem n={4} title="กรอกรายละเอียดความเสียหาย" desc="อัปโหลดรูปและเลือกประเภทความเสียหาย" />
                <StepItem n={5} title="ตรวจสอบยืนยัน" desc="ตรวจสอบข้อมูลทั้งหมดก่อนกดยืนยัน" />
              </ol>

              {/* ปุ่มอยู่ล่างสุด */}
              <div className="mt-8 mt-8 flex justify-center md:justify-start">
                <a
                  href="/detect"
                  className="inline-flex items-center gap-2 rounded-full bg-[#6F47E4] 
                     text-white font-semibold px-6 py-2 shadow-sm 
                     hover:bg-[#6D5BD0]/90 transform transition 
                     hover:-translate-y-1"
                >
                  เริ่มต้นเคลม
                  <ChevronRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>
        <section className="mt-16 px-6 md:px-10  max-w-6xl mx-auto">
          {/* หัวข้อ */}
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10 text-black">
            ตัวอย่างการเคลม
          </h2>


        </section>

      </div>
    </div>

  );
}




function StepItem({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="h-6 w-6 rounded-full bg-[#DEDCFF] text-black text-[13px] grid place-items-center shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <div className="font-medium text-zinc-900">{title}</div>
        <div className="text-sm text-zinc-600">{desc}</div>
      </div>
    </li>
  );
}
