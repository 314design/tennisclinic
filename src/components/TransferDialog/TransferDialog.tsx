"use client";

import { AlertTriangle, ArrowRightLeft, CircleCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal/Modal";
import { formatDayChip, formatDayLabel, formatShortDate } from "@/lib/format";
import { getTransferOptions, transferLesson } from "@/server/actions/transfer";
import type { PlanDay, PlanSlot } from "@/server/queries/planning";
import styles from "@/components/LessonPlanner/LessonPlanner.module.css";

export interface TransferTarget {
  id: number;
  label: string;
  date: string;
  start: string;
  end: string;
  coachId: number;
  coachName: string;
}

interface Props {
  target: TransferTarget | null;
  coaches: { id: number; name: string; onLeave: boolean }[];
  today: string;
  onClose: () => void;
}

export function TransferDialog({ target, coaches, today, onClose }: Props) {
  return (
    <Modal open={!!target} onClose={onClose} title="Dersi başka hocaya aktar" description={target?.label}>
      {target && <TransferForm key={target.id} target={target} coaches={coaches} today={today} onDone={onClose} />}
    </Modal>
  );
}

function TransferForm({ target, coaches, today, onDone }: { target: TransferTarget; coaches: Props["coaches"]; today: string; onDone: () => void }) {
  const [coachId, setCoachId] = useState<number | null>(null);
  const [days, setDays] = useState<PlanDay[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<PlanSlot | null>(null);
  const [courtId, setCourtId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const available = coaches.filter((c) => !c.onLeave && c.id !== target.coachId);

  const chooseCoach = (id: number) => {
    setCoachId(id);
    setSlot(null);
    setError(null);
    startTransition(async () => {
      const res = await getTransferOptions(target.id, id);
      if (!res.ok) return setError(res.error);
      setDays(res.days);
      // Aynı gün ve saat müsaitse doğrudan onu öner
      const same = res.days.find((d) => d.date === target.date)?.slots.find((s) => s.start === target.start);
      const firstDay = same ? target.date : (res.days.find((d) => d.slots.length)?.date ?? null);
      setDay(firstDay);
      if (same) {
        setSlot(same);
        setCourtId(same.courts[0].id);
      }
    });
  };

  const activeDay = days?.find((d) => d.date === day);
  const sameSlot = slot && day === target.date && slot.start === target.start;

  const submit = () =>
    startTransition(async () => {
      if (!coachId || !slot || !day || !courtId) return;
      const res = await transferLesson({ bookingId: target.id, coachId, courtId, date: day, start: slot.start });
      if (res.ok) onDone();
      else setError(res.error);
    });

  return (
    <div className="form">
      <p className="field__hint">
        Şu an: {formatDayLabel(target.date, today)} {formatShortDate(target.date)} · {target.start}–{target.end} · {target.coachName}
      </p>
      <label className="field">
        <span className="field__label">Yeni antrenör</span>
        <select className="select" value={coachId ?? ""} onChange={(e) => chooseCoach(Number(e.target.value))}>
          <option value="" disabled>Antrenör seçin</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      {pending && !days && <p className="field__hint">Müsait saatler yükleniyor…</p>}

      {days && (
        <>
          <div className={styles.days} role="tablist" aria-label="Günler" style={{ marginTop: 0 }}>
            {days.map((d) => {
              const chip = formatDayChip(d.date);
              return (
                <button
                  key={d.date}
                  type="button"
                  role="tab"
                  aria-selected={d.date === day}
                  className={styles.day}
                  disabled={!d.slots.length}
                  onClick={() => { setDay(d.date); setSlot(null); }}
                >
                  <span>{d.date === today ? "Bugün" : chip.weekday}</span>
                  <strong>{chip.day}</strong>
                  <em>{d.slots.length ? `${d.slots.length} saat` : "dolu"}</em>
                </button>
              );
            })}
          </div>
          {activeDay && (
            activeDay.slots.length ? (
              <div className={styles.slots} style={{ marginTop: 0 }}>
                {activeDay.slots.map((sl) => (
                  <button
                    key={sl.start}
                    type="button"
                    className={styles.slot}
                    aria-pressed={slot?.start === sl.start}
                    onClick={() => { setSlot(sl); setCourtId(sl.courts.find((c) => c.state === "free")?.id ?? sl.courts[0].id); }}
                  >
                    <strong>{sl.start}</strong>
                    <span>{activeDay.date === target.date && sl.start === target.start ? "aynı saat" : `${sl.courts.length} kort`}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty">Bu gün için müsait saat yok.</p>
            )
          )}
          {slot && (
            <fieldset className={styles.fieldset}>
              <legend className="field__label">Kort</legend>
              <div className="pills">
                {slot.courts.map((c) => (
                  <label key={c.id} className="pill">
                    <input type="radio" name="transfer-court" checked={courtId === c.id} onChange={() => setCourtId(c.id)} />
                    <span>{c.name} · {c.label}{c.state === "shared" ? " · paylaşımlı" : ""}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {days.every((d) => !d.slots.length) && <p className="notice notice--warn">Bu antrenörün önümüzdeki 14 günde uygun saati yok.</p>}
        </>
      )}

      {error && (
        <p className="notice notice--error" role="alert">
          <AlertTriangle className="icon" aria-hidden="true" />
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="btn" type="button" onClick={onDone}>Vazgeç</button>
        <button className="btn btn--primary" type="button" disabled={pending || !slot || !courtId} onClick={submit}>
          {sameSlot ? <ArrowRightLeft className="icon" aria-hidden="true" /> : <CircleCheck className="icon" aria-hidden="true" />}
          {sameSlot ? "Aynı saatte aktar" : slot && day ? `${formatShortDate(day)} ${slot.start} olarak aktar` : "Aktar"}
        </button>
      </div>
    </div>
  );
}

/** Listeden aktarma penceresi açan düğme */
export function TransferButton(props: { target: TransferTarget; coaches: Props["coaches"]; today: string; label?: string; small?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`btn ${props.small ? "btn--sm btn--outline" : ""}`} type="button" onClick={() => setOpen(true)}>
        <ArrowRightLeft className={`icon ${props.small ? "icon--sm" : ""}`} aria-hidden="true" />
        {props.label ?? "Aktar"}
      </button>
      <TransferDialog target={open ? props.target : null} coaches={props.coaches} today={props.today} onClose={() => setOpen(false)} />
    </>
  );
}
