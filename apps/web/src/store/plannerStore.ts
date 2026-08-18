'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { current } from 'immer';
import {
  applyDiff as applyDiffToSchedule,
  activitySignature,
  schoolYearHolidays,
  type ActivityCategory,
  type ActivityOverride,
  type AvailabilityWindow,
  type Catalog,
  type CalendarException,
  type CustomEntry,
  type Diff,
  type Enrollment,
  type NamedSchedule,
  type PlannerState,
  type Weekday,
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

  /** Požadavek souhrnu na přepnutí kalendáře na daný den (C8-B7). */
  focusWeekday: Weekday | null;
  focusNonce: number;

  /** Zvýší se po přidání kroužku z primárního CTA — CatalogPanel na to reaguje
   * vymazáním vyhledávacího pole, ať nezůstává filtrovaný na už přidaný kroužek
   * (CHANGE-56). */
  clearCatalogSearchNonce: number;

  /** Text poslední akce pro toast (CHANGE-61, FR-5, design_review_58.md) — např.
   * "Basketbal přidán do rozvrhu". `lastActionNonce` se zvýší při každé změně,
   * ať se toast zobrazí i při opakování stejného textu. */
  lastActionLabel: string | null;
  lastActionNonce: number;

  history: PlannerState[];
  future: PlannerState[];

  // ---- výběr v UI ----
  selectActivity(activityId: string | null): void;
  selectCustomEntry(entryId: string | null): void;
  setHoveredGroup(groupId: string | null): void;
  setActiveChild(childId: string): void;
  focusDay(weekday: Weekday): void;
  /** Vyžádá vymazání vyhledávacího pole katalogu (CHANGE-56). */
  clearCatalogSearch(): void;

  // ---- přímé uživatelské akce (potvrzené kliknutím) ----
  enrollGroup(activityId: string, sessionGroupId: string): void;
  removeEnrollment(enrollmentId: string): void;
  changeVariant(enrollmentId: string, newGroupId: string): void;
  addCustomEntry(entry: CustomEntry): void;
  addCustomEntries(entries: CustomEntry[]): void;
  updateCustomEntry(entry: CustomEntry): void;
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
  /** Obnovení z autosave — nastaví stav bez zápisu do historie (BL-030). */
  hydrate(state: PlannerState): void;
  setChildAge(childId: string, age: number): void;
  /** Nastaví zájmy dítěte (personalizace doporučení, CHANGE-51). */
  setChildInterests(childId: string, interests: ActivityCategory[]): void;
  /** Nastaví dny/okna dostupnosti dítěte (CHANGE-52). */
  setChildAvailability(childId: string, availability: AvailabilityWindow[]): void;
  /** Nastaví měsíční rozpočet dítěte (CHANGE-52); `undefined` = bez limitu. */
  setChildBudget(childId: string, budgetMonthlyCzk: number | undefined): void;
  addChild(): void;
}

function activeSchedule(state: PlannerState): NamedSchedule {
  const found = state.schedules.find((s) => s.id === state.activeScheduleId);
  // activeScheduleId vždy odkazuje na existující rozvrh (INV-2b).
  return found ?? state.schedules[0]!;
}

