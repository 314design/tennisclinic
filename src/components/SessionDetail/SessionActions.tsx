"use client";

import { Check, Play, UserPlus, Wallet, X } from "lucide-react";
import { useState, useTransition } from "react";
import { CancelDialog } from "@/components/CancelDialog/CancelDialog";
import { MemberPicker } from "@/components/MemberPicker/MemberPicker";
import { Modal } from "@/components/Modal/Modal";
import type { BookingKind } from "@/lib/types";
import {
  addMembersToBooking,
  finishBooking,
  markPaid,
  removeMemberFromBooking,
  startBooking,
  type ActionResult,
} from "@/server/actions/bookings";
import type { MemberOption } from "@/server/queries/planning";

interface Props {
  id: number;
  kind: BookingKind;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  paid: boolean;
  label: string;
  memberIds: number[];
  memberName?: string;
  capacity: number;
  members: MemberOption[];
}

export function SessionActions({ id, kind, status, paid, label, memberIds, memberName, capacity, members }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const open = status === "scheduled" || status === "in_progress";

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error);
    });

  return (
    <div className="form">
      <div className="page-header__actions">
        {status === "scheduled" && (
          <button className="btn btn--primary" type="button" disabled={pending} onClick={() => run(() => startBooking(id))}>
            <Play className="icon" aria-hidden="true" />
            Başlat
          </button>
        )}
        {status === "in_progress" && (
          <button className="btn btn--primary" type="button" disabled={pending} onClick={() => run(() => finishBooking(id))}>
            <Check className="icon" aria-hidden="true" />
            Bitir
          </button>
        )}
        {!paid && status !== "cancelled" && (
          <button className="btn" type="button" disabled={pending} onClick={() => run(() => markPaid(id))}>
            <Wallet className="icon" aria-hidden="true" />
            Tahsil et
          </button>
        )}
        {open && kind !== "private" && memberIds.length < capacity && (
          <button className="btn" type="button" onClick={() => setAddOpen(true)}>
            <UserPlus className="icon" aria-hidden="true" />
            Üye ekle
          </button>
        )}
        {open && (
          <button className="btn btn--danger" type="button" onClick={() => setCancelOpen(true)}>
            <X className="icon" aria-hidden="true" />
            İptal et
          </button>
        )}
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}

      <CancelDialog
        target={cancelOpen ? { id, kind, label, memberCount: memberIds.length, memberName } : null}
        onClose={() => setCancelOpen(false)}
      />
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Üye ekle" description={`${capacity - memberIds.length} yer kaldı`}>
        {addOpen && <AddMembers id={id} kind={kind} exclude={memberIds} max={capacity - memberIds.length} members={members} onDone={() => setAddOpen(false)} />}
      </Modal>
    </div>
  );
}

function AddMembers({ id, kind, exclude, max, members, onDone }: { id: number; kind: BookingKind; exclude: number[]; max: number; members: MemberOption[]; onDone: () => void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="form">
      <MemberPicker members={members} selected={selected} onChange={setSelected} max={max} exclude={exclude} label="Üyeler" />
      {kind !== "reservation" && <p className="field__hint">Eklenen her üyenin ders hakkından (varsa telafiden) 1 düşülür.</p>}
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="btn" type="button" onClick={onDone}>Vazgeç</button>
        <button
          className="btn btn--primary"
          type="button"
          disabled={pending || !selected.length}
          onClick={() =>
            startTransition(async () => {
              const res = await addMembersToBooking({ bookingId: id, memberIds: selected, useMakeup: true });
              if (res.ok) onDone();
              else setError(res.error);
            })
          }
        >
          Ekle
        </button>
      </div>
    </div>
  );
}

export function RemoveMemberButton({ bookingId, memberId, name, refundable }: { bookingId: number; memberId: number; name: string; refundable: boolean }) {
  const [open, setOpen] = useState(false);
  const [refund, setRefund] = useState(true);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button className="icon-btn icon-btn--sm icon-btn--danger" type="button" aria-label={`${name} seanstan çıkar`} title="Seanstan çıkar" onClick={() => setOpen(true)}>
        <X className="icon" aria-hidden="true" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Seanstan çıkar" description={name}>
        {open && (
          <div className="form">
            {refundable && (
              <label className="check">
                <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
                <span>Kullanılan ders hakkını iade et</span>
              </label>
            )}
            <div className="form-actions">
              <button className="btn" type="button" onClick={() => setOpen(false)}>Vazgeç</button>
              <button
                className="btn btn--danger-solid"
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await removeMemberFromBooking({ bookingId, memberId, refund: refundable && refund });
                    setOpen(false);
                  })
                }
              >
                Çıkar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
