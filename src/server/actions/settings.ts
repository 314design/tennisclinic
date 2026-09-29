"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import type { FormState } from "./members";

const time = z.string().regex(/^\d{2}:\d{2}$/);
const schema = z.object({
  club: z.object({ name: z.string().trim().min(1).max(60), subtitle: z.string().trim().max(60), branch: z.string().trim().min(1).max(60) }),
  user: z.object({ firstName: z.string().trim().min(1).max(40), fullName: z.string().trim().min(1).max(80), role: z.string().trim().max(60) }),
  weather: z.object({ name: z.string().trim().min(1).max(60), latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) }),
  hours: z.object({ open: time, close: time }),
});

export async function updateSettings(_: FormState, fd: FormData): Promise<FormState> {
  const g = (k: string) => String(fd.get(k) ?? "");
  const parsed = schema.safeParse({
    club: { name: g("club.name"), subtitle: g("club.subtitle"), branch: g("club.branch") },
    user: { firstName: g("user.firstName"), fullName: g("user.fullName"), role: g("user.role") },
    weather: { name: g("weather.name"), latitude: g("weather.latitude"), longitude: g("weather.longitude") },
    hours: { open: g("hours.open"), close: g("hours.close") },
  });
  if (!parsed.success) return { error: "Alanları kontrol edin (koordinatlar sayı, saatler SS:DD olmalı)." };
  if (parsed.data.hours.close <= parsed.data.hours.open) return { error: "Kapanış saati açılıştan sonra olmalı." };
  const d = parsed.data;
  const initials = d.user.fullName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toLocaleUpperCase("tr-TR");
  const db = await getDb();
  const entries = { club: d.club, user: { ...d.user, initials }, weather: d.weather, hours: d.hours };
  for (const [key, value] of Object.entries(entries)) {
    await db.insert(s.settings).values({ key, value }).onConflictDoUpdate({ target: s.settings.key, set: { value } });
  }
  revalidatePath("/", "layout");
  return { saved: true };
}
