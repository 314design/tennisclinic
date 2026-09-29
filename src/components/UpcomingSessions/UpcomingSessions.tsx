"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { useState } from "react";
import { SessionRow } from "@/components/SessionRow/SessionRow";
import type { Session, SessionsSummary } from "@/lib/types";
import styles from "./UpcomingSessions.module.css";

interface UpcomingSessionsProps {
  sessions: Session[];
  courts: Record<string, { name: string; surface: string }>;
  summary: SessionsSummary;
}

export function UpcomingSessions({ sessions, courts, summary }: UpcomingSessionsProps) {
  // "Giriş yap" → "Geldi": şimdilik yerel durum, ileride API çağrısı
  const [checkedIn, setCheckedIn] = useState<Set<string>>(() => new Set());
  const checkIn = (id: string) => setCheckedIn((prev) => new Set(prev).add(id));

  return (
    <section className={`card ${styles.sessions}`} aria-labelledby="sessions-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="sessions-title">Sıradaki seanslar</h2>
          <p className="card__meta">
            {summary.windowLabel} · {sessions.length} seans
          </p>
        </div>
        <a className="link" href="#">
          Tümü
          <ChevronRight className="icon" aria-hidden="true" />
        </a>
      </header>
      <ol className={styles.list}>
        {sessions.map((s) => (
          <SessionRow
            key={s.id}
            session={checkedIn.has(s.id) ? { ...s, status: { type: "arrived" } } : s}
            court={courts[s.courtId]}
            onCheckIn={checkIn}
          />
        ))}
      </ol>
      <footer className={styles.foot}>
        <span>
          Bugün <strong>{summary.remainingReservations} rezervasyon</strong> ve{" "}
          <strong>{summary.remainingLessons} ders</strong> daha başlayacak
        </span>
        <a className="link" href="#">
          Takvimde gör
          <ArrowRight className="icon" aria-hidden="true" />
        </a>
      </footer>
    </section>
  );
}
