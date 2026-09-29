import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoachInfoForm, HoursEditor } from "@/components/CoachEditor/CoachEditor";
import { GroupLessons } from "@/components/LessonPlanner/GroupLessons";
import { clubNow } from "@/lib/clock";
import { getCoachGroups, getCoachOptions, getMemberOptions } from "@/server/queries/planning";

export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const now = clubNow();
  const coach = (await getCoachOptions()).find((c) => c.id === id);
  if (!coach) notFound();
  const [groups, members] = await Promise.all([getCoachGroups(id, now), getMemberOptions()]);

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
