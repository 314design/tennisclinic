import "server-only";
import { and, asc, between, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { addDays, fromMinutes, weekdayOf } from "@/lib/clock";
import { environmentLabel } from "@/lib/courts";
import { toMinutes } from "@/lib/format";
import { MAX_SHARED_LESSONS, usesHalfCourt, type PriceBand } from "@/lib/pricing";
import type { Now } from "@/lib/types";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { overlaps, withDetails } from "./common";

export const PLAN_DAYS = 14;
const STEP = 30;

/** free: boş · shared: 1 kişilik paylaşımlı özel dersle paylaşılabilir · displaceable: grup önceliğiyle boşaltılabilir */
export type SlotCourtState = "free" | "shared" | "displaceable";

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
export async function getAvailability(
  coach: CoachOption,
  kind: "private" | "group",
  duration: number,
  now: Now,
  /** Aktarılan dersin kendisi çakışma sayılmasın */
  ignoreBookingId?: number,
): Promise<PlanDay[]> {
  const db = await getDb();
  const to = addDays(now.date, PLAN_DAYS - 1);
  const [courts, bookings, blocks] = await Promise.all([
    db.select().from(s.courts).where(eq(s.courts.active, true)).orderBy(asc(s.courts.sortOrder)),
    db
      .select()
      .from(s.bookings)
      .where(and(between(s.bookings.date, now.date, to), ne(s.bookings.status, "cancelled")))
      .then((rows) => rows.filter((b) => b.id !== ignoreBookingId)),
    db.select().from(s.courtBlocks).where(between(s.courtBlocks.date, now.date, to)),
  ]);
  // Kort paylaşımı için ders başına öğrenci sayısı
  const counts = bookings.length
    ? await db
        .select({ id: s.bookingMembers.bookingId, n: sql<number>`count(*)::int` })
        .from(s.bookingMembers)
        .where(inArray(s.bookingMembers.bookingId, bookings.map((b) => b.id)))
        .groupBy(s.bookingMembers.bookingId)
    : [];
  const half = (b: (typeof bookings)[number]) =>
    usesHalfCourt({ kind: b.kind, exclusive: b.exclusive, memberCount: counts.find((c) => c.id === b.id)?.n ?? 0 });

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
          else if (kind === "private" && clashes.every(half) && clashes.length < MAX_SHARED_LESSONS) {
            courtStates.push({ ...base, state: "shared", conflict: `${clashes[0].start}–${clashes[0].end} paylaşımlı özel ders` });
          }
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

export interface PackageOption {
  id: number;
  memberIds: number[];
  memberNames: string[];
  coachName: string | null;
  peopleCount: number;
  sessions: number;
  remaining: number;
  makeupSessions: number;
  band: PriceBand;
  exclusive: boolean;
  price: number;
  paid: boolean;
  fixed: { weekday: number; start: string } | null;
  createdAt: string;
}

/** Özel ders paketleri (varsayılan: seansı kalan aktif paketler) */
export async function getPackages(opts: { memberId?: number; activeOnly?: boolean } = { activeOnly: true }): Promise<PackageOption[]> {
  const db = await getDb();
  let rows = await db.select().from(s.packages).orderBy(asc(s.packages.createdAt));
  if (opts.activeOnly) rows = rows.filter((p) => p.status === "active" && p.usedSessions < p.sessions);
  if (!rows.length) return [];
  const [links, coaches] = await Promise.all([
    db
      .select({ packageId: s.packageMembers.packageId, id: s.members.id, name: s.members.name })
      .from(s.packageMembers)
      .innerJoin(s.members, eq(s.members.id, s.packageMembers.memberId))
      .where(inArray(s.packageMembers.packageId, rows.map((r) => r.id))),
    db.select({ id: s.coaches.id, name: s.coaches.name }).from(s.coaches),
  ]);
  return rows
    .map((p) => {
      const ms = links.filter((l) => l.packageId === p.id);
      return {
        id: p.id,
        memberIds: ms.map((m) => m.id),
        memberNames: ms.map((m) => m.name),
        coachName: coaches.find((c) => c.id === p.coachId)?.name ?? null,
        peopleCount: p.peopleCount,
        sessions: p.sessions,
        remaining: p.sessions - p.usedSessions,
        makeupSessions: p.makeupSessions,
        band: p.band,
        exclusive: p.exclusive,
        price: p.price,
        paid: p.paid,
        fixed: p.fixedWeekday && p.fixedStart ? { weekday: p.fixedWeekday, start: p.fixedStart } : null,
        createdAt: p.createdAt.toISOString().slice(0, 10),
      };
    })
    .filter((p) => !opts.memberId || p.memberIds.includes(opts.memberId));
}

export interface OpenLesson {
  id: number;
  kind: "private" | "group";
  date: string;
  start: string;
  end: string;
  title: string;
  courtName: string;
  coachId: number;
  coachName: string;
  /** Kortu paylaşabilir mi (1 kişilik paylaşımlı özel ders) */
  half: boolean;
}

/** İzinli antrenörlerin bugünden sonraki planlanmış dersleri (başka hocaya aktarılmayı bekleyen) */
export async function getOpenLessons(now: Now, coachId?: number): Promise<OpenLesson[]> {
  const db = await getDb();
  const leave = await db.select().from(s.coaches).where(eq(s.coaches.onLeave, true));
  const ids = leave.map((c) => c.id).filter((id) => !coachId || id === coachId);
  if (!ids.length) return [];
  const rows = await db
    .select()
    .from(s.bookings)
    .where(and(inArray(s.bookings.coachId, ids), eq(s.bookings.status, "scheduled"), gte(s.bookings.date, now.date)))
    .orderBy(asc(s.bookings.date), asc(s.bookings.start));
  const detailed = (await withDetails(rows)).filter((b) => b.date > now.date || toMinutes(b.start) > toMinutes(now.time));
  return detailed.map((b) => ({
    id: b.id,
    kind: b.kind as "private" | "group",
    date: b.date,
    start: b.start,
    end: b.end,
    title: b.kind === "group" ? (b.title ?? "Grup dersi") : b.members.map((m) => m.name).join(", "),
    courtName: b.court.name,
    coachId: b.coachId!,
    coachName: b.coach?.name ?? "",
    half: usesHalfCourt({ kind: b.kind, exclusive: b.exclusive, memberCount: b.members.length }),
  }));
}

export interface GroupSeries {
  key: string;
  title: string;
  level: string | null;
  coachName: string;
  courtName: string;
  weekday: number;
  start: string;
  end: string;
  sessions: { id: number; date: string; capacity: number; members: { id: number; name: string }[] }[];
}

/**
 * Önümüzdeki 4 haftanın grup dersleri; aynı antrenör + gün + saat + ad
 * ile tekrarlayan dersler tek grup (seri) olarak toplanır.
 */
export async function getGroupSeries(now: Now): Promise<GroupSeries[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(s.bookings)
    .where(
      and(
        eq(s.bookings.kind, "group"),
        ne(s.bookings.status, "cancelled"),
        ne(s.bookings.status, "completed"),
        between(s.bookings.date, now.date, addDays(now.date, 27)),
      ),
    )
    .orderBy(asc(s.bookings.date), asc(s.bookings.start));
  const upcoming = rows.filter((b) => b.date > now.date || toMinutes(b.start) > toMinutes(now.time));
  const detailed = await withDetails(upcoming);
  const series = new Map<string, GroupSeries>();
  for (const b of detailed) {
    const title = b.title ?? "Grup dersi";
    const key = `${b.coachId}|${weekdayOf(b.date)}|${b.start}|${title}`;
    let g = series.get(key);
    if (!g) {
      g = {
        key, title, level: b.level, coachName: b.coach?.name ?? "Antrenör yok", courtName: b.court.name,
        weekday: weekdayOf(b.date), start: b.start, end: b.end, sessions: [],
      };
      series.set(key, g);
    }
    g.sessions.push({ id: b.id, date: b.date, capacity: b.capacity ?? 6, members: b.members.map((m) => ({ id: m.id, name: m.name })) });
  }
  return [...series.values()];
}
