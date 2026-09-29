import { SettingsForm } from "@/components/SettingsForm/SettingsForm";
import { getSettings } from "@/server/queries/common";

export const metadata = { title: "Ayarlar · Tennis Clinic" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Ayarlar</h1>
          <p className="page-header__lede">Kulüp bilgileri, çalışma saatleri ve hava durumu konumu</p>
        </div>
      </header>
      <SettingsForm settings={settings} />
    </>
  );
}
