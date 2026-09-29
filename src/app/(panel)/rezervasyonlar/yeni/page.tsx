import { and, asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BookingWizard, type WizardKind } from "@/components/BookingWizard/BookingWizard";
import { clubNow } from "@/lib/clock";
import { environmentLabel } from "@/lib/courts";
import { usesHalfCourt } from "@/lib/pricing";
import { getDb } from "@/server/db/client";
import * as s from "@/server/db/schema";
import { bookingsOn, getSettings, LEVELS, withDetails } from "@/server/queries/common";
import { blockEvents, toGridEvents } from "@/server/queries/grid";
import { getCoachOptions, getMemberOptions, getPackages } from "@/server/queries/planning";
import { getPriceList } from "@/server/queries/pricing";

export const metadata = { title: "Yeni Rezervasyon · Tennis Clinic" };

const KIND_PARAM: Record<string, WizardKind> = { grup: "group", ozel: "private", kiralama: "reservation" };
const DEFAULT_DURATION: Record<WizardKind, number> = { group: 90, private: 60, reservation: 60 };

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; tarih?: string; kort?: string; saat?: string; hoca?: string; sure?: string; uyeler?: string }>;
}) {
  const sp = await searchParams;
  const now = clubNow();
  const kind = KIND_PARAM[sp.tur ?? ""] ?? "private";
  const date = sp.tarih && /^\d{4}-\d{2}-\d{2}$/.test(sp.tarih) && sp.tarih >= now.date ? sp.tarih : now.date;
  const duration = [60, 90, 120].includes(Number(sp.sure)) ? Number(sp.sure) : DEFAULT_DURATION[kind];
  const db = await getDb();
  const settings = await getSettings();
  const [courts, rows, blocks, coaches, members, packages, priceList] = await Promise.all([
    db.select().from(s.courts).where(eq(s.courts.active, true)).orderBy(asc(s.courts.sortOrder)),
    bookingsOn(date),
    db.select().from(s.courtBlocks).where(and(eq(s.courtBlocks.date, date))),
    getCoachOptions(),
    getMemberOptions(),
    getPackages(),
    getPriceList(date),
  ]);
  const bookings = await withDetails(rows);
  const wanted = (sp.uyeler ?? "").split(",").map(Number);
  const initialMembers = members.filter((m) => wanted.includes(m.id)).map((m) => m.id);
  const coachId = coaches.some((c) => String(c.id) === sp.hoca) ? Number(sp.hoca) : null;

  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" href="/rezervasyonlar">
            <ChevronLeft className="icon" aria-hidden="true" /> Rezervasyonlar
          </Link>
          <h1 className="page-header__title">Yeni Rezervasyon</h1>
          <p className="page-header__lede">Türü seçin, takvimde boş bir saate tıklayın; ücret türüne ve saatine göre otomatik hesaplanır.</p>
        </div>
      </header>
      <BookingWizard
        key={`${kind}-${date}-${coachId}-${duration}`}
        kind={kind}
        date={date}
        today={now.date}
        nowTime={now.time}
        duration={duration}
        coachId={coachId}
        initial={{ courtId: Number(sp.kort) || undefined, start: sp.saat && /^\d{2}:\d{2}$/.test(sp.saat) ? sp.saat : undefined }}
        open={settings.hours.open}
        close={settings.hours.close}
        courts={courts.map((c) => ({ id: c.id, name: c.name, label: environmentLabel(c) }))}
        bookings={bookings.map((b) => ({
          id: b.id, courtId: b.courtId, coachId: b.coachId, start: b.start, end: b.end, kind: b.kind,
          half: usesHalfCourt({ kind: b.kind, exclusive: b.exclusive, memberCount: b.members.length }),
        }))}
        blocks={blocks.map((k) => ({ courtId: k.courtId, start: k.start, end: k.end }))}
        events={[...toGridEvents(bookings, (b) => String(b.courtId)), ...blockEvents(blocks, (id) => String(id))]}
        coaches={coaches}
        members={members}
        packages={packages}
        priceList={priceList}
        levels={LEVELS}
        initialMembers={initialMembers}
      />
    </>
  );
}
