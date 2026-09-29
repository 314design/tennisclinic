import { and, between, eq, gte, sql } from "drizzle-orm";
import { RevenueChart } from "@/components/RevenueChart/RevenueChart";
import { CANCEL_REASONS, type CancelReason } from "@/lib/booking";
import { addDays, clubNow } from "@/lib/clock";
import { formatCurrency } from "@/lib/format";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { KIND_LABEL } from "@/server/queries/common";
import { getDashboard } from "@/server/queries/dashboard";

export const metadata = { title: "Raporlar · Tennis Clinic" };

export default async function ReportsPage() {
  const now = clubNow();
  const from = addDays(now.date, -29);
  const db = await getDb();
  const [data, [revenue], byKind, byReason, [makeup]] = await Promise.all([
    getDashboard(now, null),
    db.select({ total: sql<number>`coalesce(sum(${s.payments.amount}), 0)::int` }).from(s.payments).where(between(s.payments.date, from, now.date)),
    db
      .select({ kind: s.bookings.kind, n: sql<number>`count(*)::int` })
      .from(s.bookings)
      .where(and(between(s.bookings.date, from, now.date), eq(s.bookings.status, "completed")))
      .groupBy(s.bookings.kind),
    db
      .select({ reason: s.bookings.cancelReason, n: sql<number>`count(*)::int` })
      .from(s.bookings)
      .where(and(between(s.bookings.date, from, now.date), eq(s.bookings.status, "cancelled")))
      .groupBy(s.bookings.cancelReason),
    db
      .select({ n: sql<number>`coalesce(sum(${s.creditTransactions.delta}), 0)::int` })
      .from(s.creditTransactions)
      .where(and(eq(s.creditTransactions.kind, "makeup_granted"), gte(s.creditTransactions.createdAt, new Date(`${from}T00:00:00Z`)))),
  ]);
  const cancelled = byReason.reduce((a, r) => a + r.n, 0);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Raporlar</h1>
          <p className="page-header__lede">Son 30 gün</p>
        </div>
      </header>
      <div className="stat-row">
        <div className="stat"><p className="stat__label">Gelir</p><p className="stat__value">{formatCurrency(revenue.total)}</p></div>
        {(["private", "group", "reservation"] as const).map((k) => (
          <div key={k} className="stat">
            <p className="stat__label">{KIND_LABEL[k]}</p>
            <p className="stat__value">{byKind.find((x) => x.kind === k)?.n ?? 0}</p>
            <p className="stat__hint">tamamlanan</p>
          </div>
        ))}
        <div className="stat stat--warn"><p className="stat__label">İptal</p><p className="stat__value">{cancelled}</p></div>
        <div className="stat stat--accent"><p className="stat__label">Verilen telafi hakkı</p><p className="stat__value">{makeup.n}</p></div>
      </div>
      <div className="two-col">
        <RevenueChart data={data.revenue} time={now.time} />
        <section className="card" aria-labelledby="reasons-title">
          <h2 className="card__title" id="reasons-title">İptal nedenleri</h2>
          {byReason.length ? (
            <ul className="ledger">
              {byReason.map((r) => (
                <li key={r.reason ?? "?"}>
                  <span>{r.reason ? CANCEL_REASONS[r.reason as CancelReason] : "Belirtilmedi"}</span>
                  <strong>{r.n}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Son 30 günde iptal yok.</p>
          )}
        </section>
      </div>
    </>
  );
}
