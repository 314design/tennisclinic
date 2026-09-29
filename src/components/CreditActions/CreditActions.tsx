"use client";

import { PackagePlus, SlidersHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal/Modal";
import { formatCurrency } from "@/lib/format";
import { addPackage, adjustCredits } from "@/server/actions/members";

export function CreditActions({ memberId, name, fee, validity }: { memberId: number; name: string; fee: number; validity: Record<"8" | "16", number> }) {
  const [open, setOpen] = useState<"package" | "adjust" | null>(null);
  return (
    <>
      <button className="btn btn--primary" type="button" onClick={() => setOpen("package")}>
        <PackagePlus className="icon" aria-hidden="true" /> Grup ders kotası
      </button>
      <button className="btn" type="button" onClick={() => setOpen("adjust")}>
        <SlidersHorizontal className="icon" aria-hidden="true" /> Hak düzelt
      </button>
      <Modal open={open === "package"} onClose={() => setOpen(null)} title="Grup dersi kotası ekle" description={name}>
        {open === "package" && <PackageForm memberId={memberId} fee={fee} validity={validity} onDone={() => setOpen(null)} />}
      </Modal>
      <Modal open={open === "adjust"} onClose={() => setOpen(null)} title="Ders / telafi hakkı düzelt" description={name}>
        {open === "adjust" && <AdjustForm memberId={memberId} onDone={() => setOpen(null)} />}
      </Modal>
    </>
  );
}

function PackageForm({ memberId, fee, validity, onDone }: { memberId: number; fee: number; validity: Record<"8" | "16", number>; onDone: () => void }) {
  const [lessons, setLessons] = useState<8 | 16>(8);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const amount = fee * lessons;
  return (
    <div className="form">
      <div className="pills">
        {([8, 16] as const).map((n) => (
          <label key={n} className="pill">
            <input type="radio" name="quota" checked={lessons === n} onChange={() => setLessons(n)} />
            <span>{n} seans</span>
          </label>
        ))}
      </div>
      <p className="notice notice--info">
        Tutar {formatCurrency(amount)} ({formatCurrency(fee)} × {lessons} seans). Üyelik bitişi bugünden itibaren {validity[String(lessons) as "8" | "16"]} gün geçerli olacak şekilde uzar.
      </p>
      {amount > 0 && (
        <label className="check">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          <span>Ödeme alındı</span>
        </label>
      )}
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="btn" type="button" onClick={onDone}>Vazgeç</button>
        <button
          className="btn btn--primary"
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await addPackage({ memberId, lessons, paid });
              if (res.ok) onDone();
              else setError(res.error);
            })
          }
        >
          Kotayı ekle
        </button>
      </div>
    </div>
  );
}

function AdjustForm({ memberId, onDone }: { memberId: number; onDone: () => void }) {
  const [kind, setKind] = useState<"lesson" | "makeup">("makeup");
  const [delta, setDelta] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="form">
      <div className="pills">
        <label className="pill">
          <input type="radio" name="kind" checked={kind === "makeup"} onChange={() => setKind("makeup")} />
          <span>Telafi hakkı</span>
        </label>
        <label className="pill">
          <input type="radio" name="kind" checked={kind === "lesson"} onChange={() => setKind("lesson")} />
          <span>Ders hakkı</span>
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="field__label">Değişim</span>
          <input className="input" type="number" min={-50} max={50} value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
          <span className="field__hint">Eklemek için pozitif, düşmek için negatif sayı.</span>
        </label>
        <label className="field">
          <span className="field__label">Not</span>
          <input className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Ör. Antrenör hastalığı nedeniyle telafi" />
        </label>
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="btn" type="button" onClick={onDone}>Vazgeç</button>
        <button
          className="btn btn--primary"
          type="button"
          disabled={pending || !delta}
          onClick={() =>
            startTransition(async () => {
              const res = await adjustCredits({ memberId, kind, delta, note });
              if (res.ok) onDone();
              else setError(res.error);
            })
          }
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}
