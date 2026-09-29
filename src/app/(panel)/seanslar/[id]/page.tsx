import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RemoveMemberButton, SessionActions } from "@/components/SessionDetail/SessionActions";
import { CANCEL_REASONS } from "@/lib/booking";
import { clubNow } from "@/lib/clock";
import { environmentLabel, FORMAT_LABEL } from "@/lib/courts";
import { formatCurrency, formatDayLabel, formatShortDate } from "@/lib/format";
import { KIND_LABEL, TIER_LABEL } from "@/server/queries/common";
import { getBookingDetail, getCoachOptions, getMemberOptions, getPackages } from "@/server/queries/planning";
import { TransferButton } from "@/components/TransferDialog/TransferDialog";

const STATUS = {
  scheduled: { label: "Planlandı", chip: "chip--outline" },
  in_progress: { label: "Devam ediyor", chip: "chip--ok" },
  completed: { label: "Tamamlandı", chip: "chip--neutral" },
  cancelled: { label: "İptal edildi", chip: "chip--warn" },
} as const;

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getBookingDetail(Number(id));
  if (!b) notFound();
  const [members, coaches] = await Promise.all([getMemberOptions(), getCoachOptions()]);
  const pkg = b.packageId ? (await getPackages({ activeOnly: false })).find((p) => p.id === b.packageId) : undefined;
  const now = clubNow();
  const title = b.kind === "group" ? (b.title ?? "Grup dersi") : b.members.map((m) => m.name).join(", ") || KIND_LABEL[b.kind];
  const capacity = b.kind === "group" ? (b.capacity ?? 6) : b.kind === "private" ? 1 : 4;
  const status = STATUS[b.status];

  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" href={`/takvim?tarih=${b.date}`}>
            <ChevronLeft className="icon" aria-hidden="true" />
            Takvim
          </Link>
          <p className="page-header__eyebrow" style={{ marginTop: 8 }}>{KIND_LABEL[b.kind]}{b.level ? ` · ${b.level}` : ""}</p>
          <h1 className="page-header__title">{title}</h1>
          <p className="page-header__lede">
            {formatDayLabel(b.date, now.date)} {formatShortDate(b.date)} · {b.start}–{b.end} · {b.court.name} ({environmentLabel(b.court)})
            {b.coach ? ` · Ant. ${b.coach.name}` : ""}
          </p>
        </div>
        <div className="page-header__actions">
        {b.kind !== "reservation" && b.status === "scheduled" && b.coach && (
          <TransferButton
            label="Hocayı değiştir"
            today={now.date}
            coaches={coaches}
            target={{ id: b.id, label: `${title} · ${b.start}–${b.end}`, date: b.date, start: b.start, end: b.end, coachId: b.coach.id, coachName: b.coach.name }}
          />
        )}
        <SessionActions
          id={b.id}
          kind={b.kind}
          status={b.status}
          paid={b.paid}
          label={`${title} · ${b.court.name} · ${b.start}–${b.end}`}
          memberIds={b.members.map((m) => m.id)}
          memberName={b.kind === "group" ? undefined : b.members[0]?.name}
          capacity={capacity}
          members={members}
        />
        </div>
      </header>

      <div className="two-col">
        <section className="card" aria-labelledby="members-title">
          <header className="card__head">
            <div>
              <h2 className="card__title" id="members-title">{b.kind === "reservation" ? "Oyuncular" : "Öğrenciler"}</h2>
              <p className="card__meta">{b.members.length}/{capacity} kişi</p>
            </div>
          </header>
          {b.members.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Üye</th>
                    <th>Hak</th>
                    <th className="num">Ders / Telafi</th>
                    <th aria-label="İşlem" />
                  </tr>
                </thead>
                <tbody>
                  {b.members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link className="row-link" href={`/uyeler/${m.id}`}>{m.name}</Link>
                        <div className="muted">{TIER_LABEL[m.tier]}</div>
                      </td>
                      <td className="muted">{b.kind === "reservation" ? "—" : m.usedMakeup ? "Telafi" : "Paket"}</td>
                      <td className="num">{m.lessonCredits} / {m.makeupCredits}</td>
                      <td className="num">
                        {(b.status === "scheduled" || b.status === "in_progress") && (
                          <RemoveMemberButton bookingId={b.id} memberId={m.id} name={m.name} refundable={b.kind !== "reservation"} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">Henüz üye yok.</p>
          )}
        </section>

        <section className="card" aria-labelledby="info-title">
          <h2 className="card__title" id="info-title">Bilgiler</h2>
          <dl className="details">
            <dt>Durum</dt>
            <dd><span className={`chip chip--sm ${status.chip}`}>{status.label}</span></dd>
            {b.format && (<><dt>Biçim</dt><dd>{FORMAT_LABEL[b.format]}</dd></>)}
            {b.kind === "private" && (
              <>
                <dt>Kort</dt>
                <dd>{b.exclusive ? "Paylaşımsız" : b.members.length === 1 ? "Paylaşımlı (en fazla 2 ders)" : "Tüm kort"}</dd>
              </>
            )}
            {pkg && (
              <>
                <dt>Paket</dt>
                <dd>
                  {pkg.sessions} seans · {pkg.remaining} kaldı · {formatCurrency(pkg.price)} {pkg.paid ? "· ödendi" : "· ödenmedi"}
                </dd>
              </>
            )}
            {b.seriesId && (
              <>
                <dt>Seri</dt>
                <dd>Haftalık sabit ders</dd>
              </>
            )}
            <dt>Ücret</dt>
            <dd>{b.price ? formatCurrency(b.price) : pkg ? "Paketten" : "—"} {b.price > 0 && (b.paid ? "· ödendi" : "· ödenmedi")}</dd>
            {b.status === "cancelled" && (
              <>
                <dt>İptal nedeni</dt>
                <dd>{b.cancelReason ? CANCEL_REASONS[b.cancelReason as keyof typeof CANCEL_REASONS] : "—"}{b.cancelNote ? ` · ${b.cancelNote}` : ""}</dd>
              </>
            )}
          </dl>
        </section>
      </div>
    </>
  );
}
