"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, clubNow, weekdayOf } from "@/lib/clock";
import { formatCurrency, formatShortDate, toMinutes } from "@/lib/format";
import { bandFor, canBeExclusive, MAX_PRIVATE_PEOPLE, packagePrice, singleLessonPrice } from "@/lib/pricing";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { getPriceList } from "@/server/queries/pricing";
import { findConflicts, validTimeRange } from "@/server/scheduling";
import { logActivity, type ActionResult } from "./bookings";

const privateSchema = z.object({
  coachId: z.number().int(),
  courtId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string(),
  end: z.string(),
  memberIds: z.array(z.number().int()).min(1).max(MAX_PRIVATE_PEOPLE),
  exclusive: z.boolean().default(false),
  /** Ödeme kaynağı: yeni paket · mevcut paket · paketsiz tek ders · üyenin telafi hakkı */
  source: z.enum(["newPackage", "package", "single", "makeup"]),
  packageId: z.number().int().optional(),
  sessions: z.union([z.literal(8), z.literal(16)]).optional(),
  /** Elle girilen tutar (yeni paket toplamı ya da tek ders ücreti); boşsa fiyat listesinden */
  price: z.number().int().min(0).optional(),
  paid: z.boolean().default(false),
  /** Haftalık sabitleme: aynı gün ve saatte kaç hafta (1 = sabitleme yok) */
  weeks: z.number().int().min(1).max(16).default(1),
  /** Çakışan haftaları atlayıp kalanları oluştur */
  skipConflicts: z.boolean().default(false),
});

export type PrivateLessonInput = z.input<typeof privateSchema>;

/**
 * Özel ders(ler) oluşturur. Haftalık sabitlemede aynı gün/saatte ardışık haftalara ders açılır;
 * her ders paketten bir seans kullanır. Çakışan haftalar listelenir, onayla atlanabilir.
 */
