"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clubNow, fromMinutes, weekdayOf } from "@/lib/clock";
import { formatShortDate, toMinutes } from "@/lib/format";
import { usesHalfCourt } from "@/lib/pricing";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { withDetails } from "@/server/queries/common";
import { getAvailability, getCoachOptions, type PlanDay } from "@/server/queries/planning";
import { findConflicts } from "@/server/scheduling";
import { logActivity, type ActionResult } from "./bookings";

async function loadLesson(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(s.bookings).where(eq(s.bookings.id, id));
  if (!row || row.kind === "reservation") return null;
  const [b] = await withDetails([row]);
  return b;
}

/** Aktarma penceresi: seçilen hocanın dersin süresine göre 14 günlük müsait saatleri */
export async function getTransferOptions(bookingId: number, coachId: number): Promise<{ ok: true; days: PlanDay[] } | { ok: false; error: string }> {
  const b = await loadLesson(bookingId);
  if (!b) return { ok: false, error: "Ders bulunamadı." };
  const coach = (await getCoachOptions()).find((c) => c.id === coachId);
  if (!coach || coach.onLeave) return { ok: false, error: "Bu antrenör izinli." };
  const duration = toMinutes(b.end) - toMinutes(b.start);
  const half = usesHalfCourt({ kind: b.kind, exclusive: b.exclusive, memberCount: b.members.length });
  const days = await getAvailability(coach, b.kind as "private" | "group", duration, clubNow(), b.id);
  // Paylaşımsız / çok kişilik ders, paylaşımlı kortlara aktarılamaz
  const filtered = days.map((d) => ({
    ...d,
    slots: d.slots
      .map((sl) => ({ ...sl, courts: sl.courts.filter((c) => c.state !== "shared" || half) }))
      .filter((sl) => sl.courts.length),
  }));
  return { ok: true, days: filtered };
}

const schema = z.object({
  bookingId: z.number().int(),
  coachId: z.number().int(),
  courtId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
});

/** Dersi başka antrenöre (gerekirse başka gün/saat/korta) aktarır */
export async function transferLesson(input: z.input<typeof schema>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Aktarma bilgilerini kontrol edin." };
  const d = parsed.data;
  const b = await loadLesson(d.bookingId);
  if (!b || b.status !== "scheduled") return { ok: false, error: "Yalnızca planlanmış dersler aktarılabilir." };
  const db = await getDb();
  const [coach] = await db.select().from(s.coaches).where(eq(s.coaches.id, d.coachId));
  if (!coach || coach.onLeave) return { ok: false, error: "Seçilen antrenör izinli." };
  const end = fromMinutes(toMinutes(d.start) + toMinutes(b.end) - toMinutes(b.start));
  const hours = await db.select().from(s.coachHours).where(and(eq(s.coachHours.coachId, d.coachId), eq(s.coachHours.weekday, weekdayOf(d.date))));
  if (!hours.some((h) => toMinutes(h.start) <= toMinutes(d.start) && toMinutes(end) <= toMinutes(h.end))) {
    return { ok: false, error: `${coach.name} bu saatte çalışmıyor.` };
  }
  const c = await findConflicts(db, {
    kind: b.kind, courtId: d.courtId, coachId: d.coachId, date: d.date, start: d.start, end, ignoreId: b.id,
    halfCourt: usesHalfCourt({ kind: b.kind, exclusive: b.exclusive, memberCount: b.members.length }),
  });
  if (c.blocked) return { ok: false, error: `Kort bu saatte bakımda (${c.blocked.reason}).` };
  if (c.blocking.length || c.displaceable.length) {
    return { ok: false, error: [...new Set([...c.blocking.map((x) => x.reason), ...c.displaceable.map((x) => `${x.court.name}: ${x.start}–${x.end} dolu`)])].join(" · ") };
  }
  const previous = b.coach?.name ?? "—";
  await db.update(s.bookings).set({ coachId: d.coachId, courtId: d.courtId, date: d.date, start: d.start, end }).where(eq(s.bookings.id, b.id));
  const moved = d.date !== b.date || d.start !== b.start;
  await logActivity(
    db,
    b.kind === "group" ? (b.title ?? "Grup dersi") : b.members.map((m) => m.name).join(", "),
    `dersi ${previous} → ${coach.name} aktarıldı${moved ? ` · ${formatShortDate(d.date)} ${d.start}` : ""}`,
    { memberId: b.members[0]?.id },
  );
  revalidatePath("/", "layout");
  return { ok: true };
}