export const usePlannerStore = create<PlannerStore>()(
  immer((set, get) => {
    /** Uloží snapshot do historie a nastaví nový stav. Volitelný `after` běží ve stejné
     * transakci a má přístup na celý store (ne jen `draft: PlannerState`) — používá
     * se pro ephemerální pole jako `lastActionLabel` (CHANGE-61). */
    const commit = (
      mutate: (draft: PlannerState) => void,
      after?: (store: PlannerStore) => void,
    ) => {
      set((store) => {
        store.history.push(current(store.state));
        if (store.history.length > HISTORY_LIMIT) store.history.shift();
        store.future = [];
        // Reset na null, ať nezůstane viset stará zpráva u akcí bez vlastního
        // popisku (`after` ji případně přepíše — CHANGE-61).
        store.lastActionLabel = null;
        mutate(store.state);
        after?.(store);
      });
    };

    const initialState = buildNovestraseciState();

    return {
      state: initialState,
      catalog: NOVE_STRASECI_CATALOG,
      // Výchozí výjimky = státní svátky školního roku → EXDATE v exportu (C6-A9).
      exceptions: schoolYearHolidays(initialState.schoolYear),

      activeChildId: 'child-1',
      selectedActivityId: null,
      selectedCustomEntryId: null,
      hoveredGroupId: null,
      pendingDiff: null,

      focusWeekday: null,
      focusNonce: 0,
      clearCatalogSearchNonce: 0,
      lastActionLabel: null,
      lastActionNonce: 0,

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

      focusDay: (weekday) =>
        set((s) => {
          s.focusWeekday = weekday;
          s.focusNonce += 1;
        }),

      clearCatalogSearch: () =>
        set((s) => {
          s.clearCatalogSearchNonce += 1;
        }),

      enrollGroup: (activityId, sessionGroupId) => {
        const childId = get().activeChildId;
        const activityName = NOVE_STRASECI_CATALOG.activities.find((a) => a.id === activityId)?.name ?? 'Kroužek';
        let label = '';
        commit(
          (draft) => {
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
              label = `${activityName} odebrán z rozvrhu`;
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
            label = `${activityName} přidán do rozvrhu`;
          },
          (store) => {
            store.lastActionLabel = label;
            store.lastActionNonce += 1;
          },
        );
      },

      removeEnrollment: (enrollmentId) => {
        let label = 'Kroužek odebrán z rozvrhu';
        commit(
          (draft) => {
            const schedule = activeSchedule(draft);
            const enrollment = schedule.enrollments.find((e) => e.id === enrollmentId);
            const activityName = enrollment
              ? (NOVE_STRASECI_CATALOG.activities.find((a) => a.id === enrollment.activityId)?.name ?? 'Kroužek')
              : 'Kroužek';
            schedule.enrollments = schedule.enrollments.filter(
              (e) => e.id !== enrollmentId,
            );
            label = `${activityName} odebrán z rozvrhu`;
          },
          (store) => {
            store.lastActionLabel = label;
            store.lastActionNonce += 1;
          },
        );
      },

      changeVariant: (enrollmentId, newGroupId) =>
        commit((draft) => {
          const schedule = activeSchedule(draft);
          const enrollment = schedule.enrollments.find(
            (e) => e.id === enrollmentId,
          );
          if (enrollment) enrollment.sessionGroupId = newGroupId;
        }),

      addCustomEntry: (entry) =>
        commit(
          (draft) => {
            activeSchedule(draft).customEntries.push(entry);
          },
          (store) => {
            store.lastActionLabel = `${entry.name} přidán do rozvrhu`;
            store.lastActionNonce += 1;
          },
        ),

      addCustomEntries: (entries) =>
        commit((draft) => {
          activeSchedule(draft).customEntries.push(...entries);
        }),

      updateCustomEntry: (entry) =>
        commit((draft) => {
          const schedule = activeSchedule(draft);
          const i = schedule.customEntries.findIndex((e) => e.id === entry.id);
          if (i !== -1) schedule.customEntries[i] = entry;
        }),

      removeCustomEntry: (entryId) => {
        let label = 'Událost odebrána z rozvrhu';
        commit(
          (draft) => {
            const schedule = activeSchedule(draft);
            const entry = schedule.customEntries.find((e) => e.id === entryId);
            schedule.customEntries = schedule.customEntries.filter(
              (e) => e.id !== entryId,
            );
            label = `${entry?.name ?? 'Událost'} odebrána z rozvrhu`;
          },
          (store) => {
            store.lastActionLabel = label;
            store.lastActionNonce += 1;
          },
        );
      },

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
          // Prázdný přepis (jen metadata) se odstraní.
          const META_KEYS = new Set(['activityId', 'editedAt', 'baseSignature']);
          const hasRealOverride = Object.keys(override).some((k) => !META_KEYS.has(k));
          if (!hasRealOverride) {
            draft.overrides = draft.overrides.filter(
              (o) => o.activityId !== activityId,
            );
            return;
          }
          // Razítko úprav pro detekci změny zdroje (C8-E3).
          const activity = get().catalog.activities.find((a) => a.id === activityId);
          if (activity) {
            override.baseSignature = activitySignature(activity);
            override.editedAt = new Date().toISOString().slice(0, 10);
          }
          // Kanonické pořadí klíčů (dle schématu) → bajtově shodný round-trip (C8-E5, BL-021).
          const src = override as Record<string, unknown>;
          const canonical: Record<string, unknown> = { activityId };
          for (const k of [
            'name',
            'address',
            'contactPhone',
            'price',
            'colorCss',
            'note',
            'editedAt',
            'baseSignature',
          ]) {
            if (src[k] !== undefined) canonical[k] = src[k];
          }
          draft.overrides = draft.overrides.map((o) =>
            o.activityId === activityId ? (canonical as typeof o) : o,
          );
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

      hydrate: (state) =>
        set((s) => {
          // Autosave obnova: čistý start bez historie, aby undo nesmazal obnovená data.
          s.state = state;
          s.activeChildId = state.children[0]?.id ?? s.activeChildId;
          s.selectedActivityId = null;
          s.selectedCustomEntryId = null;
          s.hoveredGroupId = null;
          s.pendingDiff = null;
          s.history = [];
          s.future = [];
        }),

      setChildAge: (childId, age) =>
        commit((draft) => {
          const child = draft.children.find((c) => c.id === childId);
          if (child) child.age = age;
        }),

      setChildInterests: (childId, interests) =>
        commit((draft) => {
          const child = draft.children.find((c) => c.id === childId);
          if (child) child.interests = interests;
        }),

      setChildAvailability: (childId, availability) =>
        commit((draft) => {
          const child = draft.children.find((c) => c.id === childId);
          if (child) child.availability = availability;
        }),

      setChildBudget: (childId, budgetMonthlyCzk) =>
        commit((draft) => {
          const child = draft.children.find((c) => c.id === childId);
          if (!child) return;
          if (budgetMonthlyCzk === undefined) delete child.budgetMonthlyCzk;
          else child.budgetMonthlyCzk = budgetMonthlyCzk;
        }),

      // Víc dětí = samostatný rozvrh i export na dítě (C6-C2).
      addChild: () => {
        const id = newId('child');
        commit((draft) => {
          const first = draft.children[0];
          draft.children.push({
            id,
            name: `Dítě ${draft.children.length + 1}`,
            age: first?.age ?? 9,
            interests: [],
            availability: [],
            schoolEndByWeekday: {},
            ...(first?.schoolAddress ? { schoolAddress: first.schoolAddress } : {}),
          });
        });
        set((s) => {
          s.activeChildId = id;
        });
      },
    };
  }),
);

export { activeSchedule };
