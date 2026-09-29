import "server-only";
import ExcelJS from "exceljs";
import { and, asc, between, gte, inArray } from "drizzle-orm";
import { CANCEL_REASONS, type CancelReason } from "@/lib/booking";
import { clubNow } from "@/lib/clock";
import { environmentLabel, FORMAT_LABEL } from "@/lib/courts";
import { formatShortDate, toMinutes } from "@/lib/format";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { KIND_LABEL, TIER_LABEL, withDetails } from "@/server/queries/common";
import { getPackages } from "@/server/queries/planning";

/* =========================================================
   Tam yedek: tüm tablolar olduğu gibi (JSON)
   ========================================================= */

export async function buildBackup() {
  const db = await getDb();
  const tables = {
    settings: await db.select().from(s.settings),
    priceLists: await db.select().from(s.priceLists),
    courts: await db.select().from(s.courts),
    courtBlocks: await db.select().from(s.courtBlocks),
    coaches: await db.select().from(s.coaches),
    coachHours: await db.select().from(s.coachHours),
    members: await db.select().from(s.members),
    packages: await db.select().from(s.packages),
    packageMembers: await db.select().from(s.packageMembers),
    bookings: await db.select().from(s.bookings),
    bookingMembers: await db.select().from(s.bookingMembers),
    creditTransactions: await db.select().from(s.creditTransactions),
    payments: await db.select().from(s.payments),
    activities: await db.select().from(s.activities),
  };
  return {
    app: "Tennis Clinic",
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
    tables,
  };
}

/* =========================================================
   Excel özet raporu (tarih aralığı)
   ========================================================= */

const GREEN = "FF2F6B4F";
const LIME = "FFEFF9D0";
const SAGE = "FFECF3EE";
const MONEY = '#,##0 "₺"';
const STATUS = { scheduled: "Planlandı", in_progress: "Devam ediyor", completed: "Tamamlandı", cancelled: "İptal" } as const;

function styleSheet(ws: ExcelJS.Worksheet, moneyColumns: string[] = []) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  if (ws.rowCount > 1) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  for (const key of moneyColumns) ws.getColumn(key).numFmt = MONEY;
  // Okunabilirlik için satırlar dönüşümlü renkli
  ws.eachRow((row, n) => {
    if (n > 1 && n % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SAGE } };
  });
}

function totalRow(ws: ExcelJS.Worksheet, label: string, values: Record<string, number>) {
  const row = ws.addRow({ ...Object.fromEntries(Object.keys(values).map((k) => [k, values[k]])) });
  row.getCell(1).value = label;
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIME } };
}

