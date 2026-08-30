'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { serializePlannerState } from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { loadAutosave, saveAutosave } from '@/lib/autosave';
import { decodeShareHash } from '@/lib/shareLink';
import { Toolbar } from '@/components/Toolbar';
import { VariantTabs } from '@/components/VariantTabs';
import { HomeScreen } from '@/components/HomeScreen';
import { CatalogPanel } from '@/components/CatalogPanel';
import { DetailsPanel } from '@/components/DetailsPanel';
import { CustomEntryDialog } from '@/components/CustomEntryDialog';
import { IconHome, IconFolderOpen, IconCalendar, IconUser, IconClose, IconMaximize, IconMinimize, IconPlus } from '@/components/Icons';
import { useIsMobile, useIsWide, useIsLandscapeCompact } from '@/hooks/useBreakpoint';

// Mřížka odvozuje zobrazený týden z aktuálního data. Kdyby ji Next vykreslil na
// serveru, hydratace by narazila na jiný „dnešek" na klientu (CHANGE-34). Proto
// jen na klientu.
const ScheduleGrid = dynamic(
  () => import('@/components/ScheduleGrid').then((m) => m.ScheduleGrid),
  { ssr: false },
);

type MobileTab = 'home' | 'catalog' | 'grid' | 'details';

/** Skutečná správa kalendářů (dětí) pro mobilní záložku „Děti" (FR-13,
 * design_review_65.md; přejmenování/přidání/odebrání design_review_70.md) —
 * dřív tato záložka jen mountovala `DetailsPanel` (souhrn/detail), přepínač,
 * věk a přidání žily jen v Toolbaru (skryté na mobilu od FR-12). */
