"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addDays, clubNow } from "@/lib/clock";
import { groupLessonPrice, MAX_PRIVATE_PEOPLE, validityFor } from "@/lib/pricing";
import { extendMembership } from "@/server/membership";
import { getPriceList } from "@/server/queries/pricing";
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
  membershipStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Üyelik başlangıç tarihini seçin"),
});

const readMember = (fd: FormData) =>
  memberSchema.safeParse({
    name: fd.get("name"),
    phone: fd.get("phone") || undefined,
    tier: fd.get("tier"),
    level: fd.get("level") || undefined,
    membershipStart: fd.get("membershipStart") || "",
  });

export type FormState = { error?: string; saved?: boolean } | undefined;

const groupSchema = memberSchema.omit({ name: true, phone: true }).extend({
  people: z
    .array(z.object({ name: memberSchema.shape.name, phone: memberSchema.shape.phone }))
    .min(2, "Grup için en az 2 kişi girin")
    .max(6, "Tek seferde en fazla 6 kişi eklenebilir"),
  then: z.enum(["save", "group", "private"]),
});

type MemberData = Omit<z.infer<typeof memberSchema>, "name" | "phone"> & { name: string; phone?: string };

/** Üyeyi ve varsa ders kotasını (hak + ödeme) kaydeder */
async function insertMember(d: MemberData, quota: number, paid: boolean, note = "üye olarak kaydedildi") {
  const db = await getDb();
  const list = await getPriceList(d.membershipStart);
  const days = validityFor(list, quota);
  const [row] = await db
    .insert(s.members)
    .values({ ...d, membershipEnd: days ? addDays(d.membershipStart, days) : null, initials: initialsOf(d.name), lessonCredits: quota })
    .returning();
  if (quota) {
    await db.insert(s.creditTransactions).values({ memberId: row.id, kind: "lesson_added", delta: quota, note: `${quota} seanslık ders kotası` });
    const amount = groupLessonPrice(list, 1) * quota;
    if (paid && amount) await db.insert(s.payments).values({ memberId: row.id, amount, date: clubNow().date, description: `${quota} seanslık ders kotası` });
  }
  await db.insert(s.activities).values({ memberId: row.id, subject: row.name, text: note });
  return row;
}

const readQuota = (fd: FormData) => ([0, 8, 16].includes(Number(fd.get("quota"))) ? Number(fd.get("quota")) : 0);

/**
 * Yeni üye. Üyelik bitişi elle girilmez: ders kotası (grup dersi hakkı) seçildiyse
 * başlangıç + kotanın geçerlilik süresi (Fiyatlar ekranı) olarak hesaplanır.
 * "Grup olarak ekle" modunda birlikte gelen kişiler ortak bilgilerle tek seferde kaydedilir.
 */
export async function createMember(_: FormState, fd: FormData): Promise<FormState> {
  if (fd.get("mode") === "group") return createMembers(fd);
  const parsed = readMember(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Form bilgilerini kontrol edin." };
  const row = await insertMember(parsed.data, readQuota(fd), fd.get("paid") === "on");
  revalidatePath("/", "layout");
  redirect(`/uyeler/${row.id}`);
}

async function createMembers(fd: FormData): Promise<FormState> {
  const phones = fd.getAll("phone");
  const people = fd
    .getAll("name")
    .map((name, i) => ({ name: String(name).trim(), phone: String(phones[i] ?? "").trim() || undefined }))
    .filter((p) => p.name);
  const parsed = groupSchema.safeParse({
    people,
    tier: fd.get("tier"),
    level: fd.get("level") || undefined,
    membershipStart: fd.get("membershipStart") || "",
    then: fd.get("then"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Form bilgilerini kontrol edin." };
  const { people: list, then, ...shared } = parsed.data;
  if (then === "private" && list.length > MAX_PRIVATE_PEOPLE) {
    return { error: `Özel ders en fazla ${MAX_PRIVATE_PEOPLE} kişilik; ${list.length} kişi için grup dersi seçin.` };
  }
  const quota = readQuota(fd);
  const paid = fd.get("paid") === "on";
  const ids: number[] = [];
  for (const p of list) {
    const others = list.filter((o) => o !== p).map((o) => o.name.split(/\s+/)[0]).join(", ");
    const row = await insertMember({ ...shared, ...p }, quota, paid, `grup olarak kaydedildi (${others} ile)`);
    ids.push(row.id);
  }
  revalidatePath("/", "layout");
  const q = ids.join(",");
  if (then === "group") redirect(`/dersler/gruba-katil?uyeler=${q}`);
  if (then === "private") redirect(`/rezervasyonlar/yeni?tur=ozel&uyeler=${q}`);
  redirect(`/uyeler?yeni=${q}`);
}

export async function updateMember(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const parsed = readMember(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Form bilgilerini kontrol edin." };
  const db = await getDb();
  const d = parsed.data;
  await db.update(s.members).set({ ...d, initials: initialsOf(d.name) }).where(eq(s.members.id, id));
  revalidatePath("/", "layout");
  return { saved: true };
}

const packageSchema = z.object({
  memberId: z.number().int(),
  lessons: z.union([z.literal(8), z.literal(16)]),
  paid: z.boolean(),
});

/**
 * Grup dersi kotası satışı: ders hakkı ekler; tutar kişi başı grup dersi ücreti × seans;
 * üyelik bitişi kotanın geçerlilik süresine göre uzar.
 */
export async function addPackage(input: z.input<typeof packageSchema>): Promise<ActionResult> {
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Kota seçin (8 ya da 16 seans)." };
  const { memberId, lessons, paid } = parsed.data;
  const db = await getDb();
  const [m] = await db.select().from(s.members).where(eq(s.members.id, memberId));
  if (!m) return { ok: false, error: "Üye bulunamadı." };
  const today = clubNow().date;
  const list = await getPriceList(today);
  const amount = groupLessonPrice(list, 1) * lessons;
  await db.update(s.members).set({ lessonCredits: sql`${s.members.lessonCredits} + ${lessons}` }).where(eq(s.members.id, memberId));
  await extendMembership(db, [memberId], today, validityFor(list, lessons));
  await db.insert(s.creditTransactions).values({ memberId, kind: "lesson_added", delta: lessons, note: `${lessons} seanslık ders kotası` });
  if (paid && amount) await db.insert(s.payments).values({ memberId, amount, date: today, description: `${lessons} seanslık ders kotası` });
  await db.insert(s.activities).values({ memberId, subject: m.name, text: `${lessons} seanslık ders kotası aldı${amount ? ` · ${formatCurrency(amount)}` : ""}` });
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
