import "server-only";
import { asc, desc, lte } from "drizzle-orm";
import { DEFAULT_PRICE_LIST, withDefaults, type PriceList, type PriceListData } from "@/lib/pricing";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";

/** Verilen tarihte geçerli fiyat listesi (yoksa varsayılan tablo) */
export async function getPriceList(date: string): Promise<PriceList> {
  const db = await getDb();
  const [row] = await db.select().from(s.priceLists).where(lte(s.priceLists.effectiveFrom, date)).orderBy(desc(s.priceLists.effectiveFrom), desc(s.priceLists.id)).limit(1);
  if (!row) return DEFAULT_PRICE_LIST;
  return { id: row.id, effectiveFrom: row.effectiveFrom, ...withDefaults(row.data as Partial<PriceListData>) };
}

export async function getPriceHistory(): Promise<PriceList[]> {
  const db = await getDb();
  const rows = await db.select().from(s.priceLists).orderBy(desc(s.priceLists.effectiveFrom), asc(s.priceLists.id));
  return rows.map((r) => ({ id: r.id, effectiveFrom: r.effectiveFrom, ...withDefaults(r.data as Partial<PriceListData>) }));
}
