import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { MemberForm } from "@/components/MemberForm/MemberForm";
import { createMember } from "@/server/actions/members";
import { LEVELS } from "@/server/queries/common";
import { getPriceList } from "@/server/queries/pricing";
import { clubNow } from "@/lib/clock";

export const metadata = { title: "Üye Ekle · Tennis Clinic" };

export default async function NewMemberPage() {
  const now = clubNow();
  const list = await getPriceList(now.date);
  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" href="/uyeler">
            <ChevronLeft className="icon" aria-hidden="true" /> Üyeler
          </Link>
          <h1 className="page-header__title">Üye Ekle</h1>
        </div>
      </header>
      <section className="card">
        <MemberForm action={createMember} levels={LEVELS} isNew today={now.date} fee={list.groupPerPerson} validity={list.validityDays} />
      </section>
    </>
  );
}
