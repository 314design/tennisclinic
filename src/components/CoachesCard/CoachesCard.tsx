import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { CoachRow } from "@/components/CoachRow/CoachRow";
import type { Coach, CoachState } from "@/lib/types";
import styles from "./CoachesCard.module.css";

interface CoachesCardProps {
  lessonsToday: number;
  coaches: { coach: Coach; state: CoachState }[];
}

export function CoachesCard({ lessonsToday, coaches }: CoachesCardProps) {
  const onDuty = coaches.filter((c) => c.state.type !== "off" && c.coach.lessonsTotal > 0).length;
  return (
    <section className={`card ${styles.coaches}`} aria-labelledby="coaches-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="coaches-title">Antrenörler</h2>
          <p className="card__meta">
            Bugün {lessonsToday} ders · {onDuty} antrenör sahada
          </p>
        </div>
        <Link className="link" href="/antrenorler">
          Tümü
          <ChevronRight className="icon" aria-hidden="true" />
        </Link>
      </header>
      <ul className={styles.list}>
        {coaches.map(({ coach, state }) => (
          <CoachRow key={coach.id} coach={coach} state={state} />
        ))}
      </ul>
    </section>
  );
}
