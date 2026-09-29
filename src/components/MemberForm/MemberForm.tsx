"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import type { FormState } from "@/server/actions/members";

interface MemberFormProps {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  levels: readonly string[];
  initial?: { name: string; phone: string | null; tier: "premium" | "standard"; level: string | null; membershipEnd: string | null };
  /** Yeni üyede başlangıç ders hakkı alanı gösterilir */
  isNew?: boolean;
}

export function MemberForm({ action, levels, initial, isNew }: MemberFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
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
          <span className="field__label">Üyelik bitiş tarihi</span>
          <input className="input" name="membershipEnd" type="date" defaultValue={initial?.membershipEnd ?? ""} />
        </label>
        {isNew && (
          <label className="field">
            <span className="field__label">Başlangıç ders hakkı</span>
            <input className="input" name="lessonCredits" type="number" min={0} max={100} defaultValue={0} />
          </label>
        )}
      </div>
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
