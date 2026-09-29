"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { saveCoach, setCoachHours } from "@/server/actions/coaches";
import styles from "./CoachEditor.module.css";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function CoachInfoForm({ coach }: { coach?: { id: number; name: string; role: string | null; onLeave: boolean } }) {
  const [name, setName] = useState(coach?.name ?? "");
  const [role, setRole] = useState(coach?.role ?? "");
  const [onLeave, setOnLeave] = useState(coach?.onLeave ?? false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="form">
      <div className="form-grid">
        <label className="field">
          <span className="field__label">Ad soyad</span>
          <input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Unvan</span>
          <input className="input" value={role} maxLength={60} onChange={(e) => setRole(e.target.value)} placeholder="Ör. Baş antrenör" />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={onLeave} onChange={(e) => setOnLeave(e.target.checked)} />
        <span>
          İzinli
          <small>İzinli antrenöre yeni ders planlanamaz.</small>
        </span>
      </label>
      {msg && <p className={`notice ${msg.ok ? "notice--ok" : "notice--error"}`} role="status">{msg.text}</p>}
      <div className="form-actions">
        <button
          className="btn btn--primary"
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await saveCoach({ id: coach?.id, name, role, onLeave });
              setMsg(res.ok ? { ok: true, text: "Kaydedildi" } : { ok: false, text: res.error });
            })
          }
        >
          {coach ? "Kaydet" : "Antrenörü ekle"}
        </button>
      </div>
    </div>
  );
}

interface HourRow {
  enabled: boolean;
  start: string;
  end: string;
}

export function HoursEditor({ coachId, hours }: { coachId: number; hours: { weekday: number; start: string; end: string }[] }) {
  const [rows, setRows] = useState<HourRow[]>(() =>
    DAYS.map((_, i) => {
      const h = hours.find((x) => x.weekday === i + 1);
      return { enabled: !!h, start: h?.start ?? "09:00", end: h?.end ?? "18:00" };
    }),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const update = (i: number, patch: Partial<HourRow>) => {
    setSaved(false);
    setRows((r) => r.map((row, k) => (k === i ? { ...row, ...patch } : row)));
  };

  return (
    <div className="form">
      <ul className={styles.hours}>
        {rows.map((r, i) => (
          <li key={DAYS[i]} className={r.enabled ? undefined : styles.off}>
            <label className="check">
              <input type="checkbox" checked={r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
              <span>{DAYS[i]}</span>
            </label>
            <input className="input" type="time" step={1800} value={r.start} disabled={!r.enabled} aria-label={`${DAYS[i]} başlangıç`} onChange={(e) => update(i, { start: e.target.value })} />
            <span aria-hidden="true">–</span>
            <input className="input" type="time" step={1800} value={r.end} disabled={!r.enabled} aria-label={`${DAYS[i]} bitiş`} onChange={(e) => update(i, { end: e.target.value })} />
          </li>
        ))}
      </ul>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <div className="form-actions">
        {saved && (
          <span className="notice--inline">
            <Check className="icon" aria-hidden="true" /> Kaydedildi
          </span>
        )}
        <button
          className="btn btn--primary"
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await setCoachHours(
                coachId,
                rows.flatMap((r, i) => (r.enabled ? [{ weekday: i + 1, start: r.start, end: r.end }] : [])),
              );
              if (res.ok) setSaved(true);
              else setError(res.error);
            })
          }
        >
          Saatleri kaydet
        </button>
      </div>
    </div>
  );
}
