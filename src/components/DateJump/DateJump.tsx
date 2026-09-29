"use client";

import { usePathname, useRouter } from "next/navigation";

/** Tarih seçilince aynı sayfayı ?tarih= ile açar */
export function DateJump({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <input
      className="input date-input"
      type="date"
      value={value}
      aria-label="Tarih seç"
      onChange={(e) => e.target.value && router.push(`${pathname}?tarih=${e.target.value}`)}
    />
  );
}
