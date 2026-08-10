'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { current } from 'immer';
import {
  applyDiff as applyDiffToSchedule,
  type ActivityOverride,
  type Catalog,
  type CalendarException,
  type CustomEntry,
  type Diff,
  type Enrollment,
  type NamedSchedule,
  type PlannerState,
} from '@krouzky/domain';
import {
  NOVE_STRASECI_CATALOG,
  buildNovestraseciState,
} from '@/lib/novestraseci';
import { newId } from '@/lib/ids';

const HISTORY_LIMIT = 50;

interface PlannerStore {
  state: PlannerState;
  catalog: Catalog;
  exceptions: CalendarException[];

  activeChildId: string;
  selectedActivityId: string | null;
  selectedCustomEntryId: string | null;
  hoveredGroupId: string | null;
  pendingDiff: Diff | null;

  history: PlannerState[];
  future: PlannerState[];

  // ---- výběr v UI ----
  selectActivity(activityId: string | null): void;
  selectCustomEntry(entryId: string | null): void;
  setHoveredGroup(groupId: string | null): void;
  setActiveChild(childId: string): void;

  // ---- přímé uživatelské akce (potvrzené kliknutím) ----
  enrollGroup(activityId: string, sessionGroupId: string): void;
  removeEnrollment(enrollmentId: string): void;
  changeVariant(enrollmentId: string, newGroupId: string): void;
  addCustomEntry(entry: CustomEntry): void;
  addCustomEntries(entries: CustomEntry[]): void;
  removeCustomEntry(entryId: string): void;

  // ---- uživatelské přepisy katalogových aktivit (CHANGE-4) ----
  setActivityOverride(
    activityId: string,
    patch: Partial<Omit<ActivityOverride, 'activityId'>>,
  ): void;
  clearActivityOverride(activityId: string): void;

  // ---- pojmenované varianty rozvrhu ----
  setActiveSchedule(scheduleId: string): void;
  addSchedule(): void;
  duplicateActiveSchedule(): void;
  renameSchedule(scheduleId: string, name: string): void;
  removeSchedule(scheduleId: string): void;

  // ---- diff (chat/solver) ----
  proposeDiff(diff: Diff): void;
  applyDiff(): void;
  discardDiff(): void;

  // ---- historie ----
  undo(): void;
  redo(): void;

  // ---- perzistence do souboru ----
  loadState(state: PlannerState): void;
  setChildAge(childId: string, age: number): void;
}

function activeSchedule(state: PlannerState): NamedSchedule {
  const found = state.schedules.find((s) => s.id === state.activeScheduleId);
  // activeScheduleId vždy odkazuje na existující rozvrh (INV-2b).
  return found ?? state.schedules[0]!;
}

