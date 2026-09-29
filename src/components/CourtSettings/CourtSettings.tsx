"use client";

import { Check, Plus, Trash2, Wrench } from "lucide-react";
import { useState, useTransition } from "react";
import { environmentLabel } from "@/lib/courts";
import { formatDayLabel } from "@/lib/format";
import { addCourtBlock, deleteCourtBlock, updateCourt } from "@/server/actions/courts";
import styles from "./CourtSettings.module.css";

export interface CourtSettingsData {
  id: number;
  name: string;
  surface: string;
  environment: "outdoor" | "indoor";
  balloon: boolean;
  active: boolean;
  blocks: { id: number; date: string; start: string; end: string; reason: string }[];
}

const SURFACES = ["Toprak", "Sert zemin", "Çim", "Halı"];

export function CourtSettings({ court, today }: { court: CourtSettingsData; today: string }) {
  const [form, setForm] = useState(court);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify({ ...form, blocks: 0 }) !== JSON.stringify({ ...court, blocks: 0 });

  const set = <K extends keyof CourtSettingsData>(key: K, value: CourtSettingsData[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = () =>
    startTransition(async () => {
      const res = await updateCourt({ id: form.id, name: form.name, surface: form.surface, environment: form.environment, balloon: form.balloon, active: form.active });
      if (res.ok) setSaved(true);
      else setError(res.error);
    });

  return (
    <section className={`card ${styles.court}`} aria-labelledby={`court-${court.id}`}>
      <header className="card__head">
        <div className="card__title-row">
          <h2 className="card__title" id={`court-${court.id}`}>{court.name}</h2>
          <span className={`chip chip--sm ${court.balloon ? "chip--ok" : "chip--neutral"}`}>{environmentLabel(court)}</span>
          {!court.active && <span className="chip chip--sm chip--warn">Kullanım dışı</span>}
        </div>
      </header>

      <div className="form" style={{ marginTop: 14 }}>
        <div className="form-grid">
          <label className="field">
            <span className="field__label">Kort adı</span>
            <input className="input" value={form.name} maxLength={40} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Zemin</span>
            <select className="select" value={form.surface} onChange={(e) => set("surface", e.target.value)}>
              {[...new Set([form.surface, ...SURFACES])].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className="field__label">Kort tipi</legend>
          <div className="pills">
            <label className="pill">
              <input type="radio" name={`env-${court.id}`} checked={form.environment === "outdoor"} onChange={() => set("environment", "outdoor")} />
              <span>Açık kort</span>
            </label>
            <label className="pill">
              <input type="radio" name={`env-${court.id}`} checked={form.environment === "indoor"} onChange={() => set("environment", "indoor")} />
              <span>Kapalı kort</span>
            </label>
          </div>
        </fieldset>

        {form.environment === "outdoor" && (
          <label className={`check ${styles.balloon}`}>
            <input type="checkbox" checked={form.balloon} onChange={(e) => set("balloon", e.target.checked)} />
            <span>
              Balon Kort (kış dönemi)
              <small>Açık kort balonla kapatıldıysa işaretleyin. Balon kortlar kapalı sayılır; yağmur uyarılarında dikkate alınmaz. Yazın işareti kaldırın.</small>
            </span>
          </label>
        )}

        <label className="check">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          <span>
            Kullanımda
            <small>Kapatılan kort panelde ve planlamada görünmez.</small>
          </span>
        </label>

        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <div className="form-actions">
          {saved && !dirty && (
            <span className={styles.saved}>
              <Check className="icon" aria-hidden="true" /> Kaydedildi
            </span>
          )}
          <button className="btn btn--primary" type="button" disabled={pending || !dirty} onClick={save}>
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      <MaintenanceList courtId={court.id} blocks={court.blocks} today={today} />
    </section>
  );
}

function MaintenanceList({ courtId, blocks, today }: { courtId: number; blocks: CourtSettingsData["blocks"]; today: string }) {
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("10:00");
  const [reason, setReason] = useState("Zemin bakımı");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className={styles.maint}>
      <div className={styles.maintHead}>
        <h3>
          <Wrench className="icon" aria-hidden="true" /> Bakım takvimi
        </h3>
        {!adding && (
          <button className="btn btn--sm btn--outline" type="button" onClick={() => setAdding(true)}>
            <Plus className="icon icon--sm" aria-hidden="true" /> Bakım ekle
          </button>
        )}
      </div>
      {blocks.length ? (
        <ul className={styles.blocks}>
          {blocks.map((b) => (
            <li key={b.id}>
              <span>
                <strong>{formatDayLabel(b.date, today)}</strong> · {b.start}–{b.end} · {b.reason}
              </span>
              <button
                className="icon-btn icon-btn--sm icon-btn--danger"
                type="button"
                aria-label="Bakımı sil"
                disabled={pending}
                onClick={() => startTransition(async () => void (await deleteCourtBlock(b.id)))}
              >
                <Trash2 className="icon" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !adding && <p className="muted" style={{ fontSize: 13.5, marginTop: 6 }}>Planlanmış bakım yok.</p>
      )}
      {adding && (
        <div className="form" style={{ marginTop: 10 }}>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Tarih</span>
              <input className="input" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Başlangıç</span>
              <input className="input" type="time" step={1800} value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Bitiş</span>
              <input className="input" type="time" step={1800} value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Neden</span>
              <input className="input" value={reason} maxLength={80} onChange={(e) => setReason(e.target.value)} />
            </label>
          </div>
          {error && <p className="notice notice--error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="btn" type="button" onClick={() => setAdding(false)}>Vazgeç</button>
            <button
              className="btn btn--primary"
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await addCourtBlock({ courtId, date, start, end, reason });
                  if (res.ok) setAdding(false);
                  else setError(res.error);
                })
              }
            >
              Bakımı kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
