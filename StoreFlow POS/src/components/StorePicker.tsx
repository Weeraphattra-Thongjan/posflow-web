import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Store as StoreIcon, Check, LogOut, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoreOption } from "@/lib/store-context";

interface StorePickerProps {
  open: boolean;
  stores: StoreOption[];
  currentStoreId?: string | null;
  // false = ต้องเลือกร้านก่อนใช้งาน (หลังเข้าสู่ระบบ) ปิดหน้าต่างไม่ได้
  closable: boolean;
  onChoose: (storeId: string) => void;
  onClose: () => void;
  onSignOut: () => void;
}

const roleText = (r: string) => (r === "cashier" ? "พนักงานขาย" : "เจ้าของร้าน");

// หน้าจอเลือกร้านแบบเต็มจอ: เลือกร้านก่อน แล้วกด "เข้าร้านนี้" เพื่อยืนยัน (กันกดผิด)
export function StorePicker({
  open,
  stores,
  currentStoreId,
  closable,
  onChoose,
  onClose,
  onSignOut,
}: StorePickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => setMounted(true), []);

  // เปิดใหม่ทุกครั้ง: ยังไม่เลือกร้านไว้ล่วงหน้า (ต้องกดเลือกเอง)
  useEffect(() => {
    if (open) {
      setSelected(closable ? currentStoreId ?? null : null);
      setEntering(false);
    }
  }, [open, closable, currentStoreId]);

  // กด Esc ปิดได้เฉพาะตอนเปลี่ยนร้านระหว่างใช้งาน
  useEffect(() => {
    if (!open || !closable) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closable, onClose]);

  if (!open || !mounted) return null;

  const selectedStore = stores.find((o) => o.store.id === selected);
  const sameAsCurrent = closable && selected === currentStoreId;

  const handleEnter = () => {
    if (!selected) return;
    if (sameAsCurrent) {
      onClose();
      return;
    }
    setEntering(true);
    onChoose(selected);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-picker-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        {closable && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <StoreIcon className="h-7 w-7" />
          </div>
          <h1 id="store-picker-title" className="text-xl font-bold">
            {closable ? "เปลี่ยนร้านค้า" : "เลือกร้านที่จะเข้าใช้งาน"}
          </h1>
          <p className="text-sm text-muted-foreground">
            คุณทำงานอยู่ {stores.length} ร้าน เลือกร้านแล้วกด "เข้าร้านนี้"
          </p>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto" role="radiogroup" aria-label="รายการร้านค้า">
          {stores.map((o) => {
            const isSelected = o.store.id === selected;
            const isCurrent = closable && o.store.id === currentStoreId;
            return (
              <button
                key={o.store.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(o.store.id)}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-primary font-display text-base font-bold text-primary-foreground">
                  {o.store.name?.[0]?.toUpperCase() ?? "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{o.store.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {roleText(o.role)}
                    {isCurrent ? " · ใช้งานอยู่" : ""}
                  </p>
                </div>
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                  }`}
                >
                  {isSelected && <Check className="h-4 w-4" />}
                </div>
              </button>
            );
          })}
        </div>

        <Button className="mt-6 w-full" size="lg" disabled={!selected || entering} onClick={handleEnter}>
          {entering ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังเข้าร้าน...
            </>
          ) : selectedStore ? (
            sameAsCurrent ? "อยู่ร้านนี้ต่อ" : `เข้าร้าน ${selectedStore.store.name}`
          ) : (
            "เลือกร้านก่อน"
          )}
        </Button>

        {!closable && (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            <LogOut className="h-4 w-4" /> ออกจากระบบ
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}