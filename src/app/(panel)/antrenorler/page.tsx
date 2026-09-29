import { Plus } from "lucide-react";
import Link from "next/link";
import { CoachesCard } from "@/components/CoachesCard/CoachesCard";
import { clubNow } from "@/lib/clock";
import { getDashboard } from "@/server/queries/dashboard";
import { getCoachGroups, getCoachOptions } from "@/server/queries/planning";

export const metadata = { title: "Antrenörler · Tennis Clinic" };

const WEEKDAYS = ["", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default async function CoachesPage() {
  const now = clubNow();
  const [data, options] = await Promise.all([getDashboard(now, null), getCoachOptions()]);
  const groups = await Promise.all(options.map((c) => getCoachGroups(c.id, now)));

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Antrenörler</h1>
          <p className="page-header__lede">Bugünkü durum, haftalık çalışma saatleri ve grup dersleri</p>
        </div>
        <div className="page-header__actions">
          <Link className="btn" href="/antrenorler/yeni">
            <Plus className="icon" aria-hidden="true" /> Antrenör ekle
          </Link>
          <Link className="btn btn--primary" href="/dersler/yeni">Ders planla</Link>
        </div>
      </header>

      <CoachesCard lessonsToday={data.today.lessons} coaches={data.coaches} />

      <section className="card" aria-labelledby="week-title">
        <h2 className="card__title" id="week-title">Haftalık plan</h2>
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Antrenör</th>
                <th>Çalışma saatleri</th>
                <th>Grup dersleri (14 gün)</th>
                <th aria-label="İşlem" />
              </tr>
            </thead>
            <tbody>
              {options.map((c, i) => {
                const g = groups[i];
                const titles = [...new Map(g.map((x) => [x.title, x])).values()];
                return (
                  <tr key={c.id}>
                    <td>
                      <Link className="row-link" href={`/antrenorler/${c.id}`}>{c.name}</Link>
                      <div className="muted">{c.onLeave ? "İzinli" : (c.role ?? "Antrenör")}</div>
                    </td>
                    <td className="muted">{c.hours.map((h) => `${WEEKDAYS[h.weekday]} ${h.start}–${h.end}`).join(" · ") || "—"}</td>
                    <td>
                      {titles.length
                        ? titles.map((x) => (
                            <div key={x.title}>
                              {x.title} <span className="chip chip--sm chip--ok">{x.level}</span>{" "}
                              <span className="muted">{x.members.length}/{x.capacity}</span>
                            </div>
                          ))
                        : <span className="muted">—</span>}
                    </td>
                    <td className="num">
                      {!c.onLeave && (
                        <Link className="btn btn--sm btn--outline" href={`/dersler/yeni?hoca=${c.id}`}>Müsait saatler</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
