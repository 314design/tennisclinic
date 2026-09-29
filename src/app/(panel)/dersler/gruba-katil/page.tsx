import { inArray } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { GroupJoin } from "@/components/GroupJoin/GroupJoin";
import { clubNow } from "@/lib/clock";
import { MAX_PRIVATE_PEOPLE } from "@/lib/pricing";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { getGroupSeries } from "@/server/queries/planning";

export const metadata = { title: "Grup Dersine Ekle · Tennis Clinic" };

export default async function JoinGroupPage({ searchParams }: { searchParams: Promise<{ uyeler?: string }> }) {
  const { uyeler = "" } = await searchParams;
  const ids = [...new Set(uyeler.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 12);
  const now = clubNow();
  const db = await getDb();
  const [members, series] = await Promise.all([
    ids.length
      ? db.select({ id: s.members.id, name: s.members.name, level: s.members.level, lessonCredits: s.members.lessonCredits }).from(s.members).where(inArray(s.members.id, ids))
      : Promise.resolve([]),
    getGroupSeries(now),
  ]);
  const q = members.map((m) => m.id).join(",");

  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" href="/uyeler">
            <ChevronLeft className="icon" aria-hidden="true" /> Üyeler
          </Link>
          <h1 className="page-header__title">Grup Dersine Ekle</h1>
          <p className="page-header__lede">
            {members.length
              ? `${members.map((m) => m.name).join(", ")} · ${members.length} kişiye yeri olan grup dersleri`
              : "Üye seçilmedi."}
          </p>
        </div>
        {members.length > 0 && (
          <div className="page-header__actions">
            {members.length <= MAX_PRIVATE_PEOPLE && (
              <Link className="btn" href={`/rezervasyonlar/yeni?tur=ozel&uyeler=${q}`}>Ekibe özel ders aç</Link>
            )}
            <Link className="btn btn--primary" href={`/rezervasyonlar/yeni?tur=grup&uyeler=${q}`}>Yeni grup dersi aç</Link>
          </div>
        )}
      </header>
      {members.length ? (
        <GroupJoin members={members} series={series} today={now.date} />
      ) : (
        <section className="card">
          <p className="empty">
            <strong>Eklenecek üye yok</strong>
            <Link href="/uyeler/yeni">Üye Ekle</Link> ekranında “Grup olarak ekle” ile birlikte gelen kişileri kaydedin.
          </p>
        </section>
      )}
    </>
  );
}
