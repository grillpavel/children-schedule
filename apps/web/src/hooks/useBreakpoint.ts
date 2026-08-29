'use client';

import { useLayoutEffect, useEffect, useState } from 'react';

// SSR nemá `window` — `useLayoutEffect` by tam byl no-op a Next varuje v konzoli.
// Na serveru proto spadneme na `useEffect` (FR-W1-2, design_review_73.md).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Jediný zdroj mobilního zlomu (FR-W1-1, design_review_73.md) — musí přesně
 * odpovídat `desk: '900px'` v tailwind.config.ts. FR-W2-4/BL-051 zvažovalo posun
 * na 768px (design_review_77.md), ale změřeno: na tablet-portrait (834px) s
 * otevřeným detailem (katalog+mřížka+info-drawer současně) klesne sloupec dne
 * na ~24px — nepoužitelně úzké. Hranice proto zůstává na 900px. Dřív bylo
 * totož `matchMedia` volaní duplikováno nezávisle v page.tsx, CatalogPanel.tsx
 * i ScheduleGrid.tsx. */
export const MOBILE_BREAKPOINT_QUERY = '(max-width: 899.98px)';

/** Třísloupcový layout platí od 1440px (C9-L1). FR-W2-4/BL-051 zvažovalo posun
 * na 1180px (design_review_77.md), ale změřeno: při 1180–1439px klesá sloupec
 * dne pod 105px (T-200 selhávalo s 83px na 1280px) — hranice proto zůstává. */
export const WIDE_BREAKPOINT_QUERY = '(min-width: 1440px)';

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

/** `true` pod 900px šířky. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BREAKPOINT_QUERY);
}

/** `true` od 1440px šířky (třísloupcový layout). */
export function useIsWide(): boolean {
  return useMediaQuery(WIDE_BREAKPOINT_QUERY);
}

/** `true` pro mobil na šířku s omezenou výškou (boční rail místo spodní navigace). */
export function useIsLandscapeCompact(): boolean {
  return useMediaQuery(LANDSCAPE_COMPACT_QUERY);
}

