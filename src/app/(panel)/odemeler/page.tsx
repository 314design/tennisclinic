import { and, asc, between, desc, eq, gte, ne, sql } from "drizzle-orm";
import Link from "next/link";
import { CollectButton } from "@/components/CollectButton/CollectButton";
import { addDays, clubNow } from "@/lib/clock";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { KIND_LABEL, withDetails } from "@/server/queries/common";

export const metadata = { title: "Ödemeler · Tennis Clinic" };

export default async function PaymentsPage() {
  const now = clubNow();
  const db = await getDb();
  const from = addDays(now.date, -29);
  const [unpaidRows, payments, [totals]] = await Promise.all([
    db
      .select()
      .from(s.bookings)
      .where(and(eq(s.bookings.paid, false), ne(s.bookings.status, "cancelled"), between(s.bookings.date, addDays(now.date, -30), addDays(now.date, 7))))
      .orderBy(asc(s.bookings.date), asc(s.bookings.start)),
    db
      .select({ id: s.payments.id, amount: s.payments.amount, date: s.payments.date, description: s.payments.description, memberId: s.payments.memberId, name: s.members.name })
      .from(s.payments)
      .leftJoin(s.members, eq(s.members.id, s.payments.memberId))
      .where(gte(s.payments.date, from))
      .orderBy(desc(s.payments.date), desc(s.payments.id))
      .limit(50),
    db
      .select({
        month: sql<number>`coalesce(sum(${s.payments.amount}), 0)::int`,
        today: sql<number>`coalesce(sum(${s.payments.amount}) filter (where ${s.payments.date} = ${now.date}), 0)::int`,
      })
      .from(s.payments)
      .where(gte(s.payments.date, from)),
  ]);
  const unpaid = await withDetails(unpaidRows);
  const unpaidTotal = unpaid.reduce((a, b) => a + b.price, 0);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Ödemeler</h1>
          <p className="page-header__lede">Bekleyen tahsilatlar (son 30 gün ve önümüzdeki 7 gün) ve son 30 günün ödemeleri</p>
        </div>
      </header>

      <div className="stat-row">
        <div className={`stat ${unpaid.length ? "stat--warn" : ""}`}>
          <p className="stat__label">Bekleyen</p>
          <p className="stat__value">{formatCurrency(unpaidTotal)}</p>
          <p className="stat__hint">{unpaid.length} seans</p>
        </div>
        <div className="stat">
          <p className="stat__label">Bugün tahsil edilen</p>
          <p className="stat__value">{formatCurrency(totals.today)}</p>
        </div>
        <div className="stat">
          <p className="stat__label">Son 30 gün</p>
          <p className="stat__value">{formatCurrency(totals.month)}</p>
        </div>
      </div>

      <section className="card" aria-labelledby="unpaid-title">
        <h2 className="card__title" id="unpaid-title">Bekleyen ödemeler</h2>
        {unpaid.length ? (
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="table">
              <thead>
                <tr><th>Tarih</th><th>Seans</th><th>Üye</th><th className="num">Tutar</th><th aria-label="İşlem" /></tr>
              </thead>
              <tbody>
                {unpaid.map((b) => (
                  <tr key={b.id}>
                    <td className="nowrap">{formatShortDate(b.date)}<div className="muted">{b.start}–{b.end}</div></td>
                    <td><Link className="row-link" href={`/seanslar/${b.id}`}>{KIND_LABEL[b.kind]}</Link><div className="muted">{b.court.name}</div></td>
                    <td>{b.members.map((m) => m.name).join(", ") || "—"}</td>
                    <td className="num">{formatCurrency(b.price)}</td>
                    <td className="num"><CollectButton id={b.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty"><strong>Bekleyen ödeme yok</strong></p>
        )}
      </section>

      <section className="card" aria-labelledby="paid-title">
        <h2 className="card__title" id="paid-title">Son ödemeler</h2>
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="table">
            <thead>
              <tr><th>Tarih</th><th>Açıklama</th><th>Üye</th><th className="num">Tutar</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="nowrap">{formatShortDate(p.date)}</td>
                  <td>{p.description}</td>
                  <td>{p.memberId ? <Link className="row-link" href={`/uyeler/${p.memberId}`}>{p.name}</Link> : "—"}</td>
                  <td className="num">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
