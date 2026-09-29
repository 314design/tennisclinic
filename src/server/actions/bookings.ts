"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clubNow, weekdayOf } from "@/lib/clock";
import { toMinutes } from "@/lib/format";
import { getDb, type Db } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { KIND_LABEL, MAX_GROUP_SIZE, withDetails, type BookingDetail } from "@/server/queries/common";
import { findConflicts, validTimeRange } from "@/server/scheduling";
import { CANCEL_REASONS, type CancelReason } from "@/lib/booking";

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string; displaceable?: { id: number; label: string }[]; conflicts?: { date: string; reason: string }[] };

const refresh = () => revalidatePath("/", "layout");

export async function logActivity(db: Db, subject: string, text: string, opts: { memberId?: number; tone?: "default" | "danger" } = {}) {
  await db.insert(s.activities).values({ subject, text, memberId: opts.memberId, tone: opts.tone ?? "default" });
}

const bookingLabel = (b: Pick<BookingDetail, "kind" | "title" | "members">) =>
  b.kind === "group" ? (b.title ?? "Grup dersi") : (b.members.map((m) => m.name).join(", ") || KIND_LABEL[b.kind]);

async function loadBooking(db: Db, id: number) {
  const [row] = await db.select().from(s.bookings).where(eq(s.bookings.id, id));
  if (!row) return null;
  const [detail] = await withDetails([row]);
  return detail;
}

/** Ders hakkı düş: telafi istendiyse ve varsa telafiden, yoksa paketten */
export async function consumeCredit(db: Db, memberId: number, bookingId: number, preferMakeup: boolean) {
  const [m] = await db.select().from(s.members).where(eq(s.members.id, memberId));
  const useMakeup = preferMakeup && m.makeupCredits > 0;
  if (useMakeup) {
    await db.update(s.members).set({ makeupCredits: sql`${s.members.makeupCredits} - 1` }).where(eq(s.members.id, memberId));
    await db.insert(s.creditTransactions).values({ memberId, kind: "makeup_used", delta: -1, bookingId, note: "Telafi dersi" });
  } else {
    await db.update(s.members).set({ lessonCredits: sql`${s.members.lessonCredits} - 1` }).where(eq(s.members.id, memberId));
    await db.insert(s.creditTransactions).values({ memberId, kind: "lesson_used", delta: -1, bookingId });
  }
  return useMakeup;
}

async function cancelInternal(db: Db, booking: BookingDetail, reason: CancelReason, note: string | null, grantMakeup: boolean) {
  await db
    .update(s.bookings)
    .set({ status: "cancelled", cancelReason: reason, cancelNote: note, cancelledAt: new Date() })
    .where(eq(s.bookings.id, booking.id));
  // Kiralamalarda ders hakkı kullanılmaz; telafi yalnızca derslerde verilir
  const makeup = grantMakeup && booking.kind !== "reservation";
  if (makeup && booking.packageId) {
    // Paket dersi: seans pakete telafi olarak iade edilir
    await db
      .update(s.packages)
      .set({ usedSessions: sql`greatest(${s.packages.usedSessions} - 1, 0)`, makeupSessions: sql`${s.packages.makeupSessions} + 1`, status: "active" })
      .where(eq(s.packages.id, booking.packageId));
    for (const m of booking.members) {
      await db.insert(s.creditTransactions).values({
        memberId: m.id, kind: "makeup_granted", delta: 1, bookingId: booking.id,
        note: `${CANCEL_REASONS[reason]} nedeniyle iptal · seans pakete iade edildi`,
      });
    }
  } else if (makeup) {
    for (const m of booking.members) {
      await db.update(s.members).set({ makeupCredits: sql`${s.members.makeupCredits} + 1` }).where(eq(s.members.id, m.id));
      await db.insert(s.creditTransactions).values({
        memberId: m.id, kind: "makeup_granted", delta: 1, bookingId: booking.id,
        note: `${CANCEL_REASONS[reason]} nedeniyle iptal`,
      });
    }
  }
  await logActivity(
    db,
    bookingLabel(booking),
    `${KIND_LABEL[booking.kind].toLocaleLowerCase("tr-TR")} iptal edildi · ${CANCEL_REASONS[reason]}${makeup ? " · telafi hakkı verildi" : ""}`,
    { memberId: booking.members[0]?.id, tone: "danger" },
  );
}

/* ---------- Durum değişiklikleri ---------- */

export async function startBooking(id: number): Promise<ActionResult> {
  const db = await getDb();
  const b = await loadBooking(db, id);
  if (!b || b.status !== "scheduled") return { ok: false, error: "Seans başlatılamadı." };
  await db.update(s.bookings).set({ status: "in_progress", startedAt: new Date() }).where(eq(s.bookings.id, id));
  await db.update(s.bookingMembers).set({ arrived: true }).where(eq(s.bookingMembers.bookingId, id));
  refresh();
  return { ok: true };
}

