"use client";
import React from "react";

interface Step {
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export default function ProgressBar({
  current,
  steps,
}: {
  current: number;
  steps: Step[];
}) {
  return (
    <div className="flex items-center justify-center gap-3 z-0 relative">
      {steps.map((step, i) => {
        const isActive = current === i;
        const isDone = current > i;
        const Icon = step.icon;

        return (
          <div key={i} className="relative flex items-center">
            {/* เส้นเชื่อมด้านซ้าย */}
            {i > 0 && (
              <div className="absolute top-1/2 right-full w-8 h-4 -translate-y-1/2 z-0">
                <div
                  className={`h-full w-full ${
                    isDone || isActive ? "bg-[#6F47E4]" : "bg-[#E5E4F9]"
                  }`}
                />
              </div>
            )}

            {/* Active capsule */}
            {isActive ? (
              <div className="flex items-center bg-[#6F47E4] text-white rounded-full font-medium h-9 pl-1 pr-3 min-w-[140px] relative z-10">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white text-[#6F47E4] font-bold mr-2 text-sm">
                  {i + 1}
                </div>
                <span className="text-sm font-medium">{step.label}</span>
              </div>
            ) : (
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm relative z-10
                ${
                  isDone
                    ? "bg-[#6F47E4] text-white"
                    : "bg-[#E5E4F9] text-zinc-500"
                }`}
              >
                {i + 1}
              </div>
            )}

            {/* เส้นเชื่อมด้านขวา */}
            {i < steps.length - 1 && (
              <div className="absolute top-1/2 left-full w-8 h-4 -translate-y-1/2 z-0">
                <div
                  className={`h-full w-full ${
                    isDone ? "bg-[#6F47E4]" : "bg-[#E5E4F9]"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
