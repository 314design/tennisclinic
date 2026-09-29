"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clubNow } from "@/lib/clock";
import { formatCurrency } from "@/lib/format";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import type { ActionResult } from "./bookings";

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr-TR");

const memberSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı").max(80),
  phone: z.string().trim().max(30).optional(),
  tier: z.enum(["premium", "standard"]),
  level: z.string().trim().max(40).optional(),
  membershipEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

const readMember = (fd: FormData) =>
  memberSchema.safeParse({
    name: fd.get("name"),
    phone: fd.get("phone") || undefined,
    tier: fd.get("tier"),
    level: fd.get("level") || undefined,
    membershipEnd: fd.get("membershipEnd") || "",
  });

export type FormState = { error?: string; saved?: boolean } | undefined;

export async function createMember(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = readMember(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Form bilgilerini kontrol edin." };
  const credits = Math.max(0, Number(fd.get("lessonCredits") ?? 0) || 0);
  const db = await getDb();
  const d = parsed.data;
  const [row] = await db
    .insert(s.members)
    .values({ ...d, membershipEnd: d.membershipEnd || null, initials: initialsOf(d.name), lessonCredits: credits })
    .returning();
  if (credits) await db.insert(s.creditTransactions).values({ memberId: row.id, kind: "lesson_added", delta: credits, note: "Kayıtta tanımlanan paket" });
  await db.insert(s.activities).values({ memberId: row.id, subject: row.name, text: "üye olarak kaydedildi" });
  revalidatePath("/", "layout");
  redirect(`/uyeler/${row.id}`);
}

export async function updateMember(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const parsed = readMember(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Form bilgilerini kontrol edin." };
  const db = await getDb();
  const d = parsed.data;
  await db.update(s.members).set({ ...d, membershipEnd: d.membershipEnd || null, initials: initialsOf(d.name) }).where(eq(s.members.id, id));
  revalidatePath("/", "layout");
  return { saved: true };
}

const packageSchema = z.object({
  memberId: z.number().int(),
  lessons: z.number().int().min(1).max(100),
  amount: z.number().int().min(0),
  extendDays: z.number().int().min(0).max(730),
});

/** Ders paketi satışı: ders hakkı ekler, ödeme kaydı oluşturur, isteğe bağlı üyelik süresini uzatır */
export async function addPackage(input: z.input<typeof packageSchema>): Promise<ActionResult> {
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ders sayısı ve tutarı kontrol edin." };
  const { memberId, lessons, amount, extendDays } = parsed.data;
  const db = await getDb();
  const [m] = await db.select().from(s.members).where(eq(s.members.id, memberId));
  if (!m) return { ok: false, error: "Üye bulunamadı." };
  const today = clubNow().date;
  let membershipEnd = m.membershipEnd;
  if (extendDays) {
    const base = m.membershipEnd && m.membershipEnd > today ? m.membershipEnd : today;
    const d = new Date(`${base}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + extendDays);
    membershipEnd = d.toISOString().slice(0, 10);
  }
  await db.update(s.members).set({ lessonCredits: sql`${s.members.lessonCredits} + ${lessons}`, membershipEnd }).where(eq(s.members.id, memberId));
  await db.insert(s.creditTransactions).values({ memberId, kind: "lesson_added", delta: lessons, note: `${lessons} derslik paket` });
  if (amount) await db.insert(s.payments).values({ memberId, amount, date: today, description: `${lessons} derslik paket` });
  await db.insert(s.activities).values({ memberId, subject: m.name, text: `${lessons} derslik paket aldı${amount ? ` · ${formatCurrency(amount)}` : ""}` });
  revalidatePath("/", "layout");
  return { ok: true };
}

const adjustSchema = z.object({
  memberId: z.number().int(),
  kind: z.enum(["lesson", "makeup"]),
  delta: z.number().int().min(-50).max(50).refine((v) => v !== 0),
  note: z.string().trim().max(200).optional(),
});

/** Elle ders/telafi hakkı düzeltmesi (ör. hava durumu dışı telafi, hatalı kayıt) */
export async function adjustCredits(input: z.input<typeof adjustSchema>): Promise<ActionResult> {
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçerli bir sayı girin." };
  const { memberId, kind, delta, note } = parsed.data;
  const db = await getDb();
  const column = kind === "lesson" ? s.members.lessonCredits : s.members.makeupCredits;
  await db.update(s.members).set({ [kind === "lesson" ? "lessonCredits" : "makeupCredits"]: sql`greatest(${column} + ${delta}, 0)` }).where(eq(s.members.id, memberId));
  await db.insert(s.creditTransactions).values({
    memberId,
    kind: kind === "makeup" ? (delta > 0 ? "makeup_granted" : "makeup_used") : "adjustment",
    delta,
    note: note || "Elle düzeltme",
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
