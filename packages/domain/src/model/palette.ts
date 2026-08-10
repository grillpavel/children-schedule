import { hashFnv1a } from './hash.js';

/**
 * Paleta 12 barev rozlišitelných i při protanopii/deuteranopii.
 * Vyhýbá se současnému použití červené a zelené s podobným jasem.
 *
 * `text` je barva popisku zvolená tak, aby kontrast na dané výplni
 * byl ≥ 4.5:1 (WCAG 2.1 AA). Barva nikdy nenese sémantiku stavu —
 * stav se kóduje ikonou/overlayem, ne barvou.
 */
export interface PaletteColor {
  /** Výplň bloku (HEX). */
  fill: string;
  /** Barva textu na výplni (HEX), kontrast ≥ 4.5:1. */
  text: string;
  /** Lidský název pro ladění. */
  name: string;
  /** CSS3 klíčové slovo barvy pro ICS vlastnost `COLOR` (RFC 7986). */
  css: string;
}

export const PALETTE: readonly PaletteColor[] = [
  { fill: '#1f77b4', text: '#ffffff', name: 'modrá', css: 'steelblue' },
  { fill: '#ff7f0e', text: '#000000', name: 'oranžová', css: 'darkorange' },
  { fill: '#9467bd', text: '#ffffff', name: 'fialová', css: 'mediumpurple' },
  { fill: '#8c564b', text: '#ffffff', name: 'hnědá', css: 'sienna' },
  { fill: '#e377c2', text: '#000000', name: 'růžová', css: 'orchid' },
  { fill: '#17becf', text: '#000000', name: 'tyrkysová', css: 'darkturquoise' },
  { fill: '#bcbd22', text: '#000000', name: 'olivová', css: 'yellowgreen' },
  { fill: '#7f7f7f', text: '#ffffff', name: 'šedá', css: 'gray' },
  { fill: '#2c3e50', text: '#ffffff', name: 'tmavě modrá', css: 'darkslategray' },
  { fill: '#d4a017', text: '#000000', name: 'zlatá', css: 'goldenrod' },
  { fill: '#5b8c5a', text: '#ffffff', name: 'šalvějová', css: 'mediumseagreen' },
  { fill: '#c44e52', text: '#ffffff', name: 'cihlová', css: 'indianred' },
] as const;

/** Deterministicky vybere barvu kroužku z jeho `activity.id`. */
export function colorForActivity(activityId: string): PaletteColor {
  const index = hashFnv1a(activityId) % PALETTE.length;
  // PALETTE je neprázdná konstanta, index je vždy v rozsahu.
  return PALETTE[index]!;
}

/** Deterministicky vybere jednu barvu pro dítě (režim exportu `single`). */
export function colorForChild(childId: string): PaletteColor {
  const index = hashFnv1a(childId) % PALETTE.length;
  return PALETTE[index]!;
}

/** Najde barvu palety podle CSS klíčového slova (uživatelský přepis barvy). */
export function colorByCss(css: string): PaletteColor | undefined {
  return PALETTE.find((c) => c.css === css);
}
