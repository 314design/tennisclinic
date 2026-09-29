/**
 * Örnek veriler. Bugünün tarihine göre üretilir: son 6 haftanın geçmişi, bugün ve önümüzdeki 2 hafta.
 * Aynı gün tekrar çalıştırıldığında aynı sonucu verir (sabit tohumlu rastgele sayı üreteci).
 */
import { sql } from "drizzle-orm";
import { addDays, clubNow, fromMinutes, weekdayOf } from "../../lib/clock";
import { toMinutes } from "../../lib/format";
import type { Db } from "./connect";
import { bandFor, DEFAULT_PRICE_LIST, MAX_SHARED_LESSONS, packagePrice, singleLessonPrice } from "../../lib/pricing";
import { DEFAULT_SETTINGS } from "./defaults";
import * as s from "./schema";

function rng(seedValue: number) {
  let a = seedValue >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr-TR");

const MEMBER_NAMES = [
  "Deniz Aydın", "Mert Kaya", "Can Demir", "Zeynep Arslan", "Ece Koç", "Sude Kalkan", "Arda Polat", "Efe Tunç",
  "Burak Şahin", "Ozan Kurt", "Kerem Yılmaz", "İrem Güneş", "Naz Özkan", "Umut Çetin", "Elif Yıldız", "Emre Aksoy",
  "Selin Doğan", "Kaan Öztürk", "Defne Erdem", "Barış Aslan", "Ayşe Karataş", "Yusuf Çelik", "Nehir Tekin", "Alp Güler",
  "Duru Şen", "Onur Bulut", "Melis Acar", "Tuna Korkmaz", "Lara Özdemir", "Ege Yavuz", "Ada Kılınç", "Kuzey Ateş",
  "Eylül Uysal", "Batu Sarı", "Ela Başar", "Cem Aydoğan",
];

const COACHES = [
  { name: "Tolga Aksu", role: "Baş antrenör", avatarTone: "deep", hours: [[1, "09:00", "21:00"], [2, "09:00", "21:00"], [3, "09:00", "21:00"], [4, "09:00", "21:00"], [5, "09:00", "21:00"], [6, "09:00", "16:00"]] },
  { name: "Ceren Başaran", role: null, avatarTone: "default", hours: [[1, "12:00", "21:00"], [2, "12:00", "21:00"], [3, "12:00", "21:00"], [4, "12:00", "21:00"], [5, "12:00", "21:00"]] },
  { name: "Serkan Uçar", role: null, avatarTone: "lime", hours: [[1, "14:00", "22:00"], [3, "14:00", "22:00"], [5, "14:00", "22:00"], [6, "09:00", "18:00"], [7, "09:00", "18:00"]] },
  { name: "Melis Tan", role: null, avatarTone: "default", hours: [[1, "10:00", "21:00"], [2, "10:00", "18:00"], [3, "10:00", "21:00"], [4, "10:00", "18:00"], [6, "10:00", "16:00"]] },
  { name: "Barış Kılıç", role: null, avatarTone: "off", onLeave: true, hours: [[2, "09:00", "17:00"], [4, "09:00", "17:00"]] },
] as const;

/** Haftalık sabit grup dersleri: [grup adı, seviye, kapasite, antrenör sırası, kort sırası, günler, başlangıç, bitiş, üye sıraları] */
const GROUPS = [
  { title: "Junior grubu", level: "Junior", capacity: 6, coach: 1, court: 2, days: [2, 4], start: "16:30", end: "18:00", members: [18, 22, 24, 28, 30, 32] },
  { title: "Başlangıç grubu", level: "Başlangıç", capacity: 6, coach: 2, court: 1, days: [1, 3, 5], start: "17:00", end: "18:30", members: [14, 15, 20, 26] },
  { title: "Çiftler grubu", level: "Orta", capacity: 4, coach: 3, court: 2, days: [1, 3], start: "19:00", end: "20:30", members: [16, 17, 19, 21] },
  { title: "Performans grubu", level: "İleri", capacity: 6, coach: 0, court: 0, days: [6], start: "10:00", end: "12:00", members: [0, 1, 2, 6, 7] },
];

const PRICE = { reservation: 900, groupPerMember: 400 };

export async function seedBase(db: Db) {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(s.settings).values({ key, value }).onConflictDoNothing();
  }
  const [{ lists }] = await db.select({ lists: sql<number>`count(*)::int` }).from(s.priceLists);
  if (lists === 0) {
    const { effectiveFrom, ...data } = DEFAULT_PRICE_LIST;
    await db.insert(s.priceLists).values({ effectiveFrom, data });
  }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(s.courts);
  if (count === 0) {
    await db.insert(s.courts).values([
      { name: "Kort 1", environment: "outdoor", surface: "Toprak", sortOrder: 1 },
      { name: "Kort 2", environment: "outdoor", surface: "Toprak", sortOrder: 2 },
      { name: "Kort 3", environment: "indoor", surface: "Sert zemin", sortOrder: 3 },
    ]);
  }
}