function MobileChildrenPanel() {
  const state = usePlannerStore((s) => s.state);
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const setActiveChild = usePlannerStore((s) => s.setActiveChild);
  const addChild = usePlannerStore((s) => s.addChild);
  const removeChild = usePlannerStore((s) => s.removeChild);
  const setChildAge = usePlannerStore((s) => s.setChildAge);
  const setChildTravelBuffer = usePlannerStore((s) => s.setChildTravelBuffer);
  const setChildTravelMode = usePlannerStore((s) => s.setChildTravelMode);
  const [addingCalendar, setAddingCalendar] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const child = state.children.find((c) => c.id === activeChildId);
  if (!child) return null;

  return (
    <section aria-label="Děti" className="shrink-0 space-y-2.5 border-b border-slate-200/80 bg-white p-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Kalendáře</h2>
      <div className="flex flex-wrap items-center gap-2">
        {state.children.map((c) => (
          <span
            key={c.id}
            className={clsx(
              'flex h-11 items-center gap-1 rounded-full border pl-3 pr-1 text-xs font-semibold transition',
              c.id === activeChildId
                ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700',
            )}
          >
            <button type="button" onClick={() => setActiveChild(c.id)} aria-pressed={c.id === activeChildId}>
              {c.name}
            </button>
            {state.children.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Opravdu odebrat kalendář „${c.name}“ a všechny jeho zápisy z rozvrhu?`)) {
                    removeChild(c.id);
                  }
                }}
                aria-label={`Odebrat kalendář ${c.name}`}
                className={clsx(
                  'flex h-11 w-11 items-center justify-center rounded-full transition',
                  c.id === activeChildId ? 'hover:bg-blue-700' : 'hover:bg-slate-100',
                )}
              >
                ✕
              </button>
            )}
          </span>
        ))}
        {addingCalendar ? (
          <form
            className="flex h-11 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              addChild(newCalName);
              setNewCalName('');
              setAddingCalendar(false);
            }}
          >
            <input
              autoFocus
              value={newCalName}
              onChange={(e) => setNewCalName(e.target.value)}
              placeholder="Název nového kalendáře"
              aria-label="Název nového kalendáře"
              className="h-11 w-36 rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="flex h-11 items-center rounded-full border border-blue-600 bg-blue-600 px-3 text-xs font-medium text-white shadow-2xs hover:bg-blue-700"
            >
              Přidat
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingCalendar(false);
                setNewCalName('');
              }}
              aria-label="Zrušit přidání kalendáře"
              className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAddingCalendar(true)}
            className="flex h-11 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
            title="Přidat další kalendář (samostatný rozvrh a export)"
          >
            <IconPlus className="h-3 w-3" />
            <span>Přidat kalendář</span>
          </button>
        )}
      </div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <span>Věk ({child.name}):</span>
        <input
          key={child.id}
          type="number"
          min={3}
          max={19}
          defaultValue={child.age}
          placeholder="—"
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (raw === '') {
              setChildAge(child.id, undefined);
              return;
            }
            const n = Number(raw);
            if (Number.isFinite(n) && n >= 3 && n <= 19) setChildAge(child.id, n);
            else e.target.value = child.age !== undefined ? String(child.age) : '';
          }}
          aria-label="Věk dítěte"
          className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-900 text-xs shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-slate-400 font-normal">let</span>
      </label>
      {/* Přesun mezi kroužky (BL-038, design_review_67.md) — H9 detekce z toho čte
          per-dítě rezervu/mód místo globálního výchozího nastavení. */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700">
        <span>Čas na přesun:</span>
        <select
          value={child.travelBufferMinutes ?? ''}
          onChange={(e) =>
            setChildTravelBuffer(child.id, e.target.value === '' ? undefined : Number(e.target.value))
          }
          aria-label="Minimální čas na přesun"
          className="h-11 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">výchozí (10 min)</option>
          {[0, 5, 10, 15, 20, 30].map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </select>
        <select
          value={child.travelMode ?? ''}
          onChange={(e) =>
            setChildTravelMode(child.id, (e.target.value || undefined) as typeof child.travelMode)
          }
          aria-label="Způsob přesunu"
          className="h-11 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">výchozí (auto)</option>
          <option value="walk">pěšky</option>
          <option value="car">auto</option>
          <option value="transit">MHD</option>
        </select>
      </div>
    </section>
  );
}

export default function Page() {
  const state = usePlannerStore((s) => s.state);
  const catalog = usePlannerStore((s) => s.catalog);
  const historyLength = usePlannerStore((s) => s.history.length);
  const lastActionLabel = usePlannerStore((s) => s.lastActionLabel);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);
  const hydrate = usePlannerStore((s) => s.hydrate);
  const selectedActivityId = usePlannerStore((s) => s.selectedActivityId);
  const selectedCustomEntryId = usePlannerStore((s) => s.selectedCustomEntryId);
  const selectActivity = usePlannerStore((s) => s.selectActivity);
  const selectCustomEntry = usePlannerStore((s) => s.selectCustomEntry);
  const stateSignature = serializePlannerState(state);
  const hasScheduleContent = usePlannerStore((s) => {
    const schedule = activeSchedule(s.state);
    return schedule.enrollments.length > 0 || schedule.customEntries.length > 0;
  });

  const [customOpen, setCustomOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const [savedSignature, setSavedSignature] = useState(stateSignature);
  const [showChangeToast, setShowChangeToast] = useState(false);
  const [autosaveOk, setAutosaveOk] = useState(true);
  // Jediný zdroj 768px/1180px zlomu (FR-W1-1, design_review_73.md; BL-051 design_review_84.md).
  const isMobile = useIsMobile();
  const isWide = useIsWide();
  // Mobil na šířku s málo výškou dostane boční rail místo spodní navigace
  // (FR-W2-1, design_review_73.md).
  const isLandscapeCompact = useIsLandscapeCompact();
  // M1 (design_review_86.md): `isLandscapeCompact` je nezávislý na šířce, `isMobile`
  // nezávislý na výšce — široký telefon na šířku (932×430) tak dostal rail, o který
  // se ale žádný panel níže nestaral (všechny byly gated jen na `isMobile`). Jeden
  // společný přepínač pro VŠECHNY jednopanelové/tabové větve layoutu.
  const isMobileLayout = isMobile || isLandscapeCompact;
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [mediumInfoOpen, setMediumInfoOpen] = useState(false);
  // Tabletové/střední šířky (design_review_88.md) mají DRUHý sheet — „Domů“
  // (HomeScreen) vedle „Děti“ (dřív „Souhrn“, nyní vedle DetailsPanel i skutečná
  // správa dětí jako na mobilu). Výběr aktivity/události (`hasSelection`) má vždy
  // přednost před „Domů“ obsahem, ať se po kliknutí na kroužek ukáže jeho detail.
  const [mediumHomeOpen, setMediumHomeOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const previousHistoryRef = useRef(historyLength);
  const isDirty = stateSignature !== savedSignature;
  const hasSelection = selectedActivityId !== null || selectedCustomEntryId !== null;

  // Klávesové zkratky undo/redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Klávesová zkratka „/" (FR-W3-8, design_review_73.md): skok do hledání v
  // katalogu, běžná konvence (GitHub, Slack…). Ignoruje se, když uživatel
  // právě píše do pole, ať nekolidují lomítka v adrese/textu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      e.preventDefault();
      if (isMobileLayout) setMobileTab('catalog');
      requestAnimationFrame(() => {
        document.querySelector<HTMLInputElement>('[data-catalog-search]')?.focus();
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileLayout]);

  // Escape zavře vybraný detail / mobilní sheet / medium sheety (C9-A4).
  useEffect(() => {
    if (!hasSelection && !mediumInfoOpen && !mediumHomeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      selectActivity(null);
      selectCustomEntry(null);
      setMediumInfoOpen(false);
      setMediumHomeOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasSelection, mediumInfoOpen, mediumHomeOpen, selectActivity, selectCustomEntry]);

  // Autosave (BL-030): obnova po připojení + uložení při každé změně stavu.
  // Subscribe místo efektu nad `state`, aby výchozí mount-render nepřepsal obnovu.
  // Sdílený odkaz (FR-W3-4, design_review_73.md) má přednost před autosave — otevření
  // odkazu je explicitní uživatelská akce (poslal ho někdo jiný), fragment se po
  // zpracování odstraní z URL, ať se stejný stav nenačetl znovu při refreshi/zpět.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const shareResult = await decodeShareHash(window.location.hash);
      if (cancelled) return;
      if (shareResult) {
        const clearHash = () =>
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        if (!shareResult.ok) {
          alert(`Sdílený odkaz nelze načíst: ${shareResult.error}`);
          clearHash();
        } else if (
          window.confirm('Otevřít sdílený rozvrh? Nahradí aktuální neuložený stav v tomto prohlížeči.')
        ) {
          hydrate(shareResult.state);
          setSavedSignature(serializePlannerState(shareResult.state));
          clearHash();
          return;
        } else {
          clearHash();
        }
      }
      const restored = loadAutosave();
      if (restored) {
        hydrate(restored);
        setSavedSignature(serializePlannerState(restored));
      }
    })();
    const unsubscribe = usePlannerStore.subscribe((s) => setAutosaveOk(saveAutosave(s.state)));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hydrate]);

  const markSaved = (signature?: string) => {
    setSavedSignature(signature ?? stateSignature);
  };

  // Zavře mobilní spodní sheet (CHANGE-55, C-mobile-sheet-close): po úspěšném
  // přidání i přes tlačítko „Zavřít“, aby nezakrýval spodní navigaci natrvalo.
  const closeMobileSheet = () => {
    selectActivity(null);
    selectCustomEntry(null);
    setSheetExpanded(false);
  };

  useEffect(() => {
    if (historyLength <= previousHistoryRef.current) {
      previousHistoryRef.current = historyLength;
      return;
    }
    previousHistoryRef.current = historyLength;
    setShowChangeToast(true);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setShowChangeToast(false);
      toastTimerRef.current = null;
    }, 4000);
  }, [historyLength]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={clsx(
        'flex h-dvh flex-col bg-slate-100/50 print-shell',
        // Obsah se posune vpravo od bočního railu (FR-W2-1) — `fixed` prvky
        // (rail/toast/sheet) toto odsazení nedědí, řeší se zvlášť.
        isLandscapeCompact && 'pl-14',
      )}
    >
      <Toolbar gridRef={gridRef} isDirty={isDirty} autosaveOk={autosaveOk} onMarkSaved={markSaved} />
      {/* Varianty rozvrhu jsou pokročilá funkce — v jednopanelovém layoutu skryté (C11 UX,
          M1 design_review_86.md: `desk:block` samo o sobě neví o `isLandscapeCompact`). */}
      {!isMobileLayout && (
        <div className="hidden desk:block">
          <VariantTabs />
        </div>
      )}

      {/* Desktop: tři sloupce. Mobil: jeden panel podle spodní navigace. */}
      <main className="print-shell relative flex flex-1 overflow-hidden">
        {/* Domů (týden-first) je jen jednopanelová záložka; desktop má tři sloupce.
            M1 (design_review_86.md): gated na `isMobileLayout`, ne jen `isMobile` — jinak
            se na širokém telefonu na šířku nevykreslí vůbec nic pod tímto tlačítkem. */}
        {isMobileLayout && mobileTab === 'home' && (
          <section className="w-full overflow-hidden">
            <HomeScreen
              onOpenCatalog={() => setMobileTab('catalog')}
              onOpenGrid={() => setMobileTab('grid')}
            />
          </section>
        )}
        <aside
          className={clsx(
            'no-print shrink-0 overflow-hidden border-r border-slate-200/80 bg-white shadow-2xs',
            isMobileLayout ? (mobileTab === 'catalog' ? 'block w-full' : 'hidden') : 'block w-80',
          )}
        >
          <CatalogPanel onOpenCustom={() => setCustomOpen(true)} />
        </aside>

        <section
          className={clsx(
            'print-section flex-1 overflow-hidden p-2',
            isMobileLayout ? (mobileTab === 'grid' ? 'block' : 'hidden') : 'block',
          )}
        >
          <ScheduleGrid
            gridRef={gridRef}
            onAddFirstActivity={() => {
              setMobileTab('catalog');
              const first = catalog.activities[0];
              if (first) selectActivity(first.id);
              requestAnimationFrame(() => {
                document
                  .querySelector<HTMLInputElement>('[data-catalog-search]')
                  ?.focus();
              });
            }}
          />
        </section>

        {/* Info je stálý sloupec jen na širokém desktopu (≥1440, C9-L1);
            v jednopanelovém layoutu je to záložka a jinak slide-over níže. */}
        <aside
          className={clsx(
            'no-print overflow-hidden border-l border-slate-200/80 bg-white shadow-2xs',
            isWide
              ? clsx('block shrink-0', hasScheduleContent ? 'w-80' : 'w-64')
              : isMobileLayout
                ? mobileTab === 'details'
                  ? 'block w-full'
                  : 'hidden'
                : 'hidden',
          )}
        >
          {/* Mount jen v aktivním slotu, ať je DetailsPanel v DOM právě jednou (C12).
              Jednopanelová záložka „Děti" navíc nese skutečnou správu dětí nad detailem
              (FR-13, design_review_65.md) — dřív tu byl jen duplicitní souhrn. */}
          {isWide && <DetailsPanel />}
          {isMobileLayout && mobileTab === 'details' && (
            <div className="flex h-full flex-col">
              <MobileChildrenPanel />
              <div className="min-h-0 flex-1">
                <DetailsPanel />
              </div>
            </div>
          )}
        </aside>

        {/* Info na středních šířkách 900–1440 (FR-7, design_review_58.md): trvalý
            sloupec vedle katalogu a mřížky (master-detail), ne overlay přes obsah —
            otevře výběr, „Domů", nebo „Děti". Test id `info-drawer` beze změny.
            Výběr aktivity/události má vždy přednost před „Domů" obsahem (design_review_88.md). */}
        {!isMobileLayout && !isWide && (hasSelection || mediumInfoOpen || mediumHomeOpen) && (
          <div
            data-testid="info-drawer"
            className="no-print shrink-0 flex w-96 max-w-[90vw] flex-col border-l border-slate-200 bg-white shadow-2xs animate-in slide-in-from-right"
          >
            <div className="flex shrink-0 justify-end border-b border-slate-200 p-1.5">
              <button
                type="button"
                onClick={() => {
                  selectActivity(null);
                  selectCustomEntry(null);
                  setMediumInfoOpen(false);
                  setMediumHomeOpen(false);
                }}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                aria-label="Zavřít detail"
              >
                Zavřít
              </button>
            </div>
            {mediumHomeOpen && !hasSelection ? (
              <div className="min-h-0 flex-1">
                <HomeScreen
                  onOpenCatalog={() => setMediumHomeOpen(false)}
                  onOpenGrid={() => setMediumHomeOpen(false)}
                />
              </div>
            ) : (
              <aside className="flex flex-1 flex-col overflow-hidden" aria-label="Děti a detail kroužku">
                <MobileChildrenPanel />
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <DetailsPanel />
                </div>
              </aside>
            )}
          </div>
        )}
      </main>

      {/* Mobilní navigace: spodní lišta na výšku, boční rail na šířku s málo
          výškou (FR-W2-1, design_review_73.md) — mřížka tam potřebuje co nejvíc
          svislého prostoru, spodní lišta by ho zabrala nejvíc. `desk:hidden`
          platí jen MIMO landscape-compact — širší telefony na šířku (768px+)
          by jinak neměly žádnou navigaci, i když landscape-compact (nízká výška)
          požaduje rail bez ohledu na šířku. */}
      <nav
        aria-label="Hlavní navigace"
        className={clsx(
          'no-print bg-white/95 backdrop-blur shadow-lg',
          !isLandscapeCompact && 'desk:hidden',
          isLandscapeCompact
            ? 'fixed inset-y-0 left-0 z-30 flex w-14 flex-col justify-center gap-1 border-r border-slate-200/90 pl-[env(safe-area-inset-left,0px)]'
            : 'flex border-t border-slate-200/90 pb-[env(safe-area-inset-bottom,0px)]',
        )}
      >
        {(
          [
            ['home', 'Domů', IconHome],
            ['catalog', 'Katalog', IconFolderOpen],
            ['grid', 'Rozvrh', IconCalendar],
            ['details', 'Děti', IconUser],
          ] as const
        ).map(([tab, label, Icon]) => {
          const active = mobileTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 text-[11px] transition',
                isLandscapeCompact ? 'w-full flex-1' : 'h-12 flex-1',
                active ? 'font-bold text-blue-600' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <Icon className={clsx('h-4 w-4 transition', active ? 'text-blue-600 scale-110' : 'text-slate-400')} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Info slide-over pro střední šířky 900–1440 (C9-L1): Info není stálý
          sloupec, otevře se přes obsah při výběru nebo tlačítky „Domů"/„Děti"
          (design_review_88.md — dřív jen jedno tlačítko „Souhrn", tablet neměl
          žádný přístup k domovské obrazovce ani ke správě dětí). */}
      {!isMobileLayout && !isWide && !(hasSelection || mediumInfoOpen || mediumHomeOpen) && (
        <div className="no-print fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col overflow-hidden rounded-l-xl shadow-xl">
          <button
            type="button"
            onClick={() => setMediumHomeOpen(true)}
            className="border-b border-slate-700 bg-slate-900 px-2 py-4 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            Domů
          </button>
          <button
            type="button"
            onClick={() => setMediumInfoOpen(true)}
            className="bg-slate-900 px-2 py-4 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            Děti
          </button>
        </div>
      )}

      {/* Mobilní spodní sheet detailu (C8-F7): při výběru nad mřížkou. Odsazení
          zdola počítá s home indikátorem, aby sheet nezmizel pod nav (CHANGE-55).
          `bottom-12 mb-[env(...)]` (ne přepočtený `bottom`), ať zůstane stabilní
          CSS selektor `.fixed.inset-x-0.bottom-12` používaný napříč testy. V
          landscape-compact (FR-W2-1) není spodní nav, sheet jde až k okraji. */}
      {isMobileLayout && hasSelection && mobileTab !== 'details' && (
        <div
          className={clsx(
            'no-print fixed inset-x-0 mb-[env(safe-area-inset-bottom,0px)] z-40',
            isLandscapeCompact ? 'bottom-0' : 'bottom-12',
          )}
        >
          <div
            className={clsx(
              'glass flex flex-col rounded-t-2xl border border-slate-200/90 shadow-2xl transition-[height] motion-safe:duration-200',
              // M7 (design_review_86.md): `vh` je na mobilním Safari počítané k největšímu
              // viewportu (bez adresního řádku) — rozbalený sheet pak přeteče nahoře přes
              // hranu. `dvh` sleduje SKUTEČNOU dostupnou výšku, stejně jako kořen v `h-dvh`.
              sheetExpanded ? 'h-[70dvh]' : 'h-60',
            )}
          >
            <div className="flex items-center justify-between px-3">
              <button
                type="button"
                onClick={closeMobileSheet}
                className="flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-700"
                aria-label="Zavřít detail"
              >
                <IconClose className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSheetExpanded((v) => !v)}
                className="flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-700"
                aria-label={sheetExpanded ? 'Zmenšit detail' : 'Zvětšit detail'}
              >
                {sheetExpanded ? <IconMinimize className="h-4 w-4" /> : <IconMaximize className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              <DetailsPanel onEnrolled={closeMobileSheet} />
            </div>
          </div>
        </div>
      )}

      {/* Spodní navigace (nav, `desk:hidden`) rezervuje safe-area-inset-bottom navíc
          k vlastní výšce — toast proto na mobilu počítá stejný odstup, ne pevných
          64px, aby na zaříznutých iPhonech neschovala pod navigaci (FR-W1-4,
          design_review_73.md). Na desktopu (`desk:`) žádná spodní nav není.
          V landscape-compact (FR-W2-1) je nav bočním railem, ne spodní lištou —
          toast pak počítá jen se safe-area, ne s výškou navigace navíc. */}
      {showChangeToast && (
        <div
          className={clsx(
            'no-print pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 desk:bottom-16',
            isLandscapeCompact ? 'bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))]' : 'bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]',
          )}
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-xl motion-safe:animate-[toastIn_180ms_ease-out]">
            <span>{lastActionLabel ?? 'Změna uložena do varianty'}</span>
            <button
              type="button"
              onClick={() => {
                undo();
                setShowChangeToast(false);
              }}
              className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold hover:bg-white/30 transition"
            >
              Zpět
            </button>
          </div>
        </div>
      )}

      {customOpen && <CustomEntryDialog onClose={() => setCustomOpen(false)} />}
    </div>
  );
}
