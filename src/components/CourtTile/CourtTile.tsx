import { Check, Plus, Timer, Wrench } from "lucide-react";
import Link from "next/link";
import { Icon } from "@/components/Icon/Icon";
import { BOOKING_KIND, type CourtView } from "@/lib/courts";
import styles from "./CourtTile.module.css";

interface CourtTileProps {
  name: string;
  surface: string;
  view: CourtView;
  reserveHref: string;
}

const STATUS_CLASS = {
  busy: "",
  free: styles.free,
  maint: styles.maint,
  overtime: styles.overtime,
} as const;

const PROGRESS_CLASS = {
  busy: "",
  free: "",
  maint: styles.progressMuted,
  overtime: styles.progressWarn,
} as const;

function CourtVisual({ view }: { view: CourtView }) {
  return (
    <div className={styles.visual}>
      <svg className={styles.svg} viewBox="0 0 44 92" aria-hidden="true">
        <g className={styles.lines}>
          <rect x="1" y="1" width="42" height="90" rx="1" />
          <path d="M6.25 1V91M37.75 1V91M6.25 21.8H37.75M6.25 70.2H37.75M22 21.8V70.2" />
        </g>
        <path className={styles.net} d="M-2 46H46" />
        {view.figures.map((f, i) => (
          <circle key={i} className={f.role === "coach" ? styles.coach : styles.player} cx={f.x} cy={f.y} r="4.2" />
        ))}
      </svg>
      {view.status === "maint" && (
        <span className={styles.badge}>
          <Wrench className="icon" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

function CourtType({ view }: { view: CourtView }) {
  if (view.status === "maint") return <span className="chip chip--sm chip--neutral">Bakımda</span>;
  if (view.status === "free")
    return (
      <span className="chip chip--sm chip--ok">
        <Check className="icon icon--xs" aria-hidden="true" />
        Müsait
      </span>
    );
  const kind = BOOKING_KIND[view.kind!];
  return (
    <>
      <Icon name={kind.icon} />
      {kind.label}
    </>
  );
}

export function CourtTile({ name, surface, view, reserveHref }: CourtTileProps) {
  const warn = view.status === "overtime";
  return (
    <article className={`${styles.court} ${STATUS_CLASS[view.status]}`}>
      <CourtVisual view={view} />
      <div className={styles.body}>
        <div className={styles.head}>
          <h3 className={styles.name}>{name}</h3>
          <span className={styles.surface}>{surface}</span>
          {view.short && <span className={`${styles.left} ${warn ? styles.leftWarn : ""}`}>{view.short}</span>}
        </div>
        <p className={styles.type}>
          <CourtType view={view} />
        </p>
        <p className={`${styles.who} ellipsis`}>{view.who}</p>
        <p className={`${styles.sub} ellipsis`}>{view.sub}</p>
        <div className={styles.foot}>
          {view.status === "free" ? (
            <Link className="btn btn--sm btn--accent btn--block" href={reserveHref}>
              <Plus className="icon icon--sm" aria-hidden="true" />
              Rezervasyon yap
            </Link>
          ) : (
            <>
              <div className={`${styles.progress} ${PROGRESS_CLASS[view.status]}`}>
                <span style={{ width: `${view.progress}%` }} />
              </div>
              <div className={styles.time}>
                <span>{view.range}</span>
                {warn ? (
                  <strong className={styles.isWarn}>
                    <Timer className="icon icon--xs" aria-hidden="true" />
                    {view.remaining}
                  </strong>
                ) : (
                  <strong>{view.remaining}</strong>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
