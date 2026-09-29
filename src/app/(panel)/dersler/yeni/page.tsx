import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LessonPlanner } from "@/components/LessonPlanner/LessonPlanner";
import { clubNow } from "@/lib/clock";
import { LEVELS } from "@/server/queries/common";
import { getAvailability, getCoachGroups, getCoachOptions, getMemberOptions } from "@/server/queries/planning";

export const metadata = { title: "Ders Planla · Tennis Clinic" };

export default async function NewLessonPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const now = clubNow();
  const kind = sp.tur === "grup" ? "group" : "private";
  const duration = [60, 90, 120].includes(Number(sp.sure)) ? Number(sp.sure) : kind === "group" ? 90 : 60;
  const [coaches, members] = await Promise.all([getCoachOptions(), getMemberOptions()]);
  const coach = coaches.find((c) => String(c.id) === sp.hoca && !c.onLeave) ?? null;
  const [days, groups] = coach
    ? await Promise.all([getAvailability(coach, kind, duration, now), getCoachGroups(coach.id, now)])
    : [[], []];

  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" href="/">
            <ChevronLeft className="icon" aria-hidden="true" />
            Genel Bakış
          </Link>
          <h1 className="page-header__title">Ders Planla</h1>
          <p className="page-header__lede">Antrenörü seçin; müsait gün ve saatlerden birini seçip öğrencileri atayın.</p>
        </div>
      </header>
      <LessonPlanner
        key={`${coach?.id}-${kind}-${duration}`}
        today={now.date}
        kind={kind}
        duration={duration}
        coaches={coaches}
        coach={coach}
        days={days}
        groups={groups}
        members={members}
        levels={LEVELS}
        defaultPrice={0}
      />
    </>
  );
}
