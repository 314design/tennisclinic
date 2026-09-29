import "server-only";
import { and, asc, between, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { addDays } from "@/lib/clock";
import { environmentLabel, isOpenAir } from "@/lib/courts";
import { formatCurrency, toMinutes, toTime, atTime } from "@/lib/format";
import type {
  Activity,
  Alert,
  Coach,
  CoachState,
  Court,
  CourtBooking,
  Delta,
  Now,
  RevenueData,
  Session,
  Weather,
} from "@/lib/types";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { bookingsOn, getSettings, TIER_LABEL, withDetails, type BookingDetail } from "./common";

const DAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const DAY_LONG = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const dayIndex = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

function percentDelta(current: number, previous: number): Delta {
  if (!previous) return { text: current ? "yeni" : "%0", direction: current ? "up" : "flat" };
  const p = Math.round(((current - previous) / previous) * 100);
  return { text: `%${Math.abs(p)}`, direction: p > 0 ? "up" : p < 0 ? "down" : "flat" };
}

function pointDelta(current: number, previous: number): Delta {
  const p = current - previous;
  return { text: `${Math.abs(p)} puan`, direction: p > 0 ? "up" : p < 0 ? "down" : "flat" };
}

function toCourtBooking(b: BookingDetail): CourtBooking {
  return {
    id: b.id,
    kind: b.kind,
    start: b.start,
    end: b.end,
    members: b.members.map((m) => m.name),
    coach: b.coach?.name,
    format: b.format ?? undefined,
    groupName: b.title ?? undefined,
    groupSize: b.members.length,
  };
}

/** Bir günün kort doluluğu (%): dolu dakika / (aktif kort × açık dakika) */
function occupancyPercent(rows: { start: string; end: string }[], courtCount: number, open: string, close: string) {
  const capacity = courtCount * (toMinutes(close) - toMinutes(open));
  if (!capacity) return 0;
  const used = rows.reduce((sum, r) => sum + toMinutes(r.end) - toMinutes(r.start), 0);
  return Math.min(100, Math.round((used / capacity) * 100));
}

export async function getDashboard(now: Now, weather: Weather | null) {
  const db = await getDb();
  const settings = await getSettings();
  const nowMin = toMinutes(now.time);
  const today = now.date;
  const tomorrow = addDays(today, 1);
  const weekAgo = addDays(today, -7);
  const from = addDays(today, -42);

  const [courtRows, todayRows, blocks, coachRows, history, paymentRows, activityRows] = await Promise.all([
    db.select().from(s.courts).where(eq(s.courts.active, true)).orderBy(asc(s.courts.sortOrder)),
    bookingsOn(today),
    db.select().from(s.courtBlocks).where(inArray(s.courtBlocks.date, [today, tomorrow])),
    db.select().from(s.coaches).where(eq(s.coaches.active, true)).orderBy(asc(s.coaches.id)),
    db
      .select({ date: s.bookings.date, kind: s.bookings.kind, start: s.bookings.start, end: s.bookings.end })
      .from(s.bookings)
      .where(and(between(s.bookings.date, from, today), ne(s.bookings.status, "cancelled"))),
    db
      .select({ date: s.payments.date, total: sql<number>`sum(${s.payments.amount})::int` })
      .from(s.payments)
      .where(between(s.payments.date, from, today))
      .groupBy(s.payments.date),
    db.select().from(s.activities).orderBy(desc(s.activities.createdAt)).limit(3),
  ]);
  const today_ = await withDetails(todayRows);

  /* ---------- Kortlar ---------- */
  const courts: Court[] = courtRows.map((c) => {
    const mine = today_.filter((b) => b.courtId === c.id);
    // Başlatılmış ama boşaltılmamış seans ya da saati şu ana denk gelen seans
    const occupant =
      mine.find((b) => b.status === "in_progress") ??
      mine.find((b) => b.status === "scheduled" && toMinutes(b.start) <= nowMin && nowMin < toMinutes(b.end));
    const next = mine.find((b) => b.status === "scheduled" && toMinutes(b.start) > nowMin);
    const block = blocks.find((k) => k.courtId === c.id && k.date === today && toMinutes(k.start) <= nowMin && nowMin < toMinutes(k.end));
    return {
      id: c.id,
      name: c.name,
      surface: environmentLabel(c),
      environment: c.environment,
      balloon: c.balloon,
      occupant: occupant && toCourtBooking(occupant),
      next: next && { start: next.start, member: next.title ?? next.members[0]?.name ?? "Rezervasyon" },
      maintenance: block && { start: block.start, end: block.end, reason: block.reason },
    };
  });

  /* ---------- Sıradaki seanslar: devam edenler + bugün başlayacaklar ---------- */
  const upcoming = today_
    .filter((b) => b.status === "in_progress" || (b.status === "scheduled" && toMinutes(b.end) > nowMin))
    .slice(0, 8);
  const sessions: Session[] = upcoming.map((b) => {
    const first = b.members[0];
    const isGroup = b.kind === "group";
    return {
      id: b.id,
      start: b.start,
      end: b.end,
      courtId: b.courtId,
      kind: b.kind,
      name: isGroup ? (b.title ?? "Grup dersi") : (first?.name ?? "—"),
      initials: first?.initials,
      memberLine: isGroup
        ? `${b.members.length}/${b.capacity ?? 6} kişi${b.level ? ` · ${b.level}` : ""}`
        : b.members.length > 1
          ? `+${b.members.length - 1} oyuncu`
          : first
            ? TIER_LABEL[first.tier]
            : "",
      coach: b.coach?.name,
      format: b.format ?? undefined,
      state: b.status === "in_progress" ? "in_progress" : "scheduled",
      paid: b.paid,
      memberCount: b.members.length,
    };
  });
  const remaining = today_.filter((b) => b.status === "scheduled" && toMinutes(b.start) > nowMin);

  /* ---------- Göstergeler ---------- */
  const revenueOn = (d: string) => paymentRows.find((p) => p.date === d)?.total ?? 0;
  const historyOn = (d: string) => history.filter((h) => h.date === d);
  const sameWeekdays = [35, 28, 21, 14, 7, 0].map((n) => addDays(today, -n));
  const count = (d: string, kinds: string[]) => historyOn(d).filter((h) => kinds.includes(h.kind)).length;
  const occ = (d: string) => occupancyPercent(historyOn(d), courtRows.length, settings.hours.open, settings.hours.close);

  const todayRevenue = revenueOn(today);
  const reservationsToday = count(today, ["reservation"]);
  const privateToday = count(today, ["private"]);
  const groupToday = count(today, ["group"]);
  const lessonsToday = privateToday + groupToday;
  const occupancyToday = occ(today);

  const kpis = {
    revenue: { value: todayRevenue, delta: percentDelta(todayRevenue, revenueOn(weekAgo)), trend: sameWeekdays.map(revenueOn) },
    reservations: {
      value: reservationsToday,
      delta: percentDelta(reservationsToday, count(weekAgo, ["reservation"])),
      trend: sameWeekdays.map((d) => count(d, ["reservation"])),
    },
    lessons: {
      value: lessonsToday,
      aside: `${privateToday} özel · ${groupToday} grup`,
      delta: percentDelta(lessonsToday, count(weekAgo, ["private", "group"])),
      trend: sameWeekdays.map((d) => count(d, ["private", "group"])),
    },
    occupancy: { value: occupancyToday, delta: pointDelta(occupancyToday, occ(weekAgo)) },
    compareLabel: DAY_LONG[dayIndex(today)].toLocaleLowerCase("tr-TR"),
    compareSuffix: ["a", "ye", "ya", "ya", "ye", "ya", "ye"][dayIndex(today)],
  };

  /* ---------- Gelir grafiği ---------- */
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const prevDays = days.map((d) => addDays(d, -7));
  const revenueValues = days.map(revenueOn);
  const occValues = days.map(occ);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const avg = (a: number[]) => Math.round(sum(a) / a.length);
  // Eksen üst sınırı: 1-2-5 dizisine yuvarlanır (ör. 38.000 → 50.000)
  const niceMax = (v: number) => {
    if (v <= 0) return 10000;
    const raw = v * 1.1;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const n = raw / mag;
    return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  };
  const monthName = (d: string) => new Intl.DateTimeFormat("tr-TR", { month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const dayNum = (d: string) => Number(d.slice(8, 10));
  const revenue: RevenueData = {
    rangeLabel:
      monthName(days[0]) === monthName(today)
        ? `${dayNum(days[0])}–${dayNum(today)} ${monthName(today)}`
        : `${dayNum(days[0])} ${monthName(days[0])} – ${dayNum(today)} ${monthName(today)}`,
    days: days.map((d, i) => (i === 6 ? { short: "Bugün", long: "Bugün" } : { short: DAY_SHORT[dayIndex(d)], long: DAY_LONG[dayIndex(d)] })),
    series: [
      {
        key: "gelir", label: "Gelir", title: "Gelir · son 7 gün", unit: "currency", summary: "sum",
        delta: percentDelta(sum(revenueValues), sum(prevDays.map(revenueOn))),
        max: niceMax(Math.max(...revenueValues)),
        values: revenueValues,
      },
      {
        key: "doluluk", label: "Doluluk", title: "Kort doluluğu · son 7 gün", unit: "percent", summary: "average",
        delta: pointDelta(avg(occValues), avg(prevDays.map(occ))),
        max: 100,
        values: occValues,
      },
    ],
  };

  /* ---------- Dikkat gerektirenler ---------- */
  const alerts: Alert[] = [];
  const unpaid = await withDetails(
    await db
      .select()
      .from(s.bookings)
      .where(and(eq(s.bookings.paid, false), ne(s.bookings.status, "cancelled"), between(s.bookings.date, addDays(today, -30), addDays(today, 7))))
      .orderBy(asc(s.bookings.date), asc(s.bookings.start)),
  );
  if (unpaid.length) {
    const names = [...new Set(unpaid.map((b) => b.members[0]?.name).filter(Boolean))];
    alerts.push({
      id: "unpaid", tone: "warn", icon: "wallet", href: "/odemeler", action: "Tahsil et",
      title: `${unpaid.length} ödeme bekliyor`,
      detail: `${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2}` : ""} · ${formatCurrency(unpaid.reduce((a, b) => a + b.price, 0))}`,
    });
  }

  const ending = await db
    .select({ name: s.members.name })
    .from(s.members)
    .where(between(s.members.membershipEnd, today, addDays(today, 7)));
  if (ending.length) {
    alerts.push({
      id: "ending", tone: "ok", icon: "id-card", href: "/uyeler?filtre=bitiyor", action: "Hatırlat",
      title: `${ending.length} üyelik bu hafta bitiyor`,
      detail: ending.slice(0, 3).map((m) => m.name).join(", "),
    });
  }

  for (const block of blocks.filter((k) => k.date === today ? toMinutes(k.end) > nowMin : true)) {
    const court = courtRows.find((c) => c.id === block.courtId);
    if (!court) continue;
    const isToday = block.date === today;
    alerts.push({
      id: `block-${block.id}`, tone: "neutral", icon: "wrench", href: "/kortlar", action: "Düzenle",
      title: `${court.name} ${isToday ? "" : "yarın "}bakımda`,
      detail: `${block.reason} · ${isToday ? `${atTime(block.end)} açılacak` : `${block.start}–${block.end}`}`,
    });
  }

  if (weather) {
    const openCourtIds = courtRows.filter(isOpenAir).map((c) => c.id);
    const rainSoon = weather.hours.find((h) => h.precipitationProbability >= 50);
    if (rainSoon && openCourtIds.length) {
      const affected = today_.filter(
        (b) => openCourtIds.includes(b.courtId) && b.status === "scheduled" && toMinutes(b.end) > toMinutes(rainSoon.time),
      ).length;
      if (affected) {
        alerts.push({
          id: "rain-today", tone: "sage", icon: "cloud-rain", href: "/takvim", action: "Takvime bak",
          title: `${toTime(rainSoon.time)} doğru yağmur bekleniyor`,
          detail: `Açık kortlarda ${affected} seans var · %${rainSoon.precipitationProbability} olasılık`,
        });
      }
    }
    if (weather.tomorrowPrecipitation >= 50 && openCourtIds.length) {
      const tomorrowRows = await bookingsOn(tomorrow);
      const affected = tomorrowRows.filter((b) => openCourtIds.includes(b.courtId)).length;
      if (affected) {
        alerts.push({
          id: "rain-tomorrow", tone: "sage", icon: "cloud-rain", href: `/takvim?tarih=${tomorrow}`, action: "Üyelere bildir",
          title: "Yarın yağmur bekleniyor",
          detail: `Açık kortlarda ${affected} seans var · %${weather.tomorrowPrecipitation} olasılık`,
        });
      }
    }
  }

  /* ---------- Son hareketler ---------- */
  const activities: Activity[] = activityRows.map((a) => ({
    id: a.id,
    name: a.subject,
    text: a.text,
    at: a.createdAt.toISOString(),
    tone: a.tone,
  }));

  /* ---------- Antrenörler ---------- */
  const coaches = coachRows.map((c) => {
    const mine = today_.filter((b) => b.coachId === c.id);
    const current = mine.find((b) => b.status === "in_progress" || (toMinutes(b.start) <= nowMin && nowMin < toMinutes(b.end)));
    const next = mine.find((b) => b.status === "scheduled" && toMinutes(b.start) > nowMin);
    const courtName = (id: number) => courtRows.find((k) => k.id === id)?.name ?? "";
    const state: CoachState = c.onLeave
      ? { type: "off" }
      : current
        ? { type: "teaching", courtName: courtName(current.courtId), until: current.end }
        : { type: "available", next: next && { start: next.start, courtName: courtName(next.courtId) } };
    const coach: Coach = {
      id: c.id,
      name: c.name,
      initials: c.initials,
      role: c.role ?? undefined,
      avatarTone: c.avatarTone,
      lessonsDone: mine.filter((b) => b.status === "completed" || toMinutes(b.end) <= nowMin).length,
      lessonsTotal: mine.length,
    };
    return { coach, state };
  });

  const courtInfo = Object.fromEntries(courtRows.map((c) => [c.id, { name: c.name, surface: environmentLabel(c) }]));

  return {
    settings,
    courts,
    sessions,
    remaining: {
      reservations: remaining.filter((b) => b.kind === "reservation").length,
      lessons: remaining.filter((b) => b.kind !== "reservation").length,
    },
    courtInfo,
    kpis,
    revenue,
    alerts,
    activities,
    coaches,
    today: { reservations: reservationsToday, lessons: lessonsToday },
  };
}

/** Kabuk (yan menü, alt menü, hızlı işlem) için sayaçlar */
export async function getShellCounts(now: Now) {
  const db = await getDb();
  const [todayCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.bookings)
    .where(and(eq(s.bookings.date, now.date), ne(s.bookings.status, "cancelled")));
  const [unpaid] = await db
    .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${s.bookings.price}), 0)::int` })
    .from(s.bookings)
    .where(and(eq(s.bookings.paid, false), ne(s.bookings.status, "cancelled"), between(s.bookings.date, addDays(now.date, -30), addDays(now.date, 7))));
  return { bookingsToday: todayCount.n, unpaidCount: unpaid.n, unpaidTotal: unpaid.total };
}

/** Hızlı işlem menüsündeki "Şu an müsait" önerisi */
export async function getFreeCourtSuggestion(now: Now) {
  const db = await getDb();
  const nowMin = toMinutes(now.time);
  const [courtRows, rows, blocks] = await Promise.all([
    db.select().from(s.courts).where(eq(s.courts.active, true)).orderBy(asc(s.courts.sortOrder)),
    bookingsOn(now.date),
    db.select().from(s.courtBlocks).where(eq(s.courtBlocks.date, now.date)),
  ]);
  const settings = await getSettings();
  if (nowMin >= toMinutes(settings.hours.close)) return undefined;
  for (const c of courtRows) {
    const mine = rows.filter((b) => b.courtId === c.id);
    const busy =
      mine.some((b) => b.status === "in_progress" || (toMinutes(b.start) <= nowMin && nowMin < toMinutes(b.end))) ||
      blocks.some((k) => k.courtId === c.id && toMinutes(k.start) <= nowMin && nowMin < toMinutes(k.end));
    if (busy) continue;
    const next = mine.find((b) => toMinutes(b.start) > nowMin);
    const until = next?.start ?? settings.hours.close;
    // Bir sonraki yarım saate yuvarla
    const startMin = Math.ceil(nowMin / 30) * 30;
    const start = `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
    return {
      courtName: c.name,
      surface: environmentLabel(c),
      freeText: `${toTime(until)} kadar boş`,
      freeMinutes: toMinutes(until) - nowMin,
      href: `/rezervasyonlar/yeni?kort=${c.id}&tarih=${now.date}&saat=${start}`,
    };
  }
  return undefined;
}
