import { ChevronRight } from "lucide-react";
import { CoachRow } from "@/components/CoachRow/CoachRow";
import type { Coach, CoachState } from "@/lib/types";
import styles from "./CoachesCard.module.css";

interface CoachesCardProps {
  lessonsToday: number;
  coaches: { coach: Coach; state: CoachState }[];
}

export function CoachesCard({ lessonsToday, coaches }: CoachesCardProps) {
  const onDuty = coaches.filter((c) => c.state.type !== "off").length;
  return (
    <section className={`card ${styles.coaches}`} aria-labelledby="coaches-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="coaches-title">Antrenörler</h2>
          <p className="card__meta">
            Bugün {lessonsToday} ders · {onDuty} antrenör sahada
          </p>
        </div>
        <a className="link" href="#">
          Tümü
          <ChevronRight className="icon" aria-hidden="true" />
        </a>
      </header>
      <ul className={styles.list}>
        {coaches.map(({ coach, state }) => (
          <CoachRow key={coach.id} coach={coach} state={state} />
        ))}
      </ul>
    </section>
  );
}
