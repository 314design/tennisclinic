import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

/**
 * DATABASE_URL tanımlıysa PostgreSQL'e (Vercel'de Neon/Supabase) bağlanır.
 * Tanımlı değilse geliştirme için `.data/pglite` altında gömülü Postgres (PGlite) kullanılır.
 */
export async function createDb({ migrate = false } = {}): Promise<{ db: Db; close: () => Promise<void> }> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: 5 });
    const db = drizzle(pool, { schema });
    if (migrate) {
      const { migrate: run } = await import("drizzle-orm/node-postgres/migrator");
      await run(db, { migrationsFolder: "drizzle" });
    }
    return { db, close: () => pool.end() };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  // Gömülü veritabanında şema her zaman güncel tutulur
  const { migrate: run } = await import("drizzle-orm/pglite/migrator");
  await run(db, { migrationsFolder: "drizzle" });
  // PGlite ve node-postgres sürücüleri aynı sorgu API'sini paylaşır
  return { db: db as unknown as Db, close: () => client.close() };
}
