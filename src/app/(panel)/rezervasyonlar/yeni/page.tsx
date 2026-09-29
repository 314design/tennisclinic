import { asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ReservationForm } from "@/components/ReservationForm/ReservationForm";
import { clubNow, fromMinutes } from "@/lib/clock";
import { environmentLabel } from "@/lib/courts";
import { toMinutes } from "@/lib/format";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { getSettings } from "@/server/queries/common";
import { getMemberOptions } from "@/server/queries/planning";

export const metadata = { title: "Yeni Rezervasyon · Tennis Clinic" };

export default async function NewReservationPage({ searchParams }: { searchParams: Promise<{ kort?: string; tarih?: string; saat?: string }> }) {
  const sp = await searchParams;
  const now = clubNow();
  const db = await getDb();
  const settings = await getSettings();
  const [courts, members] = await Promise.all([
    db.select().from(s.courts).where(eq(s.courts.active, true)).orderBy(asc(s.courts.sortOrder)),
    getMemberOptions(),
  ]);
  const nextHalf = fromMinutes(Math.min(Math.ceil(toMinutes(now.time) / 30) * 30, toMinutes(settings.hours.close) - 60));
  const date = sp.tarih && /^\d{4}-\d{2}-\d{2}$/.test(sp.tarih) ? sp.tarih : now.date;
  const start = sp.saat && /^\d{2}:\d{2}$/.test(sp.saat) ? sp.saat : date === now.date && nextHalf > settings.hours.open ? nextHalf : settings.hours.open;

  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" href="/rezervasyonlar">
            <ChevronLeft className="icon" aria-hidden="true" /> Rezervasyonlar
          </Link>
          <h1 className="page-header__title">Yeni Rezervasyon</h1>
          <p className="page-header__lede">Kort kiralama. Ders için <Link href="/dersler/yeni">Ders Planla</Link> ekranını kullanın.</p>
        </div>
      </header>
      <ReservationForm
        courts={courts.map((c) => ({ id: c.id, name: c.name, label: environmentLabel(c) }))}
        members={members}
        defaults={{ courtId: Number(sp.kort) || undefined, date, start }}
        open={settings.hours.open}
        close={settings.hours.close}
        hourlyPrice={900}
      />
    </>
  );
}
