import "server-only";
import { and, asc, between, eq, gte, ne } from "drizzle-orm";
import { addDays, fromMinutes, weekdayOf } from "@/lib/clock";
import { environmentLabel } from "@/lib/courts";
import { toMinutes } from "@/lib/format";
import type { Now } from "@/lib/types";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { overlaps, withDetails } from "./common";

export const PLAN_DAYS = 14;
const STEP = 30;

export type SlotCourtState = "free" | "displaceable";

export interface PlanSlot {
  start: string;
  end: string;
  courts: { id: number; name: string; label: string; state: SlotCourtState; conflict?: string }[];
}

export interface PlanDay {
  date: string;
  slots: PlanSlot[];
}

export interface CoachOption {
  id: number;
  name: string;
  role: string | null;
  onLeave: boolean;
  hours: { weekday: number; start: string; end: string }[];
}

export async function getCoachOptions(): Promise<CoachOption[]> {
  const db = await getDb();
  const [coaches, hours] = await Promise.all([
    db.select().from(s.coaches).where(eq(s.coaches.active, true)).orderBy(asc(s.coaches.name)),
    db.select().from(s.coachHours).orderBy(asc(s.coachHours.weekday), asc(s.coachHours.start)),
  ]);
  return coaches.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    onLeave: c.onLeave,
    hours: hours.filter((h) => h.coachId === c.id).map(({ weekday, start, end }) => ({ weekday, start, end })),
  }));
}

/**
 * Antrenörün önümüzdeki günlerdeki müsait saatleri.
 * Özel ders: yalnızca tamamen boş kortlar.
 * Grup dersi: boş kortlar + yalnızca özel ders/kiralama olan kortlar (grup önceliği; onayla iptal edilir).
 */
export async function getAvailability(coach: CoachOption, kind: "private" | "group", duration: number, now: Now): Promise<PlanDay[]> {
  const db = await getDb();
  const to = addDays(now.date, PLAN_DAYS - 1);
  const [courts, bookings, blocks] = await Promise.all([
    db.select().from(s.courts).where(eq(s.courts.active, true)).orderBy(asc(s.courts.sortOrder)),
    db.select().from(s.bookings).where(and(between(s.bookings.date, now.date, to), ne(s.bookings.status, "cancelled"))),
    db.select().from(s.courtBlocks).where(between(s.courtBlocks.date, now.date, to)),
  ]);

  const days: PlanDay[] = [];
  for (let i = 0; i < PLAN_DAYS; i++) {
    const date = addDays(now.date, i);
    const windows = coach.hours.filter((h) => h.weekday === weekdayOf(date));
    const dayBookings = bookings.filter((b) => b.date === date);
    const dayBlocks = blocks.filter((k) => k.date === date);
    const slots: PlanSlot[] = [];

    for (const w of windows) {
      for (let m = toMinutes(w.start); m + duration <= toMinutes(w.end); m += STEP) {
        if (date === now.date && m <= toMinutes(now.time)) continue;
        const start = fromMinutes(m);
        const end = fromMinutes(m + duration);
        // Antrenör başka bir derste mi?
        if (dayBookings.some((b) => b.coachId === coach.id && overlaps(b.start, b.end, start, end))) continue;

        const courtStates: PlanSlot["courts"] = [];
        for (const c of courts) {
          if (dayBlocks.some((k) => k.courtId === c.id && overlaps(k.start, k.end, start, end))) continue;
          const clashes = dayBookings.filter((b) => b.courtId === c.id && overlaps(b.start, b.end, start, end));
          const base = { id: c.id, name: c.name, label: environmentLabel(c) };
          if (!clashes.length) courtStates.push({ ...base, state: "free" });
          else if (kind === "group" && clashes.every((b) => b.kind !== "group")) {
            courtStates.push({
              ...base,
              state: "displaceable",
              conflict: clashes.map((b) => `${b.start}–${b.end} ${b.kind === "private" ? "özel ders" : "kiralama"}`).join(", "),
            });
          }
        }
        if (courtStates.length) slots.push({ start, end, courts: courtStates });
      }
    }
    days.push({ date, slots });
  }
  return days;
}

export interface GroupLesson {
  id: number;
  date: string;
  start: string;
  end: string;
  title: string;
  level: string | null;
  capacity: number;
  courtName: string;
  members: { id: number; name: string }[];
}

/** Antrenörün yaklaşan grup dersleri (seviye ve doluluk ile) */
export async function getCoachGroups(coachId: number, now: Now): Promise<GroupLesson[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(s.bookings)
    .where(
      and(
        eq(s.bookings.coachId, coachId),
        eq(s.bookings.kind, "group"),
        ne(s.bookings.status, "cancelled"),
        ne(s.bookings.status, "completed"),
        gte(s.bookings.date, now.date),
        between(s.bookings.date, now.date, addDays(now.date, PLAN_DAYS - 1)),
      ),
    )
    .orderBy(asc(s.bookings.date), asc(s.bookings.start));
  const detailed = await withDetails(rows);
  return detailed.map((b) => ({
    id: b.id,
    date: b.date,
    start: b.start,
    end: b.end,
    title: b.title ?? "Grup dersi",
    level: b.level,
    capacity: b.capacity ?? 6,
    courtName: b.court.name,
    members: b.members.map((m) => ({ id: m.id, name: m.name })),
  }));
}

export interface MemberOption {
  id: number;
  name: string;
  initials: string;
  level: string | null;
  lessonCredits: number;
  makeupCredits: number;
}

export async function getMemberOptions(): Promise<MemberOption[]> {
  const db = await getDb();
  return db
    .select({
      id: s.members.id,
      name: s.members.name,
      initials: s.members.initials,
      level: s.members.level,
      lessonCredits: s.members.lessonCredits,
      makeupCredits: s.members.makeupCredits,
    })
    .from(s.members)
    .orderBy(asc(s.members.name));
}

export async function getBookingDetail(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(s.bookings).where(eq(s.bookings.id, id));
  if (!row) return null;
  const [detail] = await withDetails([row]);
  return detail;
}
