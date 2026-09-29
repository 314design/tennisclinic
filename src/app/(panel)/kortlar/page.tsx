import { asc, gte } from "drizzle-orm";
import { CourtSettings } from "@/components/CourtSettings/CourtSettings";
import { clubNow } from "@/lib/clock";
import { environmentLabel } from "@/lib/courts";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";

export const metadata = { title: "Kortlar · Tennis Clinic" };

export default async function CourtsPage() {
  const now = clubNow();
  const db = await getDb();
  const [courts, blocks] = await Promise.all([
    db.select().from(s.courts).orderBy(asc(s.courts.sortOrder)),
    db.select().from(s.courtBlocks).where(gte(s.courtBlocks.date, now.date)).orderBy(asc(s.courtBlocks.date), asc(s.courtBlocks.start)),
  ]);
  const summary = courts.filter((c) => c.active).map((c) => `${c.name} ${environmentLabel(c).toLocaleLowerCase("tr-TR")}`).join(" · ");

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Kortlar</h1>
          <p className="page-header__lede">{summary}. Açık kortları kışın &quot;Balon Kort&quot; olarak işaretleyebilirsiniz.</p>
        </div>
      </header>
      <div className="court-settings-grid">
        {courts.map((c) => (
          <CourtSettings
            key={`${c.id}-${c.environment}-${c.balloon}-${c.active}-${c.name}-${c.surface}`}
            court={{ ...c, blocks: blocks.filter((b) => b.courtId === c.id) }}
            today={now.date}
          />
        ))}
      </div>
    </>
  );
}
