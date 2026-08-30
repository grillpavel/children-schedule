'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  colorForActivity,
  buildRecommendations,
  previewGroupConflict,
  type ActivityCategory,
  type Weekday,
} from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { WEEKDAYS, formatTime } from '@/lib/grid';
import { useIsMobile } from '@/hooks/useBreakpoint';
import {
  IconSearch,
  IconClose,
  IconSparkles,
  IconCheck,
  IconPlus,
  IconSliders,
  IconChevronDown,
} from './Icons';

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
      <mark className="rounded bg-amber-200/80 px-0.5 font-medium text-slate-900">{text.slice(srcStart, srcEnd)}</mark>
      {text.slice(srcEnd)}
    </>
  );
}

/** Skloňování počtu dalších termínů (FR-1, design_review_58.md): žádné strohé "+N" bez vysvětlení. */
function extraTerminText(extra: number): string {
  if (extra === 1) return '1 další termín';
  if (extra >= 2 && extra <= 4) return `${extra} další termíny`;
  return `${extra} dalších termínů`;
}

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  sport: 'Sport',
  athletics: 'Atletika',
  art: 'Výtvarka',
  music: 'Hudba',
  dance: 'Tanec',
  drama: 'Divadlo',
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
  if (category === 'drama') return { root: 'umeni_tvoreni', sub: 'Divadlo' };
  if (category === 'outdoor' || category === 'scouting') return { root: 'priroda_dobrodruzstvi', sub: 'Turistika a skauting' };
  if (category === 'games') return { root: 'hry_mysleni', sub: 'Deskové hry a logika' };
  if (category === 'language') return { root: 'jazyky', sub: 'Jazyky' };
  return { root: 'hry_mysleni', sub: 'Ostatní' };
}

/** Krátké označení období na kartě (skutečná cena, žádný přepočet na měsíc). */
const PRICE_PERIOD_SHORT: Record<string, string> = {
  per_month: 'měs',
  per_semester: 'pol.',
  per_year: 'rok',
  per_session: 'lekce',
};

type SessionSpan = { weekday: Weekday; startMinutes: number; endMinutes: number };

