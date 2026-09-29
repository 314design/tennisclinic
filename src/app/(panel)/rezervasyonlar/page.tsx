import { and, asc, eq } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { DateJump } from "@/components/DateJump/DateJump";
import { addDays, clubNow } from "@/lib/clock";
import { environmentLabel, FORMAT_LABEL } from "@/lib/courts";
import { formatCurrency, formatDayLabel, formatShortDate } from "@/lib/format";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { KIND_LABEL, withDetails } from "@/server/queries/common";

export const metadata = { title: "Rezervasyonlar · Tennis Clinic" };

const STATUS = {
  scheduled: ["Planlandı", "chip--outline"],
  in_progress: ["Devam ediyor", "chip--ok"],
  completed: ["Tamamlandı", "chip--neutral"],
  cancelled: ["İptal", "chip--warn"],
} as const;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tarih?: string }> }) {
  const { tarih } = await searchParams;
  const now = clubNow();
  const date = tarih && /^\d{4}-\d{2}-\d{2}$/.test(tarih) ? tarih : now.date;
  const db = await getDb();
  const rows = await db.select().from(s.bookings).where(and(eq(s.bookings.date, date))).orderBy(asc(s.bookings.start), asc(s.bookings.courtId));
  const bookings = await withDetails(rows);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Rezervasyonlar</h1>
          <p className="page-header__lede">{formatDayLabel(date, now.date)} · {formatShortDate(date)} · {bookings.filter((b) => b.status !== "cancelled").length} seans</p>
        </div>
        <div className="page-header__actions">
          <Link className="icon-btn" href={`/rezervasyonlar?tarih=${addDays(date, -1)}`} aria-label="Önceki gün">
            <ChevronLeft className="icon" aria-hidden="true" />
          </Link>
          <DateJump value={date} />
          <Link className="icon-btn" href={`/rezervasyonlar?tarih=${addDays(date, 1)}`} aria-label="Sonraki gün">
            <ChevronRight className="icon" aria-hidden="true" />
          </Link>
          <Link className="btn" href="/dersler/yeni">Ders planla</Link>
          <Link className="btn btn--primary" href={`/rezervasyonlar/yeni?tarih=${date}`}>
            <Plus className="icon" aria-hidden="true" /> Yeni rezervasyon
          </Link>
        </div>
      </header>

      <section className="card">
        {bookings.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Saat</th>
                  <th>Seans</th>
                  <th>Kort</th>
                  <th>Tür</th>
                  <th className="num">Ücret</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const [label, chip] = STATUS[b.status];
                  const title = b.kind === "group" ? (b.title ?? "Grup dersi") : b.members.map((m) => m.name).join(", ") || "—";
                  return (
                    <tr key={b.id} style={b.status === "cancelled" ? { opacity: 0.6 } : undefined}>
                      <td className="nowrap"><strong>{b.start}</strong><div className="muted">{b.end}</div></td>
                      <td>
                        <Link className="row-link" href={`/seanslar/${b.id}`}>{title}</Link>
                        <div className="muted">
                          {b.coach ? `Ant. ${b.coach.name}` : b.format ? FORMAT_LABEL[b.format] : ""}
                          {b.kind === "group" ? ` · ${b.members.length}/${b.capacity ?? 6} kişi${b.level ? ` · ${b.level}` : ""}` : ""}
                        </div>
                      </td>
                      <td className="nowrap">{b.court.name}<div className="muted">{environmentLabel(b.court)}</div></td>
                      <td className="nowrap">{KIND_LABEL[b.kind]}</td>
                      <td className="num">
                        {b.price ? formatCurrency(b.price) : "—"}
                        {b.price > 0 && !b.paid && b.status !== "cancelled" && <div><span className="chip chip--sm chip--warn">Ödenmedi</span></div>}
                      </td>
                      <td><span className={`chip chip--sm ${chip}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">
            <strong>Bu gün için seans yok</strong>
            Yeni rezervasyon ya da ders ekleyebilirsiniz.
          </p>
        )}
      </section>
    </>
  );
}
