'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { current } from 'immer';
import {
  applyDiff as applyDiffToSchedule,
  activitySignature,
  schoolYearHolidays,
  districtSchoolHolidays,
  applySessionOverrides,
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
  type SessionOverride,
  type TravelMode,
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
  /** Zobrazí toast s textem bez zápisu do historie (undo/redo) — pro akce mimo store
   * (např. sekvenční export v Toolbaru, audit after_review_71 §1). */
  announce(label: string): void;

  // ---- přímé uživatelské akce (potvrzené kliknutím) ----
  enrollGroup(activityId: string, sessionGroupId: string): void;
  removeEnrollment(enrollmentId: string): void;
  /** Částečná docházka (design_review_87.md): dítě chodí jen na NĚKTERÉ termíny skupiny
   * (např. skupina má pondělí+středu, dítě jen na pondělí). `sessionIds: undefined`
   * = všechny termíny skupiny (výchozí, zpětně kompatibilní). */
  setEnrollmentSessions(enrollmentId: string, sessionIds: string[] | undefined): void;
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

  /** Přepis času katalogové Session (design_review_69.md) — katalog nemusí odrážet
   * aktuální stav; efektivní hodnota = `override ?? katalog`. Zapisuje se vždy pod
   * aktivní dítě (design_review_96.md, CHANGE-103) — sdílená katalogová položka
   * (např. ZŠ „Výuka") tak může mít pro každé dítě jiný skutečný čas. */
  setSessionOverride(
    sessionId: string,
    patch: Partial<Omit<SessionOverride, 'sessionId' | 'childId'>>,
  ): void;
  clearSessionOverride(sessionId: string): void;

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
  /** `age: undefined` smaže známý věk (design_review_88.md — věk se nikdy nativně
   * nevyplňuje a lze ho i kdykoli zase vymazat). */
  setChildAge(childId: string, age: number | undefined): void;
  /** Nastaví zájmy dítěte (personalizace doporučení, CHANGE-51). */
  setChildInterests(childId: string, interests: ActivityCategory[]): void;
  /** Nastaví dny/okna dostupnosti dítěte (CHANGE-52). */
  setChildAvailability(childId: string, availability: AvailabilityWindow[]): void;
  /** Nastaví měsíční rozpočet dítěte (CHANGE-52); `undefined` = bez limitu. */
  setChildBudget(childId: string, budgetMonthlyCzk: number | undefined): void;
  /** Minimální čas na přesun mezi různými místy (BL-038, design_review_67.md); `undefined` = globální výchozí. */
  setChildTravelBuffer(childId: string, minutes: number | undefined): void;
  /** Dopravní mód pro odhad času na přesun (BL-038); `undefined` = výchozí `'car'`. */
  setChildTravelMode(childId: string, mode: TravelMode | undefined): void;
  /** Přidá nový kalendář (dítě); volitelný `name` — jinak `Kalendář N` (design_review_70.md). */
  addChild(name?: string): void;
  /** Přejmenuje kalendář (design_review_70.md); prázdný/whitespace název je ignorován. */
  renameChild(childId: string, name: string): void;
  /** Odebere kalendář i všechny jeho zápisy/vlastní události ve VŠECH variantách rozvrhu
   * (design_review_70.md); no-op, pokud by zbyl 0 kalendářů. */
  removeChild(childId: string): void;
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
      // Katalog s aplikovanými přepisy časů Sessions (design_review_69.md) — přepočítá se
      // při setSessionOverride/clearSessionOverride i při obnově stavu (loadState/hydrate).
      catalog: applySessionOverrides(NOVE_STRASECI_CATALOG, initialState.sessionOverrides),
      // Výchozí výjimky = státní svátky školního roku (C6-A9) + školní prázdniny okresu Rakovník
      // (design_review_68.md FR-3) → EXDATE v exportu i potlačení v mřížce.
      exceptions: [
        ...schoolYearHolidays(initialState.schoolYear),
        ...districtSchoolHolidays(initialState.schoolYear, initialState.districtCode),
      ],

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

      announce: (label) =>
        set((s) => {
          s.lastActionLabel = label;
          s.lastActionNonce += 1;
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

      setEnrollmentSessions: (enrollmentId, sessionIds) =>
        commit((draft) => {
          const schedule = activeSchedule(draft);
          const enrollment = schedule.enrollments.find((e) => e.id === enrollmentId);
          if (!enrollment) return;
          // Aspoň jeden termín musí zůstat vybraný — prázdný výběr by znamenal
          // zápis bez jediného skutečného termínu.
          if (sessionIds && sessionIds.length === 0) return;
          enrollment.sessionIds = sessionIds;
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
            'allowOnHolidays',
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

      setSessionOverride: (sessionId, patch) => {
        const childId = get().activeChildId;
        commit(
          (draft) => {
            // Přepis je vždy vlastní TOMUTO dítěti (design_review_96.md) — i když
            // pro stejnou session existuje starší GLOBÁLNÍ přepis (bez childId,
            // zpětně kompatibilní), ten zůstává nedotčený a dál platí pro děti bez
            // vlastního přepisu; tenhle zápis vytvoří/aktualizuje jen ten aktivního dítěte.
            let override = draft.sessionOverrides.find(
              (o) => o.sessionId === sessionId && o.childId === childId,
            );
            if (!override) {
              override = { sessionId, childId };
              draft.sessionOverrides.push(override);
            }
            // undefined v patchi ruší dané pole (návrat na katalogový čas).
            for (const [key, value] of Object.entries(patch)) {
              if (value === undefined) {
                delete (override as Record<string, unknown>)[key];
              } else {
                (override as Record<string, unknown>)[key] = value;
              }
            }
            // Prázdný přepis (jen sessionId+childId) se odstraní.
            const hasRealOverride = Object.keys(override).some(
              (k) => k !== 'sessionId' && k !== 'childId',
            );
            if (!hasRealOverride) {
              draft.sessionOverrides = draft.sessionOverrides.filter(
                (o) => !(o.sessionId === sessionId && o.childId === childId),
              );
              return;
            }
            // Kanonické pořadí klíčů (dle schématu) → stabilní round-trip (viz BL-021/CHANGE-73).
            const src = override as Record<string, unknown>;
            const canonical: Record<string, unknown> = { sessionId, childId };
            for (const k of ['weekday', 'startMinutes', 'endMinutes']) {
              if (src[k] !== undefined) canonical[k] = src[k];
            }
            draft.sessionOverrides = draft.sessionOverrides.map((o) =>
              o.sessionId === sessionId && o.childId === childId ? (canonical as typeof o) : o,
            );
          },
          (store) => {
            store.catalog = applySessionOverrides(NOVE_STRASECI_CATALOG, store.state.sessionOverrides);
          },
        );
      },

      clearSessionOverride: (sessionId) => {
        const childId = get().activeChildId;
        commit(
          (draft) => {
            // Zruší přepis aktivního dítěte; jinak (žádný vlastní přepis) zruší
            // starší GLOBÁLNÍ přepis beze childId (zpětná kompatibilita).
            draft.sessionOverrides = draft.sessionOverrides.filter(
              (o) => !(o.sessionId === sessionId && (o.childId === childId || o.childId === undefined)),
            );
          },
          (store) => {
            store.catalog = applySessionOverrides(NOVE_STRASECI_CATALOG, store.state.sessionOverrides);
          },
        );
      },

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

      removeSchedule: (scheduleId) => {
        let label: string | null = null;
        commit(
          (draft) => {
            if (draft.schedules.length <= 1) return; // poslední nelze smazat
            const removed = draft.schedules.find((s) => s.id === scheduleId);
            draft.schedules = draft.schedules.filter((s) => s.id !== scheduleId);
            if (draft.activeScheduleId === scheduleId) {
              draft.activeScheduleId = draft.schedules[0]!.id;
            }
            if (removed) label = `Rozvrh „${removed.name}“ smazán`;
          },
          (store) => {
            if (label) {
              store.lastActionLabel = label;
              store.lastActionNonce += 1;
            }
          },
        );
      },

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
          s.catalog = applySessionOverrides(NOVE_STRASECI_CATALOG, state.sessionOverrides);
          s.activeChildId = state.children[0]?.id ?? s.activeChildId;
          s.selectedActivityId = null;
          s.hoveredGroupId = null;
          s.pendingDiff = null;
        }),

      hydrate: (state) =>
        set((s) => {
          // Autosave obnova: čistý start bez historie, aby undo nesmazal obnovená data.
          s.state = state;
          s.catalog = applySessionOverrides(NOVE_STRASECI_CATALOG, state.sessionOverrides);
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
          if (!child) return;
          if (age === undefined) {
            delete child.age;
            return;
          }
          if (!Number.isFinite(age) || age < 3 || age > 19) return;
          child.age = age;
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

      setChildTravelBuffer: (childId, minutes) =>
        commit((draft) => {
          const child = draft.children.find((c) => c.id === childId);
          if (!child) return;
          if (minutes === undefined) delete child.travelBufferMinutes;
          else child.travelBufferMinutes = minutes;
        }),

      setChildTravelMode: (childId, mode) =>
        commit((draft) => {
          const child = draft.children.find((c) => c.id === childId);
          if (!child) return;
          if (mode === undefined) delete child.travelMode;
          else child.travelMode = mode;
        }),

      // Víc kalendářů = samostatný rozvrh i export na kalendář (C6-C2).
      addChild: (name) => {
        const id = newId('child');
        commit((draft) => {
          const first = draft.children[0];
          draft.children.push({
            id,
            name: name?.trim() || `Kalendář ${draft.children.length + 1}`,
            // Věk se nikdy nativně nevyplňuje (design_review_88.md) — rodič ho zadá sám.
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

      renameChild: (childId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        commit((draft) => {
          const child = draft.children.find((c) => c.id === childId);
          if (child) child.name = trimmed;
        });
      },

      removeChild: (childId) => {
        if (get().state.children.length <= 1) return;
        let label: string | null = null;
        commit(
          (draft) => {
            const removed = draft.children.find((c) => c.id === childId);
            draft.children = draft.children.filter((c) => c.id !== childId);
            for (const schedule of draft.schedules) {
              schedule.enrollments = schedule.enrollments.filter((e) => e.childId !== childId);
              schedule.customEntries = schedule.customEntries.filter((e) => e.childId !== childId);
            }
            if (removed) label = `Kalendář „${removed.name}“ odebrán`;
          },
          (store) => {
            if (store.activeChildId === childId) {
              store.activeChildId = store.state.children[0]?.id ?? store.activeChildId;
            }
            if (label) {
              store.lastActionLabel = label;
              store.lastActionNonce += 1;
            }
          },
        );
      },
    };
  }),
);

export { activeSchedule };
