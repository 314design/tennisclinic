"use client";

import { AlertTriangle, CircleCheck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { MemberPicker } from "@/components/MemberPicker/MemberPicker";
import { formatCurrency, formatDayLabel, formatShortDate } from "@/lib/format";
import { createLesson } from "@/server/actions/bookings";
import type { CoachOption, MemberOption, PlanSlot } from "@/server/queries/planning";
import styles from "./LessonPlanner.module.css";

const MAX_GROUP = 6;

interface Props {
  coach: CoachOption;
  date: string;
  today: string;
  slot: PlanSlot;
  members: MemberOption[];
  levels: readonly string[];
  perPersonFee: number;
  onCreated: (id: number) => void;
  /** Önceden seçili üyeler */
  initialSelected?: number[];
  /** Takvimden seçilen kort */
  defaultCourtId?: number;
}

export function GroupLessonForm({ coach, date, today, slot, members, levels, perPersonFee, onCreated, defaultCourtId, initialSelected }: Props) {
  const [courtId, setCourtId] = useState(slot.courts.find((c) => c.id === defaultCourtId)?.id ?? slot.courts.find((c) => c.state === "free")?.id ?? slot.courts[0].id);
  const [selected, setSelected] = useState<number[]>(() => (initialSelected ?? []).slice(0, MAX_GROUP));
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<string>(() => {
    // Önceden seçili ekibin ortak seviyesi varsa o seçilir
    const own = [...new Set((initialSelected ?? []).map((id) => members.find((m) => m.id === id)?.level))];
    return own.length === 1 && own[0] && levels.includes(own[0]) ? own[0] : levels[0];
  });
  const [capacity, setCapacity] = useState(MAX_GROUP);
  const [useMakeup, setUseMakeup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displaceable, setDisplaceable] = useState<{ id: number; label: string }[] | null>(null);
  const [pending, startTransition] = useTransition();

  const court = slot.courts.find((c) => c.id === courtId)!;
  const makeupAvailable = selected.some((id) => (members.find((m) => m.id === id)?.makeupCredits ?? 0) > 0);
  // Hakkı olmayan (ücretli) öğrenci sayısı
  const charged = selected.filter((id) => {
    const m = members.find((x) => x.id === id);
    return m && m.lessonCredits <= 0 && !(useMakeup && m.makeupCredits > 0);
  }).length;
  const levelMismatch = useMemo(() => selected.filter((id) => members.find((m) => m.id === id)?.level !== level).length, [selected, members, level]);

  const submit = (displace = false) =>
    startTransition(async () => {
      setError(null);
      const res = await createLesson({
        kind: "group", coachId: coach.id, courtId, date, start: slot.start, end: slot.end,
        memberIds: selected, title, level, capacity, useMakeup: makeupAvailable && useMakeup, displace,
      });
      if (res.ok) onCreated(res.id);
      else {
        setError(res.error);
        setDisplaceable(res.displaceable ?? null);
      }
    });

  return (
    <section className="card" aria-labelledby="form-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="form-title">Grup dersi · öğrenci ata</h2>
          <p className="card__meta">
            {formatDayLabel(date, today)} {formatShortDate(date)} · {slot.start}–{slot.end} · {coach.name}
          </p>
        </div>
      </header>

      <div className={styles.formGrid}>
        <div className="form">
          <fieldset className={styles.fieldset}>
            <legend className="field__label">Kort</legend>
            <div className="pills">
              {slot.courts.map((c) => (
                <label key={c.id} className="pill">
                  <input type="radio" name="court" checked={courtId === c.id} onChange={() => setCourtId(c.id)} />
                  <span>
                    {c.name} · {c.label}
                    {c.state === "displaceable" && " ⚠"}
                  </span>
                </label>
              ))}
            </div>
            {court.state === "displaceable" && (
              <p className="notice notice--warn" style={{ marginTop: 8 }}>
                <AlertTriangle className="icon" aria-hidden="true" />
                Bu kortta {court.conflict} var. Grup dersi öncelikli olduğu için kaydederken bu seanslar iptal edilir ve üyelere telafi hakkı verilir.
              </p>
            )}
          </fieldset>

          <div className="form-grid">
            <label className="field">
              <span className="field__label">Grup adı</span>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${level} grubu`} maxLength={80} />
            </label>
            <label className="field">
              <span className="field__label">Seviye</span>
              <select className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
                {levels.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Kapasite (en fazla {MAX_GROUP})</span>
              <select className="select" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
                {Array.from({ length: MAX_GROUP }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n} disabled={n < selected.length}>{n} kişi</option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.sourceBox}>
            <div className={styles.priceLine}>
              <strong>{formatCurrency(charged * perPersonFee)}</strong>
              <span>
                Ders hakkı olan öğrenciler hakkından düşer; hakkı olmayanlar kişi başı {formatCurrency(perPersonFee)} öder
                {charged ? ` (${charged} öğrenci)` : ""}.
              </span>
            </div>
          </div>
          {makeupAvailable && (
            <label className="check">
              <input type="checkbox" checked={useMakeup} onChange={(e) => setUseMakeup(e.target.checked)} />
              <span>
                Telafi hakkından düş
                <small>Telafi hakkı olan üyelerde ders, ders hakkı yerine telafi hakkından kullanılır.</small>
              </span>
            </label>
          )}
          {levelMismatch > 0 && <p className="notice notice--info">{levelMismatch} üyenin kayıtlı seviyesi &quot;{level}&quot; değil.</p>}
        </div>

        <MemberPicker members={members} selected={selected} onChange={setSelected} max={capacity} label="Öğrenciler" />
      </div>

      {error && (
        <div className="notice notice--error" role="alert" style={{ marginTop: 16 }}>
          <AlertTriangle className="icon" aria-hidden="true" />
          <div>
            {error}
            {displaceable && (
              <ul>
                {displaceable.map((d) => (
                  <li key={d.id}>{d.label}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 16 }}>
        {displaceable ? (
          <button className="btn btn--primary" type="button" disabled={pending} onClick={() => submit(true)}>
            <CircleCheck className="icon" aria-hidden="true" />
            Özel dersleri iptal et ve grubu oluştur
          </button>
        ) : (
          <button className="btn btn--primary" type="button" disabled={pending || selected.length > capacity} onClick={() => submit(false)}>
            <CircleCheck className="icon" aria-hidden="true" />
            {pending ? "Kaydediliyor…" : "Grup dersini oluştur"}
          </button>
        )}
      </div>
    </section>
  );
}
