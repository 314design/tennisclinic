"use client";

import { AlertTriangle, CloudRain } from "lucide-react";
import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal/Modal";
import { CANCEL_REASONS, type CancelReason } from "@/lib/booking";
import type { BookingKind } from "@/lib/types";
import { cancelBooking } from "@/server/actions/bookings";

export interface CancelTarget {
  id: number;
  kind: BookingKind;
  /** "Zeynep Arslan · Kort 1 · 18:00–19:00" */
  label: string;
  memberCount: number;
  /** Tek üyeli seanslarda üyenin adı */
  memberName?: string;
}

/** Telafi hakkı varsayılan olarak açık gelen nedenler (üyenin kusuru olmayan iptaller) */
const MAKEUP_BY_DEFAULT: CancelReason[] = ["weather", "coach", "maintenance"];
const SELECTABLE = (Object.keys(CANCEL_REASONS) as CancelReason[]).filter((r) => r !== "group_priority");

export function CancelDialog({ target, onClose }: { target: CancelTarget | null; onClose: () => void }) {
  return (
    <Modal open={!!target} onClose={onClose} title="Seansı iptal et" description={target?.label}>
      {target && <CancelForm key={target.id} target={target} onDone={onClose} />}
    </Modal>
  );
}

function CancelForm({ target, onDone }: { target: CancelTarget; onDone: () => void }) {
  const [reason, setReason] = useState<CancelReason>("weather");
  const [grantMakeup, setGrantMakeup] = useState(true);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isLesson = target.kind !== "reservation";
  const people = target.memberCount;

  const chooseReason = (r: CancelReason) => {
    setReason(r);
    setGrantMakeup(MAKEUP_BY_DEFAULT.includes(r));
  };

  const submit = () =>
    startTransition(async () => {
      const res = await cancelBooking({ id: target.id, reason, note, grantMakeup: isLesson && grantMakeup });
      if (res.ok) onDone();
      else setError(res.error);
    });

  return (
    <div className="form">
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field__label" style={{ marginBottom: 8 }}>İptal nedeni</legend>
        <div className="pills">
          {SELECTABLE.map((r) => (
            <label key={r} className="pill">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => chooseReason(r)} />
              <span>
                {r === "weather" && <CloudRain className="icon" aria-hidden="true" />}
                {CANCEL_REASONS[r]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="field__label">Not (isteğe bağlı)</span>
        <textarea className="textarea" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Ör. Kort zemini ıslak, 30 dk içinde yağış bekleniyor" />
      </label>

      {isLesson ? (
        <label className="check">
          <input type="checkbox" checked={grantMakeup} onChange={(e) => setGrantMakeup(e.target.checked)} />
          <span>
            Telafi ders hakkı oluştur
            <small>
              {people > 1 ? `${people} üyenin` : target.memberName ? `${target.memberName} adlı üyenin` : "Üyenin"} ders haklarına +1 telafi dersi eklenir. Üyelik bitiş tarihi değişmez.
              {!grantMakeup && " İşaretlemezseniz kullanılan ders hakkı yanar."}
            </small>
          </span>
        </label>
      ) : (
        <p className="notice notice--info">Kort kiralamalarında ders hakkı kullanılmadığı için telafi oluşturulmaz.</p>
      )}

      {error && (
        <p className="notice notice--error" role="alert">
          <AlertTriangle className="icon" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="form-actions">
        <button className="btn" type="button" onClick={onDone} disabled={pending}>Vazgeç</button>
        <button className="btn btn--danger-solid" type="button" onClick={submit} disabled={pending}>
          {pending ? "İptal ediliyor…" : "Seansı iptal et"}
        </button>
      </div>
    </div>
  );
}
