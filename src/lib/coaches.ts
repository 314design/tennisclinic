import { courtStatus } from "./courts";
import { toMinutes } from "./format";
import type { ClockTime, Coach, CoachState, Court, Session } from "./types";

/** Antrenörün durumu kortlardaki ve sıradaki seanslardaki bilgiden çıkarılır. */
export function getCoachState(coach: Coach, courts: Court[], sessions: Session[], now: ClockTime): CoachState {
  if (coach.onLeave) return { type: "off" };

  const court = courts.find((c) => c.occupant?.coach === coach.name && courtStatus(c, now) === "busy");
  if (court?.occupant) return { type: "teaching", courtName: court.name, until: court.occupant.end };

  const next = sessions
    .filter((s) => s.coach === coach.name && toMinutes(s.start) >= toMinutes(now))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))[0];
  const nextCourt = next && courts.find((c) => c.id === next.courtId);
  return {
    type: "available",
    next: next && nextCourt ? { start: next.start, courtName: nextCourt.name } : undefined,
  };
}
