"use client";

import { Wallet } from "lucide-react";
import { useTransition } from "react";
import { markPaid } from "@/server/actions/bookings";
import { markPackagePaid } from "@/server/actions/packages";

export function CollectButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button className="btn btn--sm btn--outline" type="button" disabled={pending} onClick={() => startTransition(async () => void (await markPaid(id)))}>
      <Wallet className="icon icon--sm" aria-hidden="true" />
      {pending ? "…" : "Tahsil et"}
    </button>
  );
}

export function CollectPackageButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button className="btn btn--sm btn--outline" type="button" disabled={pending} onClick={() => startTransition(async () => void (await markPackagePaid(id)))}>
      <Wallet className="icon icon--sm" aria-hidden="true" />
      {pending ? "…" : "Tahsil et"}
    </button>
  );
}
