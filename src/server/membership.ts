import "server-only";
import { eq, inArray } from "drizzle-orm";
import { addDays } from "@/lib/clock";
import type { Db } from "@/server/db/client";
import * as s from "@/server/db/schema";

/**
 * Üyelik süresini ders kotasına göre uzatır: bitiş = max(mevcut bitiş, başlangıç + geçerlilik günü).
 * Başlangıcı olmayan üyeye başlangıç tarihi de yazılır.
 */
export async function extendMembership(db: Db, memberIds: number[], from: string, days: number) {
  if (!days || !memberIds.length) return;
  const rows = await db.select().from(s.members).where(inArray(s.members.id, memberIds));
  for (const m of rows) {
    const candidate = addDays(from, days);
    const end = m.membershipEnd && m.membershipEnd > candidate ? m.membershipEnd : candidate;
    await db.update(s.members).set({ membershipEnd: end, membershipStart: m.membershipStart ?? from }).where(eq(s.members.id, m.id));
  }
}
