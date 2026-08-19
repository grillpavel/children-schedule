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
}

export interface ScheduleView {
  scheduleName: string;
  childName: string;
  blocks: Block[];
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
    const placed = resolvePlacedSessions(schedule, index, activeChildId);

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

    const blocks: Block[] = placed.map((p) => {
      const override = p.activityId ? overrides.get(p.activityId) : undefined;
      const overrideColor =
        override?.colorCss !== undefined ? colorByCss(override.colorCss) : undefined;
      let color = overrideColor;
      if (!color) {
        if (p.activityId) {
          color = colorForActivity(p.activityId);
        } else {
          const entry = customEntryById.get(p.ownerId);
          const css = entry?.colorOverride ?? (entry ? KIND_DEFAULT_CSS[entry.kind] : undefined);
          color = (css ? colorByCss(css) : undefined) ?? CUSTOM_COLOR;
        }
      }
      return {
        ...p,
        label: override?.name ?? p.label,
        fill: color.fill,
        text: color.text,
        hasHardConflict: hardByOwner.has(p.ownerId),
        hasSoftConflict: softByOwner.has(p.ownerId),
        conflictMessage: conflictMessageByOwner.get(p.ownerId),
        allowOnHolidays: p.activityId !== undefined && override?.allowOnHolidays === true,
      };
    });

    return {
      scheduleName: schedule.name,
      childName: child?.name ?? '',
      blocks,
      conflicts: report.conflicts,
      skippedChecks: report.skippedChecks.map((s) => ({
        check: s.check,
        reason: s.reason,
      })),
      summary: scheduleSummary(schedule, catalog, activeChildId),
    };
  }, [state, catalog, activeChildId]);
}