export async function createPrivateLessons(input: PrivateLessonInput): Promise<ActionResult<{ ids: number[]; skipped: string[] }>> {
  const parsed = privateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Form bilgilerini kontrol edin." };
  const d = parsed.data;
  if (!validTimeRange(d.start, d.end)) return { ok: false, error: "Saatleri kontrol edin." };
  const db = await getDb();
  const now = clubNow();
  if (d.date < now.date || (d.date === now.date && toMinutes(d.start) < toMinutes(now.time) - 5)) {
    return { ok: false, error: "Geçmiş bir saate ders eklenemez." };
  }

  const people = d.memberIds.length;
  let exclusive = d.exclusive && canBeExclusive(people);

  const [coach] = await db.select().from(s.coaches).where(eq(s.coaches.id, d.coachId));
  if (!coach || coach.onLeave) return { ok: false, error: "Antrenör izinli." };
  const hours = await db.select().from(s.coachHours).where(and(eq(s.coachHours.coachId, d.coachId), eq(s.coachHours.weekday, weekdayOf(d.date))));
  if (!hours.some((h) => toMinutes(h.start) <= toMinutes(d.start) && toMinutes(d.end) <= toMinutes(h.end))) {
    return { ok: false, error: `${coach.name} bu saatte çalışmıyor.` };
  }

  const list = await getPriceList(d.date);
  const band = bandFor(list, d.date, d.start, d.end);

  // Ödeme kaynağına göre kontroller
  let pkg: typeof s.packages.$inferSelect | undefined;
  if (d.source === "package") {
    [pkg] = await db.select().from(s.packages).where(eq(s.packages.id, d.packageId ?? -1));
    if (!pkg || pkg.status === "cancelled") return { ok: false, error: "Paket bulunamadı." };
    const pm = await db.select().from(s.packageMembers).where(eq(s.packageMembers.packageId, pkg.id));
    const same = pm.length === people && pm.every((x) => d.memberIds.includes(x.memberId));
    if (!same) return { ok: false, error: "Seçilen öğrenciler bu paketin öğrencileriyle aynı olmalı." };
    const remaining = pkg.sessions - pkg.usedSessions;
    if (d.weeks > remaining) return { ok: false, error: `Pakette ${remaining} seans kaldı; en fazla ${remaining} hafta sabitlenebilir.` };
    exclusive = pkg.exclusive;
  } else if (d.source === "newPackage") {
    if (!d.sessions) return { ok: false, error: "Paket seans sayısını seçin (8 ya da 16)." };
    if (d.weeks > d.sessions) return { ok: false, error: `En fazla ${d.sessions} hafta sabitlenebilir.` };
  } else if (d.source === "makeup") {
    if (people !== 1) return { ok: false, error: "Telafi hakkı tek kişilik derslerde kullanılabilir." };
    const [m] = await db.select().from(s.members).where(eq(s.members.id, d.memberIds[0]));
    if (!m || m.makeupCredits < d.weeks) return { ok: false, error: `Üyenin ${m?.makeupCredits ?? 0} telafi hakkı var.` };
  }

  // Haftalar ve çakışmalar
  const dates = Array.from({ length: d.weeks }, (_, i) => addDays(d.date, i * 7));
  const conflicts: { date: string; reason: string }[] = [];
  for (const date of dates) {
    const c = await findConflicts(db, { kind: "private", courtId: d.courtId, coachId: d.coachId, date, start: d.start, end: d.end, halfCourt: people === 1 && !exclusive });
    if (c.blocked) conflicts.push({ date, reason: `Kort bakımda (${c.blocked.reason})` });
    else if (c.blocking.length) conflicts.push({ date, reason: [...new Set(c.blocking.map((x) => x.reason))].join(" · ") });
  }
  if (conflicts.length && (!d.skipConflicts || conflicts.length === dates.length)) {
    return {
      ok: false,
      error:
        conflicts.length === dates.length
          ? conflicts[0].reason
          : `${conflicts.length} haftada çakışma var. Bu haftaları atlayıp kalan ${dates.length - conflicts.length} dersi oluşturabilirsiniz.`,
      conflicts: dates.length > 1 ? conflicts : undefined,
    };
  }
  const skipped = conflicts.map((c) => c.date);
  const createDates = dates.filter((x) => !skipped.includes(x));
  const seriesId = d.weeks > 1 ? crypto.randomUUID() : null;

  // Paket oluştur / güncelle
  if (d.source === "newPackage") {
    const price = d.price ?? packagePrice(list, { band, people, sessions: d.sessions!, exclusive });
    [pkg] = await db
      .insert(s.packages)
      .values({
        coachId: d.coachId, peopleCount: people, sessions: d.sessions!, usedSessions: createDates.length, band, exclusive, price, paid: d.paid,
        fixedWeekday: d.weeks > 1 ? weekdayOf(d.date) : null, fixedStart: d.weeks > 1 ? d.start : null,
      })
      .returning();
    await db.insert(s.packageMembers).values(d.memberIds.map((memberId) => ({ packageId: pkg!.id, memberId })));
    if (d.paid && price > 0) {
      await db.insert(s.payments).values({ memberId: d.memberIds[0], amount: price, date: now.date, description: `${d.sessions} seanslık özel ders paketi (${people} kişi)` });
    }
  } else if (pkg) {
    await db
      .update(s.packages)
      .set({
        usedSessions: sql`${s.packages.usedSessions} + ${createDates.length}`,
        fixedWeekday: d.weeks > 1 ? weekdayOf(d.date) : pkg.fixedWeekday,
        fixedStart: d.weeks > 1 ? d.start : pkg.fixedStart,
      })
      .where(eq(s.packages.id, pkg.id));
  }

  const single = d.source === "single";
  const unitPrice = single ? (d.price ?? singleLessonPrice(list, { band, people, exclusive })) : 0;
  const ids: number[] = [];
  for (const date of createDates) {
    const [row] = await db
      .insert(s.bookings)
      .values({
        kind: "private", courtId: d.courtId, coachId: d.coachId, date, start: d.start, end: d.end,
        packageId: pkg?.id ?? null, exclusive, seriesId, price: unitPrice, paid: single ? d.paid || unitPrice === 0 : true,
      })
      .returning();
    ids.push(row.id);
    const usedMakeup = d.source === "makeup";
    await db.insert(s.bookingMembers).values(d.memberIds.map((memberId) => ({ bookingId: row.id, memberId, usedMakeup })));
    if (usedMakeup) {
      await db.update(s.members).set({ makeupCredits: sql`${s.members.makeupCredits} - 1` }).where(eq(s.members.id, d.memberIds[0]));
      await db.insert(s.creditTransactions).values({ memberId: d.memberIds[0], kind: "makeup_used", delta: -1, bookingId: row.id, note: "Telafi dersi" });
    }
    if (single && d.paid && unitPrice > 0) {
      await db.insert(s.payments).values({ memberId: d.memberIds[0], bookingId: row.id, amount: unitPrice, date: now.date, description: "Özel ders (tek)" });
    }
  }

  const names = await db.select({ name: s.members.name }).from(s.members).where(inArray(s.members.id, d.memberIds));
  const when = createDates.length > 1 ? `${createDates.length} hafta, her hafta ${d.start}` : `${formatShortDate(d.date)} ${d.start}`;
  await logActivity(db, names.map((n) => n.name).join(", "), `için özel ders planlandı · ${when}${d.source === "newPackage" && pkg ? ` · ${d.sessions} seanslık paket ${formatCurrency(pkg.price)}` : ""}`, { memberId: d.memberIds[0] });
  revalidatePath("/", "layout");
  return { ok: true, ids, skipped };
}

export async function markPackagePaid(id: number): Promise<ActionResult> {
  const db = await getDb();
  const [pkg] = await db.select().from(s.packages).where(eq(s.packages.id, id));
  if (!pkg || pkg.paid) return { ok: false, error: "Paket ödemesi zaten alınmış." };
  const [first] = await db.select().from(s.packageMembers).where(eq(s.packageMembers.packageId, id));
  await db.update(s.packages).set({ paid: true }).where(eq(s.packages.id, id));
  if (pkg.price > 0) {
    await db.insert(s.payments).values({ memberId: first?.memberId, amount: pkg.price, date: clubNow().date, description: `${pkg.sessions} seanslık özel ders paketi (${pkg.peopleCount} kişi)` });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
