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
  type PlacedSession,
  type ScheduleSummary,
} from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';

const CUSTOM_COLOR = { fill: '#475569', text: '#ffffff', name: 'břidlicová' };

export interface Block extends PlacedSession {
  fill: string;
  text: string;
  /** Má tvrdý konflikt (H1–H3, H5). */
  hasHardConflict: boolean;
  /** Má měkké upozornění. */
  hasSoftConflict: boolean;
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
    for (const conflict of report.conflicts) {
      const target = conflict.severity === 'hard' ? hardByOwner : softByOwner;
      for (const id of conflict.enrollmentIds) target.add(id);
    }

    const overrides = new Map(state.overrides.map((o) => [o.activityId, o]));

    const blocks: Block[] = placed.map((p) => {
      const override = p.activityId ? overrides.get(p.activityId) : undefined;
      const overrideColor =
        override?.colorCss !== undefined ? colorByCss(override.colorCss) : undefined;
      const color =
        overrideColor ??
        (p.activityId ? colorForActivity(p.activityId) : CUSTOM_COLOR);
      return {
        ...p,
        label: override?.name ?? p.label,
        fill: color.fill,
        text: color.text,
        hasHardConflict: hardByOwner.has(p.ownerId),
        hasSoftConflict: softByOwner.has(p.ownerId),
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
