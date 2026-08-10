'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  colorForActivity,
  type ActivityCategory,
  type Weekday,
} from '@krouzky/domain';
import { usePlannerStore } from '@/store/plannerStore';
import { WEEKDAYS, formatTime } from '@/lib/grid';

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

const PRICE_PERIOD_LABELS: Record<string, string> = {
  per_semester: 'pololetí',
  per_year: 'rok',
  per_month: 'měsíc',
  per_session: 'lekce',
};

export function CatalogPanel({ onOpenCustom }: { onOpenCustom: () => void }) {
  const catalog = usePlannerStore((s) => s.catalog);
  const child = usePlannerStore((s) =>
    s.state.children.find((c) => c.id === s.activeChildId),
  );
  const selectedActivityId = usePlannerStore((s) => s.selectedActivityId);
  const selectActivity = usePlannerStore((s) => s.selectActivity);
  const enrollGroup = usePlannerStore((s) => s.enrollGroup);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ActivityCategory | ''>('');
  const [weekday, setWeekday] = useState<Weekday | ''>('');
  const [ageOnly, setAgeOnly] = useState(false);

  const groupsByActivity = useMemo(() => {
    const map = new Map<string, typeof catalog.sessionGroups>();
    for (const g of catalog.sessionGroups) {
      const list = map.get(g.activityId) ?? [];
      list.push(g);
      map.set(g.activityId, list);
    }
    return map;
  }, [catalog]);

  const providerName = (id: string) =>
    catalog.providers.find((p) => p.id === id)?.name ?? '—';

  const filtered = catalog.activities.filter((a) => {
    if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (category && a.category !== category) return false;
    if (ageOnly && child && (child.age < a.ageMin || child.age > a.ageMax)) {
      return false;
    }
    if (weekday) {
      const groups = groupsByActivity.get(a.id) ?? [];
      const hasDay = groups.some((g) =>
        g.sessions.some((s) => s.weekday === weekday),
      );
      if (!hasDay) return false;
    }
    return true;
  });

  const handleCardClick = (activityId: string) => {
    const groups = groupsByActivity.get(activityId) ?? [];
    if (groups.length === 1) {
      // Jediná varianta → klik rovnou vloží bloky (UI spec §3, fáze 2b).
      enrollGroup(activityId, groups[0]!.id);
      selectActivity(activityId);
    } else {
      selectActivity(selectedActivityId === activityId ? null : activityId);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-slate-100 p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hledat kroužek…"
          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ActivityCategory | '')}
            className="rounded border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="">Všechny kategorie</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={weekday}
            onChange={(e) =>
              setWeekday(e.target.value ? (Number(e.target.value) as Weekday) : '')
            }
            className="rounded border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="">Kterýkoli den</option>
            {WEEKDAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.long}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={ageOnly}
            onChange={(e) => setAgeOnly(e.target.checked)}
          />
          Jen vhodné pro věk {child?.age}
        </label>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">
            {category
              ? `Pro tento filtr nic v katalogu není.`
              : `Vyberte věk dítěte a uvidíte, co je pro něj vhodné.`}
          </p>
        ) : (
          filtered.map((a) => {
            const color = colorForActivity(a.id);
            const groups = groupsByActivity.get(a.id) ?? [];
            const active = selectedActivityId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => handleCardClick(a.id)}
                className={clsx(
                  'w-full rounded-lg border p-2 text-left text-sm transition',
                  active
                    ? 'border-slate-400 bg-slate-50 ring-1 ring-slate-300'
                    : 'border-slate-200 hover:bg-slate-50',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color.fill }}
                    aria-hidden
                  />
                  <span className="font-medium">{a.name}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {providerName(a.providerId)} · {CATEGORY_LABELS[a.category]} ·{' '}
                  {a.ageMin}–{a.ageMax} let
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {Number.isFinite(a.price.amount)
                    ? `${a.price.amount} Kč / ${PRICE_PERIOD_LABELS[a.price.period]}`
                    : 'Cena neuvedena'}{' '}
                  · {groups.length} {groups.length === 1 ? 'termín' : 'variant'}
                </div>
                {active && groups.length > 1 && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    Vyberte termín kliknutím do mřížky:
                    {groups.map((g) => (
                      <span key={g.id} className="ml-1">
                        {g.label ??
                          g.sessions
                            .map((s) => `${WEEKDAYS[s.weekday - 1]?.short} ${formatTime(s.startMinutes)}`)
                            .join(', ')}
                        ;
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onOpenCustom}
          className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          + Vlastní událost
        </button>
      </div>
    </div>
  );
}
