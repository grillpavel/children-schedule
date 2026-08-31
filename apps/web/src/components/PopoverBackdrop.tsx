'use client';

import clsx from 'clsx';

/** Zatemňující podklad pro popupy bez vlastního backdropu (Toolbar dropdowny,
 * mobilní sheet detailu) — stejný vizuál jako referenční CustomEntryDialog
 * (design_review_95.md). Klik na podklad zavře popup; Escape řeší volající.
 *
 * `inset` umožňuje podklad zúžit tak, aby nepřekrýval trvalé navigační prvky
 * (spodní/boční nav u mobilního sheetu, CHANGE-55 — sheet dál umožňuje
 * přepínání záložek, jen ztmaví obsah nad navigací, ne navigaci samotnou). */
export function PopoverBackdrop({
  onClose,
  inset = 'inset-0',
}: {
  onClose: () => void;
  inset?: string;
}) {
  return (
    <div
      className={clsx('fixed z-40 bg-slate-900/50 backdrop-blur-xs', inset)}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}
