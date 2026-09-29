import { Split } from "@/components/AppShell/AppShell";
import { AttentionCard } from "@/components/AttentionCard/AttentionCard";
import { CoachesCard } from "@/components/CoachesCard/CoachesCard";
import { CourtBoard } from "@/components/CourtBoard/CourtBoard";
import { KpiCard, KpiGrid } from "@/components/KpiCard/KpiCard";
import { PageHead } from "@/components/PageHead/PageHead";
import { RevenueChart } from "@/components/RevenueChart/RevenueChart";
import { UpcomingSessions } from "@/components/UpcomingSessions/UpcomingSessions";
import { clubNow } from "@/lib/clock";
import { countCourts, getCourtView } from "@/lib/courts";
import { formatCurrency } from "@/lib/format";
import type { TextPart } from "@/lib/types";
import { getSettings } from "@/server/queries/common";
import { getDashboard } from "@/server/queries/dashboard";
import { getWeather } from "@/server/weather";

export default async function OverviewPage() {
  const now = clubNow();
  const settings = await getSettings();
  const weather = await getWeather(settings.weather);
  const data = await getDashboard(now, weather);

  // Kort durumları ve kalan süreler şu anki saate göre hesaplanır
  const courts = data.courts.map((c) => ({ ...c, view: getCourtView(c, now.time) }));
  const statuses = courts.map((c) => c.view.status);
  const counts = countCourts(statuses);
  const { kpis } = data;
  const compare: TextPart[] = [`geçen ${kpis.compareLabel}`, { text: `${kpis.compareSuffix} göre`, desktopOnly: true }];

  return (
    <>
      <PageHead
        now={now}
        firstName={settings.user.firstName}
        reservations={data.today.reservations}
        lessons={data.today.lessons}
        busyCourts={counts.busy}
        totalCourts={counts.total}
      />

      <KpiGrid>
        <KpiCard
          label="Bugünkü gelir"
          value={formatCurrency(kpis.revenue.value)}
          delta={kpis.revenue.delta}
          note={compare}
          visual={{ type: "sparkline", values: kpis.revenue.trend }}
          concealable
        />
        <KpiCard
          label="Rezervasyon"
          value={String(kpis.reservations.value)}
          delta={kpis.reservations.delta}
          note={compare}
          visual={{ type: "sparkline", values: kpis.reservations.trend }}
        />
        <KpiCard
          label="Ders"
          value={String(kpis.lessons.value)}
          aside={kpis.lessons.aside}
          delta={kpis.lessons.delta}
          note={compare}
          visual={{ type: "sparkline", values: kpis.lessons.trend }}
        />
        <KpiCard
          label="Kort doluluğu"
          value={`%${kpis.occupancy.value}`}
          delta={kpis.occupancy.delta}
          note={[{ text: "şu an ", desktopOnly: true }, `${counts.busy}/${counts.total} kort dolu`]}
          visual={{ type: "occupancy", states: statuses }}
        />
      </KpiGrid>

      <CourtBoard
        time={now.time}
        branch={settings.club.branch}
        counts={counts}
        courts={courts}
        reserveHref={(id) => `/rezervasyonlar/yeni?kort=${id}&tarih=${now.date}`}
      />

      <Split>
        <UpcomingSessions sessions={data.sessions} courts={data.courtInfo} remaining={data.remaining} />
        <AttentionCard alerts={data.alerts} activities={data.activities} now={now} />
      </Split>

      <Split>
        <RevenueChart data={data.revenue} time={now.time} />
        <CoachesCard lessonsToday={data.today.lessons} coaches={data.coaches} />
      </Split>
    </>
  );
}
