import Link from "next/link";
import { toTime } from "@/lib/format";
import type { AvatarTone, Coach, CoachState } from "@/lib/types";
import styles from "./CoachRow.module.css";

interface CoachRowProps {
  coach: Coach;
  state: CoachState;
}

const AVATAR_CLASS: Record<AvatarTone, string> = {
  default: "avatar avatar--lg",
  lime: "avatar avatar--lg avatar--lime",
  deep: "avatar avatar--lg avatar--deep",
  off: "avatar avatar--lg avatar--off",
};

function whereText(state: CoachState): string {
  switch (state.type) {
    case "teaching":
      return `${state.courtName} · ${toTime(state.until)} kadar`;
    case "available":
      return state.next ? `Sıradaki ${state.next.start} · ${state.next.courtName}` : "Bugün başka ders yok";
    case "off":
      return "Bugün ders yok";
  }
}

function StatusChip({ state }: { state: CoachState }) {
  switch (state.type) {
    case "teaching":
      return (
        <span className="chip chip--ok">
          <span className="chip__dot" />
          Derste
        </span>
      );
    case "available":
      return <span className="chip chip--outline">Müsait</span>;
    case "off":
      return <span className="chip chip--neutral">İzinli</span>;
  }
}

export function CoachRow({ coach, state }: CoachRowProps) {
  const off = state.type === "off";
  return (
    <li className={`${styles.coach} ${off ? styles.off : ""}`}>
      <span className={`${AVATAR_CLASS[coach.avatarTone]} ${styles.avatar}`} aria-hidden="true">
        {coach.initials}
      </span>
      <div className={styles.info}>
        <span className={`${styles.name} ellipsis`}>
          <Link className={styles.nameLink} href={`/antrenorler/${coach.id}`}>{coach.name}</Link>
          {coach.role && <span className={styles.role}> · {coach.role}</span>}
        </span>
        <span className={styles.where}>{whereText(state)}</span>
      </div>
      <div className={styles.load}>
        {off || coach.lessonsTotal === 0 ? (
          <span>—</span>
        ) : (
          <>
            <span>{coach.lessonsDone}/{coach.lessonsTotal} ders</span>
            <span className={styles.segments} aria-hidden="true">
              {Array.from({ length: coach.lessonsTotal }, (_, i) => (
                <i key={i} className={i < coach.lessonsDone ? styles.on : undefined} />
              ))}
            </span>
          </>
        )}
      </div>
      <span className={styles.status}>
        <StatusChip state={state} />
      </span>
    </li>
  );
}
