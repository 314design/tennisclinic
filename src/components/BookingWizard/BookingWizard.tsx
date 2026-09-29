"use client";

import { ChevronLeft, ChevronRight, MousePointerClick, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { GroupLessonForm } from "@/components/LessonPlanner/GroupLessonForm";
import { PrivateLessonForm } from "@/components/LessonPlanner/PrivateLessonForm";
import { ReservationForm } from "@/components/ReservationForm/ReservationForm";
import { GridLegend, TimeGrid, type GridEvent } from "@/components/TimeGrid/TimeGrid";
import { addDays, fromMinutes, weekdayOf } from "@/lib/clock";
import { gapsOutside } from "@/lib/schedule";
import { formatDayChip, formatDayLabel, formatShortDate, toMinutes } from "@/lib/format";
import { MAX_SHARED_LESSONS, type PriceList } from "@/lib/pricing";
import type { CoachOption, MemberOption, PackageOption, PlanSlot, SlotCourtState } from "@/server/queries/planning";
import styles from "./BookingWizard.module.css";

export type WizardKind = "group" | "private" | "reservation";

export interface SlotBooking {
  id: number;
  courtId: number;
  coachId: number | null;
  start: string;
  end: string;
  kind: "group" | "private" | "reservation";
  half: boolean;
}

interface Props {
  kind: WizardKind;
  date: string;
  today: string;
  nowTime: string;
  duration: number;
  coachId: number | null;
  initial: { courtId?: number; start?: string };
  open: string;
  close: string;
  courts: { id: number; name: string; label: string }[];
  bookings: SlotBooking[];
  blocks: { courtId: number; start: string; end: string }[];
  events: GridEvent[];
  coaches: CoachOption[];
  members: MemberOption[];
  packages: PackageOption[];
  priceList: PriceList;
  levels: readonly string[];
  /** Üye Ekle → "Grup olarak ekle" ile gelen, önceden seçili üyeler */
  initialMembers?: number[];
}

const KINDS: { key: WizardKind; label: string; param: string }[] = [
  { key: "group", label: "Grup dersi", param: "grup" },
  { key: "private", label: "Özel ders", param: "ozel" },
  { key: "reservation", label: "Kort kiralama", param: "kiralama" },
];

const overlap = (a1: string, a2: string, b1: string, b2: string) => toMinutes(a1) < toMinutes(b2) && toMinutes(b1) < toMinutes(a2);

export function BookingWizard(props: Props) {
  const { kind, date, today, nowTime, duration, coachId, courts, bookings, blocks, coaches, open, close } = props;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selection, setSelection] = useState<{ columnId: string; start: string } | null>(
    props.initial.courtId && props.initial.start ? { columnId: String(props.initial.courtId), start: props.initial.start } : null,
  );

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const isLesson = kind !== "reservation";
  const coach = coaches.find((c) => c.id === coachId) ?? null;

  /** Antrenörün bu gün çalışamadığı / dolu olduğu aralıklar */
  const coachBlocked = useMemo(() => {
    if (!isLesson || !coach) return [];
    if (coach.onLeave) return [{ start: open, end: close }];
    const gaps = gapsOutside(coach.hours.filter((h) => h.weekday === weekdayOf(date)), open, close);
    const busy = bookings.filter((b) => b.coachId === coach.id).map((b) => ({ start: b.start, end: b.end }));
    return [...gaps, ...busy];
  }, [isLesson, coach, date, open, close, bookings]);

  /** Seçilen saatte kortun durumu (null = uygun değil) */
  const courtState = (courtId: number, start: string): SlotCourtState | null => {
    const end = fromMinutes(toMinutes(start) + duration);
    if (toMinutes(end) > toMinutes(close)) return null;
    if (date === today && toMinutes(start) <= toMinutes(nowTime)) return null;
    if (blocks.some((k) => k.courtId === courtId && overlap(k.start, k.end, start, end))) return null;
    if (isLesson && (!coach || coachBlocked.some((u) => overlap(u.start, u.end, start, end)))) return null;
    const clashes = bookings.filter((b) => b.courtId === courtId && overlap(b.start, b.end, start, end));
    if (!clashes.length) return "free";
    if (kind === "group" && clashes.every((b) => b.kind !== "group")) return "displaceable";
    if (kind === "private" && clashes.every((b) => b.half) && clashes.length < MAX_SHARED_LESSONS) return "shared";
    return null;
  };

  const slot: PlanSlot | null = useMemo(() => {
    if (!selection) return null;
    const end = fromMinutes(toMinutes(selection.start) + duration);
    const list = courts
      .map((c) => ({ c, state: courtState(c.id, selection.start) }))
      .filter((x): x is { c: (typeof courts)[number]; state: SlotCourtState } => x.state !== null)
      .map(({ c, state }) => ({
        id: c.id, name: c.name, label: c.label, state,
        conflict: state === "free" ? undefined : bookings.filter((b) => b.courtId === c.id && overlap(b.start, b.end, selection.start, end)).map((b) => `${b.start}–${b.end} ${b.kind === "private" ? (state === "shared" ? "paylaşımlı özel ders" : "özel ders") : "kiralama"}`).join(", "),
      }));
    if (!list.some((c) => String(c.id) === selection.columnId)) return null;
    return { start: selection.start, end, courts: list };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, duration, kind, coach, bookings, blocks, date]);

  // Seçili günün 3 gün öncesinden başlayan 14 günlük şerit (bugünden geriye gitmez)
  const stripStart = addDays(date, -3) < today ? today : addDays(date, -3);
  const days = Array.from({ length: 14 }, (_, i) => addDays(stripStart, i));
  const selectedCourt = slot && courts.find((c) => String(c.id) === selection?.columnId);
  const onCreated = (id: number) => router.push(`/seanslar/${id}`);

  return (
    <div className={styles.wizard}>
      <section className="card">
        <div className={styles.controls}>
          <fieldset className={styles.fieldset}>
            <legend className="field__label">Rezervasyon türü</legend>
            <div className="pills">
              {KINDS.map((k) => (
                <label key={k.key} className="pill">
                  <input type="radio" name="kind" checked={kind === k.key} onChange={() => { setSelection(null); setParams({ tur: k.param, sure: null }); }} />
                  <span>
                    <i className={`${styles.swatch} ${styles[k.key]}`} aria-hidden="true" />
                    {k.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {isLesson && (
            <label className={`field ${styles.coachField}`}>
              <span className="field__label">Antrenör</span>
              <select className="select" value={coachId ?? ""} onChange={(e) => { setSelection(null); setParams({ hoca: e.target.value || null }); }}>
                <option value="">Antrenör seçin</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.onLeave}>
                    {c.name}{c.onLeave ? " (izinli)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <fieldset className={styles.fieldset}>
            <legend className="field__label">Süre</legend>
            <div className="pills">
              {[60, 90, 120].map((d) => (
                <label key={d} className="pill">
                  <input type="radio" name="duration" checked={duration === d} onChange={() => setParams({ sure: String(d) })} />
                  <span>{d} dk</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="card" aria-labelledby="pick-title">
        <header className="card__head">
          <div>
            <h2 className="card__title" id="pick-title">Tarih ve saat</h2>
            <p className="card__meta">
              {formatDayLabel(date, today)} · {formatShortDate(date)} · {isLesson && !coach ? "önce antrenör seçin" : "boş bir saate tıklayın"}
            </p>
          </div>
        </header>
        <div className={styles.days}>
          <button className="icon-btn icon-btn--sm" type="button" aria-label="Önceki gün" disabled={date <= today} onClick={() => { setSelection(null); setParams({ tarih: addDays(date, -1) }); }}>
            <ChevronLeft className="icon" aria-hidden="true" />
          </button>
          {days.map((d) => {
            const chip = formatDayChip(d);
            return (
              <button key={d} type="button" className={styles.day} aria-pressed={d === date} onClick={() => { setSelection(null); setParams({ tarih: d }); }}>
                <span>{d === today ? "Bugün" : chip.weekday}</span>
                <strong>{chip.day}</strong>
              </button>
            );
          })}
          <button className="icon-btn icon-btn--sm" type="button" aria-label="Sonraki gün" onClick={() => { setSelection(null); setParams({ tarih: addDays(date, 1) }); }}>
            <ChevronRight className="icon" aria-hidden="true" />
          </button>
        </div>
        <GridLegend />
        <TimeGrid
          open={open}
          close={close}
          columns={courts.map((c) => ({ id: String(c.id), title: c.name, subtitle: c.label, unavailable: coachBlocked, now: date === today }))}
          events={props.events}
          nowTime={date === today ? nowTime : undefined}
          pick={{
            duration,
            canStart: (col, start) => courtState(Number(col), start) !== null,
            onPick: (col, start) => setSelection({ columnId: col, start }),
            selected: selection,
          }}
        />
      </section>

      {!!props.initialMembers?.length && (
        <p className="notice notice--info">
          <Users className="icon" aria-hidden="true" />
          <span>
            {props.members.filter((m) => props.initialMembers!.includes(m.id)).map((m) => m.name).join(", ")} seçili gelecek
            {kind === "private" && props.initialMembers.length > 5 ? " (özel ders en fazla 5 kişi; ilk 5 kişi seçilir)" : ""}.
          </span>
        </p>
      )}
      {!slot ? (
        <p className={styles.hint}>
          <MousePointerClick className="icon" aria-hidden="true" />
          {isLesson && !coach ? "Antrenör seçince çalışma saatleri dışı ve dolu saatleri gölgeli görünür." : "Takvimde boş bir saate tıklayarak kortu ve başlangıç saatini seçin."}
        </p>
      ) : kind === "reservation" && selectedCourt ? (
        <ReservationForm
          initialSelected={props.initialMembers}
          key={`${date}-${selection?.columnId}-${slot.start}-${duration}`}
          court={selectedCourt}
          date={date}
          today={today}
          start={slot.start}
          end={slot.end}
          members={props.members}
          priceList={props.priceList}
          onCreated={onCreated}
        />
      ) : kind === "private" && coach ? (
        <PrivateLessonForm
          initialSelected={props.initialMembers}
          key={`${date}-${selection?.columnId}-${slot.start}-${duration}`}
          coach={coach}
          date={date}
          today={today}
          slot={slot}
          members={props.members}
          packages={props.packages}
          priceList={props.priceList}
          defaultCourtId={Number(selection?.columnId)}
          onCreated={onCreated}
        />
      ) : kind === "group" && coach ? (
        <GroupLessonForm
          initialSelected={props.initialMembers}
          key={`${date}-${selection?.columnId}-${slot.start}-${duration}`}
          coach={coach}
          date={date}
          today={today}
          slot={slot}
          members={props.members}
          levels={props.levels}
          perPersonFee={props.priceList.groupPerPerson}
          defaultCourtId={Number(selection?.columnId)}
          onCreated={onCreated}
        />
      ) : null}
    </div>
  );
}
