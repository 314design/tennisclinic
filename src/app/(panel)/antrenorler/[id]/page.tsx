import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoachInfoForm, HoursEditor } from "@/components/CoachEditor/CoachEditor";
import { GroupLessons } from "@/components/LessonPlanner/GroupLessons";
import { clubNow } from "@/lib/clock";
import { CoachCalendar, mondayOf } from "./CoachCalendar";
import { getCoachGroups, getCoachOptions, getMemberOptions, getOpenLessons } from "@/server/queries/planning";
import { TransferButton } from "@/components/TransferDialog/TransferDialog";
import { formatDayLabel, formatShortDate } from "@/lib/format";

export default async function CoachPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ hafta?: string }> }) {
  const id = Number((await params).id);
  const { hafta } = await searchParams;
  const now = clubNow();
  const coach = (await getCoachOptions()).find((c) => c.id === id);
  if (!coach) notFound();
  const [groups, members, openLessons, allCoaches] = await Promise.all([
    getCoachGroups(id, now),
    getMemberOptions(),
    getOpenLessons(now, id),
    getCoachOptions(),
  ]);

  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" href="/antrenorler">
            <ChevronLeft className="icon" aria-hidden="true" /> Antrenörler
          </Link>
          <h1 className="page-header__title">{coach.name}</h1>
          <p className="page-header__lede">{coach.onLeave ? "İzinli" : (coach.role ?? "Antrenör")}</p>
        </div>
        {!coach.onLeave && (
          <div className="page-header__actions">
            <Link className="btn btn--primary" href={`/dersler/yeni?hoca=${coach.id}`}>Ders planla</Link>
          </div>
        )}
      </header>

      {openLessons.length > 0 && (
        <section className="card" aria-labelledby="open-title">
          <header className="card__head">
            <div>
              <h2 className="card__title" id="open-title">Açıkta kalan dersler</h2>
              <p className="card__meta">{coach.name} izinli · {openLessons.length} ders başka hocaya aktarılmalı</p>
            </div>
          </header>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="table">
              <tbody>
                {openLessons.map((l) => (
                  <tr key={l.id}>
                    <td className="nowrap"><strong>{formatDayLabel(l.date, now.date)}</strong><div className="muted">{formatShortDate(l.date)} · {l.start}–{l.end}</div></td>
                    <td><Link className="row-link" href={`/seanslar/${l.id}`}>{l.title}</Link><div className="muted">{l.kind === "group" ? "Grup dersi" : "Özel ders"} · {l.courtName}</div></td>
                    <td className="num">
                      <TransferButton
                        small
                        today={now.date}
                        coaches={allCoaches}
                        target={{ id: l.id, label: `${l.title} · ${l.start}–${l.end}`, date: l.date, start: l.start, end: l.end, coachId: l.coachId, coachName: l.coachName }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <CoachCalendar
        coach={coach}
        week={mondayOf(hafta && /^\d{4}-\d{2}-\d{2}$/.test(hafta) ? hafta : now.date)}
        today={now.date}
        nowTime={now.time}
      />

      <GroupLessons groups={groups} members={members} coachName={coach.name} today={now.date} />

      <div className="two-col">
        <section className="card" aria-labelledby="hours-title">
          <h2 className="card__title" id="hours-title">Haftalık çalışma saatleri</h2>
          <p className="card__meta">Ders planlamada müsait saatler bu aralıklardan hesaplanır.</p>
          <div style={{ marginTop: 14 }}>
            <HoursEditor key={JSON.stringify(coach.hours)} coachId={coach.id} hours={coach.hours} />
          </div>
        </section>
        <section className="card" aria-labelledby="info-title">
          <h2 className="card__title" id="info-title">Bilgiler</h2>
          <div style={{ marginTop: 14 }}>
            <CoachInfoForm key={`${coach.name}-${coach.onLeave}`} coach={coach} />
          </div>
        </section>
      </div>
    </>
  );
}