export async function seed(db: Db, { onlyIfEmpty = true, reset = false } = {}): Promise<boolean> {
  if (reset) {
    await db.execute(
      sql`TRUNCATE activities, payments, credit_transactions, booking_members, bookings, package_members, packages, price_lists, members, coach_hours, coaches, court_blocks, courts, settings RESTART IDENTITY CASCADE`,
    );
  }
  if (onlyIfEmpty) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(s.members);
    if (count > 0) return false;
  }

  await seedBase(db);
  const now = clubNow();
  const today = now.date;
  const nowMin = toMinutes(now.time);
  const rand = rng(Number(today.replaceAll("-", "")));
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

  const courtRows = await db.select().from(s.courts).orderBy(s.courts.sortOrder);

  const coachRows = await db
    .insert(s.coaches)
    .values(COACHES.map((c) => ({ name: c.name, initials: initials(c.name), role: c.role, avatarTone: c.avatarTone, onLeave: "onLeave" in c && c.onLeave })))
    .returning();
  await db.insert(s.coachHours).values(
    COACHES.flatMap((c, i) => c.hours.map(([weekday, start, end]) => ({ coachId: coachRows[i].id, weekday, start, end }))),
  );

  const memberRows = await db
    .insert(s.members)
    .values(
      MEMBER_NAMES.map((name, i) => ({
        name,
        initials: initials(name),
        phone: `0532 ${String(100 + i * 7).padStart(3, "0")} ${String(10 + i).padStart(2, "0")} ${String(40 + i).padStart(2, "0")}`,
        tier: (i % 3 === 0 ? "premium" : "standard") as "premium" | "standard",
        level: pick(["Başlangıç", "Orta", "İleri"]),
        // 5 üyeliğin süresi bu hafta doluyor
        membershipEnd: addDays(today, i < 5 ? 1 + i : 10 + Math.floor(rand() * 150)),
        lessonCredits: 2 + Math.floor(rand() * 10),
        makeupCredits: i % 7 === 0 ? 1 : 0,
      })),
    )
    .returning();
  await db.insert(s.creditTransactions).values(
    memberRows.map((m) => ({ memberId: m.id, kind: "lesson_added" as const, delta: m.lessonCredits, note: "Başlangıç paketi" })),
  );

  // ---------- Seanslar ----------
  // half: 1 kişilik paylaşımlı özel ders (kortu en fazla 2 ders paylaşır)
  type Slot = { courtId: number; coachId?: number; date: string; start: number; end: number; half?: boolean };
  const taken: Slot[] = [];
  const overlaps = (a: Slot) => {
    const sameTime = taken.filter((b) => b.date === a.date && a.start < b.end && b.start < a.end);
    if (a.coachId && sameTime.some((b) => b.coachId === a.coachId)) return true;
    const onCourt = sameTime.filter((b) => b.courtId === a.courtId);
    if (!onCourt.length) return false;
    return !(a.half && onCourt.every((b) => b.half) && onCourt.length < MAX_SHARED_LESSONS);
  };

  const payments: (typeof s.payments.$inferInsert)[] = [];

  async function addBooking(
    b: Omit<typeof s.bookings.$inferInsert, "status" | "startedAt">,
    memberIds: number[],
    opts: { unpaid?: boolean; cancelWeather?: boolean } = {},
  ) {
    const endMin = toMinutes(b.end);
    const startMin = toMinutes(b.start);
    let status: s.BookingStatus = "scheduled";
    if (b.date < today || (b.date === today && endMin <= nowMin)) status = "completed";
    else if (b.date === today && startMin <= nowMin) status = "in_progress";
    const cancelled = opts.cancelWeather && b.date <= today;
    const paid = !opts.unpaid;
    const [row] = await db
      .insert(s.bookings)
      .values({
        ...b,
        status: cancelled ? "cancelled" : status,
        paid,
        startedAt: status === "in_progress" ? new Date() : null,
        cancelReason: cancelled ? "weather" : null,
        cancelledAt: cancelled ? new Date() : null,
      })
      .returning();
    if (memberIds.length) {
      await db.insert(s.bookingMembers).values(
        memberIds.map((memberId) => ({ bookingId: row.id, memberId, arrived: status !== "scheduled" && !cancelled })),
      );
    }
    if (cancelled) {
      for (const memberId of memberIds) {
        await db.execute(sql`UPDATE members SET makeup_credits = makeup_credits + 1 WHERE id = ${memberId}`);
        await db.insert(s.creditTransactions).values({ memberId, kind: "makeup_granted", delta: 1, bookingId: row.id, note: "Hava durumu nedeniyle iptal" });
      }
    } else if (paid && status !== "scheduled") {
      const amount = b.kind === "group" ? PRICE.groupPerMember * memberIds.length : b.price ?? 0;
      if (amount > 0) payments.push({ memberId: memberIds[0], bookingId: row.id, amount, date: b.date, description: b.kind === "group" ? `${b.title} · ders ücreti` : b.kind === "private" ? "Özel ders" : "Kort kiralama" });
    }
    return row;
  }

  // ---------- Haftalık sabit özel ders paketleri (8 seans, 3 hafta önce başlamış) ----------
  const todayWd = weekdayOf(today);
  const PACKAGES: { members: number[]; coach: number; court: number; weekday: number; start: string; exclusive?: boolean; unpaid?: boolean }[] = [
    { members: [3], coach: 0, court: 0, weekday: 2, start: "20:00" },
    { members: [9], coach: 1, court: 0, weekday: 2, start: "20:00" }, // aynı kortu paylaşır
    { members: [10], coach: 0, court: 1, weekday: 4, start: "11:00", exclusive: true },
    { members: [11, 16], coach: 3, court: 1, weekday: 1, start: "10:00" },
    { members: [8], coach: 2, court: 0, weekday: 6, start: "14:00" },
    { members: [0], coach: 0, court: 2, weekday: 3, start: "12:00" },
    { members: [1], coach: 3, court: 2, weekday: 3, start: "12:00" }, // aynı kortu paylaşır
    { members: [4, 5, 6], coach: 1, court: 0, weekday: 5, start: "19:00" },
    { members: [20], coach: 2, court: 2, weekday: 7, start: "10:00", exclusive: true, unpaid: true },
    { members: [25], coach: 0, court: 1, weekday: todayWd, start: "18:00" },
    { members: [26], coach: 1, court: 1, weekday: todayWd, start: "18:00", unpaid: true }, // bugün paylaşımlı kort
  ];
  const firstOn = (weekday: number) => {
    let d = addDays(today, -21);
    while (weekdayOf(d) !== weekday) d = addDays(d, 1);
    return d;
  };
  const packageRows = [];
  for (const p of PACKAGES) {
    const start = firstOn(p.weekday);
    const end = fromMinutes(toMinutes(p.start) + 60);
    const band = bandFor(DEFAULT_PRICE_LIST, start, p.start, end);
    const price = packagePrice(DEFAULT_PRICE_LIST, { band, people: p.members.length, sessions: 8, exclusive: !!p.exclusive });
    const [row] = await db
      .insert(s.packages)
      .values({
        coachId: coachRows[p.coach].id, peopleCount: p.members.length, sessions: 8, band, exclusive: !!p.exclusive && p.members.length === 1,
        price, paid: !p.unpaid, fixedWeekday: p.weekday, fixedStart: p.start,
      })
      .returning();
    await db.insert(s.packageMembers).values(p.members.map((i) => ({ packageId: row.id, memberId: memberRows[i].id })));
    if (!p.unpaid) payments.push({ memberId: memberRows[p.members[0]].id, amount: price, date: start, description: `8 seanslık özel ders paketi (${p.members.length} kişi)` });
    packageRows.push({ def: p, row, dates: Array.from({ length: 8 }, (_, i) => addDays(start, i * 7)), end, used: 0 });
  }

  for (let offset = -42; offset <= 14; offset++) {
    const date = addDays(today, offset);
    const weekday = weekdayOf(date);
    // Geçmişte bazı yağmurlu günlerde açık kort dersleri iptal oldu
    const rainyDay = offset < 0 && rand() < 0.08;

    // 1) Grup dersleri önce yerleşir (öncelikli)
    for (const g of GROUPS) {
      if (!g.days.includes(weekday)) continue;
      const court = courtRows[g.court];
      const coach = coachRows[g.coach];
      const slot = { courtId: court.id, coachId: coach.id, date, start: toMinutes(g.start), end: toMinutes(g.end) };
      taken.push(slot);
      await addBooking(
        { kind: "group", courtId: court.id, coachId: coach.id, date, start: g.start, end: g.end, title: g.title, level: g.level, capacity: g.capacity, price: 0 },
        g.members.map((i) => memberRows[i].id),
        { cancelWeather: rainyDay && court.environment === "outdoor" },
      );
    }

    // 2) Haftalık sabit paket dersleri
    for (const pk of packageRows) {
      if (!pk.dates.includes(date)) continue;
      const court = courtRows[pk.def.court];
      const coach = coachRows[pk.def.coach];
      const half = pk.def.members.length === 1 && !pk.row.exclusive;
      const slot = { courtId: court.id, coachId: coach.id, date, start: toMinutes(pk.def.start), end: toMinutes(pk.end), half };
      if (overlaps(slot)) continue;
      taken.push(slot);
      pk.used++;
      await addBooking(
        { kind: "private", courtId: court.id, coachId: coach.id, date, start: pk.def.start, end: pk.end, packageId: pk.row.id, exclusive: pk.row.exclusive, seriesId: `seed-${pk.row.id}`, price: 0 },
        pk.def.members.map((i) => memberRows[i].id),
        { cancelWeather: rainyDay && court.environment === "outdoor" },
      );
    }

    // 3) Tek özel dersler ve kort kiralamaları boş saatlere
    const activeCoaches = coachRows.filter((c) => !c.onLeave);
    const lessonCount = 3 + Math.floor(rand() * 3);
    const rentalCount = 5 + Math.floor(rand() * 4);
    for (let n = 0; n < lessonCount + rentalCount; n++) {
      const isLesson = n < lessonCount;
      const court = pick(courtRows);
      const duration = isLesson ? 60 : pick([60, 90]);
      const start = 9 * 60 + Math.floor(rand() * 24) * 30;
      if (start + duration > 22 * 60) continue;
      const coach = isLesson ? pick(activeCoaches) : undefined;
      if (coach) {
        const hours = COACHES[coachRows.indexOf(coach)].hours.find(([d]) => d === weekday);
        if (!hours || start < toMinutes(hours[1]) || start + duration > toMinutes(hours[2])) continue;
      }
      const slot = { courtId: court.id, coachId: coach?.id, date, start, end: start + duration, half: isLesson };
      if (overlaps(slot)) continue;
      taken.push(slot);
      const members = isLesson ? [pick(memberRows).id] : [pick(memberRows).id, pick(memberRows).id].filter((v, i, a) => a.indexOf(v) === i);
      await addBooking(
        {
          kind: isLesson ? "private" : "reservation",
          courtId: court.id,
          coachId: coach?.id,
          date,
          start: fromMinutes(start),
          end: fromMinutes(start + duration),
          format: isLesson ? null : members.length > 1 && rand() < 0.4 ? "doubles" : "singles",
          price: isLesson
            ? singleLessonPrice(DEFAULT_PRICE_LIST, { band: bandFor(DEFAULT_PRICE_LIST, date, fromMinutes(start), fromMinutes(start + duration)), people: 1, exclusive: false })
            : Math.round((PRICE.reservation * duration) / 60),
        },
        members,
        { unpaid: offset >= 0 && offset <= 3 && !isLesson && rand() < 0.3, cancelWeather: rainyDay && court.environment === "outdoor" },
      );
    }
  }

  for (const pk of packageRows) {
    await db.update(s.packages).set({ usedSessions: pk.used }).where(sql`${s.packages.id} = ${pk.row.id}`);
  }
  if (payments.length) await db.insert(s.payments).values(payments);

  // Bir bakım kaydı: yarın sabah Kort 2 zemin bakımı
  await db.insert(s.courtBlocks).values({ courtId: courtRows[1].id, date: addDays(today, 1), start: "08:00", end: "10:00", reason: "Zemin bakımı" });

  const ago = (min: number) => new Date(Date.now() - min * 60_000);
  await db.insert(s.activities).values([
    { memberId: memberRows[12].id, subject: memberRows[12].name, text: "üye olarak kaydedildi", createdAt: ago(5) },
    { memberId: memberRows[5].id, subject: memberRows[5].name, text: "10 derslik paket aldı · ₺12.500", createdAt: ago(18) },
    { memberId: memberRows[13].id, subject: memberRows[13].name, text: "rezervasyonunu iptal etti", tone: "danger", createdAt: ago(27) },
  ]);

  return true;
}
