"use client";

import { AlertTriangle, CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MemberPicker } from "@/components/MemberPicker/MemberPicker";
import { fromMinutes } from "@/lib/clock";
import { toMinutes } from "@/lib/format";
import { createReservation } from "@/server/actions/bookings";
import type { MemberOption } from "@/server/queries/planning";

interface Props {
  courts: { id: number; name: string; label: string }[];
  members: MemberOption[];
  defaults: { courtId?: number; date: string; start: string };
  open: string;
  close: string;
  hourlyPrice: number;
}

export function ReservationForm({ courts, members, defaults, open, close, hourlyPrice }: Props) {
  const router = useRouter();
  const [courtId, setCourtId] = useState(defaults.courtId ?? courts[0]?.id);
  const [date, setDate] = useState(defaults.date);
  const [start, setStart] = useState(defaults.start);
  const [duration, setDuration] = useState(60);
  const [format, setFormat] = useState<"singles" | "doubles">("singles");
  const [selected, setSelected] = useState<number[]>([]);
  const [price, setPrice] = useState(hourlyPrice);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const times: string[] = [];
  for (let m = toMinutes(open); m + 30 <= toMinutes(close); m += 30) times.push(fromMinutes(m));
  const end = fromMinutes(toMinutes(start) + duration);

  const changeDuration = (d: number) => {
    setDuration(d);
    setPrice(Math.round((hourlyPrice * d) / 60));
  };

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await createReservation({ courtId, date, start, end, memberIds: selected, format, price, paid });
      if (res.ok) router.push(`/seanslar/${res.id}`);
      else setError(res.error);
    });

  return (
    <section className="card">
      <div className="two-col">
        <div className="form">
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field__label" style={{ marginBottom: 8 }}>Kort</legend>
            <div className="pills">
              {courts.map((c) => (
                <label key={c.id} className="pill">
                  <input type="radio" name="court" checked={courtId === c.id} onChange={() => setCourtId(c.id)} />
                  <span>{c.name} · {c.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Tarih</span>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">Başlangıç</span>
              <select className="select" value={start} onChange={(e) => setStart(e.target.value)}>
                {times.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Süre</span>
              <select className="select" value={duration} onChange={(e) => changeDuration(Number(e.target.value))}>
                <option value={60}>60 dk</option>
                <option value={90}>90 dk</option>
                <option value={120}>120 dk</option>
              </select>
              <span className="field__hint">Bitiş: {end}</span>
            </label>
          </div>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field__label" style={{ marginBottom: 8 }}>Oyun</legend>
            <div className="pills">
              <label className="pill">
                <input type="radio" name="format" checked={format === "singles"} onChange={() => setFormat("singles")} />
                <span>Tekler</span>
              </label>
              <label className="pill">
                <input type="radio" name="format" checked={format === "doubles"} onChange={() => setFormat("doubles")} />
                <span>Çiftler</span>
              </label>
            </div>
          </fieldset>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Ücret (₺)</span>
              <input className="input" type="number" min={0} step={50} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} />
            </label>
          </div>
          {price > 0 && (
            <label className="check">
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
              <span>Ödeme alındı</span>
            </label>
          )}
          <p className="field__hint">Grup dersi olan saatlere kiralama yapılamaz; grup dersleri önceliklidir.</p>
        </div>
        <MemberPicker members={members} selected={selected} onChange={setSelected} max={4} label="Oyuncular (1–4)" />
      </div>

      {error && (
        <p className="notice notice--error" role="alert" style={{ marginTop: 16 }}>
          <AlertTriangle className="icon" aria-hidden="true" />
          {error}
        </p>
      )}
      <div className="form-actions" style={{ marginTop: 16 }}>
        <button className="btn btn--primary" type="button" disabled={pending || !selected.length || !courtId} onClick={submit}>
          <CircleCheck className="icon" aria-hidden="true" />
          {pending ? "Kaydediliyor…" : "Rezervasyonu oluştur"}
        </button>
      </div>
    </section>
  );
}
