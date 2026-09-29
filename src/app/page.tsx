import { AppShell, Split } from "@/components/AppShell/AppShell";
import { AttentionCard } from "@/components/AttentionCard/AttentionCard";
import { CoachesCard } from "@/components/CoachesCard/CoachesCard";
import { CourtBoard } from "@/components/CourtBoard/CourtBoard";
import { KpiCard, KpiGrid, type KpiVisual } from "@/components/KpiCard/KpiCard";
import { PageHead } from "@/components/PageHead/PageHead";
import { RevenueChart } from "@/components/RevenueChart/RevenueChart";
import { UpcomingSessions } from "@/components/UpcomingSessions/UpcomingSessions";
import * as data from "@/data/mock";
import { getCoachState } from "@/lib/coaches";
import { countCourts, getCourtView } from "@/lib/courts";
import { formatDayMonth } from "@/lib/format";
import type { KpiData, TextPart } from "@/lib/types";

export default function OverviewPage() {
  const { now } = data;

  // Kort durumları ve kalan süreler `now`'a göre hesaplanır
  const courts = data.courts.map((c) => ({ ...c, view: getCourtView(c, now.time) }));
  const statuses = courts.map((c) => c.view.status);
  const counts = countCourts(statuses);

  const kpiProps = (kpi: KpiData): { visual?: KpiVisual; note: TextPart[] } =>
    kpi.id === "occupancy"
      ? {
          visual: { type: "occupancy", states: statuses },
          note: [{ text: "şu an ", desktopOnly: true }, `${counts.busy}/${counts.total} kort dolu`],
        }
      : { visual: kpi.trend && { type: "sparkline", values: kpi.trend }, note: kpi.note };

  const courtInfo = Object.fromEntries(courts.map((c) => [c.id, { name: c.name, surface: c.surface }]));

  const freeCourt = courts.find((c) => c.view.status === "free");
  const suggestion = freeCourt && {
    courtName: freeCourt.name,
    surface: freeCourt.surface,
    freeText: freeCourt.view.who,
    freeMinutes: freeCourt.view.freeMinutes,
  };

  const coaches = data.coaches.map((coach) => ({
    coach,
    state: getCoachState(coach, data.courts, data.sessions, now.time),
  }));

  return (
    <AppShell
      club={data.club}
      user={data.currentUser}
      navSections={data.navSections}
      footerNav={data.footerNav}
      tabs={data.tabs}
      unreadNotifications={data.unreadNotifications}
      quickActions={data.quickActions}
      sheetMeta={`${data.club.branch} · ${formatDayMonth(now)}, ${now.time}`}
      suggestion={suggestion}
    >
      <PageHead
        now={now}
        firstName={data.currentUser.firstName}
        reservations={data.today.reservations}
        lessons={data.today.lessons}
        busyCourts={counts.busy}
        totalCourts={counts.total}
      />

      <KpiGrid>
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.id} label={kpi.label} value={kpi.value} aside={kpi.aside} delta={kpi.delta} {...kpiProps(kpi)} />
        ))}
      </KpiGrid>

      <CourtBoard time={now.time} branch={data.club.branch} counts={counts} courts={courts} />

      <Split>
        <UpcomingSessions sessions={data.sessions} courts={courtInfo} summary={data.sessionsSummary} />
        <AttentionCard alerts={data.alerts} activities={data.activities} now={now} />
      </Split>

      <Split>
        <RevenueChart data={data.revenue} time={now.time} />
        <CoachesCard lessonsToday={data.today.lessons} coaches={coaches} />
      </Split>
    </AppShell>
  );
}
