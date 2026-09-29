"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** Tarayıcının yerel <dialog> penceresi: odak tuzağı ve Esc ile kapanma hazır gelir */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div className="modal__body">
          <div className="modal__head">
            <div>
              <h2 className="modal__title" id={titleId}>{title}</h2>
              {description && <p className="card__meta">{description}</p>}
            </div>
            <button className="modal__close" type="button" aria-label="Kapat" onClick={onClose}>
              <X className="icon icon--lg" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
