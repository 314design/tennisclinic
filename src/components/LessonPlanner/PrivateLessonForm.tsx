"use client";

import { AlertTriangle, CalendarRange, CircleCheck, Lock } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { MemberPicker } from "@/components/MemberPicker/MemberPicker";
import { addDays, weekdayOf } from "@/lib/clock";
import { atTime, formatCurrency, formatDayLabel, formatShortDate } from "@/lib/format";
import {
  BAND_LABEL,
  bandFor,
  canBeExclusive,
  MAX_PRIVATE_PEOPLE,
  packagePrice,
  perPerson,
  singleLessonPrice,
  type PriceList,
} from "@/lib/pricing";
import { createPrivateLessons } from "@/server/actions/packages";
import type { CoachOption, MemberOption, PackageOption, PlanSlot } from "@/server/queries/planning";
import styles from "./LessonPlanner.module.css";

const WEEKDAY_NAMES = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

type Source = "newPackage" | "package" | "single" | "makeup";

interface Props {
  coach: CoachOption;
  date: string;
  today: string;
  slot: PlanSlot;
  members: MemberOption[];
  packages: PackageOption[];
  priceList: PriceList;
  onCreated: (id: number) => void;
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

export function PrivateLessonForm({ coach, date, today, slot, members, packages, priceList, onCreated }: Props) {
  const [courtId, setCourtId] = useState(slot.courts.find((c) => c.state === "free")?.id ?? slot.courts[0].id);
  const [selected, setSelected] = useState<number[]>([]);
  const [exclusive, setExclusive] = useState(false);
  const [source, setSource] = useState<Source>("newPackage");
  const [packageId, setPackageId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<8 | 16>(8);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [paid, setPaid] = useState(false);
  const [fixWeekly, setFixWeekly] = useState(true);
  const [weeks, setWeeks] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<{ date: string; reason: string }[] | null>(null);
  const [pending, startTransition] = useTransition();

  const people = selected.length;
  const court = slot.courts.find((c) => c.id === courtId)!;
  const band = bandFor(priceList, date, slot.start, slot.end);
  const matchingPackages = useMemo(() => packages.filter((p) => people > 0 && sameSet(p.memberIds, selected)), [packages, selected, people]);
  const pkg = matchingPackages.find((p) => p.id === packageId) ?? null;
  const member = people === 1 ? members.find((m) => m.id === selected[0]) : undefined;
  const makeupAvailable = (member?.makeupCredits ?? 0) > 0;

  // Seçime göre geçerli kaynak (örn. paket öğrencileri değişince)
  const effectiveSource: Source =
    source === "package" && !matchingPackages.length ? "newPackage" : source === "makeup" && !makeupAvailable ? "newPackage" : source;
  const effectiveExclusive = effectiveSource === "package" ? !!pkg?.exclusive : exclusive && canBeExclusive(people);

  const listPrice =
    effectiveSource === "newPackage"
      ? packagePrice(priceList, { band, people: Math.max(people, 1), sessions, exclusive: effectiveExclusive })
      : singleLessonPrice(priceList, { band, people: Math.max(people, 1), exclusive: effectiveExclusive });
  const price = priceOverride ?? listPrice;

  const maxWeeks =
    effectiveSource === "newPackage" ? sessions : effectiveSource === "package" ? (pkg?.remaining ?? 1) : effectiveSource === "makeup" ? (member?.makeupCredits ?? 1) : 12;
  const weekCount = fixWeekly ? Math.min(Math.max(weeks, 1), maxWeeks) : 1;
  const dates = Array.from({ length: weekCount }, (_, i) => addDays(date, i * 7));

  const sharedCourtProblem = court.state === "shared" && (people > 1 || effectiveExclusive);

  const submit = (skipConflicts = false) =>
    startTransition(async () => {
      setError(null);
      const res = await createPrivateLessons({
        coachId: coach.id, courtId, date, start: slot.start, end: slot.end, memberIds: selected,
        exclusive: effectiveExclusive, source: effectiveSource, packageId: pkg?.id, sessions,
        price: effectiveSource === "newPackage" || effectiveSource === "single" ? price : undefined,
        paid, weeks: weekCount, skipConflicts,
      });
      if (res.ok) onCreated(res.ids[0]);
      else {
        setError(res.error);
        setConflicts(res.conflicts ?? null);
      }
    });

  const resetPrice = () => setPriceOverride(null);
  const canSubmit = people >= 1 && people <= MAX_PRIVATE_PEOPLE && !sharedCourtProblem && (effectiveSource !== "package" || !!pkg);

  return (
    <section className="card" aria-labelledby="form-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="form-title">Özel ders · öğrenci ata</h2>
          <p className="card__meta">
            {formatDayLabel(date, today)} {formatShortDate(date)} · {slot.start}–{slot.end} · {coach.name} · {BAND_LABEL[band]}
          </p>
        </div>
      </header>

      <div className={styles.formGrid}>
        <div className="form">
          <fieldset className={styles.fieldset}>
            <legend className="field__label">Kort</legend>
            <div className="pills">
              {slot.courts.map((c) => (
                <label key={c.id} className="pill">
                  <input type="radio" name="court" checked={courtId === c.id} onChange={() => setCourtId(c.id)} />
                  <span>
                    {c.name} · {c.label}
                    {c.state === "shared" && " · paylaşımlı"}
                  </span>
                </label>
              ))}
            </div>
            {court.state === "shared" && (
              <p className={`notice ${sharedCourtProblem ? "notice--error" : "notice--info"}`} style={{ marginTop: 8 }}>
                {sharedCourtProblem ? <AlertTriangle className="icon" aria-hidden="true" /> : null}
                {sharedCourtProblem
                  ? `Bu kortta ${court.conflict} var. Paylaşımsız ya da çok kişilik ders için boş bir kort seçin.`
                  : `Bu kortta ${court.conflict} var; kort 2 hoca, 2 öğrenci olarak paylaşılacak.`}
              </p>
            )}
          </fieldset>

          {canBeExclusive(people) && effectiveSource !== "package" && (
            <label className="check">
              <input type="checkbox" checked={exclusive} onChange={(e) => { setExclusive(e.target.checked); resetPrice(); }} />
              <span>
                <Lock className="icon icon--sm" aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
                Paylaşımsız kort (+{formatCurrency(priceList.exclusiveSurcharge)} / seans)
                <small>Kort yalnızca bu öğrenci ve hocaya ayrılır; aynı saatte başka ders eklenmez.</small>
              </span>
            </label>
          )}

          <fieldset className={styles.fieldset}>
            <legend className="field__label">Ödeme</legend>
            <div className="pills">
              <label className="pill">
                <input type="radio" name="source" checked={effectiveSource === "newPackage"} onChange={() => { setSource("newPackage"); resetPrice(); }} />
                <span>Yeni paket</span>
              </label>
              <label className="pill">
                <input type="radio" name="source" disabled={!matchingPackages.length} checked={effectiveSource === "package"} onChange={() => { setSource("package"); setPackageId(matchingPackages[0]?.id ?? null); }} />
                <span>Mevcut paket{matchingPackages.length ? ` (${matchingPackages.length})` : ""}</span>
              </label>
              <label className="pill">
                <input type="radio" name="source" checked={effectiveSource === "single"} onChange={() => { setSource("single"); resetPrice(); }} />
                <span>Tek ders</span>
              </label>
              {makeupAvailable && (
                <label className="pill">
                  <input type="radio" name="source" checked={effectiveSource === "makeup"} onChange={() => setSource("makeup")} />
                  <span>Telafi hakkı ({member?.makeupCredits})</span>
                </label>
              )}
            </div>
          </fieldset>

          <div className={styles.sourceBox}>
            {effectiveSource === "newPackage" && (
              <>
                <div className="pills">
                  {([8, 16] as const).map((n) => (
                    <label key={n} className="pill">
                      <input type="radio" name="sessions" checked={sessions === n} onChange={() => { setSessions(n); setWeeks(n); resetPrice(); }} />
                      <span>{n} seanslık paket</span>
                    </label>
                  ))}
                </div>
                <PriceInput price={price} listPrice={listPrice} onChange={setPriceOverride} people={Math.max(people, 1)} sessions={sessions} />
              </>
            )}
            {effectiveSource === "package" && (
              <label className="field">
                <span className="field__label">Paket</span>
                <select className="select" value={pkg?.id ?? ""} onChange={(e) => setPackageId(Number(e.target.value))}>
                  {matchingPackages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sessions} seans · {p.remaining} kaldı · {p.band === "offpeak" ? "Sakin saat" : "Yoğun saat"}
                      {p.exclusive ? " · Paylaşımsız" : ""}{p.coachName ? ` · ${p.coachName}` : ""}{p.paid ? "" : " · ödenmedi"}
                    </option>
                  ))}
                </select>
                {pkg && pkg.band !== band && (
                  <span className="field__hint">Bu paket {BAND_LABEL[pkg.band].toLocaleLowerCase("tr-TR")} fiyatıyla alındı; seçilen saat {BAND_LABEL[band].toLocaleLowerCase("tr-TR")}.</span>
                )}
              </label>
            )}
            {effectiveSource === "single" && (
              <PriceInput price={price} listPrice={listPrice} onChange={setPriceOverride} people={Math.max(people, 1)} sessions={1} />
            )}
            {effectiveSource === "makeup" && <p className="field__hint">Ders ücretsizdir; üyenin telafi hakkından düşülür.</p>}
            {(effectiveSource === "newPackage" || effectiveSource === "single") && price > 0 && (
              <label className="check">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
                <span>Ödeme alındı</span>
              </label>
            )}
          </div>

