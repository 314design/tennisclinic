import { Check, Play, Wallet, X } from "lucide-react";
import Link from "next/link";
import { Icon } from "@/components/Icon/Icon";
import { BOOKING_KIND, FORMAT_LABEL } from "@/lib/courts";
import type { AvatarTone, Session } from "@/lib/types";
import styles from "./SessionRow.module.css";

export interface SessionHandlers {
  onStart: (s: Session) => void;
  onFinish: (s: Session) => void;
  onCollect: (s: Session) => void;
  onCancel: (s: Session) => void;
}

interface SessionRowProps extends SessionHandlers {
  session: Session;
  court: { name: string; surface: string };
  /** İşlem sürerken butonlar kilitlenir */
  busy: boolean;
}

const AVATAR_CLASS: Record<AvatarTone, string> = {
  default: "avatar",
  lime: "avatar avatar--lime",
  deep: "avatar avatar--deep",
  off: "avatar avatar--off",
};

function SessionActions({ session, busy, onStart, onFinish, onCollect, onCancel }: Omit<SessionRowProps, "court">) {
  if (session.state === "in_progress") {
    return (
      <>
        <span className="chip chip--ok">
          <span className="chip__dot" />
          Devam ediyor
        </span>
        <button className="btn btn--sm btn--outline" type="button" disabled={busy} onClick={() => onFinish(session)}>
          <Check className="icon icon--sm" aria-hidden="true" />
          Bitir
        </button>
      </>
    );
  }
  return (
    <>
      {session.paid ? (
        <button className="btn btn--sm btn--outline" type="button" disabled={busy} onClick={() => onStart(session)}>
          <Play className="icon icon--sm" aria-hidden="true" />
          Başlat
        </button>
      ) : (
        <button className="chip chip--warn chip--button" type="button" disabled={busy} onClick={() => onCollect(session)} title="Ödemeyi tahsil et">
          <Wallet className="icon icon--sm" aria-hidden="true" />
          Ödenmedi
        </button>
      )}
      <button
        className="icon-btn icon-btn--sm icon-btn--danger"
        type="button"
        disabled={busy}
        aria-label={`${session.name} seansını iptal et`}
        title="İptal et"
        onClick={() => onCancel(session)}
      >
        <X className="icon" aria-hidden="true" />
      </button>
    </>
  );
}

export function SessionRow({ session, court, ...rest }: SessionRowProps) {
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
          <Link className={`${styles.nameLink} ellipsis`} href={`/seanslar/${session.id}`}>
            {session.name}
          </Link>
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
        <SessionActions session={session} {...rest} />
      </div>
    </li>
  );
}
