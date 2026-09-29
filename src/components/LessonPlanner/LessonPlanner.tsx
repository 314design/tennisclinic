"use client";

import { CalendarClock, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatDayChip, formatDayLabel, formatShortDate } from "@/lib/format";
import type { PriceList } from "@/lib/pricing";
import type { CoachOption, GroupLesson, MemberOption, PackageOption, PlanDay, PlanSlot } from "@/server/queries/planning";
import { GroupLessonForm } from "./GroupLessonForm";
import { GroupLessons } from "./GroupLessons";
import { PrivateLessonForm } from "./PrivateLessonForm";
import styles from "./LessonPlanner.module.css";

const WEEKDAYS = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
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
  packages: PackageOption[];
  priceList: PriceList;
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
                      const onlyShared = sl.courts.every((c) => c.state === "shared");
                      return (
                        <button
                          key={sl.start}
                          type="button"
                          className={`${styles.slot} ${onlyDisplace ? styles.slotWarn : ""} ${onlyShared ? styles.slotShared : ""}`}
                          aria-pressed={slot?.start === sl.start}
                          onClick={() => setSlot(sl)}
                          title={sl.courts.map((c) => `${c.name}${c.conflict ? ` (${c.conflict})` : ""}`).join(", ")}
                        >
                          <strong>{sl.start}</strong>
                          <span>{onlyShared ? "paylaşımlı" : `${sl.courts.length} kort`}</span>
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
            kind === "private" ? (
              <PrivateLessonForm
                key={`${activeDay.date}-${slot.start}`}
                coach={coach}
                date={activeDay.date}
                today={today}
                slot={slot}
                members={members}
                packages={props.packages}
                priceList={props.priceList}
                onCreated={(id) => router.push(`/seanslar/${id}`)}
              />
            ) : (
              <GroupLessonForm
                key={`${activeDay.date}-${slot.start}`}
                coach={coach}
                date={activeDay.date}
                today={today}
                slot={slot}
                members={members}
                levels={levels}
                perPersonFee={props.priceList.groupPerPerson}
                onCreated={(id) => router.push(`/seanslar/${id}`)}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
