"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal/Modal";
import { TimeGrid, type GridColumn, type GridEvent } from "@/components/TimeGrid/TimeGrid";
import { fromMinutes } from "@/lib/clock";
import { toMinutes } from "@/lib/format";
import { moveBooking } from "@/server/actions/transfer";
import styles from "./CalendarBoard.module.css";

interface Props {
  open: string;
  close: string;
  columns: GridColumn[];
  events: GridEvent[];
  nowTime?: string;
  emptyHref?: string;
}

interface PendingMove {
  event: GridEvent;
  columnId: string;
  start: string;
}

const KIND_NOUN: Record<GridEvent["kind"], string> = { group: "Ders", private: "Ders", reservation: "Kiralama", block: "Bakım" };

/** Kort takvimi: seanslar sürüklenip bırakılınca onay istenir, sonra taşınır */
export function CalendarBoard(props: Props) {
  const [move, setMove] = useState<PendingMove | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setMove(null);
    setError(null);
  };
  const confirm = () =>
    move &&
    startTransition(async () => {
      const res = await moveBooking({ bookingId: Number(move.event.id), courtId: Number(move.columnId), start: move.start });
      if (res.ok) {
        setMove(null);
        setError(null);
      } else setError(res.error);
    });

  const length = move ? toMinutes(move.event.end) - toMinutes(move.event.start) : 0;
  const newEnd = move ? fromMinutes(toMinutes(move.start) + length) : "";
  const court = (id: string) => props.columns.find((c) => c.id === id)?.title ?? "";
  const courtChanged = move && move.columnId !== move.event.columnId;
  const timeChanged = move && move.start !== move.event.start;
  const noun = move ? KIND_NOUN[move.event.kind] : "";

  return (
    <>
      <TimeGrid {...props} onMove={(event, columnId, start) => { setError(null); setMove({ event, columnId, start }); }} />
      <Modal
        open={!!move}
        onClose={close}
        title={timeChanged ? `${noun} saati değişiyor` : `${noun} kortu değişiyor`}
        description={move?.event.title}
      >
        {move && (
          <div className={styles.body}>
            <div className={styles.change}>
              <div className={styles.slot}>
                <span>Şu an</span>
                <strong>{move.event.start}–{move.event.end}</strong>
                <em>{court(move.event.columnId)}</em>
              </div>
              <ArrowRight className="icon" aria-hidden="true" />
              <div className={`${styles.slot} ${styles.next}`}>
                <span>Yeni</span>
                <strong>{move.start}–{newEnd}</strong>
                <em>{court(move.columnId)}{courtChanged ? " (kort değişiyor)" : ""}</em>
              </div>
            </div>
            <p className="field__hint">
              Antrenör, öğrenciler ve ücret aynı kalır.
              {move.event.series ? " Haftalık sabit seride yalnızca bu tarihteki ders taşınır." : ""}
              {move.event.kind !== "reservation" ? " Öğrencilere yeni saati bildirmeyi unutmayın." : ""}
            </p>
            {error && (
              <p className="notice notice--error" role="alert">
                <AlertTriangle className="icon" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}
            <div className="form-actions">
              <button className="btn" type="button" onClick={close} disabled={pending}>Vazgeç</button>
              <button className="btn btn--primary" type="button" onClick={confirm} disabled={pending}>
                {pending ? "Taşınıyor…" : "Onayla ve taşı"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
