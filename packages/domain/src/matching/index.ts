import type {
  Activity,
  ActivityCategory,
  Catalog,
  Child,
  NamedSchedule,
  Price,
  SessionGroup,
} from '../model/types.js';
import {
  buildCatalogIndex,
  resolvePlacedSessions,
  type PlacedSession,
} from '../conflicts/resolve.js';

/** Vysvětlitelný důvod skóre — bez procent (FR-4). */
export interface FitReason {
  key: 'age' | 'interest' | 'availability' | 'collision' | 'budget';
  ok: boolean;
  label: string;
}

export interface ActivityFit {
  /** 0..1 = podíl splněných relevantních kritérií. */
  score: number;
  reasons: FitReason[];
}

export interface RecommendationOptions {
  /** Maximální počet vrácených doporučení (default 5). */
  limit?: number;
  /** Kategorie k vyloučení z doporučení. */
  excludeCategories?: ActivityCategory[];
}

export interface Recommendation {
  activity: Activity;
  fit: ActivityFit;
}

const CATEGORY_CS: Record<ActivityCategory, string> = {
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

/** Měsíční náklad z ceny — konzistentní se zobrazením „Kč/měs" v aplikaci. */
function monthlyCzk(price: Price): number {
  if (!Number.isFinite(price.amount)) return Number.NaN;
  switch (price.period) {
    case 'per_month':
      return price.amount;
    case 'per_year':
      return price.amount / 12;
    case 'per_semester':
      return price.amount / 5;
    case 'per_session':
      return price.amount * 4;
    default:
      return price.amount;
  }
}

interface SlotWindow {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
}

/** Session platná k datu `today` (validFrom ≤ today ≤ validTo). */
function activeOn(session: { validFrom: string; validTo: string }, today: string): boolean {
  return session.validFrom <= today && today <= session.validTo;
}

function overlaps(a: SlotWindow, b: PlacedSession): boolean {
  return (
    a.weekday === b.weekday &&
    Math.min(a.endMinutes, b.endMinutes) > Math.max(a.startMinutes, b.startMinutes)
  );
}

function activeSessions(group: SessionGroup, today: string): SlotWindow[] {
  return group.sessions
    .filter((s) => activeOn(s, today))
    .map((s) => ({ weekday: s.weekday, startMinutes: s.startMinutes, endMinutes: s.endMinutes }));
}

/**
 * Deterministický „fit" aktivity pro dítě: kombinuje věk, zájem, dostupnost,
 * bezkolizní zařaditelnost a rozpočet. `today` je vždy parametr (žádné `Date.now`).
 * Nezadané zájmy/dostupnost/rozpočet se chovají neutrálně (kritérium se vynechá).
 */
export function activityFit(
  activity: Activity,
  child: Child,
  schedule: NamedSchedule,
  catalog: Catalog,
  today: string,
): ActivityFit {
  const reasons: FitReason[] = [];

  // Neznámý věk (design_review_88.md) se chová neutrálně — kritérium se vynechá,
  // stejně jako prázdné zájmy/dostupnost/rozpočet.
  if (child.age !== undefined) {
    const ageOk = child.age >= activity.ageMin && child.age <= activity.ageMax;
    reasons.push({
      key: 'age',
      ok: ageOk,
      label: ageOk ? '✓ Vhodné pro věk' : '× Mimo věkový rozsah',
    });
  }

  if (child.interests.length > 0) {
    const interestOk = child.interests.includes(activity.category);
    reasons.push({
      key: 'interest',
      ok: interestOk,
      label: interestOk
        ? `✓ Odpovídá zájmu ${CATEGORY_CS[activity.category]}`
        : '× Mimo zadané zájmy',
    });
  }

  const activeGroups = catalog.sessionGroups
    .filter((g) => g.activityId === activity.id)
    .map((g) => activeSessions(g, today))
    .filter((slots) => slots.length > 0);

  if (child.availability.length > 0) {
    const availabilityOk = activeGroups.some((slots) =>
      slots.every((s) =>
        child.availability.some(
          (w) =>
            w.weekday === s.weekday &&
            s.startMinutes >= w.startMinutes &&
            s.endMinutes <= w.endMinutes,
        ),
      ),
    );
    reasons.push({
      key: 'availability',
      ok: availabilityOk,
      label: availabilityOk ? '✓ Termín ve volném čase' : '× Termín mimo volný čas',
    });
  }

  const placed = resolvePlacedSessions(schedule, buildCatalogIndex(catalog), child.id);
  const collisionOk =
    activeGroups.length === 0
      ? true
      : activeGroups.some((slots) => slots.every((s) => !placed.some((p) => overlaps(s, p))));
  reasons.push({
    key: 'collision',
    ok: collisionOk,
    label: collisionOk ? '✓ Bez kolize' : '× Koliduje s rozvrhem',
  });

  if (child.budgetMonthlyCzk !== undefined) {
    const cost = monthlyCzk(activity.price);
    const budgetOk = !Number.isFinite(cost) || cost <= child.budgetMonthlyCzk;
    reasons.push({
      key: 'budget',
      ok: budgetOk,
      label: budgetOk ? '✓ V rozpočtu' : '× Nad rozpočet',
    });
  }

  const score = reasons.length === 0 ? 0 : reasons.filter((r) => r.ok).length / reasons.length;
  return { score, reasons };
}

/**
 * Seřazený seznam nejlepších aktivit pro dítě dle `activityFit.score`.
 * Vyloučí už zapsané a volitelně vybrané kategorie; stabilní řazení
 * (skóre desc, pak název asc). Deterministické — `today` je parametr.
 */
export function buildRecommendations(
  child: Child,
  catalog: Catalog,
  schedule: NamedSchedule,
  today: string,
  opts: RecommendationOptions = {},
): Recommendation[] {
  const enrolled = new Set(
    schedule.enrollments.filter((e) => e.childId === child.id).map((e) => e.activityId),
  );
  const exclude = new Set(opts.excludeCategories ?? []);
  const limit = opts.limit ?? 5;

  return catalog.activities
    .filter((a) => !enrolled.has(a.id) && !exclude.has(a.category))
    .map((activity) => ({ activity, fit: activityFit(activity, child, schedule, catalog, today) }))
    .sort(
      (a, b) => b.fit.score - a.fit.score || a.activity.name.localeCompare(b.activity.name, 'cs'),
    )
    .slice(0, limit);
}