export async function buildExcel(from: string, to: string): Promise<Buffer> {
  const db = await getDb();
  const today = clubNow().date;

  const [bookingRows, payments, members, coaches, courts, credits] = await Promise.all([
    db.select().from(s.bookings).where(between(s.bookings.date, from, to)).orderBy(asc(s.bookings.date), asc(s.bookings.start)),
    db.select().from(s.payments).where(between(s.payments.date, from, to)).orderBy(asc(s.payments.date), asc(s.payments.id)),
    db.select().from(s.members).orderBy(asc(s.members.name)),
    db.select().from(s.coaches).orderBy(asc(s.coaches.name)),
    db.select().from(s.courts).orderBy(asc(s.courts.sortOrder)),
    db
      .select()
      .from(s.creditTransactions)
      .where(and(gte(s.creditTransactions.createdAt, new Date(`${from}T00:00:00+03:00`)), inArray(s.creditTransactions.kind, ["makeup_granted"]))),
  ]);
  const bookings = await withDetails(bookingRows);
  const packages = (await getPackages({ activeOnly: false })).filter((p) => p.createdAt >= from && p.createdAt <= to);
  const allPackages = await getPackages({ activeOnly: false });
  const memberName = new Map(members.map((m) => [m.id, m.name]));

  const active = bookings.filter((b) => b.status !== "cancelled");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const revenue = payments.reduce((a, p) => a + p.amount, 0);
  const pending =
    bookings.filter((b) => !b.paid && b.price > 0 && b.status !== "cancelled").reduce((a, b) => a + b.price, 0) +
    allPackages.filter((p) => !p.paid).reduce((a, p) => a + p.price, 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Tennis Clinic";
  wb.created = new Date();

  /* ---------- Özet ---------- */
  const sum = wb.addWorksheet("Özet", { properties: { tabColor: { argb: GREEN } } });
  sum.columns = [{ width: 38 }, { width: 18 }, { width: 18 }];
  sum.addRow(["Tennis Clinic · Özet rapor"]).font = { bold: true, size: 16, color: { argb: GREEN } };
  sum.addRow([`Dönem: ${formatShortDate(from)} – ${formatShortDate(to)}`, `Oluşturma: ${formatShortDate(today)}`]).font = { color: { argb: "FF5E6A60" } };
  sum.addRow([]);

  const section = (title: string) => {
    const r = sum.addRow([title]);
    r.font = { bold: true, color: { argb: "FFFFFFFF" } };
    r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    sum.mergeCells(r.number, 1, r.number, 3);
  };
  const line = (label: string, value: number | string, money = false) => {
    const r = sum.addRow([label, value]);
    if (money) r.getCell(2).numFmt = MONEY;
    r.getCell(2).alignment = { horizontal: "right" };
  };

  section("Gelir");
  line("Tahsil edilen toplam", revenue, true);
  line("Bekleyen ödemeler (bugün itibarıyla)", pending, true);
  line("Satılan özel ders paketi", packages.length);
  line("Satılan paket tutarı", packages.reduce((a, p) => a + p.price, 0), true);
  sum.addRow([]);

  section("Seanslar");
  for (const k of ["private", "group", "reservation"] as const) line(KIND_LABEL[k], active.filter((b) => b.kind === k).length);
  line("Tamamlanan", bookings.filter((b) => b.status === "completed").length);
  line("İptal", cancelled.length);
  line("  · hava durumu nedeniyle", cancelled.filter((b) => b.cancelReason === "weather").length);
  line("Verilen telafi hakkı", credits.reduce((a, c) => a + c.delta, 0));
  sum.addRow([]);

  section("Üyeler");
  line("Toplam üye", members.length);
  line("Aktif üyelik (bitişi bugün ya da sonra)", members.filter((m) => m.membershipEnd && m.membershipEnd >= today).length);
  line("Dönemde yeni üye", members.filter((m) => { const d = m.createdAt.toISOString().slice(0, 10); return d >= from && d <= to; }).length);
  sum.addRow([]);

  section("Antrenör · ders sayısı");
  sum.addRow(["Antrenör", "Ders", "Tamamlanan"]).font = { bold: true };
  for (const c of coaches) {
    const mine = active.filter((b) => b.coachId === c.id);
    sum.addRow([c.name, mine.length, mine.filter((b) => b.status === "completed").length]);
  }
  sum.addRow([]);

  section("Kort · dolu saat");
  sum.addRow(["Kort", "Saat", "Seans"]).font = { bold: true };
  for (const c of courts) {
    const mine = active.filter((b) => b.courtId === c.id);
    const hours = mine.reduce((a, b) => a + toMinutes(b.end) - toMinutes(b.start), 0) / 60;
    sum.addRow([`${c.name} (${environmentLabel(c)})`, Math.round(hours * 10) / 10, mine.length]);
  }

  /* ---------- Seanslar ---------- */
  const ws = wb.addWorksheet("Seanslar");
  ws.columns = [
    { header: "Tarih", key: "date", width: 12 },
    { header: "Başlangıç", key: "start", width: 10 },
    { header: "Bitiş", key: "end", width: 10 },
    { header: "Tür", key: "kind", width: 14 },
    { header: "Kort", key: "court", width: 10 },
    { header: "Antrenör", key: "coach", width: 18 },
    { header: "Öğrenci / grup", key: "who", width: 34 },
    { header: "Seviye / biçim", key: "detail", width: 14 },
    { header: "Durum", key: "status", width: 14 },
    { header: "Ücret", key: "price", width: 12 },
    { header: "Ödendi", key: "paid", width: 9 },
    { header: "İptal nedeni", key: "reason", width: 20 },
  ];
  for (const b of bookings) {
    ws.addRow({
      date: formatShortDate(b.date),
      start: b.start,
      end: b.end,
      kind: KIND_LABEL[b.kind],
      court: b.court.name,
      coach: b.coach?.name ?? "",
      who: b.kind === "group" ? `${b.title ?? "Grup"} (${b.members.length}/${b.capacity ?? 6})` : b.members.map((m) => m.name).join(", "),
      detail: b.level ?? (b.format ? FORMAT_LABEL[b.format] : b.packageId ? "Paket" : ""),
      status: STATUS[b.status],
      price: b.price,
      paid: b.price ? (b.paid ? "Evet" : "Hayır") : "",
      reason: b.cancelReason ? (CANCEL_REASONS[b.cancelReason as CancelReason] ?? b.cancelReason) : "",
    });
  }
  styleSheet(ws, ["price"]);

  /* ---------- Ödemeler ---------- */
  const wp = wb.addWorksheet("Ödemeler");
  wp.columns = [
    { header: "Tarih", key: "date", width: 12 },
    { header: "Açıklama", key: "description", width: 40 },
    { header: "Üye", key: "member", width: 24 },
    { header: "Tutar", key: "amount", width: 14 },
  ];
  for (const p of payments) wp.addRow({ date: formatShortDate(p.date), description: p.description, member: p.memberId ? memberName.get(p.memberId) : "", amount: p.amount });
  styleSheet(wp, ["amount"]);
  totalRow(wp, "Toplam", { amount: revenue });

  /* ---------- Paketler ---------- */
  const wk = wb.addWorksheet("Paketler");
  wk.columns = [
    { header: "Satış", key: "created", width: 12 },
    { header: "Öğrenciler", key: "members", width: 34 },
    { header: "Kişi", key: "people", width: 7 },
    { header: "Seans", key: "sessions", width: 8 },
    { header: "Kalan", key: "remaining", width: 8 },
    { header: "Saat bandı", key: "band", width: 12 },
    { header: "Kort", key: "court", width: 13 },
    { header: "Sabit gün", key: "fixed", width: 16 },
    { header: "Antrenör", key: "coach", width: 18 },
    { header: "Tutar", key: "price", width: 12 },
    { header: "Ödendi", key: "paid", width: 9 },
  ];
  const DAYS = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  for (const p of allPackages) {
    wk.addRow({
      created: formatShortDate(p.createdAt),
      members: p.memberNames.join(", "),
      people: p.peopleCount,
      sessions: p.sessions,
      remaining: p.remaining,
      band: p.band === "offpeak" ? "Sakin saat" : "Yoğun saat",
      court: p.exclusive ? "Paylaşımsız" : p.peopleCount === 1 ? "Paylaşımlı" : "Tüm kort",
      fixed: p.fixed ? `${DAYS[p.fixed.weekday]} ${p.fixed.start}` : "",
      coach: p.coachName ?? "",
      price: p.price,
      paid: p.paid ? "Evet" : "Hayır",
    });
  }
  styleSheet(wk, ["price"]);

  /* ---------- Üyeler ---------- */
  const wm = wb.addWorksheet("Üyeler");
  wm.columns = [
    { header: "Ad soyad", key: "name", width: 24 },
    { header: "Telefon", key: "phone", width: 17 },
    { header: "Üyelik", key: "tier", width: 14 },
    { header: "Seviye", key: "level", width: 12 },
    { header: "Başlangıç", key: "start", width: 12 },
    { header: "Bitiş", key: "end", width: 12 },
    { header: "Durum", key: "state", width: 12 },
    { header: "Grup ders hakkı", key: "credits", width: 15 },
    { header: "Telafi hakkı", key: "makeup", width: 12 },
    { header: "Paket seansı (kalan)", key: "pkg", width: 19 },
  ];
  for (const m of members) {
    const remaining = allPackages.filter((p) => p.memberIds.includes(m.id)).reduce((a, p) => a + p.remaining, 0);
    const row = wm.addRow({
      name: m.name,
      phone: m.phone ?? "",
      tier: TIER_LABEL[m.tier],
      level: m.level ?? "",
      start: m.membershipStart ? formatShortDate(m.membershipStart) : "",
      end: m.membershipEnd ? formatShortDate(m.membershipEnd) : "",
      state: !m.membershipEnd ? "—" : m.membershipEnd < today ? "Süresi doldu" : "Aktif",
      credits: m.lessonCredits,
      makeup: m.makeupCredits,
      pkg: remaining,
    });
    if (m.membershipEnd && m.membershipEnd < today) row.getCell("state").font = { color: { argb: "FFB4432B" } };
  }
  styleSheet(wm);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
