"use client";

import { Wallet } from "lucide-react";
import { useTransition } from "react";
import { markPaid } from "@/server/actions/bookings";

export function CollectButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button className="btn btn--sm btn--outline" type="button" disabled={pending} onClick={() => startTransition(async () => void (await markPaid(id)))}>
      <Wallet className="icon icon--sm" aria-hidden="true" />
      {pending ? "…" : "Tahsil et"}
    </button>
  );
}
