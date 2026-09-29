"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { validTimeRange } from "@/server/scheduling";
import type { ActionResult } from "./bookings";

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toLocaleUpperCase("tr-TR");

const coachSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().max(60).optional(),
  onLeave: z.boolean(),
});

export async function saveCoach(input: z.input<typeof coachSchema> & { id?: number }): Promise<ActionResult> {
  const parsed = coachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ad soyad en az 2 karakter olmalı." };
  const db = await getDb();
  const values = { ...parsed.data, role: parsed.data.role || null, initials: initialsOf(parsed.data.name) };
  if (input.id) {
    const [current] = await db.select().from(s.coaches).where(eq(s.coaches.id, input.id));
    const avatarTone = values.onLeave ? "off" : current?.avatarTone === "off" ? "default" : current?.avatarTone;
    await db.update(s.coaches).set({ ...values, avatarTone }).where(eq(s.coaches.id, input.id));
    revalidatePath("/", "layout");
    return { ok: true };
  }
  const [row] = await db.insert(s.coaches).values(values).returning();
  // Varsayılan çalışma saatleri: hafta içi 09:00–18:00
  await db.insert(s.coachHours).values([1, 2, 3, 4, 5].map((weekday) => ({ coachId: row.id, weekday, start: "09:00", end: "18:00" })));
  revalidatePath("/", "layout");
  redirect(`/antrenorler/${row.id}`);
}

const hoursSchema = z.array(z.object({ weekday: z.number().int().min(1).max(7), start: z.string(), end: z.string() })).max(21);

/** Haftalık çalışma saatlerini tümüyle değiştirir */
export async function setCoachHours(coachId: number, rows: z.input<typeof hoursSchema>): Promise<ActionResult> {
  const parsed = hoursSchema.safeParse(rows);
  if (!parsed.success || parsed.data.some((r) => !validTimeRange(r.start, r.end))) {
    return { ok: false, error: "Her gün için bitiş saati başlangıçtan sonra olmalı." };
  }
  const db = await getDb();
  await db.delete(s.coachHours).where(eq(s.coachHours.coachId, coachId));
  if (parsed.data.length) await db.insert(s.coachHours).values(parsed.data.map((r) => ({ ...r, coachId })));
  revalidatePath("/", "layout");
  return { ok: true };
}
