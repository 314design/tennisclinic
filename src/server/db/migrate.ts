/**
 * npm run db:migrate  → şemayı kurar/günceller (+ kortlar ve ayarlar)
 * npm run db:seed     → boş veritabanına örnek veri yükler
 * npm run db:reset    → tüm verileri silip örnek veriyi yeniden yükler
 * SEED_DEMO=1 tanımlıysa db:migrate de boş veritabanına örnek veri yükler.
 * --if-database: DATABASE_URL yoksa hiçbir şey yapmaz (derleme sırasında; gömülü veritabanı çalışırken kurulur).
 */
import { createDb } from "./connect";
import { seed, seedBase } from "./seed";

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--if-database") && !process.env.DATABASE_URL) return;
  const reset = args.includes("--reset");
  const { db, close } = await createDb({ migrate: true });
  console.log("Şema güncel.");
  if (process.env.SEED_DEMO === "1" || args.includes("--seed")) {
    const loaded = await seed(db, { onlyIfEmpty: !reset, reset });
    console.log(loaded ? "Örnek veriler yüklendi." : "Veritabanında üye var, örnek veri atlandı.");
  } else {
    await seedBase(db);
  }
  await close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