export async function finishBooking(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.update(s.bookings).set({ status: "completed" }).where(and(eq(s.bookings.id, id), eq(s.bookings.status, "in_progress")));
  refresh();
  return { ok: true };
}

const cancelSchema = z.object({
  id: z.number().int(),
  reason: z.enum(Object.keys(CANCEL_REASONS) as [CancelReason, ...CancelReason[]]),
  note: z.string().max(300).optional(),
  grantMakeup: z.boolean(),
});

export async function cancelBooking(input: z.infer<typeof cancelSchema>): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz iptal bilgisi." };
  const db = await getDb();
  const b = await loadBooking(db, parsed.data.id);
  if (!b || b.status === "cancelled" || b.status === "completed") return { ok: false, error: "Bu seans iptal edilemez." };
  await cancelInternal(db, b, parsed.data.reason, parsed.data.note?.trim() || null, parsed.data.grantMakeup);
  refresh();
  return { ok: true };
}

export async function markPaid(id: number): Promise<ActionResult> {
  const db = await getDb();
  const b = await loadBooking(db, id);
  if (!b || b.paid) return { ok: false, error: "Ödeme zaten alınmış." };
  await db.update(s.bookings).set({ paid: true }).where(eq(s.bookings.id, id));
  if (b.price > 0) {
    await db.insert(s.payments).values({
      memberId: b.members[0]?.id, bookingId: b.id, amount: b.price, date: clubNow().date,
      description: `${KIND_LABEL[b.kind]} · ${b.date} ${b.start}`,
    });
  }
  refresh();
  return { ok: true };
}

/* ---------- Oluşturma ---------- */

const baseSchema = z.object({
  courtId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string(),
  end: z.string(),
  memberIds: z.array(z.number().int()).max(MAX_GROUP_SIZE),
  price: z.number().int().min(0).default(0),
  paid: z.boolean().default(true),
});

const lessonSchema = baseSchema.extend({
  kind: z.literal("group"),
  coachId: z.number().int(),
  title: z.string().max(80).optional(),
  level: z.string().max(40).optional(),
  capacity: z.number().int().min(1).max(MAX_GROUP_SIZE).optional(),
  useMakeup: z.boolean().default(false),
  /** Grup dersi önceliği: çakışan özel dersleri telafiyle iptal et */
  displace: z.boolean().default(false),
});

type SlotCheck =
  | { error: string; displaceable?: { id: number; label: string }[] }
  | { error?: undefined; displaceable: BookingDetail[] };

export async function checkSlot(db: Db, req: Parameters<typeof findConflicts>[1], displace: boolean): Promise<SlotCheck> {
  if (!validTimeRange(req.start, req.end)) return { error: "Başlangıç ve bitiş saatlerini kontrol edin." };
  const now = clubNow();
  if (req.date < now.date || (req.date === now.date && toMinutes(req.start) < toMinutes(now.time) - 5)) {
    return { error: "Geçmiş bir saate seans eklenemez." };
  }
  const c = await findConflicts(db, req);
  if (c.blocked) return { error: `Kort bu saatte bakımda (${c.blocked.reason}, ${c.blocked.start}–${c.blocked.end}).` };
  if (c.blocking.length) return { error: [...new Set(c.blocking.map((x) => x.reason))].join(" · ") };
  if (c.displaceable.length && !displace) {
    return {
      error: "Bu saatte aynı kortta özel ders/kiralama var. Grup dersleri önceliklidir; onaylarsanız bu seanslar iptal edilir ve üyelere telafi hakkı verilir.",
      displaceable: c.displaceable.map((b) => ({ id: b.id, label: `${b.start}–${b.end} · ${bookingLabel(b)}` })),
    };
  }
  return { displaceable: c.displaceable };
}