          <div className={styles.series}>
            <label className="check">
              <input type="checkbox" checked={fixWeekly} onChange={(e) => setFixWeekly(e.target.checked)} />
              <span>
                <CalendarRange className="icon icon--sm" aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
                Her {WEEKDAY_NAMES[weekdayOf(date)]} {atTime(slot.start)} sabitle
                <small>Öğrenci her hafta aynı gün ve saatte gelir; dersler ardışık haftalara açılır.</small>
              </span>
            </label>
            {fixWeekly && (
              <>
                <div className={styles.seriesRow}>
                  <select className="select" value={weekCount} onChange={(e) => setWeeks(Number(e.target.value))} aria-label="Hafta sayısı">
                    {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} hafta</option>
                    ))}
                  </select>
                  <span>
                    {formatShortDate(dates[0])} – {formatShortDate(dates[dates.length - 1])}
                  </span>
                </div>
                <div className={styles.dates}>
                  {dates.map((d) => (
                    <span key={d} className={conflicts?.some((c) => c.date === d) ? styles.conflict : undefined} title={conflicts?.find((c) => c.date === d)?.reason}>
                      {d.slice(8)}.{d.slice(5, 7)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <MemberPicker members={members} selected={selected} onChange={(ids) => { setSelected(ids); resetPrice(); setConflicts(null); }} max={MAX_PRIVATE_PEOPLE} label={`Öğrenciler (1–${MAX_PRIVATE_PEOPLE})`} />
      </div>

      {error && (
        <div className="notice notice--error" role="alert" style={{ marginTop: 16 }}>
          <AlertTriangle className="icon" aria-hidden="true" />
          <div>
            {error}
            {conflicts && (
              <ul>
                {conflicts.map((c) => (
                  <li key={c.date}>{formatShortDate(c.date)} · {c.reason}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 16 }}>
        {conflicts && conflicts.length < dates.length ? (
          <button className="btn btn--primary" type="button" disabled={pending} onClick={() => submit(true)}>
            <CircleCheck className="icon" aria-hidden="true" />
            Çakışan haftaları atla, {dates.length - conflicts.length} dersi oluştur
          </button>
        ) : (
          <button className="btn btn--primary" type="button" disabled={pending || !canSubmit} onClick={() => submit(false)}>
            <CircleCheck className="icon" aria-hidden="true" />
            {pending ? "Kaydediliyor…" : weekCount > 1 ? `${weekCount} dersi oluştur` : "Özel dersi oluştur"}
          </button>
        )}
      </div>
    </section>
  );
}

function PriceInput({ price, listPrice, onChange, people, sessions }: { price: number; listPrice: number; onChange: (v: number | null) => void; people: number; sessions: number }) {
  return (
    <div className="form-grid">
      <label className="field">
        <span className="field__label">{sessions > 1 ? "Paket tutarı (grup toplamı, ₺)" : "Ders ücreti (₺)"}</span>
        <input className="input" type="number" min={0} step={100} value={price} onChange={(e) => onChange(Math.max(0, Number(e.target.value)))} />
        <span className="field__hint">
          Seans {formatCurrency(Math.round(price / sessions))}
          {people > 1 ? ` · kişi başı ${formatCurrency(perPerson(price, people))}` : ""}
          {price !== listPrice && (
            <>
              {" · "}liste fiyatı {formatCurrency(listPrice)}{" "}
              <button type="button" className="link" style={{ minHeight: 0, padding: 0, border: 0, background: "none", cursor: "pointer" }} onClick={() => onChange(null)}>
                geri al
              </button>
            </>
          )}
        </span>
      </label>
    </div>
  );
}
