"use client";
import { Prompt, Noto_Sans_Thai, Inter } from 'next/font/google';
const headingFont = Prompt({ subsets: ['thai', 'latin'], weight: ['600', '700'], display: 'swap' });
const bodyFont = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '500'], display: 'swap' });
const thaiFont = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
export default function InspectHeader(props: {
  claimId: string;
  title: string;
  accidentType: string;
  accidentDate: string;
}) {
  const { claimId, title, accidentType, accidentDate } = props;
  return (
    <header className="mb-5">

      <div className={`${thaiFont.className} flex items-start gap-3`}>

        <div>
          <h1 className="text-xl font-semibold tracking-wide text-zinc-900 sm:text-2xl">
            ตรวจสอบความเสียหาย
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            เลขเคลม {claimId} · {title} · ประเภทเหตุการณ์: {accidentType} · วันที่: {accidentDate}
          </p>
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-white" />
    </header>
  );
}
