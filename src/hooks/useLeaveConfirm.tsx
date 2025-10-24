"use client";
import { useEffect, useRef, useCallback } from "react";

type Options = {
  hasUnsavedChanges: boolean;
  onConfirmLeave: (url: string) => void; // "back" สำหรับกรณีย้อนกลับ
  enabled?: boolean;                     // ปิด/เปิดได้ทั้งชุด
  onAutoSave?: () => void;               // จะเรียกก่อนออก (best-effort)
  sameOriginOnly?: boolean;              // เตือนเฉพาะลิงก์โดเมนเดียวกัน (ดีฟอลต์ true)
};

export function useLeaveConfirm({
  hasUnsavedChanges,
  onConfirmLeave,
  enabled = true,
  onAutoSave,
  sameOriginOnly = true,
}: Options) {
  const initialized = useRef(false);
  const disabledRef = useRef(false); // ปิดชั่วคราว (ตอนกดบันทึก)
  const hasUnsavedRef = useRef(hasUnsavedChanges);

  useEffect(() => { hasUnsavedRef.current = hasUnsavedChanges; }, [hasUnsavedChanges]);

  // ปิดการเตือนชั่วคราว (เช่นก่อน submit)
  const temporarilyDisable = useCallback((ms = 3000) => {
    disabledRef.current = true;
    if (ms > 0) setTimeout(() => (disabledRef.current = false), ms);
  }, []);

  // กันลูป pushState เมื่อกด Back
  const pushingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // 0) ดัน state เข้ากอง history หนึ่งครั้ง
    if (!initialized.current) {
      history.replaceState({ page: "form-root" }, "", window.location.href);
      initialized.current = true;
    }

    // 1) รีเฟรช/ปิดแท็บ
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (disabledRef.current || !hasUnsavedRef.current) return;
      try { onAutoSave?.(); } catch {}
      e.preventDefault();
      e.returnValue = ""; // ข้อความคัสตอมส่วนใหญ่ไม่โชว์แล้ว
      return "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 2) จับคลิกลิงก์ (internal navigation)
    const isModifiedClick = (ev: MouseEvent) =>
      ev.defaultPrevented ||
      (ev as any).button !== 0 ||
      ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey;

    const sameOrigin = (href: string) => {
      try {
        const u = new URL(href, location.href);
        return u.origin === location.origin;
      } catch { return false; }
    };

    const handleClick = (e: MouseEvent) => {
      if (!hasUnsavedRef.current || disabledRef.current) return;
      if (isModifiedClick(e)) return;

      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

      // ข้ามลิงก์ภายนอก / target=_blank / ลิงก์ที่ติด data-no-guard
      if ((sameOriginOnly && !sameOrigin(href)) || anchor.target === "_blank" || anchor.dataset.noGuard === "true") {
        return;
      }

      e.preventDefault();
      onConfirmLeave(href);
    };
    document.addEventListener("click", handleClick, true);

    // 3) ปุ่ม Back
    const handlePopState = () => {
      if (pushingRef.current) { // มาจากเราดันเอง ไม่ต้องทำอะไร
        pushingRef.current = false;
        return;
      }
      if (!hasUnsavedRef.current || disabledRef.current) return;
      // ดันกลับเพื่อกันเปลี่ยนหน้า แล้วเด้ง modal
      pushingRef.current = true;
      history.pushState({ page: "form-root" }, "", window.location.href);
      onConfirmLeave("back");
    };
    window.addEventListener("popstate", handlePopState);

    // 4) autosave บน pagehide (มือถือ)
    const onPageHide = () => {
      if (disabledRef.current || !hasUnsavedRef.current) return;
      try { onAutoSave?.(); } catch {}
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled, onAutoSave, onConfirmLeave, sameOriginOnly]);

  // สำหรับ router.push() แบบโปรแกรมมิ่ง
  const guardNavigate = useCallback((url: string, navigate: (u: string) => void) => {
    if (disabledRef.current || !hasUnsavedRef.current) {
      navigate(url);
      return;
    }
    onConfirmLeave(url);
  }, [onConfirmLeave]);

  return { temporarilyDisable, guardNavigate };
}
