'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  colorForActivity,
  buildRecommendations,
  type ActivityCategory,
  type Weekday,
} from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { WEEKDAYS, formatTime } from '@/lib/grid';

function normalizeCz(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function createNormalizedIndexMap(text: string): { normalized: string; map: number[] } {
  const map: number[] = [];
  let normalized = '';
  for (let i = 0; i < text.length; i++) {
    const base = text[i]!.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const ch of base) {
      normalized += ch.toLowerCase();
      map.push(i);
    }
  }
  return { normalized, map };
}

function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const { normalized, map } = createNormalizedIndexMap(text);
  const normalizedQuery = normalizeCz(query);
  if (!normalizedQuery) return text;
  const start = normalized.indexOf(normalizedQuery);
  if (start === -1) return text;
  const end = start + normalizedQuery.length - 1;
  const srcStart = map[start] ?? 0;
  const srcEnd = (map[end] ?? text.length - 1) + 1;
  return (
    <>
      {text.slice(0, srcStart)}
      <mark className="rounded bg-amber-100 px-0.5 text-inherit">{text.slice(srcStart, srcEnd)}</mark>
      {text.slice(srcEnd)}
    </>
  );
}

function pluralizeVariants(count: number): string {
  if (count === 1) return 'termín';
  if (count >= 2 && count <= 4) return 'varianty';
  return 'variant';
}

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

type RootGroupKey =
  | 'sport_pohyb'
  | 'veda_technika'
  | 'umeni_tvoreni'
  | 'hudba_tanec'
  | 'priroda_dobrodruzstvi'
  | 'hry_mysleni'
  | 'jazyky';

interface GroupedActivity {
  root: RootGroupKey;
  sub: string;
}

const ROOT_ORDER: RootGroupKey[] = [
  'sport_pohyb',
  'veda_technika',
  'umeni_tvoreni',
  'hudba_tanec',
  'priroda_dobrodruzstvi',
  'hry_mysleni',
  'jazyky',
];

const ROOT_LABELS: Record<RootGroupKey, string> = {
  sport_pohyb: 'Sport a pohyb',
  veda_technika: 'Věda a technika',
  umeni_tvoreni: 'Umění a tvoření',
  hudba_tanec: 'Hudba a tanec',
  priroda_dobrodruzstvi: 'Příroda a dobrodružství',
  hry_mysleni: 'Hry a myšlení',
  jazyky: 'Jazyky',
};

function classifyActivity(activityName: string, category: ActivityCategory): GroupedActivity {
  const name = normalizeCz(activityName);
  if (category === 'athletics') return { root: 'sport_pohyb', sub: 'Atletika' };
  if (category === 'sport') {
    if (name.includes('gymnast')) return { root: 'sport_pohyb', sub: 'Gymnastika a všestrannost' };
    return { root: 'sport_pohyb', sub: 'Míčové a týmové sporty' };
  }
  if (category === 'martial_arts') return { root: 'sport_pohyb', sub: 'Bojové sporty' };
  if (category === 'science') return { root: 'veda_technika', sub: 'Věda' };
  if (category === 'tech' || category === 'science_tech') return { root: 'veda_technika', sub: 'Technika a programování' };
  if (category === 'art') return { root: 'umeni_tvoreni', sub: 'Výtvarka' };
  if (category === 'crafts') return { root: 'umeni_tvoreni', sub: 'Rukodělky' };
  if (category === 'music') return { root: 'hudba_tanec', sub: 'Hudba' };
  if (category === 'dance') return { root: 'hudba_tanec', sub: 'Tanec' };
  if (category === 'outdoor' || category === 'scouting') return { root: 'priroda_dobrodruzstvi', sub: 'Turistika a skauting' };
  if (category === 'games') return { root: 'hry_mysleni', sub: 'Deskové hry a logika' };
  if (category === 'language') return { root: 'jazyky', sub: 'Jazyky' };
  return { root: 'hry_mysleni', sub: 'Ostatní' };
}

