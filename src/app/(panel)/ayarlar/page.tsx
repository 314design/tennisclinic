import { ExportPanel } from "@/components/ExportPanel/ExportPanel";
import { SettingsForm } from "@/components/SettingsForm/SettingsForm";
import { clubNow } from "@/lib/clock";
import { getSettings } from "@/server/queries/common";

export const metadata = { title: "Ayarlar · Tennis Clinic" };

export default async function SettingsPage() {
  const settings = await getSettings();
  const now = clubNow();
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Ayarlar</h1>
          <p className="page-header__lede">Yedek ve Excel raporu, kulüp bilgileri, çalışma saatleri ve hava durumu konumu</p>
        </div>
      </header>
      <ExportPanel today={now.date} monthStart={`${now.date.slice(0, 8)}01`} />
      <SettingsForm settings={settings} />
    </>
  );
}