export async function createLesson(input: z.input<typeof lessonSchema>): Promise<ActionResult<{ id: number }>> {
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Form bilgilerini kontrol edin." };
  const d = parsed.data;
  const db = await getDb();

  const [coach] = await db.select().from(s.coaches).where(eq(s.coaches.id, d.coachId));
  if (!coach || coach.onLeave) return { ok: false, error: "Antrenör bu tarihte ders veremiyor (izinli)." };
  const hours = await db
    .select()
    .from(s.coachHours)
    .where(and(eq(s.coachHours.coachId, d.coachId), eq(s.coachHours.weekday, weekdayOf(d.date))));
  const inHours = hours.some((h) => toMinutes(h.start) <= toMinutes(d.start) && toMinutes(d.end) <= toMinutes(h.end));
  if (!inHours) return { ok: false, error: `${coach.name} bu saatte çalışmıyor.` };

  const capacity = d.capacity ?? MAX_GROUP_SIZE;
  if (d.memberIds.length > capacity) return { ok: false, error: `Bu ders en fazla ${capacity} kişilik.` };
  if (!d.level) return { ok: false, error: "Grup dersi için seviye seçin." };

  const slot = await checkSlot(db, { kind: d.kind, courtId: d.courtId, coachId: d.coachId, date: d.date, start: d.start, end: d.end }, d.displace);
  if (slot.error !== undefined) return { ok: false, error: slot.error, displaceable: slot.displaceable };

  for (const b of slot.displaceable) await cancelInternal(db, b, "group_priority", null, true);

  const [row] = await db
    .insert(s.bookings)
    .values({
      kind: d.kind, courtId: d.courtId, coachId: d.coachId, date: d.date, start: d.start, end: d.end,
      title: d.title?.trim() || `${d.level} grubu`,
      level: d.level,
      capacity,
      price: d.price, paid: d.paid || d.price === 0,
    })
    .returning();

  for (const memberId of d.memberIds) {
    const usedMakeup = await consumeCredit(db, memberId, row.id, d.useMakeup);
    await db.insert(s.bookingMembers).values({ bookingId: row.id, memberId, usedMakeup });
  }
  if (d.paid && d.price > 0) {
    await db.insert(s.payments).values({ memberId: d.memberIds[0], bookingId: row.id, amount: d.price, date: clubNow().date, description: KIND_LABEL[d.kind] });
  }
  const [detail] = await withDetails([row]);
  await logActivity(db, bookingLabel(detail), `için ${KIND_LABEL[d.kind].toLocaleLowerCase("tr-TR")} planlandı · ${d.date.slice(8)}.${d.date.slice(5, 7)} ${d.start}`, { memberId: d.memberIds[0] });
  refresh();
  return { ok: true, id: row.id };
}

const reservationSchema = baseSchema.extend({
  format: z.enum(["singles", "doubles"]).default("singles"),
});

export async function createReservation(input: z.input<typeof reservationSchema>): Promise<ActionResult<{ id: number }>> {
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Form bilgilerini kontrol edin." };
  const d = parsed.data;
  if (d.memberIds.length < 1 || d.memberIds.length > 4) return { ok: false, error: "1–4 oyuncu seçin." };
  const db = await getDb();
  const slot = await checkSlot(db, { kind: "reservation", courtId: d.courtId, date: d.date, start: d.start, end: d.end }, false);
  if (slot.error !== undefined) return { ok: false, error: slot.error };

  const [row] = await db
    .insert(s.bookings)
    .values({ kind: "reservation", courtId: d.courtId, date: d.date, start: d.start, end: d.end, format: d.format, price: d.price, paid: d.paid || d.price === 0 })
    .returning();
  await db.insert(s.bookingMembers).values(d.memberIds.map((memberId) => ({ bookingId: row.id, memberId })));
  if (d.paid && d.price > 0) {
    await db.insert(s.payments).values({ memberId: d.memberIds[0], bookingId: row.id, amount: d.price, date: clubNow().date, description: "Kort kiralama" });
  }
  refresh();
  return { ok: true, id: row.id };
}

/* ---------- Grup üyeleri ---------- */

export async function addMembersToBooking(input: { bookingId: number; memberIds: number[]; useMakeup?: boolean }): Promise<ActionResult> {
  const db = await getDb();
  const b = await loadBooking(db, input.bookingId);
  if (!b || b.status === "cancelled" || b.status === "completed") return { ok: false, error: "Bu seansa üye eklenemez." };
  const fresh = input.memberIds.filter((id) => !b.members.some((m) => m.id === id));
  const capacity = b.kind === "group" ? (b.capacity ?? MAX_GROUP_SIZE) : b.kind === "private" ? 1 : 4;
  if (b.members.length + fresh.length > capacity) {
    return { ok: false, error: `Kapasite dolu: en fazla ${capacity} kişi (${capacity - b.members.length} yer kaldı).` };
  }
  for (const memberId of fresh) {
    const usedMakeup = b.kind === "reservation" ? false : await consumeCredit(db, memberId, b.id, !!input.useMakeup);
    await db.insert(s.bookingMembers).values({ bookingId: b.id, memberId, usedMakeup });
  }
  refresh();
  return { ok: true };
}

export async function removeMemberFromBooking(input: { bookingId: number; memberId: number; refund: boolean }): Promise<ActionResult> {
  const db = await getDb();
  const b = await loadBooking(db, input.bookingId);
  const m = b?.members.find((x) => x.id === input.memberId);
  if (!b || !m) return { ok: false, error: "Üye bu seansta değil." };
  await db.delete(s.bookingMembers).where(and(eq(s.bookingMembers.bookingId, b.id), eq(s.bookingMembers.memberId, m.id)));
  if (input.refund && b.kind !== "reservation") {
    const column = m.usedMakeup ? s.members.makeupCredits : s.members.lessonCredits;
    await db.update(s.members).set({ [m.usedMakeup ? "makeupCredits" : "lessonCredits"]: sql`${column} + 1` }).where(eq(s.members.id, m.id));
    await db.insert(s.creditTransactions).values({
      memberId: m.id, kind: m.usedMakeup ? "makeup_granted" : "adjustment", delta: 1, bookingId: b.id, note: "Dersten çıkarıldı, hak iade edildi",
    });
  }
  refresh();
  return { ok: true };
}