function toMonthlyCzk(amount: number, period: string): number {
  if (!Number.isFinite(amount)) return Number.NaN;
  switch (period) {
    case 'per_month':
      return amount;
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

type SessionSpan = { weekday: Weekday; startMinutes: number; endMinutes: number };

function overlaps(a: SessionSpan, b: SessionSpan): boolean {
  return a.weekday === b.weekday && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function CatalogPanel({ onOpenCustom }: { onOpenCustom: () => void }) {
  const catalog = usePlannerStore((s) => s.catalog);
  const schedule = usePlannerStore((s) => activeSchedule(s.state));
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const child = usePlannerStore((s) =>
    s.state.children.find((c) => c.id === s.activeChildId),
  );
  const selectedActivityId = usePlannerStore((s) => s.selectedActivityId);
  const selectActivity = usePlannerStore((s) => s.selectActivity);
  const setChildInterests = usePlannerStore((s) => s.setChildInterests);
  const setChildAvailability = usePlannerStore((s) => s.setChildAvailability);
  const setChildBudget = usePlannerStore((s) => s.setChildBudget);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ActivityCategory | ''>('');
  const [providerFilter, setProviderFilter] = useState('');
  const [weekdayFilter, setWeekdayFilter] = useState<Weekday[]>([]);
  const [ageOnly, setAgeOnly] = useState(false);
  const [fitOnly, setFitOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [startAfter, setStartAfter] = useState<string>('');
  const [endBefore, setEndBefore] = useState<string>('');
  const [collapsedRoots, setCollapsedRoots] = useState<Record<string, boolean>>({});
  const [collapsedSubs, setCollapsedSubs] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const collapseStateInitializedRef = useRef(false);

  const hasActiveFilters = Boolean(
    query || category || providerFilter || weekdayFilter.length || ageOnly || fitOnly || startAfter || endBefore,
  );
  const resetFilters = () => {
    setQuery('');
    setCategory('');
    setProviderFilter('');
    setWeekdayFilter([]);
    setAgeOnly(false);
    setFitOnly(false);
    setStartAfter('');
    setEndBefore('');
  };

  // Doporučení (CHANGE-51): dnešek je vstup enginu, počítá se v app vrstvě.
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const recommendations = useMemo(
    () => (child ? buildRecommendations(child, catalog, schedule, todayIso, { limit: 4 }) : []),
    [child, catalog, schedule, todayIso],
  );
  const catalogCategories = useMemo(() => {
    const set = new Set<ActivityCategory>();
    for (const a of catalog.activities) set.add(a.category);
    return [...set].sort((x, y) => CATEGORY_LABELS[x].localeCompare(CATEGORY_LABELS[y], 'cs'));
  }, [catalog.activities]);
  const toggleInterest = (cat: ActivityCategory) => {
    if (!child) return;
    const next = child.interests.includes(cat)
      ? child.interests.filter((c) => c !== cat)
      : [...child.interests, cat];
    setChildInterests(child.id, next);
  };
  const availableWeekdays = useMemo(
    () => new Set((child?.availability ?? []).map((w) => w.weekday)),
    [child],
  );
  const toggleAvailableDay = (day: Weekday) => {
    if (!child) return;
    const next = availableWeekdays.has(day)
      ? child.availability.filter((w) => w.weekday !== day)
      : [...child.availability, { weekday: day, startMinutes: 0, endMinutes: 1440 }];
    setChildAvailability(child.id, next);
  };
  useEffect(() => {
    setBudgetInput(child?.budgetMonthlyCzk != null ? String(child.budgetMonthlyCzk) : '');
  }, [child?.id, child?.budgetMonthlyCzk]);
  const commitBudget = () => {
    if (!child) return;
    const n = Number(budgetInput);
    const value = budgetInput.trim() === '' || !Number.isFinite(n) || n <= 0 ? undefined : Math.round(n);
    setChildBudget(child.id, value);
  };

  const selectedEnrollmentIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of schedule.enrollments) {
      if (e.childId === activeChildId) set.add(`${e.activityId}::${e.sessionGroupId}`);
    }
    return set;
  }, [schedule.enrollments, activeChildId]);

  const selectedActivityIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of schedule.enrollments) {
      if (e.childId === activeChildId) set.add(e.activityId);
    }
    return set;
  }, [schedule.enrollments, activeChildId]);

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

  const minutesFromHHMM = (time: string): number | null => {
    if (!time) return null;
    const [h, m] = time.split(':');
    const hh = Number(h);
    const mm = Number(m);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  };

  const timeRange = useMemo(
    () => ({ minStart: minutesFromHHMM(startAfter), maxEnd: minutesFromHHMM(endBefore) }),
    [startAfter, endBefore],
  );

  const occupiedSessions = useMemo(() => {
    const sessions: SessionSpan[] = [];
    for (const e of schedule.enrollments) {
      if (e.childId !== activeChildId) continue;
      const group = catalog.sessionGroups.find((g) => g.id === e.sessionGroupId);
      if (group) {
        sessions.push(
          ...group.sessions.map((s) => ({
            weekday: s.weekday,
            startMinutes: s.startMinutes,
            endMinutes: s.endMinutes,
          })),
        );
      }
    }
    for (const custom of schedule.customEntries) {
      if (custom.childId !== activeChildId) continue;
      sessions.push(
        ...custom.sessions.map((s) => ({
          weekday: s.weekday,
          startMinutes: s.startMinutes,
          endMinutes: s.endMinutes,
        })),
      );
    }
    return sessions;
  }, [schedule, activeChildId, catalog.sessionGroups]);

  const sessionLabel = (activityId: string): string => {
    const labels = (groupsByActivity.get(activityId) ?? [])
      .flatMap((g) => g.sessions)
      .sort(
        (a, b) =>
          a.weekday - b.weekday || a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
      )
      .map((s) => `${WEEKDAYS[s.weekday - 1]?.short} ${formatTime(s.startMinutes)}`);
    const unique = [...new Set(labels)];
    if (unique.length === 0) return 'Termín neuveden';
    if (unique.length === 1) return unique[0]!;
    return `${unique[0]} · +${unique.length - 1}`;
  };

  const normalizedQuery = normalizeCz(query.trim());

  const filtered = catalog.activities.filter((a) => {
    const provider = providerName(a.providerId);
    const haystack = normalizeCz(`${a.name} ${provider} ${CATEGORY_LABELS[a.category]}`);
    if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
    if (category && a.category !== category) return false;
    if (providerFilter && a.providerId !== providerFilter) return false;
    if (ageOnly && child && (child.age < a.ageMin || child.age > a.ageMax)) {
      return false;
    }
    const groups = groupsByActivity.get(a.id) ?? [];
    if (weekdayFilter.length > 0) {
      const hasDay = groups.some((g) =>
        g.sessions.some((s) => weekdayFilter.includes(s.weekday)),
      );
      if (!hasDay) return false;
    }
    if (timeRange.minStart !== null || timeRange.maxEnd !== null) {
      const withinWindow = groups.some((g) =>
        g.sessions.some((s) => {
          if (timeRange.minStart !== null && s.startMinutes < timeRange.minStart) return false;
          if (timeRange.maxEnd !== null && s.endMinutes > timeRange.maxEnd) return false;
          return true;
        }),
      );
      if (!withinWindow) return false;
    }
    if (fitOnly) {
      const canFit = groups.some((g) =>
        g.sessions.every((s) =>
          occupiedSessions.every((existing) => !overlaps(s, existing)),
        ),
      );
      if (!canFit) return false;
    }
    return true;
  });

  const inSchedule = filtered.filter((a) => selectedActivityIds.has(a.id));
  const available = filtered.filter((a) => !selectedActivityIds.has(a.id));

  const groupedAvailable = useMemo(() => {
    const roots = new Map<RootGroupKey, { root: RootGroupKey; items: typeof available; subMap: Map<string, typeof available> }>();
    for (const key of ROOT_ORDER) {
      roots.set(key, { root: key, items: [], subMap: new Map() });
    }
    for (const activity of available) {
      const group = classifyActivity(activity.name, activity.category);
      const bucket = roots.get(group.root)!;
      bucket.items.push(activity);
      const subItems = bucket.subMap.get(group.sub) ?? [];
      subItems.push(activity);
      bucket.subMap.set(group.sub, subItems);
    }
    return ROOT_ORDER
      .map((key) => roots.get(key)!)
      .filter((root) => root.items.length > 0)
      .map((root) => ({
        key: root.root,
        label: ROOT_LABELS[root.root],
        items: root.items,
        subGroups: [...root.subMap.entries()]
          .sort((a, b) => b[1].length - a[1].length)
          .map(([subLabel, subItems]) => ({ subLabel, subItems })),
      }));
  }, [available]);

  useEffect(() => {
    if (collapseStateInitializedRef.current) return;
    if (typeof window === 'undefined' || groupedAvailable.length === 0) return;
    const storedRoots = window.sessionStorage.getItem('catalogCollapsedRoots');
    const storedSubs = window.sessionStorage.getItem('catalogCollapsedSubs');
    if (storedRoots) {
      try {
        setCollapsedRoots(JSON.parse(storedRoots) as Record<string, boolean>);
      } catch {
        // ignore invalid storage
      }
    } else if (groupedAvailable.length > 0) {
      const initial: Record<string, boolean> = {};
      groupedAvailable.forEach((group, index) => {
        initial[group.key] = index >= 2;
      });
      setCollapsedRoots(initial);
    }
    if (storedSubs) {
      try {
        setCollapsedSubs(JSON.parse(storedSubs) as Record<string, boolean>);
      } catch {
        // ignore invalid storage
      }
    }
    collapseStateInitializedRef.current = true;
  }, [groupedAvailable]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('catalogCollapsedRoots', JSON.stringify(collapsedRoots));
  }, [collapsedRoots]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('catalogCollapsedSubs', JSON.stringify(collapsedSubs));
  }, [collapsedSubs]);

  const renderActivityCard = (a: (typeof catalog.activities)[number]) => {
    const color = colorForActivity(a.id);
    const groups = groupsByActivity.get(a.id) ?? [];
    const active = selectedActivityId === a.id;
    const isSelected = selectedActivityIds.has(a.id);
    const monthly = toMonthlyCzk(a.price.amount, a.price.period);
    const hasSelectedVariant = groups.some((g) => selectedEnrollmentIds.has(`${a.id}::${g.id}`));
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => handleCardClick(a.id)}
        className={clsx(
          'w-full rounded-lg border p-2 text-left text-sm transition',
          active
            ? 'border-slate-400 bg-slate-50 ring-1 ring-slate-300'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm',
          isSelected && 'bg-emerald-50/60',
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: color.fill }}
            aria-hidden
          />
          <span className="font-medium">{highlightMatch(a.name, query)}</span>
          {hasSelectedVariant && (
            <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
              Přidáno
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {providerName(a.providerId)} · {CATEGORY_LABELS[a.category]} · {a.ageMin}–{a.ageMax} let
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {sessionLabel(a.id)} ·{' '}
          {Number.isFinite(monthly)
            ? `${Math.round(monthly)} Kč/měs (${a.price.amount} Kč/${PRICE_PERIOD_LABELS[a.price.period]})`
            : 'Cena neuvedena'}{' '}
          · {groups.length} {pluralizeVariants(groups.length)}
        </div>
        {active && groups.length > 1 && (
          <div className="mt-1 text-[11px] text-slate-600">
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
  };

  const handleCardClick = (activityId: string) => {
    // Changes 8 (C8-S3): klik jen otevře čtecí detail, přidání je akce v detailu.
    selectActivity(selectedActivityId === activityId ? null : activityId);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-slate-100 p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hledat kroužek…"
          data-catalog-search
          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ActivityCategory | '')}
            className="rounded border border-slate-200 px-2 py-1 text-sm"
            aria-label="Kategorie kroužku"
          >
            <option value="">Všechny kategorie</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="rounded border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            Další filtry
          </button>
        </div>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
          aria-label="Pořadatel kroužku"
        >
          <option value="">Všichni pořadatelé</option>
          {[...catalog.providers]
            .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS.map((d) => {
            const active = weekdayFilter.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() =>
                  setWeekdayFilter((prev) =>
                    prev.includes(d.value)
                      ? prev.filter((x) => x !== d.value)
                      : [...prev, d.value],
                  )
                }
                className={clsx(
                  'flex h-11 items-center justify-center rounded px-3 text-xs desk:h-auto desk:px-2 desk:py-0.5',
                  active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={ageOnly}
            onChange={(e) => setAgeOnly(e.target.checked)}
          />
          Jen vhodné pro věk {child?.age}
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={fitOnly}
            onChange={(e) => setFitOnly(e.target.checked)}
            disabled={selectedActivityIds.size === 0 && schedule.customEntries.length === 0}
          />
          Bez konfliktu
        </label>
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 bg-slate-50 p-2">
            <label className="text-xs text-slate-600">
              Začátek nejdřív v
              <input
                type="time"
                value={startAfter}
                onChange={(e) => setStartAfter(e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              Konec nejpozději v
              <input
                type="time"
                value={endBefore}
                onChange={(e) => setEndBefore(e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
              />
            </label>
          </div>
        )}
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {!hasActiveFilters && child && (
          <section
            aria-label="Doporučení"
            className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
          >
            <div>
              <p className="mb-1 text-xs text-slate-500">Co tě baví? (upraví doporučení)</p>
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
            <div>
              <p className="mb-1 text-xs text-slate-500">Které dny může?</p>
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((d) => {
                  const on = availableWeekdays.has(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      aria-pressed={on}
                      aria-label={`Volno ${d.short}`}
                      onClick={() => toggleAvailableDay(d.value)}
                      className={clsx(
                        'rounded-full border px-2 py-0.5 text-xs',
                        on
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Měsíční rozpočet (Kč)
              <input
                type="number"
                min={0}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onBlur={commitBudget}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitBudget();
                }}
                aria-label="Měsíční rozpočet v korunách"
                className="w-24 rounded border border-slate-200 px-2 py-0.5 text-sm"
              />
            </label>
            <div>              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Doporučujeme
              </h3>
              {recommendations.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {recommendations.map((rec) => (
                    <li key={rec.activity.id}>
                      <button
                        type="button"
                        aria-label={`Doporučeno: ${rec.activity.name}`}
                        onClick={() => selectActivity(rec.activity.id)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="text-sm font-medium">{rec.activity.name}</div>
                        <div className="text-xs text-slate-500" data-testid="rec-category">
                          {CATEGORY_LABELS[rec.activity.category]}
                        </div>
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
            </div>
          </section>
        )}
        {filtered.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              {category
                ? `Pro tento filtr nic v katalogu není.`
                : `Vyberte věk dítěte a uvidíte, co je pro něj vhodné.`}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
              >
                Zrušit filtry
              </button>
            )}
          </div>
        ) : (
          <>
            {inSchedule.length > 0 && (
              <section className="space-y-2">
                <h3 className="sticky top-0 z-10 rounded bg-white/90 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  V rozvrhu ({inSchedule.length})
                </h3>
                {inSchedule.map(renderActivityCard)}
              </section>
            )}
            {available.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between pt-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Další kroužky ({available.length})
                  </h3>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const nextRoots: Record<string, boolean> = {};
                        const nextSubs: Record<string, boolean> = {};
                        groupedAvailable.forEach((group) => {
                          nextRoots[group.key] = false;
                          group.subGroups.forEach((sub) => {
                            nextSubs[`${group.key}::${sub.subLabel}`] = false;
                          });
                        });
                        setCollapsedRoots(nextRoots);
                        setCollapsedSubs(nextSubs);
                        if (listRef.current) listRef.current.scrollTop = 0;
                      }}
                      className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50"
                    >
                      Rozbalit vše
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextRoots: Record<string, boolean> = {};
                        const nextSubs: Record<string, boolean> = {};
                        groupedAvailable.forEach((group) => {
                          nextRoots[group.key] = true;
                          group.subGroups.forEach((sub) => {
                            nextSubs[`${group.key}::${sub.subLabel}`] = true;
                          });
                        });
                        setCollapsedRoots(nextRoots);
                        setCollapsedSubs(nextSubs);
                        if (listRef.current) listRef.current.scrollTop = 0;
                      }}
                      className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50"
                    >
                      Sbalit vše
                    </button>
                  </div>
                </div>
                {groupedAvailable.map((group) => {
                  const rootCollapsed = collapsedRoots[group.key] ?? false;
                  const showSubGroups = group.key === 'sport_pohyb' || group.items.length >= 3;
                  return (
                    <div key={group.key} className="space-y-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedRoots((prev) => ({
                            ...prev,
                            [group.key]: !rootCollapsed,
                          }))
                        }
                        className="flex w-full items-center justify-between rounded bg-white py-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                      >
                        <span>{rootCollapsed ? '▸' : '▾'} {group.label}</span>
                        <span className="text-slate-600">({group.items.length})</span>
                      </button>
                      {!rootCollapsed && (
                        <div className="space-y-2 pl-1">
                          {showSubGroups
                            ? group.subGroups.map((sub) => {
                                const subKey = `${group.key}::${sub.subLabel}`;
                                const subCollapsed = collapsedSubs[subKey] ?? false;
                                return (
                                  <div key={subKey} className="space-y-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCollapsedSubs((prev) => ({
                                          ...prev,
                                          [subKey]: !subCollapsed,
                                        }))
                                      }
                                      className="flex w-full items-center justify-between rounded py-0.5 text-left text-xs font-medium text-slate-500"
                                    >
                                      <span>{subCollapsed ? '▸' : '▾'} {sub.subLabel}</span>
                                      <span className="text-slate-600">({sub.subItems.length})</span>
                                    </button>
                                    {!subCollapsed && sub.subItems.map(renderActivityCard)}
                                  </div>
                                );
                              })
                            : group.items.map(renderActivityCard)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </>
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
