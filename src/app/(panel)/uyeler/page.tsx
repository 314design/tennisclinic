import { asc, between, gt, ilike, lt, and, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { addDays, clubNow } from "@/lib/clock";
import { formatShortDate } from "@/lib/format";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { TIER_LABEL } from "@/server/queries/common";

export const metadata = { title: "Üyeler · Tennis Clinic" };

const FILTERS = [
  { key: "", label: "Tümü" },
  { key: "bitiyor", label: "Bu hafta bitenler" },
  { key: "telafi", label: "Telafi hakkı olanlar" },
  { key: "bitti", label: "Süresi dolanlar" },
];

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; filtre?: string; yeni?: string }> }) {
  const { q = "", filtre = "", yeni = "" } = await searchParams;
  const added = yeni.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const now = clubNow();
  const db = await getDb();
  const where: SQL[] = [];
  if (q.trim()) where.push(ilike(s.members.name, `%${q.trim()}%`));
  if (filtre === "bitiyor") where.push(between(s.members.membershipEnd, now.date, addDays(now.date, 7)));
  if (filtre === "telafi") where.push(gt(s.members.makeupCredits, 0));
  if (filtre === "bitti") where.push(lt(s.members.membershipEnd, now.date));
  const members = await db.select().from(s.members).where(and(...where)).orderBy(asc(s.members.name));

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Üyeler</h1>
          <p className="page-header__lede">{members.length} üye{q ? ` · “${q}” araması` : ""}</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn btn--primary" href="/uyeler/yeni">
            <Plus className="icon" aria-hidden="true" /> Üye ekle
          </Link>
        </div>
      </header>

      {added.length > 1 && (
        <p className="notice notice--ok" role="status">
          <span>
            {added.length} kişi grup olarak kaydedildi.{" "}
            <Link href={`/dersler/gruba-katil?uyeler=${added.join(",")}`}>Grup dersine ekle</Link> ·{" "}
            <Link href={`/rezervasyonlar/yeni?tur=ozel&uyeler=${added.join(",")}`}>Ekibe özel ders aç</Link>
          </span>
        </p>
      )}

      <section className="card">
        <form className="filters" role="search">
          <input className="input search-input" type="search" name="q" defaultValue={q} placeholder="İsimle ara" aria-label="Üye ara" />
          <div className="pills">
            {FILTERS.map((f) => (
              <label key={f.key} className="pill">
                <input type="radio" name="filtre" value={f.key} defaultChecked={filtre === f.key} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
          <button className="btn btn--sm" type="submit">Uygula</button>
        </form>

        {members.length ? (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Üye</th>
                  <th>Seviye</th>
                  <th className="num">Ders hakkı</th>
                  <th className="num">Telafi</th>
                  <th>Üyelik bitişi</th>
                  <th>Telefon</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const end = m.membershipEnd;
                  const expired = end && end < now.date;
                  const soon = end && !expired && end <= addDays(now.date, 7);
                  return (
                    <tr key={m.id} className={added.includes(m.id) ? "row-highlight" : undefined}>
                      <td>
                        <Link className="row-link" href={`/uyeler/${m.id}`}>{m.name}</Link>
                        <div className="muted">{TIER_LABEL[m.tier]}</div>
                      </td>
                      <td>{m.level ?? <span className="muted">—</span>}</td>
                      <td className="num">{m.lessonCredits}</td>
                      <td className="num">{m.makeupCredits > 0 ? <span className="chip chip--sm chip--ok">{m.makeupCredits}</span> : "0"}</td>
                      <td className="nowrap">
                        {end ? formatShortDate(end) : <span className="muted">—</span>}{" "}
                        {expired && <span className="chip chip--sm chip--warn">Doldu</span>}
                        {soon && <span className="chip chip--sm chip--warn">Bu hafta</span>}
                      </td>
                      <td className="muted nowrap">{m.phone ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">
            <strong>Üye bulunamadı</strong>
            Aramayı ya da filtreyi değiştirin.
          </p>
        )}
      </section>
    </>
  );
}
