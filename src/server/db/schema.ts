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
  membershipEnd: text("membership_end"),
  /** Paketten kalan ders hakkı */
  lessonCredits: integer("lesson_credits").notNull().default(0),
  /** İptallerden doğan telafi ders hakkı */
  makeupCredits: integer("makeup_credits").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
