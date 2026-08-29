'use client';

import { useLayoutEffect, useEffect, useState } from 'react';

// SSR nemá `window` — `useLayoutEffect` by tam byl no-op a Next varuje v konzoli.
// Na serveru proto spadneme na `useEffect` (FR-W1-2, design_review_73.md).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Jediný zdroj mobilního zlomu (FR-W1-1, design_review_73.md) — musí přesně
 * odpovídat `desk: '768px'` v tailwind.config.ts. FR-W2-4/BL-051 (design_review_77.md)
 * změřilo na 900px regresi při 834px s otevřeným detailem (~24px sloupec) — opraveno
 * BL-053 (min. šířka sloupce + horizontální scroll v `ScheduleGrid.tsx`, design_review_84.md),
 * hranice se proto bezpečně vrátila na 768px. Dřív bylo totéž `matchMedia` volání
 * duplikováno nezávisle v page.tsx, CatalogPanel.tsx i ScheduleGrid.tsx. */
export const MOBILE_BREAKPOINT_QUERY = '(max-width: 767.98px)';

/** Třísloupcový layout platí od 1180px (původně 1440px, C9-L1). FR-W2-4/BL-051
 * změřilo na 1440px regresi (83px sloupec při 1280px) — opraveno BL-053, hranice
 * se proto bezpečně vrátila na 1180px (design_review_84.md). */
export const WIDE_BREAKPOINT_QUERY = '(min-width: 1180px)';

/** Mobil na šířku s málo výškou (FR-W2-1, design_review_73.md) — spodní navigace
 * by tam zabrala příliš mnoho z už tak omezené výšky, dostane boční rail. */
export const LANDSCAPE_COMPACT_QUERY = '(orientation: landscape) and (max-height: 500px)';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  // `useLayoutEffect` (ne `useEffect`) čte skutečnou šířku PŘED prvním vykreslením
  // prohlížeče — na mobilu tak nezabliká krátce desktopová větev (FR-W1-2).
  useIsomorphicLayoutEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [query]);

  return matches;
}

/** `true` pod 768px šířky. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BREAKPOINT_QUERY);
}

/** `true` od 1180px šířky (třísloupcový layout). */
export function useIsWide(): boolean {
  return useMediaQuery(WIDE_BREAKPOINT_QUERY);
}

/** `true` pro mobil na šířku s omezenou výškou (boční rail místo spodní navigace). */
export function useIsLandscapeCompact(): boolean {
  return useMediaQuery(LANDSCAPE_COMPACT_QUERY);
}

