"use client";

import { AlertTriangle, CircleCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { MemberPicker } from "@/components/MemberPicker/MemberPicker";
import { formatCurrency, formatDayLabel, formatShortDate, toMinutes } from "@/lib/format";
import { BAND_LABEL, bandFor, rentalPrice, type PriceList } from "@/lib/pricing";
import { createReservation } from "@/server/actions/bookings";
import type { MemberOption } from "@/server/queries/planning";
import styles from "@/components/LessonPlanner/LessonPlanner.module.css";

interface Props {
  court: { id: number; name: string; label: string };
  date: string;
  today: string;
  start: string;
  end: string;
  members: MemberOption[];
  priceList: PriceList;
  onCreated: (id: number) => void;
  /** Önceden seçili üyeler */
  initialSelected?: number[];
}

/** Kort kiralama: ücret saat bandına göre otomatik hesaplanır */
export function ReservationForm({ court, date, today, start, end, members, priceList, onCreated, initialSelected }: Props) {
  const [format, setFormat] = useState<"singles" | "doubles">("singles");
  const [selected, setSelected] = useState<number[]>(() => (initialSelected ?? []).slice(0, 4));
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const band = bandFor(priceList, date, start, end);
  const minutes = toMinutes(end) - toMinutes(start);
  const price = rentalPrice(priceList, band, minutes);

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await createReservation({ courtId: court.id, date, start, end, memberIds: selected, format, paid });
      if (res.ok) onCreated(res.id);
      else setError(res.error);
    });

  return (
    <section className="card" aria-labelledby="rental-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="rental-title">Kort kiralama</h2>
          <p className="card__meta">
            {formatDayLabel(date, today)} {formatShortDate(date)} · {start}–{end} · {court.name} ({court.label}) · {BAND_LABEL[band]}
          </p>
        </div>
      </header>
      <div className={styles.formGrid}>
        <div className="form">
          <fieldset className={styles.fieldset}>
            <legend className="field__label">Oyun</legend>
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
          <div className={styles.sourceBox}>
            <div className={styles.priceLine}>
              <strong>{formatCurrency(price)}</strong>
              <span>
                {formatCurrency(priceList.rentalHourly[band])} / saat × {minutes} dk
              </span>
            </div>
            {price > 0 && (
              <label className="check">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
                <span>Ödeme alındı</span>
              </label>
            )}
          </div>
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
        <button className="btn btn--primary" type="button" disabled={pending || !selected.length} onClick={submit}>
          <CircleCheck className="icon" aria-hidden="true" />
          {pending ? "Kaydediliyor…" : "Kiralamayı oluştur"}
        </button>
      </div>
    </section>
  );
}
