/**
 * Veritabanı şeması (PostgreSQL). Tarih "YYYY-MM-DD", saat "HH:MM" metni olarak tutulur;
 * kulübün yerel saatiyle (Europe/Istanbul) çalışır, saat dilimi dönüşümü gerekmez.
 */
import { boolean, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const courts = pgTable("courts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** "outdoor" açık · "indoor" kapalı */
  environment: text("environment").notNull().$type<"outdoor" | "indoor">(),
  /** Açık kort kışın balonla kapatıldıysa true ("Balon Kort") */
  balloon: boolean("balloon").notNull().default(false),
  surface: text("surface").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const courtBlocks = pgTable("court_blocks", {
  id: serial("id").primaryKey(),
  courtId: integer("court_id").notNull().references(() => courts.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  reason: text("reason").notNull(),
});

export const coaches = pgTable("coaches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: text("role"),
  avatarTone: text("avatar_tone").notNull().default("default").$type<"default" | "lime" | "deep" | "off">(),
  onLeave: boolean("on_leave").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

/** Antrenörün haftalık çalışma saatleri (1 = Pazartesi … 7 = Pazar) */
export const coachHours = pgTable("coach_hours", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  phone: text("phone"),
  tier: text("tier").notNull().default("standard").$type<"premium" | "standard">(),
  level: text("level"),
  /** Üyelik başlangıcı; bitiş tarihi ders kotasının geçerlilik süresine göre hesaplanır */
  membershipStart: text("membership_start"),
  membershipEnd: text("membership_end"),
  /** Paketten kalan ders hakkı */
  lessonCredits: integer("lesson_credits").notNull().default(0),
  /** İptallerden doğan telafi ders hakkı */
  makeupCredits: integer("makeup_credits").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Sürümlü fiyat listesi; geçerli olan, başlangıç tarihi bugüne en yakın geçmiş kayıttır */
export const priceLists = pgTable("price_lists", {
  id: serial("id").primaryKey(),
  effectiveFrom: text("effective_from").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PriceBand = "offpeak" | "peak";

/** Özel ders paketi (1–5 kişi, 8/16 seans). Paketin seansları bu pakete bağlı derslerle kullanılır. */
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  coachId: integer("coach_id").references(() => coaches.id),
  peopleCount: integer("people_count").notNull(),
  sessions: integer("sessions").notNull(),
  /** Planlanmış ya da yanmış seans sayısı (telafili iptalde geri iade edilir) */
  usedSessions: integer("used_sessions").notNull().default(0),
  /** Telafi olarak iade edilen seans sayısı (bilgi amaçlı) */
  makeupSessions: integer("makeup_sessions").notNull().default(0),
  band: text("band").notNull().$type<PriceBand>(),
  /** Paylaşımsız kort: kort yalnızca bu ders için ayrılır */
  exclusive: boolean("exclusive").notNull().default(false),
  price: integer("price").notNull(),
  paid: boolean("paid").notNull().default(false),
  /** Sabitlenen haftalık gün/saat (1 = Pazartesi) */
  fixedWeekday: integer("fixed_weekday"),
  fixedStart: text("fixed_start"),
  status: text("status").notNull().default("active").$type<"active" | "completed" | "cancelled">(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const packageMembers = pgTable(
  "package_members",
  {
    packageId: integer("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
    memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.packageId, t.memberId] })],
);

export type BookingKind = "private" | "group" | "reservation";
export type BookingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull().$type<BookingKind>(),
    courtId: integer("court_id").notNull().references(() => courts.id),
    coachId: integer("coach_id").references(() => coaches.id),
    date: text("date").notNull(),
    start: text("start").notNull(),
    end: text("end").notNull(),
    status: text("status").notNull().default("scheduled").$type<BookingStatus>(),
    /** Grup dersi adı (ör. "Junior grubu") */
    title: text("title"),
    level: text("level"),
    capacity: integer("capacity"),
    format: text("format").$type<"singles" | "doubles">(),
    /** Özel ders paketi (varsa); seans ücreti pakette tutulur */
    packageId: integer("package_id").references(() => packages.id, { onDelete: "set null" }),
    /** Paylaşımsız kort (özel ders) */
    exclusive: boolean("exclusive").notNull().default(false),
    /** Haftalık sabit seri kimliği (aynı seriden oluşturulan dersler) */
    seriesId: text("series_id"),
    price: integer("price").notNull().default(0),
    paid: boolean("paid").notNull().default(true),
    startedAt: timestamp("started_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    cancelNote: text("cancel_note"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookings_date_idx").on(t.date)],
);

export const bookingMembers = pgTable(
  "booking_members",
  {
    bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    arrived: boolean("arrived").notNull().default(false),
    /** Ders hakkı telafi hakkından düşüldüyse true */
    usedMakeup: boolean("used_makeup").notNull().default(false),
    /** Ders hakkı olmadığı için seans ücreti ayrıca alınır (grup dersi) */
    charged: boolean("charged").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.memberId] })],
);

export type CreditKind = "lesson_added" | "lesson_used" | "makeup_granted" | "makeup_used" | "adjustment";

export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().$type<CreditKind>(),
  delta: integer("delta").notNull(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
    bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    description: text("description").notNull(),
    date: text("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_date_idx").on(t.date)],
);

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
  /** Üye adı cümlenin başında kalın yazılır */
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  tone: text("tone").notNull().default("default").$type<"default" | "danger">(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
