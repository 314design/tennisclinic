"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { validTimeRange } from "@/server/scheduling";
import type { ActionResult } from "./bookings";

const courtSchema = z.object({
  id: z.number().int(),
  name: z.string().trim().min(1).max(40),
  surface: z.string().trim().min(1).max(40),
  environment: z.enum(["outdoor", "indoor"]),
  balloon: z.boolean(),
  active: z.boolean(),
});

/** Kort ayarları. Açık kort kışın balonla kapatılınca "Balon Kort" olur; kapalı kortta balon seçeneği yoktur. */
export async function updateCourt(input: z.input<typeof courtSchema>): Promise<ActionResult> {
  const parsed = courtSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Kort adı ve zemin boş olamaz." };
  const { id, ...values } = parsed.data;
  const db = await getDb();
  await db
    .update(s.courts)
    .set({ ...values, balloon: values.environment === "outdoor" && values.balloon })
    .where(eq(s.courts.id, id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createCourt(): Promise<ActionResult> {
  const db = await getDb();
  const rows = await db.select().from(s.courts);
  await db.insert(s.courts).values({ name: `Kort ${rows.length + 1}`, environment: "outdoor", surface: "Toprak", sortOrder: rows.length + 1 });
  revalidatePath("/", "layout");
  return { ok: true };
}

const blockSchema = z.object({
  courtId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string(),
  end: z.string(),
  reason: z.string().trim().min(1).max(80),
});

export async function addCourtBlock(input: z.input<typeof blockSchema>): Promise<ActionResult> {
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success || !validTimeRange(parsed.data.start, parsed.data.end)) return { ok: false, error: "Tarih, saat ve nedeni kontrol edin." };
  const db = await getDb();
  await db.insert(s.courtBlocks).values(parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCourtBlock(id: number): Promise<ActionResult> {
  const db = await getDb();
  await db.delete(s.courtBlocks).where(eq(s.courtBlocks.id, id));
  revalidatePath("/", "layout");
  return { ok: true };
}
