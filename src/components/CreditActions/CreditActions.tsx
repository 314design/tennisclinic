"use client";

import { PackagePlus, SlidersHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal/Modal";
import { addPackage, adjustCredits } from "@/server/actions/members";

export function CreditActions({ memberId, name }: { memberId: number; name: string }) {
  const [open, setOpen] = useState<"package" | "adjust" | null>(null);
  return (
    <>
      <button className="btn btn--primary" type="button" onClick={() => setOpen("package")}>
        <PackagePlus className="icon" aria-hidden="true" /> Paket ekle
      </button>
      <button className="btn" type="button" onClick={() => setOpen("adjust")}>
        <SlidersHorizontal className="icon" aria-hidden="true" /> Hak düzelt
      </button>
      <Modal open={open === "package"} onClose={() => setOpen(null)} title="Ders paketi ekle" description={name}>
        {open === "package" && <PackageForm memberId={memberId} onDone={() => setOpen(null)} />}
      </Modal>
      <Modal open={open === "adjust"} onClose={() => setOpen(null)} title="Ders / telafi hakkı düzelt" description={name}>
        {open === "adjust" && <AdjustForm memberId={memberId} onDone={() => setOpen(null)} />}
      </Modal>
    </>
  );
}

function PackageForm({ memberId, onDone }: { memberId: number; onDone: () => void }) {
  const [lessons, setLessons] = useState(10);
  const [amount, setAmount] = useState(12500);
  const [extendDays, setExtendDays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="form">
      <div className="form-grid">
        <label className="field">
          <span className="field__label">Ders sayısı</span>
          <input className="input" type="number" min={1} max={100} value={lessons} onChange={(e) => setLessons(Number(e.target.value))} />
        </label>
        <label className="field">
          <span className="field__label">Tutar (₺)</span>
          <input className="input" type="number" min={0} step={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </label>
        <label className="field">
          <span className="field__label">Üyeliği uzat</span>
          <select className="select" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))}>
            <option value={0}>Uzatma</option>
            <option value={30}>30 gün</option>
            <option value={90}>90 gün</option>
            <option value={180}>6 ay</option>
            <option value={365}>1 yıl</option>
          </select>
        </label>
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="btn" type="button" onClick={onDone}>Vazgeç</button>
        <button
          className="btn btn--primary"
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await addPackage({ memberId, lessons, amount, extendDays });
              if (res.ok) onDone();
              else setError(res.error);
            })
          }
        >
          Paketi ekle
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
