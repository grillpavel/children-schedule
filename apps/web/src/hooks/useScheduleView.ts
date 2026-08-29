'use client';

import { useMemo } from 'react';
import {
  buildCatalogIndex,
  colorByCss,
  colorForActivity,
  detectConflicts,
  resolvePlacedSessions,
  scheduleSummary,
  type Conflict,
  type CustomEntryKind,
  type PlacedSession,
  type ScheduleSummary,
} from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';

const CUSTOM_COLOR = { fill: '#475569', text: '#ffffff', name: 'břidlicová', css: 'slategray' };

/** Výchozí barva vlastní události podle typu (FR-4, design_review_58.md) — použije se,
 * jen pokud uživatel nezvolil vlastní přes `colorOverride`. `other` zůstává na původní
 * `CUSTOM_COLOR`, ať se nezmění vzhled již existujících/migrovaných událostí. */
const KIND_DEFAULT_CSS: Partial<Record<CustomEntryKind, string>> = {
  circle: 'steelblue',
  school: 'goldenrod',
  doctor: 'indianred',
};

export interface Block extends PlacedSession {
  fill: string;
  text: string;
  /** Má tvrdý konflikt (H1–H3, H5). */
  hasHardConflict: boolean;
  /** Má měkké upozornění. */
  hasSoftConflict: boolean;
  /** Konkrétní odůvodnění libovolného konfliktu (FR-11, design_review_65.md), pokud existuje. */
  conflictMessage: string | undefined;
  /** Povoleno i o prázdninách/svátcích (design_review_68.md FR-4) — vždy `false` pro `CustomEntry`
   * (ta nemá `ActivityOverride`, viz design_review_68.md §3 Non-goals). */
  allowOnHolidays: boolean;
  /** Časově se překrývá s termínem JINÉHO dítěte (FR-W3-3, design_review_73.md) — lehká
   * heuristika na úrovni aplikace, ne formální `Conflict` z domény (H9 porovnává jen v rámci
   * jednoho dítěte; formální mezidětský `ConflictKind` zůstává otevřený jako BL-041). */
  familyOverlapMessage: string | undefined;
}

/** Termín JINÉHO dítěte pro překryvovou vrstvu mřížky (FR-W3-3). */
export interface FamilyBlock extends PlacedSession {
  childName: string;
  fill: string;
}

export interface ScheduleView {
  scheduleName: string;
  childName: string;
  blocks: Block[];
  /** Termíny ostatních dětí ve STEJNÉM aktivním rozvrhu (FR-W3-3) — prázdné, když je jen 1 dítě. */
  familyBlocks: FamilyBlock[];
  conflicts: Conflict[];
  skippedChecks: { check: string; reason: string }[];
  summary: ScheduleSummary;
}

export function useScheduleView(): ScheduleView {
  const state = usePlannerStore((s) => s.state);
  const catalog = usePlannerStore((s) => s.catalog);
  const activeChildId = usePlannerStore((s) => s.activeChildId);

  return useMemo(() => {
    const schedule = activeSchedule(state);
    const child = state.children.find((c) => c.id === activeChildId);
    const index = buildCatalogIndex(catalog);
    // Beze childId filtru: vrátí termíny VŠECH dětí (FR-W3-3) — filtrujeme dole podle potřeby.
    const allPlaced = resolvePlacedSessions(schedule, index);
    const placed = allPlaced.filter((p) => p.childId === activeChildId);

    const report = detectConflicts({
      schedule,
      catalog,
      children: state.children,
      schoolYear: state.schoolYear,
    });

    const hardByOwner = new Set<string>();
    const softByOwner = new Set<string>();
    const conflictMessageByOwner = new Map<string, string>();
    for (const conflict of report.conflicts) {
      const target = conflict.severity === 'hard' ? hardByOwner : softByOwner;
      for (const id of conflict.enrollmentIds) {
        target.add(id);
        if (!conflictMessageByOwner.has(id)) conflictMessageByOwner.set(id, conflict.message);
      }
    }

    const overrides = new Map(state.overrides.map((o) => [o.activityId, o]));
    const customEntryById = new Map(schedule.customEntries.map((e) => [e.id, e]));
    const childNameById = new Map(state.children.map((c) => [c.id, c.name]));

    const colorOf = (p: PlacedSession) => {
      const override = p.activityId ? overrides.get(p.activityId) : undefined;
      const overrideColor =
        override?.colorCss !== undefined ? colorByCss(override.colorCss) : undefined;
      if (overrideColor) return overrideColor;
      if (p.activityId) return colorForActivity(p.activityId);
      const entry = customEntryById.get(p.ownerId);
      const css = entry?.colorOverride ?? (entry ? KIND_DEFAULT_CSS[entry.kind] : undefined);
      return (css ? colorByCss(css) : undefined) ?? CUSTOM_COLOR;
    };

    const otherPlaced = allPlaced.filter((p) => p.childId !== activeChildId);
    const familyOverlapByOwner = new Map<string, string>();
    for (const p of placed) {
      for (const other of otherPlaced) {
        if (other.weekday !== p.weekday) continue;
        const overlap = Math.min(p.endMinutes, other.endMinutes) - Math.max(p.startMinutes, other.startMinutes);
        if (overlap <= 0) continue;
        if (!familyOverlapByOwner.has(p.ownerId)) {
          const otherName = childNameById.get(other.childId) ?? 'jiné dítě';
          familyOverlapByOwner.set(p.ownerId, `${otherName}: ${other.label} se v tuto dobu také koná.`);
        }
      }
    }

    const blocks: Block[] = placed.map((p) => {
      const override = p.activityId ? overrides.get(p.activityId) : undefined;
      const color = colorOf(p);
      return {
        ...p,
        label: override?.name ?? p.label,
        fill: color.fill,
        text: color.text,
        hasHardConflict: hardByOwner.has(p.ownerId),
        hasSoftConflict: softByOwner.has(p.ownerId),
        conflictMessage: conflictMessageByOwner.get(p.ownerId),
        allowOnHolidays: p.activityId !== undefined && override?.allowOnHolidays === true,
        familyOverlapMessage: familyOverlapByOwner.get(p.ownerId),
      };
    });

    const familyBlocks: FamilyBlock[] = otherPlaced.map((p) => ({
      ...p,
      childName: childNameById.get(p.childId) ?? '',
      fill: colorOf(p).fill,
    }));

    return {
      scheduleName: schedule.name,
      childName: child?.name ?? '',
      blocks,
      familyBlocks,
      conflicts: report.conflicts,
      skippedChecks: report.skippedChecks.map((s) => ({
        check: s.check,
        reason: s.reason,
      })),
      summary: scheduleSummary(schedule, catalog, activeChildId),
    };
  }, [state, catalog, activeChildId]);
}
