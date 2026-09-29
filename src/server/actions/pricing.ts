"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import type { ActionResult } from "./bookings";

const row = z.tuple([z.number().int().min(0), z.number().int().min(0), z.number().int().min(0), z.number().int().min(0)]);
const schema = z.object({
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  offpeak: z.object({ start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) }),
  exclusiveSurcharge: z.number().int().min(0),
  packages: z.object({
    offpeak: z.object({ "8": row, "16": row }),
    peak: z.object({ "8": row, "16": row }),
  }),
});

/**
 * Fiyat listesini kaydeder. Aynı başlangıç tarihli liste varsa güncellenir, yoksa yeni sürüm eklenir.
 * Satılmış paketlerin tutarı değişmez (pakette saklanır).
 */
export async function savePriceList(input: z.input<typeof schema>): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Fiyatlar 0 ya da daha büyük tam sayı olmalı." };
  const { effectiveFrom, ...data } = parsed.data;
  if (data.offpeak.end <= data.offpeak.start) return { ok: false, error: "Sakin saat bitişi başlangıçtan sonra olmalı." };
  const db = await getDb();
  const [existing] = await db.select().from(s.priceLists).where(eq(s.priceLists.effectiveFrom, effectiveFrom));
  if (existing) await db.update(s.priceLists).set({ data }).where(eq(s.priceLists.id, existing.id));
  else await db.insert(s.priceLists).values({ effectiveFrom, data });
  revalidatePath("/", "layout");
  return { ok: true };
}
