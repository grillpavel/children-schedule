'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { buildRecommendations, type ActivityCategory } from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { useScheduleView } from '@/hooks/useScheduleView';

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

function monthlyCzk(amount: number, period: string): number {
  switch (period) {
    case 'per_year':
      return amount / 12;
    case 'per_semester':
      return amount / 5;
    case 'per_session':
      return amount * 4;
    default:
      return amount;
  }
}

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
  const monthlyTotal = Math.round(
    view.summary.costByPeriod.reduce((sum, c) => sum + monthlyCzk(c.amountCzk, c.period), 0),
  );
  const conflictCount = view.conflicts.filter((c) => c.severity === 'hard').length;

  const toggleInterest = (cat: ActivityCategory) => {
    const next = child.interests.includes(cat)
      ? child.interests.filter((c) => c !== cat)
      : [...child.interests, cat];
    setChildInterests(child.id, next);
  };

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4">
      <h1 className="text-lg font-semibold text-slate-900">Přehled — {child.name}</h1>

      {showOnboarding && (
        <section aria-label="Rychlé nastavení" className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
          <h2 className="text-sm font-semibold text-slate-800">Vítejte! Rychlé nastavení (30 s)</h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Věk dítěte
            <input
              type="number"
              min={3}
              max={19}
              value={child.age}
              onChange={(e) => setChildAge(child.id, Number(e.target.value))}
              aria-label="Věk dítěte"
              className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
          <div>
            <p className="mb-1 text-xs text-slate-500">Co dítě baví?</p>
            <div className="flex flex-wrap gap-1">
              {catalogCategories.map((cat) => {
                const on = child.interests.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleInterest(cat)}
                    className={clsx(
                      'rounded-full border px-2 py-0.5 text-xs',
                      on
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100',
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
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Hotovo, vybrat kroužky
          </button>
        </section>
      )}

      <section aria-label="Tento týden" className="rounded-lg border border-slate-200 bg-white p-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Tento týden</h2>
        {view.summary.activityCount === 0 ? (
          <p className="text-sm text-slate-500">
            Zatím žádný kroužek. Přidejte první z katalogu a hned uvidíte kolize i volné dny.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Kroužky</dt>
              <dd className="font-medium">{view.summary.activityCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Volné všední dny</dt>
              <dd className="font-medium">{view.summary.freeWeekdays.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Náklady</dt>
              <dd className="font-medium">{monthlyTotal} Kč/měs</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Kolize</dt>
              <dd className={clsx('font-medium', conflictCount > 0 ? 'text-red-700' : 'text-emerald-700')}>
                {conflictCount > 0 ? conflictCount : 'žádné'}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section aria-label="Doporučení" className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doporučujeme</h2>
        {recommendations.length > 0 ? (
          <ul className="space-y-1">
            {recommendations.map((rec) => (
              <li key={rec.activity.id}>
                <button
                  type="button"
                  aria-label={`Doporučeno: ${rec.activity.name}`}
                  onClick={() => selectActivity(rec.activity.id)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="text-sm font-medium">{rec.activity.name}</div>
                  <div className="text-xs text-slate-500">{CATEGORY_LABELS[rec.activity.category]}</div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                    {rec.fit.reasons
                      .filter((r) => r.ok)
                      .slice(0, 3)
                      .map((r) => (
                        <span key={r.key} className="text-[11px] text-emerald-700">
                          {r.label}
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenCatalog}
          className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Procházet katalog
        </button>
        <button
          type="button"
          onClick={onOpenGrid}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Zobrazit rozvrh
        </button>
      </div>
    </div>
  );
}
