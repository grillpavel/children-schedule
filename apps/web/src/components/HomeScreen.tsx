'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { buildRecommendations, type ActivityCategory, type Weekday } from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { useScheduleView } from '@/hooks/useScheduleView';
import { formatTime } from '@/lib/grid';
import {
  IconCalendar,
  IconSparkles,
  IconCheck,
  IconFolderOpen,
  IconUser,
} from './Icons';

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  sport: 'Sport',
  athletics: 'Atletika',
  art: 'Výtvarka',
  music: 'Hudba',
  dance: 'Tanec',
  language: 'Jazyky',
  science_tech: 'Věda a technika',
  science: 'Věda',
  tech: 'Technika',
  crafts: 'Rukodělky',
  games: 'Hry',
  outdoor: 'Příroda a turistika',
  martial_arts: 'Bojové sporty',
  scouting: 'Skauting',
  other: 'Ostatní',
};

const ONBOARD_KEY = 'krouzky:onboarded';

/** Krátké označení období (skutečná cena, žádný přepočet na měsíc). */
const PRICE_PERIOD_SHORT: Record<string, string> = {
  per_month: 'měs',
  per_semester: 'pol.',
  per_year: 'rok',
  per_session: 'lekce',
};

/** Domovská obrazovka (týden-first): souhrn, doporučení a rychlé nastavení. */
export function HomeScreen({
  onOpenCatalog,
  onOpenGrid,
}: {
  onOpenCatalog: () => void;
  onOpenGrid: () => void;
}) {
  const catalog = usePlannerStore((s) => s.catalog);
  const schedule = usePlannerStore((s) => activeSchedule(s.state));
  const child = usePlannerStore((s) => s.state.children.find((c) => c.id === s.activeChildId));
  const setChildAge = usePlannerStore((s) => s.setChildAge);
  const setChildInterests = usePlannerStore((s) => s.setChildInterests);
  const selectActivity = usePlannerStore((s) => s.selectActivity);
  const view = useScheduleView();

  const [onboarded, setOnboarded] = useState(true);
  useEffect(() => {
    setOnboarded(window.localStorage.getItem(ONBOARD_KEY) === '1');
  }, []);
  const dismissOnboarding = () => {
    window.localStorage.setItem(ONBOARD_KEY, '1');
    setOnboarded(true);
  };

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayWeekday = useMemo(() => {
    const jsDay = new Date().getDay();
    return (jsDay === 0 ? 7 : jsDay) as Weekday;
  }, []);
  const todayBlocks = useMemo(
    () =>
      view.blocks
        .filter(
          (b) => b.weekday === todayWeekday && b.validFrom <= todayIso && b.validTo >= todayIso,
        )
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [view.blocks, todayWeekday, todayIso],
  );
  const recommendations = useMemo(
    () => (child ? buildRecommendations(child, catalog, schedule, todayIso, { limit: 3 }) : []),
    [child, catalog, schedule, todayIso],
  );
  const catalogCategories = useMemo(() => {
    const set = new Set<ActivityCategory>();
    for (const a of catalog.activities) set.add(a.category);
    return [...set].sort((x, y) => CATEGORY_LABELS[x].localeCompare(CATEGORY_LABELS[y], 'cs'));
  }, [catalog.activities]);

  if (!child) return null;

  const showOnboarding = !onboarded && view.summary.activityCount === 0;
  const conflictCount = view.conflicts.filter((c) => c.severity === 'hard').length;

  const toggleInterest = (cat: ActivityCategory) => {
    const next = child.interests.includes(cat)
      ? child.interests.filter((c) => c !== cat)
      : [...child.interests, cat];
    setChildInterests(child.id, next);
  };

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4 bg-slate-50/40">
      {/* Profilová hlavička */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-xs">
          {child.name ? child.name[0]?.toUpperCase() : <IconUser className="h-5 w-5" />}
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">Přehled — {child.name}</h1>
          <p className="text-xs text-slate-500 font-medium">Věk {child.age} let · {view.scheduleName}</p>
        </div>
      </div>

      {showOnboarding && (
        <section aria-label="Rychlé nastavení" className="space-y-3 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <IconSparkles className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-blue-950">Vítejte! Rychlé nastavení (30 s)</h2>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span>Věk dítěte:</span>
            <input
              type="number"
              min={3}
              max={19}
              value={child.age}
              onChange={(e) => setChildAge(child.id, Number(e.target.value))}
              aria-label="Věk dítěte"
              className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-900 text-xs shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-slate-400 font-normal">let</span>
          </label>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">Co dítě baví?</p>
            <div className="flex flex-wrap gap-1.5">
              {catalogCategories.map((cat) => {
                const on = child.interests.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleInterest(cat)}
                    className={clsx(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                      on
                        ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              dismissOnboarding();
              onOpenCatalog();
            }}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            Hotovo, vybrat kroužky
          </button>
        </section>
      )}

      {/* Dnes (FR-2, design_review_58.md): prioritizované nad týdenním přehledem. */}
      <section aria-label="Dnes" className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dnes</h2>
        {todayBlocks.length === 0 ? (
          <p className="text-xs text-slate-500">Dnes nic nemáte naplánované.</p>
        ) : (
          <ul className="space-y-1.5">
            {todayBlocks.map((b) => (
              <li key={b.ownerId} className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-900 tabular-nums">{formatTime(b.startMinutes)}</span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: b.fill }}
                  aria-hidden
                />
                <span className="font-medium text-slate-700">{b.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tento týden dashboard widget */}
      <section aria-label="Tento týden" className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tento týden</h2>
        {view.summary.activityCount === 0 ? (
          <p className="text-xs text-slate-500 leading-relaxed">
            Zatím žádný kroužek. Přidejte první z katalogu a hned uvidíte kolize i volné dny.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
              <dt className="text-[11px] font-semibold text-slate-500">Kroužky</dt>
              <dd className="mt-0.5 text-lg font-bold text-slate-900">{view.summary.activityCount}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
              <dt className="text-[11px] font-semibold text-slate-500">Volné všední dny</dt>
              <dd className="mt-0.5 text-lg font-bold text-slate-900">{view.summary.freeWeekdays.length}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
              <dt className="text-[11px] font-semibold text-slate-500">Náklady</dt>
              <dd className="mt-0.5 text-base font-bold text-slate-900">
                {view.summary.costByPeriod.length === 0 ? (
                  <span className="text-sm font-semibold text-slate-400">bez ceny</span>
                ) : (
                  view.summary.costByPeriod.map((c) => (
                    <div key={c.period}>
                      {c.amountCzk.toLocaleString('cs-CZ')} Kč<span className="text-[11px] font-normal text-slate-500">/{PRICE_PERIOD_SHORT[c.period] ?? c.period}</span>
                    </div>
                  ))
                )}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
              <dt className="text-[11px] font-semibold text-slate-500">Kolize</dt>
              <dd className={clsx('mt-0.5 text-lg font-bold', conflictCount > 0 ? 'text-red-600' : 'text-emerald-600')}>
                {conflictCount > 0 ? conflictCount : 'žádné'}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {/* Doporučení sekce */}
      <section aria-label="Doporučení" className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Doporučujeme</h2>
        {recommendations.length > 0 ? (
          <ul className="space-y-2">
            {recommendations.map((rec) => (
              <li key={rec.activity.id}>
                <button
                  type="button"
                  aria-label={`Doporučeno: ${rec.activity.name}`}
                  onClick={() => selectActivity(rec.activity.id)}
                  className="w-full rounded-xl border border-slate-200/90 bg-white p-3 text-left transition hover:border-blue-400 hover:shadow-xs"
                >
                  <div className="text-sm font-bold text-slate-900 leading-snug">{rec.activity.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500 font-medium">{CATEGORY_LABELS[rec.activity.category]}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {rec.fit.reasons
                      .filter((r) => r.ok)
                      .slice(0, 3)
                      .map((r) => (
                        <span key={r.key} className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-100">
                          <IconCheck className="h-3 w-3" />
                          <span>{r.label.replace(/^✓\s*/, '')}</span>
                        </span>
                      ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Zatím nemáme co doporučit.</p>
        )}
      </section>

      {/* Rychlá navigační tlačítka */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onOpenCatalog}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
        >
          <IconFolderOpen className="h-4 w-4" />
          <span>Procházet katalog</span>
        </button>
        <button
          type="button"
          onClick={onOpenGrid}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        >
          <IconCalendar className="h-4 w-4 text-slate-500" />
          <span>Zobrazit rozvrh</span>
        </button>
      </div>
    </div>
  );
}
