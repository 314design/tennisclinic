import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { CoachInfoForm } from "@/components/CoachEditor/CoachEditor";

export const metadata = { title: "Antrenör Ekle · Tennis Clinic" };

export default function NewCoachPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <Link className="back-link" href="/antrenorler">
            <ChevronLeft className="icon" aria-hidden="true" /> Antrenörler
          </Link>
          <h1 className="page-header__title">Antrenör Ekle</h1>
          <p className="page-header__lede">Kaydettikten sonra haftalık çalışma saatlerini düzenleyebilirsiniz (varsayılan: hafta içi 09:00–18:00).</p>
        </div>
      </header>
      <section className="card">
        <CoachInfoForm />
      </section>
    </>
  );
}
