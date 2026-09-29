"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { CancelDialog, type CancelTarget } from "@/components/CancelDialog/CancelDialog";
import { SessionRow } from "@/components/SessionRow/SessionRow";
import { BOOKING_KIND } from "@/lib/courts";
import type { Session } from "@/lib/types";
import { finishBooking, markPaid, startBooking, type ActionResult } from "@/server/actions/bookings";
import styles from "./UpcomingSessions.module.css";

interface UpcomingSessionsProps {
  sessions: Session[];
  courts: Record<number, { name: string; surface: string }>;
  remaining: { reservations: number; lessons: number };
}

export function UpcomingSessions({ sessions, courts, remaining }: UpcomingSessionsProps) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);

  const run = (s: Session, action: (id: number) => Promise<ActionResult>) => {
    setBusyId(s.id);
    setError(null);
    startTransition(async () => {
      const res = await action(s.id);
      if (!res.ok) setError(res.error);
      setBusyId(null);
    });
  };

  const inProgress = sessions.filter((s) => s.state === "in_progress").length;

  return (
    <section className={`card ${styles.sessions}`} aria-labelledby="sessions-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="sessions-title">Sıradaki seanslar</h2>
          <p className="card__meta">
            {inProgress ? `${inProgress} devam ediyor · ` : ""}
            {sessions.length - inProgress} seans bugün başlayacak
          </p>
        </div>
        <Link className="link" href="/rezervasyonlar">
          Tümü
          <ChevronRight className="icon" aria-hidden="true" />
        </Link>
      </header>

      {error && <p className="notice notice--error" role="alert" style={{ marginTop: 12 }}>{error}</p>}

      {sessions.length ? (
        <ol className={styles.list}>
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              court={courts[s.courtId]}
              busy={pending && busyId === s.id}
              onStart={(x) => run(x, startBooking)}
              onFinish={(x) => run(x, finishBooking)}
              onCollect={(x) => run(x, markPaid)}
              onCancel={(x) =>
                setCancelTarget({
                  id: x.id,
                  kind: x.kind,
                  label: `${x.name} · ${BOOKING_KIND[x.kind].label} · ${courts[x.courtId]?.name} · ${x.start}–${x.end}`,
                  memberCount: x.memberCount,
                  memberName: x.kind === "group" ? undefined : x.name,
                })
              }
            />
          ))}
        </ol>
      ) : (
        <p className="empty">
          <strong>Bugün için başka seans yok</strong>
          Yeni bir ders ya da rezervasyon ekleyebilirsiniz.
        </p>
      )}

      <footer className={styles.foot}>
        <span>
          Bugün <strong>{remaining.reservations} rezervasyon</strong> ve <strong>{remaining.lessons} ders</strong> daha başlayacak
        </span>
        <Link className="link" href="/takvim">
          Takvimde gör
          <ArrowRight className="icon" aria-hidden="true" />
        </Link>
      </footer>

      <CancelDialog target={cancelTarget} onClose={() => setCancelTarget(null)} />
    </section>
  );
}
