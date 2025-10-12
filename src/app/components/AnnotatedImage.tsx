"use client";
import React from "react";
import type { DamagePhoto, Annotation } from "@/types/claim";

export default function AnnotatedImage({ photo }: { photo: DamagePhoto }) {
  if (!photo) return null;

  const imageUrl = photo.original_url || photo.url; // ✅ ใช้ original_url ก่อนถ้ามี

  if (!imageUrl) return null;

  return (
    <div className="relative w-full max-w-[480px]">
      <img
        src={imageUrl}
        alt="annotated"
        className="object-contain h-[330px] w-full rounded-sm"
      />

      {/* กล่อง annotation */}
      {photo.annotations?.map((a: Annotation, i: number) => (
        <div
          key={i}
          className="absolute border-[2px] rounded-[2px]"
          title={`${a.part}: ${a.damage.join(", ")} (${a.severity})`}
          style={{
            borderColor: severityColor(a.severity),
            left: `${a.x * 100}%`,
            top: `${a.y * 100}%`,
            width: `${a.w * 100}%`,
            height: `${a.h * 100}%`,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "-13px",
              left: "0",
              backgroundColor: severityColor(a.severity),
              color: "#fff",
              fontSize: "9px",
              padding: "0 3px",
              borderRadius: "2px",
            }}
          >
            {a.damage.join(", ")}
          </span>
        </div>
      ))}
    </div>
  );
}

function severityColor(s: string) {
  switch (s.toUpperCase()) {
    case "A": return "#16A34A";
    case "B": return "#F59E0B";
    case "C": return "#EF4444";
    case "D": return "#6B7280";
    default: return "#000";
  }
}
