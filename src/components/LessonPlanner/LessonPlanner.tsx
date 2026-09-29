"use client";

import { AlertTriangle, CalendarClock, CircleCheck, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MemberPicker } from "@/components/MemberPicker/MemberPicker";
import { formatDayChip, formatDayLabel, formatShortDate } from "@/lib/format";
import { createLesson } from "@/server/actions/bookings";
import type { CoachOption, GroupLesson, MemberOption, PlanDay, PlanSlot } from "@/server/queries/planning";
import { GroupLessons } from "./GroupLessons";
import styles from "./LessonPlanner.module.css";

const WEEKDAYS = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MAX_GROUP = 6;

interface LessonPlannerProps {
  today: string;
  kind: "private" | "group";
  duration: number;
  coaches: CoachOption[];
  coach: CoachOption | null;
  days: PlanDay[];
  groups: GroupLesson[];
  members: MemberOption[];
  levels: readonly string[];
  defaultPrice: number;
}

export function LessonPlanner(props: LessonPlannerProps) {
  const { kind, duration, coaches, coach, days, groups, members, levels, today } = props;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const firstDayWithSlots = days.find((d) => d.slots.length)?.date ?? days[0]?.date;
  const [day, setDay] = useState(firstDayWithSlots);
  const [slot, setSlot] = useState<PlanSlot | null>(null);
  const activeDay = days.find((d) => d.date === day) ?? days[0];

  // Hoca, tür ya da süre değişince seçim sıfırlanır (bileşen key ile yeniden kurulur)
  return (
    <div className={styles.planner}>
      <section className="card">
        <div className={styles.controls}>
          <fieldset className={styles.fieldset}>
            <legend className="field__label">Ders türü</legend>
            <div className="pills">
              <label className="pill">
                <input type="radio" name="kind" checked={kind === "private"} onChange={() => setParam("tur", "ozel")} />
                <span>Özel ders</span>
              </label>
              <label className="pill">
                <input type="radio" name="kind" checked={kind === "group"} onChange={() => setParam("tur", "grup")} />
                <span>
                  <Users className="icon" aria-hidden="true" />
                  Grup dersi
                </span>
              </label>
            </div>
          </fieldset>
          <label className={`field ${styles.coachField}`}>
            <span className="field__label">Antrenör</span>
            <select className="select" value={coach?.id ?? ""} onChange={(e) => setParam("hoca", e.target.value)}>
              <option value="" disabled>Antrenör seçin</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id} disabled={c.onLeave}>
                  {c.name}{c.role ? ` · ${c.role}` : ""}{c.onLeave ? " (izinli)" : ""}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={styles.fieldset}>
            <legend className="field__label">Süre</legend>
            <div className="pills">
              {[60, 90, 120].map((d) => (
                <label key={d} className="pill">
                  <input type="radio" name="duration" checked={duration === d} onChange={() => setParam("sure", String(d))} />
                  <span>{d} dk</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {coach && (
          <p className={styles.hours}>
            <CalendarClock className="icon" aria-hidden="true" />
            Çalışma saatleri:{" "}
            {coach.hours.length
              ? coach.hours.map((h) => `${WEEKDAYS[h.weekday]} ${h.start}–${h.end}`).join(" · ")
              : "tanımlı değil (Antrenörler ekranından ekleyin)"}
          </p>
        )}
      </section>

      {!coach ? (
        <section className="card">
          <p className="empty">
            <strong>Önce bir antrenör seçin</strong>
            Seçtiğiniz antrenörün önümüzdeki 14 gündeki müsait saatleri burada listelenir.
          </p>
        </section>
      ) : (
        <>
          {coach && <GroupLessons groups={groups} members={members} coachName={coach.name} today={today} />}

          <section className="card" aria-labelledby="slots-title">
            <header className="card__head">
              <div>
                <h2 className="card__title" id="slots-title">Müsait gün ve saatler</h2>
                <p className="card__meta">
                  {coach.name} · {duration} dk · {kind === "group" ? "grup dersleri özel derslerden önceliklidir" : "yalnızca boş kortlar"}
                </p>
              </div>
            </header>

            <div className={styles.days} role="tablist" aria-label="Günler">
              {days.map((d) => {
                const chip = formatDayChip(d.date);
                return (
                  <button
                    key={d.date}
                    type="button"
                    role="tab"
                    aria-selected={d.date === activeDay?.date}
                    className={styles.day}
                    disabled={!d.slots.length}
                    onClick={() => {
                      setDay(d.date);
                      setSlot(null);
                    }}
                  >
                    <span>{d.date === today ? "Bugün" : chip.weekday}</span>
                    <strong>{chip.day}</strong>
                    <em>{d.slots.length ? `${d.slots.length} saat` : "dolu"}</em>
                  </button>
                );
              })}
            </div>

            {activeDay && (
              <div className={styles.slotArea}>
                <p className={styles.dayTitle}>{formatDayLabel(activeDay.date, today)} · {formatShortDate(activeDay.date)}</p>
                {activeDay.slots.length ? (
                  <div className={styles.slots}>
                    {activeDay.slots.map((sl) => {
                      const onlyDisplace = sl.courts.every((c) => c.state === "displaceable");
                      return (
                        <button
                          key={sl.start}
                          type="button"
                          className={`${styles.slot} ${onlyDisplace ? styles.slotWarn : ""}`}
                          aria-pressed={slot?.start === sl.start}
                          onClick={() => setSlot(sl)}
                          title={sl.courts.map((c) => `${c.name}${c.conflict ? ` (${c.conflict})` : ""}`).join(", ")}
                        >
                          <strong>{sl.start}</strong>
                          <span>{sl.courts.length} kort</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty">Bu gün için uygun saat yok.</p>
                )}
              </div>
            )}
          </section>

          {slot && activeDay && (
            <LessonForm
              key={`${activeDay.date}-${slot.start}-${kind}`}
              {...props}
              coach={coach}
              date={activeDay.date}
              slot={slot}
              levels={levels}
              onCreated={(id) => router.push(`/seanslar/${id}`)}
            />
          )}
        </>
      )}
    </div>
  );
}

interface LessonFormProps extends LessonPlannerProps {
  coach: CoachOption;
  date: string;
  slot: PlanSlot;
  onCreated: (id: number) => void;
}

function LessonForm({ kind, coach, date, slot, members, levels, today, defaultPrice, onCreated }: LessonFormProps) {
  const [courtId, setCourtId] = useState(slot.courts.find((c) => c.state === "free")?.id ?? slot.courts[0].id);
  const [selected, setSelected] = useState<number[]>([]);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<string>(levels[0]);
  const [capacity, setCapacity] = useState(MAX_GROUP);
  const [price, setPrice] = useState(kind === "private" ? defaultPrice : 0);
  const [paid, setPaid] = useState(false);
  const [useMakeup, setUseMakeup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displaceable, setDisplaceable] = useState<{ id: number; label: string }[] | null>(null);
  const [pending, startTransition] = useTransition();

  const court = slot.courts.find((c) => c.id === courtId)!;
  const member = kind === "private" ? members.find((m) => m.id === selected[0]) : undefined;
  const makeupAvailable = kind === "private" ? (member?.makeupCredits ?? 0) > 0 : selected.some((id) => (members.find((m) => m.id === id)?.makeupCredits ?? 0) > 0);
  const levelMatches = useMemo(
    () => (kind === "group" ? selected.filter((id) => members.find((m) => m.id === id)?.level !== level).length : 0),
    [kind, selected, members, level],
  );

  const submit = (displace = false) =>
    startTransition(async () => {
      setError(null);
      const res = await createLesson({
        kind, coachId: coach.id, courtId, date, start: slot.start, end: slot.end,
        memberIds: selected, title, level: kind === "group" ? level : undefined, capacity: kind === "group" ? capacity : undefined,
        price, paid, useMakeup: makeupAvailable && useMakeup, displace,
      });
      if (res.ok) onCreated(res.id);
      else {
        setError(res.error);
        setDisplaceable(res.displaceable ?? null);
      }
    });

  const canSubmit = kind === "private" ? selected.length === 1 : selected.length <= capacity;

  return (
    <section className="card" aria-labelledby="form-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="form-title">{kind === "private" ? "Özel ders" : "Grup dersi"} · öğrenci ata</h2>
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

          {kind === "group" && (
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
          )}

          <div className="form-grid">
            <label className="field">
              <span className="field__label">Ücret (₺)</span>
              <input className="input" type="number" min={0} step={50} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} />
              <span className="field__hint">{kind === "group" ? "Grup dersleri genelde aylık ücretlidir; 0 bırakabilirsiniz." : "Paket dersinde 0 girin."}</span>
            </label>
          </div>
          {price > 0 && (
            <label className="check">
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
              <span>Ödeme alındı</span>
            </label>
          )}
          {makeupAvailable && (
            <label className="check">
              <input type="checkbox" checked={useMakeup} onChange={(e) => setUseMakeup(e.target.checked)} />
              <span>
                Telafi hakkından düş
                <small>Telafi hakkı olan üyelerde ders, paket hakkı yerine telafi hakkından kullanılır.</small>
              </span>
            </label>
          )}
          {levelMatches > 0 && (
            <p className="notice notice--info">{levelMatches} üyenin kayıtlı seviyesi &quot;{level}&quot; değil.</p>
          )}
        </div>

        <MemberPicker
          members={members}
          selected={selected}
          onChange={setSelected}
          max={kind === "private" ? 1 : capacity}
          label={kind === "private" ? "Öğrenci" : "Öğrenciler"}
        />
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
          <button className="btn btn--primary" type="button" disabled={pending || !canSubmit} onClick={() => submit(false)}>
            <CircleCheck className="icon" aria-hidden="true" />
            {pending ? "Kaydediliyor…" : kind === "private" ? "Özel dersi oluştur" : "Grup dersini oluştur"}
          </button>
        )}
      </div>
    </section>
  );
}
