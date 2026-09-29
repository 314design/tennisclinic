import { and, asc, between, eq, ne } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { GridLegend, TimeGrid } from "@/components/TimeGrid/TimeGrid";
import { addDays, weekdayOf } from "@/lib/clock";
import { formatDayChip, formatShortDate } from "@/lib/format";
import { gapsOutside } from "@/lib/schedule";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { getSettings, withDetails } from "@/server/queries/common";
import { toGridEvents } from "@/server/queries/grid";
import type { CoachOption } from "@/server/queries/planning";

/** Antrenörün haftalık takvimi: dersleri, çalışma saatleri dışı gölgeli; boş saate tıklayınca ders oluşturulur */
export async function CoachCalendar({ coach, week, today, nowTime }: { coach: CoachOption; week: string; today: string; nowTime: string }) {
  const db = await getDb();
  const settings = await getSettings();
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const rows = await db
    .select()
    .from(s.bookings)
    .where(and(eq(s.bookings.coachId, coach.id), between(s.bookings.date, days[0], days[6]), ne(s.bookings.status, "cancelled")))
    .orderBy(asc(s.bookings.date), asc(s.bookings.start));
  const bookings = await withDetails(rows);
  const total = bookings.length;

  return (
    <section className="card" aria-labelledby="coach-cal-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="coach-cal-title">{coach.name} · haftalık takvim</h2>
          <p className="card__meta">
            {formatShortDate(days[0])} – {formatShortDate(days[6])} · {total} ders{coach.onLeave ? " · izinli" : ""}
          </p>
        </div>
        <div className="page-header__actions">
          <Link className="icon-btn icon-btn--sm" href={`?hafta=${addDays(week, -7)}`} aria-label="Önceki hafta" scroll={false}>
            <ChevronLeft className="icon" aria-hidden="true" />
          </Link>
          <Link className="btn btn--sm" href="?" scroll={false}>Bu hafta</Link>
          <Link className="icon-btn icon-btn--sm" href={`?hafta=${addDays(week, 7)}`} aria-label="Sonraki hafta" scroll={false}>
            <ChevronRight className="icon" aria-hidden="true" />
          </Link>
        </div>
      </header>
      <div style={{ marginTop: 12 }}>
        <GridLegend />
        <TimeGrid
          open={settings.hours.open}
          close={settings.hours.close}
          minColumnWidth={110}
          columns={days.map((d) => {
            const chip = formatDayChip(d);
            const windows = coach.onLeave ? [] : coach.hours.filter((h) => h.weekday === weekdayOf(d));
            return {
              id: d,
              title: `${chip.weekday} ${chip.day}`,
              subtitle: d === today ? "Bugün" : windows.length ? windows.map((w) => `${w.start}–${w.end}`).join(", ") : "Çalışmıyor",
              unavailable: [...gapsOutside(windows, settings.hours.open, settings.hours.close), ...(d < today ? [{ start: settings.hours.open, end: settings.hours.close }] : [])],
              now: d === today,
            };
          })}
          events={toGridEvents(bookings, (b) => b.date, { showCourt: true })}
          nowTime={nowTime}
          emptyHref={coach.onLeave ? undefined : `/rezervasyonlar/yeni?tur=ozel&hoca=${coach.id}&tarih={col}&saat={time}`}
        />
      </div>
    </section>
  );
}

/** Verilen tarihin haftasının pazartesisi */
export function mondayOf(date: string) {
  return addDays(date, 1 - weekdayOf(date));
}
