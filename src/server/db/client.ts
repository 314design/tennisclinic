import "server-only";
import { createDb, type Db } from "./connect";

export type { Db };

const globalForDb = globalThis as unknown as { __tcDb?: Promise<Db> };

/** Uygulama boyunca tek bağlantı (geliştirmede sıcak yenilemelerde de korunur) */
export function getDb(): Promise<Db> {
  globalForDb.__tcDb ??= createDb().then((c) => c.db);
  return globalForDb.__tcDb;
}
