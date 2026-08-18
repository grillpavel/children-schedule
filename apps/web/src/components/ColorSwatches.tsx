'use client';

import { PALETTE } from '@krouzky/domain';

/** Řádek dlaždic z 12barevné palety pro výběr barvy kroužku (CHANGE-4 FR-4/FR-5). */
export function ColorSwatches({
  value,
  onPick,
  disabled = false,
}: {
  /** Aktuálně zvolené CSS klíčové slovo, nebo `undefined` (výchozí z palety). */
  value: string | undefined;
  onPick: (css: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${disabled ? 'opacity-40' : ''}`}>
      {PALETTE.map((c) => {
        const active = c.css === value;
        return (
          <button
            key={c.css}
            type="button"
            disabled={disabled}
            onClick={() => onPick(c.css)}
            title={c.name}
            aria-label={`Barva ${c.name}`}
            aria-pressed={active}
            className={`h-5 w-5 rounded-full border transition-all duration-150 ${
              active
                ? 'border-white ring-2 ring-slate-800 scale-110 shadow-xs'
                : 'border-slate-300 hover:scale-110'
            }`}
            style={{ backgroundColor: c.fill }}
          />
        );
      })}
    </div>
  );
}