export const usePlannerStore = create<PlannerStore>()(
  immer((set, get) => {
    /** Uloží snapshot do historie a nastaví nový stav. */
    const commit = (mutate: (draft: PlannerState) => void) => {
      set((store) => {
        store.history.push(current(store.state));
        if (store.history.length > HISTORY_LIMIT) store.history.shift();
        store.future = [];
        mutate(store.state);
      });
    };

    return {
      state: buildNovestraseciState(),
      catalog: NOVE_STRASECI_CATALOG,
      exceptions: [],

      activeChildId: 'child-1',
      selectedActivityId: null,
      selectedCustomEntryId: null,
      hoveredGroupId: null,
      pendingDiff: null,

      history: [],
      future: [],

      selectActivity: (activityId) =>
        set((s) => {
          s.selectedActivityId = activityId;
          s.selectedCustomEntryId = null;
          s.hoveredGroupId = null;
        }),

      selectCustomEntry: (entryId) =>
        set((s) => {
          s.selectedCustomEntryId = entryId;
          s.selectedActivityId = null;
          s.hoveredGroupId = null;
        }),

      setHoveredGroup: (groupId) =>
        set((s) => {
          s.hoveredGroupId = groupId;
        }),

      setActiveChild: (childId) =>
        set((s) => {
          s.activeChildId = childId;
        }),

      enrollGroup: (activityId, sessionGroupId) => {
        const childId = get().activeChildId;
        commit((draft) => {
          const schedule = activeSchedule(draft);
          // FR-3 (CHANGE-2): povolen více než jeden termín téže aktivity.
          // Klik na již zapsanou skupinu ji odebere (toggle).
          const existing = schedule.enrollments.find(
            (e) =>
              e.childId === childId &&
              e.activityId === activityId &&
              e.sessionGroupId === sessionGroupId,
          );
          if (existing) {
            schedule.enrollments = schedule.enrollments.filter(
              (e) => e.id !== existing.id,
            );
            return;
          }
          const enrollment: Enrollment = {
            id: newId('enr'),
            childId,
            activityId,
            sessionGroupId,
            status: 'selected',
            pinned: false,
          };
          schedule.enrollments.push(enrollment);
        });
      },

      removeEnrollment: (enrollmentId) =>
        commit((draft) => {
          const schedule = activeSchedule(draft);
          schedule.enrollments = schedule.enrollments.filter(
            (e) => e.id !== enrollmentId,
          );
        }),

      changeVariant: (enrollmentId, newGroupId) =>
        commit((draft) => {
          const schedule = activeSchedule(draft);
          const enrollment = schedule.enrollments.find(
            (e) => e.id === enrollmentId,
          );
          if (enrollment) enrollment.sessionGroupId = newGroupId;
        }),

      addCustomEntry: (entry) =>
        commit((draft) => {
          activeSchedule(draft).customEntries.push(entry);
        }),

      addCustomEntries: (entries) =>
        commit((draft) => {
          activeSchedule(draft).customEntries.push(...entries);
        }),

      removeCustomEntry: (entryId) =>
        commit((draft) => {
          const schedule = activeSchedule(draft);
          schedule.customEntries = schedule.customEntries.filter(
            (e) => e.id !== entryId,
          );
        }),

      setActivityOverride: (activityId, patch) =>
        commit((draft) => {
          let override = draft.overrides.find((o) => o.activityId === activityId);
          if (!override) {
            override = { activityId };
            draft.overrides.push(override);
          }
          // undefined v patchi ruší dané pole (návrat na katalog).
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined) {
              delete (override as Record<string, unknown>)[key];
            } else {
              (override as Record<string, unknown>)[key] = value;
            }
          }
          // Prázdný přepis (jen activityId) se odstraní.
          if (Object.keys(override).length <= 1) {
            draft.overrides = draft.overrides.filter(
              (o) => o.activityId !== activityId,
            );
          }
        }),

      clearActivityOverride: (activityId) =>
        commit((draft) => {
          draft.overrides = draft.overrides.filter(
            (o) => o.activityId !== activityId,
          );
        }),

      setActiveSchedule: (scheduleId) =>
        set((s) => {
          if (s.state.schedules.some((x) => x.id === scheduleId)) {
            s.state.activeScheduleId = scheduleId;
          }
        }),

      addSchedule: () =>
        commit((draft) => {
          const schedule: NamedSchedule = {
            id: newId('sch'),
            name: `Varianta ${draft.schedules.length + 1}`,
            enrollments: [],
            customEntries: [],
            origin: 'manual',
            createdAt: new Date().toISOString(),
          };
          draft.schedules.push(schedule);
          draft.activeScheduleId = schedule.id;
        }),

      duplicateActiveSchedule: () =>
        commit((draft) => {
          const source = activeSchedule(draft);
          const copy: NamedSchedule = {
            ...current(source),
            id: newId('sch'),
            name: `${source.name} (kopie)`,
            origin: 'duplicated',
            createdAt: new Date().toISOString(),
          };
          draft.schedules.push(copy);
          draft.activeScheduleId = copy.id;
        }),

      renameSchedule: (scheduleId, name) =>
        commit((draft) => {
          const schedule = draft.schedules.find((s) => s.id === scheduleId);
          if (schedule) schedule.name = name;
        }),

      removeSchedule: (scheduleId) =>
        commit((draft) => {
          if (draft.schedules.length <= 1) return; // poslední nelze smazat
          draft.schedules = draft.schedules.filter((s) => s.id !== scheduleId);
          if (draft.activeScheduleId === scheduleId) {
            draft.activeScheduleId = draft.schedules[0]!.id;
          }
        }),

      proposeDiff: (diff) =>
        set((s) => {
          s.pendingDiff = diff;
        }),

      applyDiff: () => {
        const diff = get().pendingDiff;
        if (!diff) return;
        commit((draft) => {
          const schedule = activeSchedule(draft);
          const updated = applyDiffToSchedule(schedule, diff);
          const idx = draft.schedules.findIndex((s) => s.id === schedule.id);
          if (idx >= 0) draft.schedules[idx] = updated;
        });
        set((s) => {
          s.pendingDiff = null;
        });
      },

      discardDiff: () =>
        set((s) => {
          s.pendingDiff = null;
        }),

      undo: () =>
        set((s) => {
          const previous = s.history.pop();
          if (!previous) return;
          s.future.push(current(s.state));
          s.state = previous;
        }),

      redo: () =>
        set((s) => {
          const next = s.future.pop();
          if (!next) return;
          s.history.push(current(s.state));
          s.state = next;
        }),

      loadState: (state) =>
        set((s) => {
          s.history.push(current(s.state));
          s.future = [];
          s.state = state;
          s.activeChildId = state.children[0]?.id ?? s.activeChildId;
          s.selectedActivityId = null;
          s.hoveredGroupId = null;
          s.pendingDiff = null;
        }),

      setChildAge: (childId, age) =>
        commit((draft) => {
          const child = draft.children.find((c) => c.id === childId);
          if (child) child.age = age;
        }),
    };
  }),
);

export { activeSchedule };
