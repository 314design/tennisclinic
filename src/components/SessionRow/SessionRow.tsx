import { Check, Wallet } from "lucide-react";
import { Icon } from "@/components/Icon/Icon";
import { BOOKING_KIND, FORMAT_LABEL } from "@/lib/courts";
import type { AvatarTone, Session } from "@/lib/types";
import styles from "./SessionRow.module.css";

interface SessionRowProps {
  session: Session;
  court: { name: string; surface: string };
  onCheckIn: (id: string) => void;
}

const AVATAR_CLASS: Record<AvatarTone, string> = {
  default: "avatar",
  lime: "avatar avatar--lime",
  deep: "avatar avatar--deep",
  off: "avatar avatar--off",
};

function SessionAction({ session, onCheckIn }: Pick<SessionRowProps, "session" | "onCheckIn">) {
  const { status } = session;
  switch (status.type) {
    case "pending":
      return (
        <button className="btn btn--sm btn--outline" type="button" onClick={() => onCheckIn(session.id)}>
          <Check className="icon icon--sm" aria-hidden="true" />
          Giriş yap
        </button>
      );
    case "arrived":
      return (
        <span className="chip chip--ok">
          <Check className="icon icon--sm" aria-hidden="true" />
          Geldi
        </span>
      );
    case "partial":
      return <span className="chip chip--neutral">{status.arrived}/{status.total} geldi</span>;
    case "unpaid":
      return (
        <span className="chip chip--warn">
          <Wallet className="icon icon--sm" aria-hidden="true" />
          Ödenmedi
        </span>
      );
  }
}

export function SessionRow({ session, court, onCheckIn }: SessionRowProps) {
  const kind = BOOKING_KIND[session.kind];
  const detail = session.coach ? `Ant. ${session.coach}` : FORMAT_LABEL[session.format ?? "singles"];
  const meta = [court.name, kind.label, session.coach].filter(Boolean).join(" · ");

  return (
    <li className={styles.session}>
      <div className={styles.time}>
        <strong>{session.start}</strong>
        <span>{session.end}</span>
      </div>
      <div className={styles.who}>
        {session.kind === "group" ? (
          <span className="avatar avatar--group" aria-hidden="true">
            <Icon name="users-round" />
          </span>
        ) : (
          <span className={AVATAR_CLASS[session.avatarTone ?? "default"]} aria-hidden="true">
            {session.initials}
          </span>
        )}
        <div className={styles.name}>
          <strong className="ellipsis">{session.name}</strong>
          <span className={styles.member}>{session.memberLine}</span>
          <span className={styles.meta}>{meta}</span>
        </div>
      </div>
      <div className={`${styles.stack} ${styles.court}`}>
        <strong>{court.name}</strong>
        <span>{court.surface}</span>
      </div>
      <div className={`${styles.stack} ${styles.type}`}>
        <strong>
          <Icon name={kind.icon} />
          {kind.label}
        </strong>
        <span className={session.coach ? "ellipsis" : undefined}>{detail}</span>
      </div>
      <div className={styles.action}>
        <SessionAction session={session} onCheckIn={onCheckIn} />
      </div>
    </li>
  );
}
