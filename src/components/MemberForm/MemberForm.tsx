"use client";

import { Check, Plus, Trash2, User, Users } from "lucide-react";
import { useActionState, useState } from "react";
import { addDays } from "@/lib/clock";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { FormState } from "@/server/actions/members";
import styles from "./MemberForm.module.css";

const MAX_GROUP_ADD = 6;
const MAX_PRIVATE = 5;
let rowSeq = 0;
const newRow = () => ++rowSeq;

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
  const [mode, setMode] = useState<"single" | "group">("single");
  const [rows, setRows] = useState<number[]>(() => Array.from({ length: 4 }, newRow));
  const [then, setThen] = useState<"save" | "group" | "private">("group");
  const group = isNew && mode === "group";
  const endPreview = quota ? addDays(start, validity[String(quota) as "8" | "16"]) : null;
  const perPerson = fee * quota;
  return (
    <form className="form" action={formAction}>
      {isNew && (
        <fieldset className={styles.fieldset}>
          <legend className="field__label">Kayıt şekli</legend>
          <div className="pills">
            <label className="pill">
              <input type="radio" name="mode" value="single" checked={mode === "single"} onChange={() => setMode("single")} />
              <span><User className="icon" aria-hidden="true" /> Tek üye</span>
            </label>
            <label className="pill">
              <input type="radio" name="mode" value="group" checked={mode === "group"} onChange={() => setMode("group")} />
              <span><Users className="icon" aria-hidden="true" /> Grup olarak ekle</span>
            </label>
          </div>
          {group && <span className="field__hint">Birlikte gelen kişileri tek seferde kaydedin; üyelik tipi, seviye, başlangıç ve kota hepsine ortak uygulanır.</span>}
        </fieldset>
      )}
      {group ? (
        <div className={styles.people}>
          {rows.map((key, i) => (
            <div key={key} className={styles.person}>
              <span className={styles.index}>{i + 1}</span>
              <label className="field">
                <span className="field__label">Ad soyad</span>
                <input className="input" name="name" required={i < 2} minLength={2} maxLength={80} autoComplete="off" />
              </label>
              <label className="field">
                <span className="field__label">Telefon</span>
                <input className="input" name="phone" type="tel" maxLength={30} placeholder="05xx xxx xx xx" />
              </label>
              <button
                className="icon-btn icon-btn--sm"
                type="button"
                aria-label={`${i + 1}. kişiyi kaldır`}
                disabled={rows.length <= 2}
                onClick={() => setRows((r) => r.filter((k) => k !== key))}
              >
                <Trash2 className="icon" aria-hidden="true" />
              </button>
            </div>
          ))}
          {rows.length < MAX_GROUP_ADD && (
            <button className="btn btn--sm btn--ghost" type="button" onClick={() => setRows((r) => [...r, newRow()])}>
              <Plus className="icon" aria-hidden="true" /> Kişi ekle
            </button>
          )}
        </div>
      ) : null}
      <div className="form-grid">
        {!group && (
          <>
            <label className="field">
              <span className="field__label">Ad soyad</span>
              <input className="input" name="name" required minLength={2} maxLength={80} defaultValue={initial?.name} autoComplete="off" />
            </label>
            <label className="field">
              <span className="field__label">Telefon</span>
              <input className="input" name="phone" type="tel" maxLength={30} defaultValue={initial?.phone ?? ""} placeholder="05xx xxx xx xx" />
            </label>
          </>
        )}
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
                ? `Üyelik bitişi: ${formatShortDate(endPreview)} (${validity[String(quota) as "8" | "16"]} gün) · ${formatCurrency(perPerson)}${group ? " / kişi" : ""}`
                : "Özel ders paketi satıldığında bitiş tarihi paketin geçerlilik süresine göre belirlenir."}
            </span>
          </label>
        )}
      </div>
      {isNew && quota > 0 && fee > 0 && (
        <label className="check">
          <input type="checkbox" name="paid" />
          <span>Kota ödemesi alındı ({formatCurrency(perPerson)}{group ? ` × ${rows.length} kişi = ${formatCurrency(perPerson * rows.length)}` : ""})</span>
        </label>
      )}
      {group && (
        <fieldset className={styles.fieldset}>
          <legend className="field__label">Kayıttan sonra</legend>
          <div className="pills">
            <label className="pill">
              <input type="radio" name="then" value="group" checked={then === "group"} onChange={() => setThen("group")} />
              <span>Mevcut grup dersine ekle</span>
            </label>
            <label className="pill">
              <input type="radio" name="then" value="private" checked={then === "private"} disabled={rows.length > MAX_PRIVATE} onChange={() => setThen("private")} />
              <span>Ekibe özel ders aç</span>
            </label>
            <label className="pill">
              <input type="radio" name="then" value="save" checked={then === "save"} onChange={() => setThen("save")} />
              <span>Sadece kaydet</span>
            </label>
          </div>
          <span className="field__hint">
            {then === "group"
              ? "Yeterli boş yeri olan grup dersleri listelenir (ör. 2 kişilik gruba 4 kişi daha); yoksa yeni grup dersi açabilirsiniz."
              : then === "private"
                ? `Yeni rezervasyon ekranı özel ders türünde, bu kişiler seçili açılır (en fazla ${MAX_PRIVATE} kişi).`
                : "Üyeler kaydedilir; derse daha sonra eklenebilir."}
          </span>
        </fieldset>
      )}
      {state?.error && <p className="notice notice--error" role="alert">{state.error}</p>}
      <div className="form-actions">
        {state?.saved && !pending && (
          <span className="notice--inline">
            <Check className="icon" aria-hidden="true" /> Kaydedildi
          </span>
        )}
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : group ? `${rows.length} üyeyi kaydet` : isNew ? "Üyeyi kaydet" : "Değişiklikleri kaydet"}
        </button>
      </div>
    </form>
  );
}