function overlaps(a: SessionSpan, b: SessionSpan): boolean {
  return a.weekday === b.weekday && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function CatalogPanel({ onOpenCustom }: { onOpenCustom: () => void }) {
  const catalog = usePlannerStore((s) => s.catalog);
  const state = usePlannerStore((s) => s.state);
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
  // Filtr podle cílového pohlaví (design_review_88.md, nahrazuje dřívější cenový
  // filtr) — katalog dnes nemá cenový rozsah, který by stálo za to filtrovat, ale
  // několik kroužků (např. "chlapci"/"dívky" v názvu) má čitelně danou skupinu.
  const [genderFilter, setGenderFilter] = useState<'boys' | 'girls' | ''>('');
  const [collapsedRoots, setCollapsedRoots] = useState<Record<string, boolean>>({});
  const [collapsedSubs, setCollapsedSubs] = useState<Record<string, boolean>>({});
  // Doporučení jsou sekundární (hlavní tok je výběr kroužků → kalendář → export),
  // proto defaultně sbalená; uživatel je aktivuje ručně.
  const [recsOpen, setRecsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const collapseStateInitializedRef = useRef(false);

  // Mobil (<768px) prochází kategorie po jedné úrovni (kořen → podkategorie →
  // aktivity) místo „Rozbalit vše" (FR-6, design_review_58.md); tablet/desktop
  // si drží dosavadní akordeon beze změny. Zdroj 768px zlomu je sdílený hook
  // (FR-W1-1, design_review_73.md; BL-051 design_review_84.md).
  const isMobileWidth = useIsMobile();
  const [mobileDrillRoot, setMobileDrillRoot] = useState<string | null>(null);
  const [mobileDrillSub, setMobileDrillSub] = useState<string | null>(null);
  // „Rozbalit vše"/„Sbalit vše" fungují na všech šířkách beze změny (testy na tom
  // stojí) — na mobilu navíc přeskočí z výchozího drill-down na klasický strom.
  const [mobileDrillBypassed, setMobileDrillBypassed] = useState(false);

  // CatalogPanel zůstává trvale připojený (jen skrytý přes CSS na mobilu), takže
  // vyhledávání jinak nikdy neresetuje. Po přidání kroužku z primárního CTA se
  // vyčistí, ať katalog po návratu z jiné záložky neukazuje jen už přidaný
  // kroužek (CHANGE-56).
  const clearCatalogSearchNonce = usePlannerStore((s) => s.clearCatalogSearchNonce);
  useEffect(() => {
    if (clearCatalogSearchNonce > 0) setQuery('');
  }, [clearCatalogSearchNonce]);

  // Nové hledání opustí rozkliknutou kategorii, ať mobilní drill-down nezůstane
  // uvízlý v (možná už prázdné) podkategorii po změně dotazu.
  useEffect(() => {
    setMobileDrillRoot(null);
    setMobileDrillSub(null);
    setMobileDrillBypassed(false);
  }, [query]);

  const hasActiveFilters = Boolean(
    query || category || providerFilter || weekdayFilter.length || ageOnly || fitOnly || startAfter || endBefore || genderFilter,
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
    setGenderFilter('');
  };

  // Doporučení (CHANGE-51): dnešek je vstup enginu, počítá se v app vrstvě.
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const recommendations = useMemo(
    () => (child ? buildRecommendations(child, catalog, schedule, todayIso, { limit: 3 }) : []),
    [child, catalog, schedule, todayIso],
  );
  // Počet plnohodnotných shod (všechny relevantní důvody splněny) pro CTA popisek
  // (BL-040, design_review_67.md) — „Co se hodí [dítě]?" místo obecného názvu sekce.
  const qualifyingRecommendations = useMemo(
    () => recommendations.filter((r) => r.fit.score === 1).length,
    [recommendations],
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

  // 3-stavový náhled kolize na kartě (BL-039, design_review_67.md): pro každou
  // aktivitu vezme NEJLEPŠÍ výsledek napříč jejími skupinami (uživatel si může
  // vybrat kteroukoli) — 🟢 aspoň jedna skupina bez konfliktu, 🟡 nejhorší nalezená
  // je jen soft (kapacita/přesun), 🔴 všechny skupiny mají tvrdý konflikt.
  const conflictPreviewByActivity = useMemo(() => {
    const map = new Map<string, { severity: 'hard' | 'soft' | null; message: string | undefined }>();
    if (!activeChildId) return map;
    const previewInput = { schedule, catalog, children: state.children, schoolYear: state.schoolYear };
    for (const a of catalog.activities) {
      const groups = groupsByActivity.get(a.id) ?? [];
      if (groups.length === 0) continue;
      let best: { severity: 'hard' | 'soft' | null; message: string | undefined } = {
        severity: 'hard',
        message: undefined,
      };
      for (const g of groups) {
        const preview = previewGroupConflict(previewInput, activeChildId, a.id, g.id);
        if (preview.severity === null) {
          best = preview;
          break;
        }
        if (preview.severity === 'soft' && best.severity === 'hard') best = preview;
        else if (best.message === undefined) best.message = preview.message;
      }
      map.set(a.id, best);
    }
    return map;
  }, [catalog, schedule, activeChildId, groupsByActivity, state.children, state.schoolYear]);

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
      .map((s) => `${WEEKDAYS[s.weekday - 1]?.short} ${formatTime(s.startMinutes)}–${formatTime(s.endMinutes)}`);
    const unique = [...new Set(labels)];
    if (unique.length === 0) return 'Termín neuveden';
    if (unique.length === 1) return unique[0]!;
    return `${unique[0]} + ${extraTerminText(unique.length - 1)}`;
  };

  const normalizedQuery = normalizeCz(query.trim());

  const filtered = catalog.activities.filter((a) => {
    const provider = providerName(a.providerId);
    const haystack = normalizeCz(`${a.name} ${provider} ${CATEGORY_LABELS[a.category]}`);
    if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
    if (category && a.category !== category) return false;
    if (providerFilter && a.providerId !== providerFilter) return false;
    if (ageOnly && child && child.age !== undefined && (child.age < a.ageMin || child.age > a.ageMax)) {
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
    if (genderFilter && a.targetGender && a.targetGender !== genderFilter) {
      return false;
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
    const hasSelectedVariant = groups.some((g) => selectedEnrollmentIds.has(`${a.id}::${g.id}`));
    const conflictPreview = conflictPreviewByActivity.get(a.id);
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => handleCardClick(a.id)}
        className={clsx(
          'group relative w-full rounded-xl border p-2.5 text-left text-sm transition-all duration-150',
          active
            ? 'border-blue-500 bg-blue-50/40 shadow-sm ring-1 ring-blue-500'
            : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-2xs',
          isSelected && !active && 'bg-emerald-50/40 border-emerald-200/80',
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-2xs"
            style={{ backgroundColor: color.fill }}
            aria-hidden
          />
          <span className="font-semibold text-slate-900 text-sm leading-tight flex-1">{highlightMatch(a.name, query)}</span>
          {hasSelectedVariant ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-2xs">
              <IconCheck className="h-3 w-3" />
              <span>Přidáno</span>
            </span>
          ) : (
            conflictPreview && conflictPreview.severity !== null && (
              // 🟡/🔴 náhled kolize (BL-039, design_review_67.md) — 🟢 (bez kolize) se
              // nezobrazuje textem, ať karty nejsou přeplněné; jen barevná tečka na kartě.
              <span
                data-testid="conflict-preview-badge"
                title={conflictPreview.message}
                className={clsx(
                  'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-2xs',
                  conflictPreview.severity === 'hard'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800',
                )}
              >
                <span aria-hidden>{conflictPreview.severity === 'hard' ? '🔴' : '🟡'}</span>
                <span>{conflictPreview.severity === 'hard' ? 'Kolize' : 'Napjato'}</span>
              </span>
            )
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="truncate max-w-[140px] text-slate-600 font-medium">{providerName(a.providerId)}</span>
          <span>·</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{CATEGORY_LABELS[a.category]}</span>
          <span>·</span>
          <span className="text-[11px] text-slate-500">{a.ageMin}–{a.ageMax} let</span>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-1.5">
          <span className="font-medium text-slate-700">{sessionLabel(a.id)}</span>
          <div className="text-right">
            {Number.isFinite(a.price.amount) ? (
              <span className="font-semibold text-slate-800">
                {a.price.amount.toLocaleString('cs-CZ')} Kč<span className="font-normal text-slate-500 text-[11px]">/{PRICE_PERIOD_SHORT[a.price.period] ?? a.price.period}</span>
              </span>
            ) : (
              <span className="text-slate-400">Cena neuvedena</span>
            )}
          </div>
        </div>

        {active && groups.length > 1 && (
          <div className="mt-2 rounded-lg bg-blue-100/60 p-2 text-[11px] text-blue-950">
            <span className="font-medium">Termíny k výběru v detailu či rozvrhu:</span>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {groups.map((g) => (
                <span key={g.id} className="rounded bg-white px-1.5 py-0.5 font-medium shadow-2xs">
                  {g.label ??
                    g.sessions
                      .map(
                        (s) =>
                          `${WEEKDAYS[s.weekday - 1]?.short} ${formatTime(s.startMinutes)}–${formatTime(s.endMinutes)}`,
                      )
                      .join(', ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </button>
    );
  };

  /**
   * Mobil (<768px) prochází kategorie po jedné úrovni místo „Rozbalit vše"
   * (FR-6, design_review_58.md): kořen → klik → podkategorie/aktivity → klik.
   */
  const renderMobileCategoryBrowser = () => {
    const root = mobileDrillRoot ? groupedAvailable.find((g) => g.key === mobileDrillRoot) : undefined;
    if (!root) {
      // Nadpis „Další kroužky (N)" i Rozbalit/Sbalit vše už vykresluje obalující
      // <section> o pár řádků výš — tady stačí jen seznam kořenových kategorií,
      // jinak by se nadpis zobrazil dvakrát pod sebou.
      return (
        <div className="space-y-1.5">
          {groupedAvailable.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => setMobileDrillRoot(group.key)}
              className="flex w-full items-center justify-between rounded-lg bg-slate-200/60 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-200 transition"
            >
              <span>{group.label}</span>
              <span className="text-slate-500 font-medium text-xs">({group.items.length})</span>
            </button>
          ))}
        </div>
      );
    }
    const showSubGroups = root.key === 'sport_pohyb' || root.items.length >= 3;
    const sub = mobileDrillSub ? root.subGroups.find((s) => s.subLabel === mobileDrillSub) : undefined;
    if (showSubGroups && !sub) {
      return (
        <>
          <button
            type="button"
            onClick={() => setMobileDrillRoot(null)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            ← Zpět na kategorie
          </button>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {root.label} ({root.items.length})
          </h3>
          <div className="space-y-1.5">
            {root.subGroups.map((s) => (
              <button
                key={s.subLabel}
                type="button"
                onClick={() => setMobileDrillSub(s.subLabel)}
                className="flex w-full items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                <span>{s.subLabel}</span>
                <span className="text-slate-400 font-normal text-xs">({s.subItems.length})</span>
              </button>
            ))}
          </div>
        </>
      );
    }
    const items = showSubGroups && sub ? sub.subItems : root.items;
    const heading = showSubGroups && sub ? sub.subLabel : root.label;
    return (
      <>
        <button
          type="button"
          onClick={() => (showSubGroups && sub ? setMobileDrillSub(null) : setMobileDrillRoot(null))}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
        >
          ← Zpět {showSubGroups && sub ? `na ${root.label}` : 'na kategorie'}
        </button>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {heading} ({items.length})
        </h3>
        <div className="space-y-1.5">{items.map(renderActivityCard)}</div>
      </>
    );
  };

  const handleCardClick = (activityId: string) => {
    selectActivity(selectedActivityId === activityId ? null : activityId);
  };

  return (
    <div className="flex h-full flex-col bg-slate-50/50">
      {/* Vyhledávací panel a filtry */}
      <div className="space-y-2.5 border-b border-slate-200/80 bg-white p-3 shadow-2xs">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat kroužek…"
            data-catalog-search
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-8 py-1.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Vymazat hledání"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ActivityCategory | '')}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <IconSliders className="h-3.5 w-3.5 text-slate-500" />
            <span>Další filtry ▾</span>
          </button>
        </div>

        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

        {/* Filtr dnů */}
        <div className="flex flex-wrap gap-1 pt-0.5">
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
                  'flex h-11 items-center justify-center rounded-lg px-2.5 text-xs font-medium transition desk:h-7 desk:px-2',
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                )}
              >
                {d.short}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 pt-0.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={ageOnly}
              onChange={(e) => setAgeOnly(e.target.checked)}
              disabled={child?.age === undefined}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
            />
            <span>{child?.age !== undefined ? `Jen vhodné pro věk ${child.age}` : 'Jen vhodné pro věk (nezadán)'}</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={fitOnly}
              onChange={(e) => setFitOnly(e.target.checked)}
              disabled={selectedActivityIds.size === 0 && schedule.customEntries.length === 0}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
            />
            <span>Bez konfliktu</span>
          </label>
        </div>

        {showAdvanced && (
          // grid-cols-1 (design_review_88.md): dřív grid-cols-2 s časovými poli
          // (input type="time" má vlastní minimální šířku danou prohlížečem) na
          // úzkém katalogu přetékalo mimo kartu — jeden sloupec vždy sedí.
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 animate-in fade-in-50">
            <label className="text-xs font-medium text-slate-600">
              Začátek nejdřív v
              <input
                type="time"
                value={startAfter}
                onChange={(e) => setStartAfter(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Konec nejpozději v
              <input
                type="time"
                value={endBefore}
                onChange={(e) => setEndBefore(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Pohlaví
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as 'boys' | 'girls' | '')}
                aria-label="Filtr podle pohlaví"
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
              >
                <option value="">Bez omezení</option>
                <option value="boys">Chlapci</option>
                <option value="girls">Dívky</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Seznam kroužků & Doporučení */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {!hasActiveFilters && child && (
          <section
            aria-label="Doporučení"
            className="space-y-3 rounded-2xl border border-blue-200 bg-white p-3 shadow-2xs"
          >
            <button
              type="button"
              onClick={() => setRecsOpen((v) => !v)}
              aria-expanded={recsOpen}
              className="flex w-full items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-900"
            >
              <IconSparkles className="h-4 w-4 text-blue-600" />
              <span>
                {qualifyingRecommendations > 0
                  ? `Co se hodí ${child.name}? (${qualifyingRecommendations})`
                  : `Doporučení na míru`}
              </span>
              <IconChevronDown
                className={clsx('ml-auto h-4 w-4 text-blue-600 transition', recsOpen && 'rotate-180')}
              />
            </button>

            {recsOpen && (
              <>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-600">Co tě baví? (upraví doporučení)</p>
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
                        'rounded-full border px-2.5 py-0.5 text-xs font-medium transition',
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

            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-600">Které dny může?</p>
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
                        'rounded-full border px-2.5 py-0.5 text-xs font-medium transition',
                        on
                          ? 'border-slate-800 bg-slate-800 text-white shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span>Měsíční rozpočet (Kč):</span>
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
                placeholder="Bez limitu"
                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Doporučujeme
              </h3>
              {recommendations.length > 0 ? (
                <ul className="mt-1.5 space-y-1.5">
                  {recommendations.map((rec) => (
                    <li key={rec.activity.id}>
                      <button
                        type="button"
                        aria-label={`Doporučeno: ${rec.activity.name}`}
                        onClick={() => selectActivity(rec.activity.id)}
                        className="w-full rounded-xl border border-slate-200/90 bg-white p-2.5 text-left transition hover:border-blue-400 hover:shadow-xs"
                      >
                        <div className="text-sm font-semibold text-slate-900">{rec.activity.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5" data-testid="rec-category">
                          {CATEGORY_LABELS[rec.activity.category]}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {rec.fit.reasons
                            .filter((r) => r.ok)
                            .slice(0, 3)
                            .map((r) => (
                              <span key={r.key} className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-100">
                                <IconCheck className="h-3 w-3" />
                                <span>{r.label}</span>
                              </span>
                            ))}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Zatím nemáme co doporučit.</p>
              )}
            </div>
              </>
            )}
          </section>
        )}

        {filtered.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">
              {category
                ? `Pro tento filtr nic v katalogu není.`
                : `Vyberte věk dítěte a uvidíte, co je pro něj vhodné.`}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <span>Zrušit filtry</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {inSchedule.length > 0 && (
              <section className="space-y-2">
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 border border-emerald-100 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    V rozvrhu ({inSchedule.length})
                  </h3>
                </div>
                <div className="space-y-1.5">
                  {inSchedule.map(renderActivityCard)}
                </div>
              </section>
            )}

            {available.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between pt-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
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
                        setMobileDrillBypassed(true);
                        setMobileDrillRoot(null);
                        setMobileDrillSub(null);
                        if (listRef.current) listRef.current.scrollTop = 0;
                      }}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs hover:bg-slate-50"
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
                        setMobileDrillBypassed(true);
                        setMobileDrillRoot(null);
                        setMobileDrillSub(null);
                        if (listRef.current) listRef.current.scrollTop = 0;
                      }}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs hover:bg-slate-50"
                    >
                      Sbalit vše
                    </button>
                  </div>
                </div>

                {isMobileWidth && !mobileDrillBypassed && !hasActiveFilters ? (
                  renderMobileCategoryBrowser()
                ) : (
                  <>
                    {groupedAvailable.map((group) => {
                      const rootCollapsed = collapsedRoots[group.key] ?? false;
                      const showSubGroups = group.key === 'sport_pohyb' || group.items.length >= 3;
                      return (
                        <div key={group.key} className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedRoots((prev) => ({
                                ...prev,
                                [group.key]: !rootCollapsed,
                              }))
                            }
                            className="flex w-full items-center justify-between rounded-lg bg-slate-200/60 px-2.5 py-1.5 text-left text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-200 transition"
                          >
                            <span>{rootCollapsed ? '▸' : '▾'} {group.label}</span>
                            <span className="text-slate-600 font-semibold">({group.items.length})</span>
                          </button>
                          {!rootCollapsed && (
                            <div className="space-y-2 pl-1">
                              {showSubGroups
                                ? group.subGroups.map((sub) => {
                                    const subKey = `${group.key}::${sub.subLabel}`;
                                    const subCollapsed = collapsedSubs[subKey] ?? false;
                                    return (
                                      <div key={subKey} className="space-y-1.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setCollapsedSubs((prev) => ({
                                              ...prev,
                                              [subKey]: !subCollapsed,
                                            }))
                                          }
                                          className="flex w-full items-center justify-between rounded-md py-1 px-1 text-left text-xs font-semibold text-slate-600 hover:text-slate-900"
                                        >
                                          <span>{subCollapsed ? '▸' : '▾'} {sub.subLabel}</span>
                                          <span className="text-slate-400 font-normal">({sub.subItems.length})</span>
                                        </button>
                                        {!subCollapsed && (
                                          <div className="space-y-1.5">
                                            {sub.subItems.map(renderActivityCard)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                : (
                                  <div className="space-y-1.5">
                                    {group.items.map(renderActivityCard)}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <div className="border-t border-slate-200/80 bg-white p-3 shadow-2xs">
        <button
          type="button"
          onClick={onOpenCustom}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition"
        >
          <IconPlus className="h-3.5 w-3.5 text-slate-500" />
          <span>Vlastní událost</span>
        </button>
      </div>
    </div>
  );
}
