import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell/AppShell";
import { clubNow } from "@/lib/clock";
import { formatCurrency, formatDayMonth } from "@/lib/format";
import { footerNav, navSections, quickActions, tabs } from "@/lib/navigation";
import { getSettings } from "@/server/queries/common";
import { getFreeCourtSuggestion, getShellCounts } from "@/server/queries/dashboard";
import { getWeather } from "@/server/weather";

// Veriler her istekte veritabanından okunur
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const now = clubNow();
  const settings = await getSettings();
  const [counts, suggestion, weather] = await Promise.all([
    getShellCounts(now),
    getFreeCourtSuggestion(now),
    getWeather(settings.weather),
  ]);

  return (
    <AppShell
      club={settings.club}
      user={settings.user}
      navSections={navSections(counts)}
      footerNav={footerNav}
      tabs={tabs}
      unreadNotifications={0}
      quickActions={quickActions({ count: counts.unpaidCount, total: formatCurrency(counts.unpaidTotal) })}
      sheetMeta={`${settings.club.branch} · ${formatDayMonth(now)}, ${now.time}`}
      suggestion={suggestion}
      weather={weather}
    >
      {children}
    </AppShell>
  );
}
