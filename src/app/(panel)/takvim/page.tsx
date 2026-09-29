import { asc, eq } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { DateJump } from "@/components/DateJump/DateJump";
import { GridLegend, TimeGrid } from "@/components/TimeGrid/TimeGrid";
import { environmentLabel } from "@/lib/courts";
import { blockEvents, toGridEvents } from "@/server/queries/grid";
import { addDays, clubNow } from "@/lib/clock";
import { formatDayLabel, formatShortDate } from "@/lib/format";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { bookingsOn, getSettings, withDetails } from "@/server/queries/common";

export const metadata = { title: "Takvim · Tennis Clinic" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ tarih?: string }> }) {
  const { tarih } = await searchParams;
  const now = clubNow();
  const date = tarih && /^\d{4}-\d{2}-\d{2}$/.test(tarih) ? tarih : now.date;
  const db = await getDb();
  const settings = await getSettings();
  const [courts, rows, blocks] = await Promise.all([
    db.select().from(s.courts).where(eq(s.courts.active, true)).orderBy(asc(s.courts.sortOrder)),
    bookingsOn(date),
    db.select().from(s.courtBlocks).where(eq(s.courtBlocks.date, date)),
  ]);
  const bookings = await withDetails(rows);
  const counts = {
    lessons: bookings.filter((b) => b.kind !== "reservation").length,
    reservations: bookings.filter((b) => b.kind === "reservation").length,
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Takvim</h1>
          <p className="page-header__lede">
            {formatDayLabel(date, now.date)} · {formatShortDate(date)} · {counts.lessons} ders, {counts.reservations} rezervasyon
          </p>
        </div>
        <div className="page-header__actions">
          <Link className="icon-btn" href={`/takvim?tarih=${addDays(date, -1)}`} aria-label="Önceki gün">
            <ChevronLeft className="icon" aria-hidden="true" />
          </Link>
          {date !== now.date && <Link className="btn" href="/takvim">Bugün</Link>}
          <DateJump value={date} />
          <Link className="icon-btn" href={`/takvim?tarih=${addDays(date, 1)}`} aria-label="Sonraki gün">
            <ChevronRight className="icon" aria-hidden="true" />
          </Link>
          <Link className="btn btn--primary" href={`/rezervasyonlar/yeni?tarih=${date}`}>
            <Plus className="icon" aria-hidden="true" /> Rezervasyon
          </Link>
        </div>
      </header>

      <section className="card">
        <GridLegend />
        <p className="field__hint" style={{ marginBottom: 10 }}>Boş bir saate tıklayarak o kort ve saat için rezervasyon oluşturabilirsiniz.</p>
        <TimeGrid
          open={settings.hours.open}
          close={settings.hours.close}
          columns={courts.map((c) => ({ id: String(c.id), title: c.name, subtitle: environmentLabel(c), now: date === now.date }))}
          events={[...toGridEvents(bookings, (b) => String(b.courtId)), ...blockEvents(blocks, (id) => String(id))]}
          nowTime={date === now.date ? now.time : undefined}
          emptyHref={`/rezervasyonlar/yeni?tarih=${date}&kort={col}&saat={time}`}
        />
      </section>
    </>
  );
}
