import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { cache } from "react";
import { toMinutes } from "@/lib/format";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { DEFAULT_SETTINGS } from "@/server/db/defaults";

export type Settings = typeof DEFAULT_SETTINGS;

export const getSettings = cache(async (): Promise<Settings> => {
  const db = await getDb();
  const rows = await db.select().from(s.settings);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    club: { ...DEFAULT_SETTINGS.club, ...(stored.club as object) },
    user: { ...DEFAULT_SETTINGS.user, ...(stored.user as object) },
    weather: { ...DEFAULT_SETTINGS.weather, ...(stored.weather as object) },
    hours: { ...DEFAULT_SETTINGS.hours, ...(stored.hours as object) },
  };
});

export type BookingRow = typeof s.bookings.$inferSelect;
export type MemberRow = typeof s.members.$inferSelect;
export type CoachRow = typeof s.coaches.$inferSelect;
export type CourtRow = typeof s.courts.$inferSelect;

export interface BookingDetail extends BookingRow {
  members: (Pick<MemberRow, "id" | "name" | "initials" | "tier" | "lessonCredits" | "makeupCredits"> & { arrived: boolean; usedMakeup: boolean })[];
  coach: Pick<CoachRow, "id" | "name"> | null;
  court: Pick<CourtRow, "id" | "name" | "surface" | "environment" | "balloon">;
}

/** Seansları üyeleri, antrenörü ve kortuyla birlikte yükler */
export async function withDetails(rows: BookingRow[]): Promise<BookingDetail[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const [memberRows, coachRows, courtRows] = await Promise.all([
    db
      .select({
        bookingId: s.bookingMembers.bookingId,
        arrived: s.bookingMembers.arrived,
        usedMakeup: s.bookingMembers.usedMakeup,
        id: s.members.id,
        name: s.members.name,
        initials: s.members.initials,
        tier: s.members.tier,
        lessonCredits: s.members.lessonCredits,
        makeupCredits: s.members.makeupCredits,
      })
      .from(s.bookingMembers)
      .innerJoin(s.members, eq(s.members.id, s.bookingMembers.memberId))
      .where(inArray(s.bookingMembers.bookingId, ids))
      .orderBy(asc(s.members.name)),
    db.select({ id: s.coaches.id, name: s.coaches.name }).from(s.coaches),
    db.select().from(s.courts),
  ]);
  return rows.map((r) => ({
    ...r,
    members: memberRows.filter((m) => m.bookingId === r.id),
    coach: coachRows.find((c) => c.id === r.coachId) ?? null,
    court: courtRows.find((c) => c.id === r.courtId)!,
  }));
}

/** Belirli günün iptal edilmemiş seansları (saat sırasıyla) */
export async function bookingsOn(date: string): Promise<BookingRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(s.bookings)
    .where(and(eq(s.bookings.date, date), ne(s.bookings.status, "cancelled")))
    .orderBy(asc(s.bookings.start), asc(s.bookings.courtId));
}

export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);

export const KIND_LABEL = { private: "Özel ders", group: "Grup dersi", reservation: "Rezervasyon" } as const;
export const TIER_LABEL = { premium: "Premium üye", standard: "Standart üye" } as const;
export const LEVELS = ["Başlangıç", "Orta", "İleri", "Junior", "Performans"] as const;
export const MAX_GROUP_SIZE = 6;
