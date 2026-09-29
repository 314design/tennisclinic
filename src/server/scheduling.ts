import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { toMinutes } from "@/lib/format";
import type { Db } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { MAX_SHARED_LESSONS, usesHalfCourt } from "@/lib/pricing";
import { overlaps, withDetails, type BookingDetail } from "@/server/queries/common";

export const isHalf = (b: Pick<BookingDetail, "kind" | "exclusive" | "members">) =>
  usesHalfCourt({ kind: b.kind, exclusive: b.exclusive, memberCount: b.members.length });

/**
 * Çakışma kuralları
 * - Aynı antrenörün üst üste binen iki seansı olamaz.
 * - Bir kortta aynı anda tek seans olur; istisna: 1 kişilik paylaşımlı özel dersler kortu
 *   en fazla 2 ders (2 hoca, 2 öğrenci) olacak şekilde paylaşabilir. Paylaşımsız kort bu paylaşımı kapatır.
 * - Grup dersleri özel ders ve kiralamalardan önceliklidir: grup dersi eklenirken
 *   aynı korttaki özel ders/kiralamalar "yerinden edilebilir" olarak döner (telafiyle iptal edilir);
 *   özel ders ya da kiralama grup dersinin saatine yazılamaz.
 */
export interface SlotRequest {
  kind: s.BookingKind;
  courtId: number;
  coachId?: number | null;
  date: string;
  start: string;
  end: string;
  /** 1 kişilik paylaşımlı özel ders: kortu başka bir 1 kişilik paylaşımlı dersle paylaşabilir */
  halfCourt?: boolean;
  /** Düzenlenen seans (kendisiyle çakışmasın) */
  ignoreId?: number;
}

export interface ConflictResult {
  /** Hiçbir şekilde aşılamayan çakışmalar */
  blocking: { booking: BookingDetail; reason: string }[];
  /** Grup dersi önceliğiyle iptal edilebilecek özel ders/kiralamalar */
  displaceable: BookingDetail[];
  /** Kortu paylaşacağı 1 kişilik paylaşımlı özel dersler */
  sharedWith: BookingDetail[];
  /** Kort bakımı */
  blocked?: { reason: string; start: string; end: string };
}

export async function findConflicts(db: Db, req: SlotRequest): Promise<ConflictResult> {
  const sameDay = await db
    .select()
    .from(s.bookings)
    .where(and(eq(s.bookings.date, req.date), ne(s.bookings.status, "cancelled")));
  const clashing = await withDetails(
    sameDay.filter(
      (b) =>
        b.id !== req.ignoreId &&
        overlaps(b.start, b.end, req.start, req.end) &&
        (b.courtId === req.courtId || (req.coachId && b.coachId === req.coachId)),
    ),
  );

  const result: ConflictResult = { blocking: [], displaceable: [], sharedWith: [] };
  for (const b of clashing) {
    const sameCoach = req.coachId && b.coachId === req.coachId;
    if (sameCoach) {
      result.blocking.push({ booking: b, reason: `${b.coach?.name} bu saatte başka bir derste (${b.court.name}, ${b.start}–${b.end})` });
    } else if (req.kind === "group" && b.kind !== "group") {
      result.displaceable.push(b);
    } else if (b.kind === "group") {
      result.blocking.push({ booking: b, reason: `${b.court.name}: ${b.start}–${b.end} arası grup dersi var; grup dersleri önceliklidir` });
    } else if (req.halfCourt && isHalf(b)) {
      result.sharedWith.push(b);
    } else if (isHalf(b)) {
      result.blocking.push({
        booking: b,
        reason: `${b.court.name}: ${b.start}–${b.end} arası paylaşımlı bir özel ders var; paylaşımsız ya da çok kişilik ders için kort tamamen boş olmalı`,
      });
    } else {
      result.blocking.push({ booking: b, reason: `${b.court.name}: ${b.start}–${b.end} arası dolu` });
    }
  }
  if (result.sharedWith.length >= MAX_SHARED_LESSONS) {
    result.blocking.push({
      booking: result.sharedWith[0],
      reason: `${result.sharedWith[0].court.name}: bu saatte kortu paylaşan ${MAX_SHARED_LESSONS} özel ders var (paylaşım kapasitesi dolu)`,
    });
  }

  const [block] = (
    await db.select().from(s.courtBlocks).where(and(eq(s.courtBlocks.courtId, req.courtId), eq(s.courtBlocks.date, req.date)))
  ).filter((k) => overlaps(k.start, k.end, req.start, req.end));
  if (block) result.blocked = { reason: block.reason, start: block.start, end: block.end };

  return result;
}

export function validTimeRange(start: string, end: string) {
  return /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && toMinutes(end) > toMinutes(start);
}
