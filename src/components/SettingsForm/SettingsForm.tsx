"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { updateSettings } from "@/server/actions/settings";
import type { Settings } from "@/server/queries/common";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(updateSettings, undefined);
  return (
    <form className="stack-lg" action={action}>
      <section className="card">
        <h2 className="card__title">Kulüp</h2>
        <div className="form-grid" style={{ marginTop: 14 }}>
          <label className="field"><span className="field__label">Kulüp adı</span><input className="input" name="club.name" defaultValue={settings.club.name} /></label>
          <label className="field"><span className="field__label">Alt başlık</span><input className="input" name="club.subtitle" defaultValue={settings.club.subtitle} /></label>
          <label className="field"><span className="field__label">Şube</span><input className="input" name="club.branch" defaultValue={settings.club.branch} /></label>
          <label className="field"><span className="field__label">Açılış</span><input className="input" type="time" step={1800} name="hours.open" defaultValue={settings.hours.open} /></label>
          <label className="field"><span className="field__label">Kapanış</span><input className="input" type="time" step={1800} name="hours.close" defaultValue={settings.hours.close} /></label>
        </div>
      </section>
      <section className="card">
        <h2 className="card__title">Hava durumu konumu</h2>
        <p className="card__meta">Sağ üstteki hava durumu ve yağmur uyarıları bu konumdan alınır (Open-Meteo).</p>
        <div className="form-grid" style={{ marginTop: 14 }}>
          <label className="field"><span className="field__label">Konum adı</span><input className="input" name="weather.name" defaultValue={settings.weather.name} /></label>
          <label className="field"><span className="field__label">Enlem</span><input className="input" name="weather.latitude" inputMode="decimal" defaultValue={settings.weather.latitude} /></label>
          <label className="field"><span className="field__label">Boylam</span><input className="input" name="weather.longitude" inputMode="decimal" defaultValue={settings.weather.longitude} /></label>
        </div>
      </section>
      <section className="card">
        <h2 className="card__title">Kullanıcı</h2>
        <div className="form-grid" style={{ marginTop: 14 }}>
          <label className="field"><span className="field__label">Ad (selamlama)</span><input className="input" name="user.firstName" defaultValue={settings.user.firstName} /></label>
          <label className="field"><span className="field__label">Ad soyad</span><input className="input" name="user.fullName" defaultValue={settings.user.fullName} /></label>
          <label className="field"><span className="field__label">Görev</span><input className="input" name="user.role" defaultValue={settings.user.role} /></label>
        </div>
      </section>
      {state?.error && <p className="notice notice--error" role="alert">{state.error}</p>}
      <div className="form-actions">
        {state?.saved && !pending && <span className="notice--inline"><Check className="icon" aria-hidden="true" /> Kaydedildi</span>}
        <button className="btn btn--primary" type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Ayarları kaydet"}</button>
      </div>
    </form>
  );
}
