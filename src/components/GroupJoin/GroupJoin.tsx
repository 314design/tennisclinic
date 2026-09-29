"use client";

import { AlertTriangle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatDayLabel } from "@/lib/format";
import { joinGroupLessons } from "@/server/actions/bookings";
import type { GroupSeries } from "@/server/queries/planning";
import styles from "./GroupJoin.module.css";

interface Props {
  members: { id: number; name: string; level: string | null; lessonCredits: number }[];
  series: GroupSeries[];
  today: string;
}

const weekdayName = (iso: string) => new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export function GroupJoin({ members, series, today }: Props) {
  const router = useRouter();
  const n = members.length;
  const ids = members.map((m) => m.id);
  const level = members.every((m) => m.level === members[0].level) ? members[0].level : null;
  const [showAll, setShowAll] = useState(false);

  /** Yeri olan dersler; ekibin seviyesine uyan gruplar önce */
  const options = useMemo((): Option[] => {
    const withRoom = series
      .map((g) => ({
        ...g,
        sessions: g.sessions.map((x) => ({ ...x, room: x.capacity - x.members.filter((m) => !ids.includes(m.id)).length })),
      }))
      .filter((g) => g.sessions.some((x) => x.room >= n));
    return withRoom.sort((a, b) => Number(b.level === level) - Number(a.level === level) || a.sessions[0].date.localeCompare(b.sessions[0].date) || a.start.localeCompare(b.start));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, n, level]);
  const visible = showAll ? options : options.slice(0, 8);
  const noCredit = members.filter((m) => m.lessonCredits <= 0).length;

  return (
    <div className="stack-lg">
      <section className="card">
        <div className={styles.team}>
          <Users className="icon" aria-hidden="true" />
          <div>
            <strong>{n} kişilik ekip</strong>
            <span>{members.map((m) => m.name).join(" · ")}{level ? ` · ${level}` : ""}</span>
          </div>
        </div>
        {noCredit > 0 && (
          <p className="notice notice--warn" style={{ marginTop: 12 }}>
            <AlertTriangle className="icon" aria-hidden="true" />
            <span>{noCredit} kişinin ders hakkı yok; eklendikleri her ders için kişi başı ücret ödenecek olarak yazılır.</span>
          </p>
        )}
      </section>

      {options.length ? (
        <>
          {visible.map((g) => (
            <SeriesCard key={g.key} group={g} n={n} memberIds={ids} today={today} levelMatch={!!level && g.level === level} onDone={(id) => router.push(`/seanslar/${id}`)} />
          ))}
          {options.length > visible.length && (
            <button className="btn" type="button" onClick={() => setShowAll(true)}>Tüm grupları göster ({options.length})</button>
          )}
        </>
      ) : (
        <section className="card">
          <p className="empty">
            <strong>{n} kişiye yeri olan grup dersi yok</strong>
            Sağ üstten yeni grup dersi ya da ekibe özel ders açabilirsiniz.
          </p>
        </section>
      )}
    </div>
  );
}

type Option = Omit<GroupSeries, "sessions"> & { sessions: (GroupSeries["sessions"][number] & { room: number })[] };

function SeriesCard({ group, n, memberIds, today, levelMatch, onDone }: { group: Option; n: number; memberIds: number[]; today: string; levelMatch: boolean; onDone: (id: number) => void }) {
  const [picked, setPicked] = useState<number[]>(() => group.sessions.filter((x) => x.room >= n).map((x) => x.id));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const first = group.sessions[0];
  const current = first.members.filter((m) => !memberIds.includes(m.id));

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await joinGroupLessons({ bookingIds: picked, memberIds });
      if (res.ok) onDone(picked[0]);
      else setError(res.error);
    });

  return (
    <section className="card">
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>
            {group.title}
            {group.level && <span className={levelMatch ? "chip chip--sm chip--ok" : "chip chip--sm chip--neutral"}>{group.level}</span>}
          </h2>
          <p className="muted">
            Her {weekdayName(first.date)} {group.start}–{group.end} · {group.coachName} · {group.courtName}
          </p>
          <p className="muted">
            Şu an {current.length}/{first.capacity} kişi{current.length ? `: ${current.map((m) => m.name).join(", ")}` : ""}
          </p>
        </div>
        <button className="btn btn--primary" type="button" disabled={pending || !picked.length} onClick={submit}>
          {pending ? "Ekleniyor…" : `${n} kişiyi ${picked.length} derse ekle`}
        </button>
      </div>
      <div className="pills" style={{ marginTop: 12 }}>
        {group.sessions.map((x) => (
          <label key={x.id} className="pill">
            <input
              type="checkbox"
              checked={picked.includes(x.id)}
              disabled={x.room < n}
              onChange={(e) => setPicked((p) => (e.target.checked ? [...p, x.id] : p.filter((id) => id !== x.id)))}
            />
            <span>
              {formatDayLabel(x.date, today)} · {x.room < n ? "yer yok" : `${x.room} yer`}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="notice notice--error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
    </section>
  );
}
