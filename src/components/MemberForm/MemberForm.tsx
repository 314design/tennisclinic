"use client";

import { Check } from "lucide-react";
import { useActionState, useState } from "react";
import { addDays } from "@/lib/clock";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { FormState } from "@/server/actions/members";

interface MemberFormProps {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  levels: readonly string[];
  initial?: { name: string; phone: string | null; tier: "premium" | "standard"; level: string | null; membershipStart: string | null; membershipEnd: string | null };
  /** Yeni üyede ders kotası seçilir; bitiş tarihi kotadan hesaplanır */
  isNew?: boolean;
  today: string;
  fee: number;
  validity: Record<"8" | "16", number>;
}

export function MemberForm({ action, levels, initial, isNew, today, fee, validity }: MemberFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [start, setStart] = useState(initial?.membershipStart ?? today);
  const [quota, setQuota] = useState(0);
  const endPreview = quota ? addDays(start, validity[String(quota) as "8" | "16"]) : null;
  return (
    <form className="form" action={formAction}>
      <div className="form-grid">
        <label className="field">
          <span className="field__label">Ad soyad</span>
          <input className="input" name="name" required minLength={2} maxLength={80} defaultValue={initial?.name} autoComplete="off" />
        </label>
        <label className="field">
          <span className="field__label">Telefon</span>
          <input className="input" name="phone" type="tel" maxLength={30} defaultValue={initial?.phone ?? ""} placeholder="05xx xxx xx xx" />
        </label>
        <label className="field">
          <span className="field__label">Üyelik tipi</span>
          <select className="select" name="tier" defaultValue={initial?.tier ?? "standard"}>
            <option value="standard">Standart</option>
            <option value="premium">Premium</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Seviye</span>
          <select className="select" name="level" defaultValue={initial?.level ?? ""}>
            <option value="">Belirtilmedi</option>
            {levels.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Üyelik başlangıç tarihi</span>
          <input className="input" name="membershipStart" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          {!isNew && (
            <span className="field__hint">
              Bitiş: {initial?.membershipEnd ? formatShortDate(initial.membershipEnd) : "—"} (ders kotası ve paketlere göre hesaplanır)
            </span>
          )}
        </label>
        {isNew && (
          <label className="field">
            <span className="field__label">Ders kotası (grup dersi)</span>
            <select className="select" name="quota" value={quota} onChange={(e) => setQuota(Number(e.target.value))}>
              <option value={0}>Kota yok</option>
              <option value={8}>8 seans</option>
              <option value={16}>16 seans</option>
            </select>
            <span className="field__hint">
              {endPreview
                ? `Üyelik bitişi: ${formatShortDate(endPreview)} (${validity[String(quota) as "8" | "16"]} gün) · ${formatCurrency(fee * quota)}`
                : "Özel ders paketi satıldığında bitiş tarihi paketin geçerlilik süresine göre belirlenir."}
            </span>
          </label>
        )}
      </div>
      {isNew && quota > 0 && fee > 0 && (
        <label className="check">
          <input type="checkbox" name="paid" />
          <span>Kota ödemesi alındı ({formatCurrency(fee * quota)})</span>
        </label>
      )}
      {state?.error && <p className="notice notice--error" role="alert">{state.error}</p>}
      <div className="form-actions">
        {state?.saved && !pending && (
          <span className="notice--inline">
            <Check className="icon" aria-hidden="true" /> Kaydedildi
          </span>
        )}
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : isNew ? "Üyeyi kaydet" : "Değişiklikleri kaydet"}
        </button>
      </div>
    </form>
  );
}
