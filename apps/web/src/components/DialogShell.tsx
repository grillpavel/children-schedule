'use client';

import { useId, type ReactNode } from 'react';
import clsx from 'clsx';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { IconClose } from './Icons';

/**
 * Jediná sdílená obálka pro centrované modální dialogy (design_review_102.md,
 * CHANGE-110). Před touto komponentou měl každý popup (`CustomEntryDialog`,
 * `PrintRangeDialog`, `PrivacyDialog`, mobilní detail v `page.tsx`) VLASTNÍ
 * ručně psaný backdrop/kartu/close-button — nezávisle se rozjely v barvě
 * podkladu, animaci, velikosti close-tlačítka, i v tom, jestli vůbec jde
 * zavřít Escape/kliknutím mimo. `DialogShell` sjednocuje přesně tyhle
 * průřezové vlastnosti; obsah (formulář, text, `DetailsPanel`…) zůstává
 * plně v rukou volajícího.
 *
 * NENÍ určeno pro ukotvené dropdown menu (Toolbar „Další ▾“, výběr dítěte) —
 * ty používají `PopoverBackdrop` a mají jiný, oprávněně odlišný vzor
 * (ukotvené k triggeru, ne centrované na obrazovce).
 */
export function DialogShell({
  onClose,
  children,
  title,
  ariaLabel,
  size = 'md',
  height = 'auto',
  glass = false,
  closeOnBackdrop = true,
  closeLabel = 'Zavřít',
}: {
  onClose: () => void;
  children: ReactNode;
  /** Viditelný titulek v hlavičce — pokud je zadaný, DialogShell vykreslí
   * standardní hlavičku (titulek + close tlačítko) a nastaví aria-labelledby. */
  title?: ReactNode;
  /** Použij místo `title`, když dialog nemá viditelný titulkový řádek
   * (např. mobilní detail položky — titulek je uvnitř obsahu). */
  ariaLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  /** 'auto' = karta se přizpůsobí obsahu do stropu výšky (běžné dialogy).
   * 'fixed' = pevná výška 85dvh bez ohledu na obsah (mobilní detail
   * položky, design_review_101.md — jinak katalogová položka a vlastní
   * událost otevírají viditelně jinak velké okno). */
  height?: 'auto' | 'fixed';
  glass?: boolean;
  closeOnBackdrop?: boolean;
  /** aria-label close tlačítka. Výchozí „Zavřít"; mobilní detail položky
   * záměrně používá „Zavřít detail" (existující E2E na to cílí, T-219 aj.),
   * ať jde jednoznačně odlišit od ostatních „Zavřít" tlačítek na obrazovce. */
  closeLabel?: string;
}) {
  useEscapeToClose(onClose);
  const titleId = useId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'flex w-full flex-col overflow-hidden rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150',
          glass ? 'glass border border-slate-200/90' : 'bg-white',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-md',
          size === 'lg' && 'max-w-lg',
          height === 'fixed' ? 'h-[85dvh]' : 'max-h-[92dvh]',
        )}
      >
        {title !== undefined ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 p-5 pb-3">
            <h2 id={titleId} className="text-base font-bold text-slate-900">
              {title}
            </h2>
            <DialogCloseButton onClose={onClose} label={closeLabel} />
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-end px-3 pt-2">
            <DialogCloseButton onClose={onClose} label={closeLabel} />
          </div>
        )}
        <div
          className={clsx(
            'min-h-0 flex-1 overflow-y-auto',
            title !== undefined && 'p-5 pt-3',
            // `glass` dělá jen VNĚJŠÍ rám poloprůhledný (ambientní efekt) — obsah
            // uvnitř zůstává čitelný na plném bílém, ne skrz sklo (design_review_73.md).
            glass && 'bg-white',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Vždy 44×44 px (WCAG 2.2 SC 2.5.8 dotykový cíl) — dřív `PrintRangeDialog`
 * a `PrivacyDialog` používaly menší `p-1.5` ikonu bez explicitního rozměru. */
function DialogCloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 desk:h-8 desk:w-8"
    >
      <IconClose className="h-4 w-4" />
    </button>
  );
}

