import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditActions } from "@/components/CreditActions/CreditActions";
import { MemberForm } from "@/components/MemberForm/MemberForm";
import { addDays, clubNow } from "@/lib/clock";
import { formatDayLabel, formatShortDate } from "@/lib/format";
import { updateMember } from "@/server/actions/members";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { KIND_LABEL, LEVELS, TIER_LABEL, withDetails } from "@/server/queries/common";
import { getPackages } from "@/server/queries/planning";
import { CollectPackageButton } from "@/components/CollectButton/CollectButton";
import { formatCurrency } from "@/lib/format";
import { perPerson } from "@/lib/pricing";

const WEEKDAY = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const CREDIT_LABEL: Record<s.CreditKind, string> = {
  lesson_added: "Ders hakkı eklendi",
  lesson_used: "Ders hakkı kullanıldı",
  makeup_granted: "Telafi hakkı verildi",
  makeup_used: "Telafi hakkı kullanıldı",
  adjustment: "Düzeltme",
};

const STATUS_LABEL = { scheduled: "Planlandı", in_progress: "Devam ediyor", completed: "Tamamlandı", cancelled: "İptal" } as const;

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const db = await getDb();
  const [member] = await db.select().from(s.members).where(eq(s.members.id, id));
  if (!member) notFound();
  const now = clubNow();

  const links = await db.select({ bookingId: s.bookingMembers.bookingId }).from(s.bookingMembers).where(eq(s.bookingMembers.memberId, id));
  const bookingIds = links.map((l) => l.bookingId);
  const [upcomingRows, recentRows, ledger] = await Promise.all([
    bookingIds.length
      ? db.select().from(s.bookings).where(and(inArray(s.bookings.id, bookingIds), gte(s.bookings.date, now.date))).orderBy(s.bookings.date, s.bookings.start).limit(10)
      : [],
    bookingIds.length
      ? db.select().from(s.bookings).where(and(inArray(s.bookings.id, bookingIds), gte(s.bookings.date, addDays(now.date, -60)))).orderBy(desc(s.bookings.date), desc(s.bookings.start)).limit(15)
      : [],
    db.select().from(s.creditTransactions).where(eq(s.creditTransactions.memberId, id)).orderBy(desc(s.creditTransactions.createdAt)).limit(20),
  ]);
  const upcoming = (await withDetails(upcomingRows)).filter((b) => b.status === "scheduled" || b.status === "in_progress");
  const recent = (await withDetails(recentRows)).filter((b) => b.date < now.date || b.status === "completed" || b.status === "cancelled");
  const packages = await getPackages({ memberId: id, activeOnly: false });
  const activePackages = packages.filter((p) => p.remaining > 0);
  const end = member.membershipEnd;
  const expired = end && end < now.date;

  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" href="/uyeler">
            <ChevronLeft className="icon" aria-hidden="true" /> Üyeler
          </Link>
          <h1 className="page-header__title">{member.name}</h1>
          <p className="page-header__lede">{TIER_LABEL[member.tier]}{member.level ? ` · ${member.level}` : ""}{member.phone ? ` · ${member.phone}` : ""}</p>
        </div>
        <div className="page-header__actions">
          <CreditActions memberId={member.id} name={member.name} />
        </div>
      </header>

      <div className="stat-row">
        <div className="stat">
          <p className="stat__label">Özel ders paketi</p>
          <p className="stat__value">{activePackages.reduce((a, p) => a + p.remaining, 0)}</p>
          <p className="stat__hint">{activePackages.length ? `${activePackages.length} aktif pakette kalan seans` : "aktif paket yok"}</p>
        </div>
        <div className="stat">
          <p className="stat__label">Grup ders hakkı</p>
          <p className="stat__value">{member.lessonCredits}</p>
          <p className="stat__hint">grup dersleri için</p>
        </div>
        <div className={`stat ${member.makeupCredits ? "stat--accent" : ""}`}>
          <p className="stat__label">Telafi hakkı</p>
          <p className="stat__value">{member.makeupCredits}</p>
          <p className="stat__hint">iptallerden doğan</p>
        </div>
        <div className={`stat ${expired ? "stat--warn" : ""}`}>
          <p className="stat__label">Üyelik bitişi</p>
          <p className="stat__value">{end ? formatShortDate(end) : "—"}</p>
          <p className="stat__hint">{expired ? "süresi doldu" : end ? formatDayLabel(end, now.date) : "tanımlı değil"}</p>
        </div>
      </div>

      <section className="card" aria-labelledby="packages-title">
        <header className="card__head">
          <div>
            <h2 className="card__title" id="packages-title">Özel ders paketleri</h2>
            <p className="card__meta">Tutarlar grubun toplamıdır</p>
          </div>
          <Link className="btn btn--sm btn--outline" href="/dersler/yeni">Paket sat / ders planla</Link>
        </header>
        {packages.length ? (
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="table">
              <thead>
                <tr><th>Paket</th><th>Sabit gün</th><th className="num">Kalan</th><th className="num">Tutar</th><th>Ödeme</th></tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id} style={p.remaining === 0 ? { opacity: 0.6 } : undefined}>
                    <td>
                      <strong>{p.sessions} seans · {p.peopleCount} kişi</strong>
                      <div className="muted">
                        {p.band === "offpeak" ? "Sakin saat" : "Yoğun saat"}{p.exclusive ? " · paylaşımsız" : p.peopleCount === 1 ? " · paylaşımlı" : ""}{p.coachName ? ` · ${p.coachName}` : ""}
                        {p.peopleCount > 1 ? ` · ${p.memberNames.filter((n) => n !== member.name).join(", ")} ile` : ""}
                      </div>
                    </td>
                    <td className="nowrap">{p.fixed ? `Her ${WEEKDAY[p.fixed.weekday]} ${p.fixed.start}` : <span className="muted">—</span>}</td>
                    <td className="num">
                      {p.remaining}/{p.sessions}
                      {p.makeupSessions > 0 && <div className="muted">{p.makeupSessions} telafi iadesi</div>}
                    </td>
                    <td className="num">
                      {formatCurrency(p.price)}
                      {p.peopleCount > 1 && <div className="muted">kişi başı {formatCurrency(perPerson(p.price, p.peopleCount))}</div>}
                    </td>
                    <td>{p.paid ? <span className="chip chip--sm chip--ok">Ödendi</span> : <CollectPackageButton id={p.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">Paket yok. Ders Planla ekranında özel ders oluştururken yeni paket satabilirsiniz.</p>
        )}
      </section>

      <div className="two-col">
        <div className="stack-lg">
          <section className="card" aria-labelledby="upcoming-title">
            <h2 className="card__title" id="upcoming-title">Yaklaşan seanslar</h2>
            {upcoming.length ? (
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="table">
                  <tbody>
                    {upcoming.map((b) => (
                      <tr key={b.id}>
                        <td className="nowrap"><strong>{formatDayLabel(b.date, now.date)}</strong><div className="muted">{b.start}–{b.end}</div></td>
                        <td><Link className="row-link" href={`/seanslar/${b.id}`}>{b.kind === "group" ? b.title : KIND_LABEL[b.kind]}</Link><div className="muted">{b.court.name}{b.coach ? ` · ${b.coach.name}` : ""}</div></td>
                        <td className="num"><span className="chip chip--sm chip--outline">{STATUS_LABEL[b.status]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">Yaklaşan seans yok.</p>
            )}
          </section>

          <section className="card" aria-labelledby="recent-title">
            <h2 className="card__title" id="recent-title">Son 60 gün</h2>
            {recent.length ? (
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="table">
                  <tbody>
                    {recent.map((b) => (
                      <tr key={b.id}>
                        <td className="nowrap">{formatShortDate(b.date)}<div className="muted">{b.start}</div></td>
                        <td><Link className="row-link" href={`/seanslar/${b.id}`}>{b.kind === "group" ? b.title : KIND_LABEL[b.kind]}</Link><div className="muted">{b.court.name}</div></td>
                        <td className="num">
                          <span className={`chip chip--sm ${b.status === "cancelled" ? "chip--warn" : "chip--neutral"}`}>{STATUS_LABEL[b.status]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty">Kayıt yok.</p>
            )}
          </section>
        </div>

        <div className="stack-lg">
          <section className="card" aria-labelledby="edit-title">
            <h2 className="card__title" id="edit-title">Üye bilgileri</h2>
            <div style={{ marginTop: 14 }}>
              <MemberForm action={updateMember.bind(null, member.id)} levels={LEVELS} initial={member} />
            </div>
          </section>
          <section className="card" aria-labelledby="ledger-title">
            <h2 className="card__title" id="ledger-title">Hak hareketleri</h2>
            {ledger.length ? (
              <ul className="ledger">
                {ledger.map((t) => (
                  <li key={t.id}>
                    <span>
                      <strong>{CREDIT_LABEL[t.kind]}</strong>
                      <span className="muted">{t.note ? ` · ${t.note}` : ""} · {formatShortDate(t.createdAt.toISOString().slice(0, 10))}</span>
                    </span>
                    <span className={t.delta > 0 ? "ledger__plus" : "ledger__minus"}>{t.delta > 0 ? `+${t.delta}` : t.delta}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Hareket yok.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
