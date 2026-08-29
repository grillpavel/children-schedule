'use client';

import { parsePlannerState, type PlannerState } from '@krouzky/domain';

const HASH_PARAM = 'share=';

/** Uint8Array → base64url (bez `+`/`/`/`=`, bezpečné do URL fragmentu bez encodeURIComponent). */
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // String.fromCharCode(...bytes) by na velkém poli přetekl zásobník volání.
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Serializuje `PlannerState` do bezstavového odkazu (URL fragment, `#share=...`) —
 * appka nemá backend, celý rozvrh proto žije jen v odkazu (design_review_73.md FR-W3-4).
 * Fragment (za `#`) se nikdy neposílá na server, ať odkaz sám o sobě neuniká přes
 * access logy. Komprimuje přes `CompressionStream('gzip')`, pokud ho prohlížeč
 * podporuje (Chrome 80+/Firefox 113+/Safari 16.4+) — jinak nekomprimovaný fallback
 * (`raw.`), ať odkaz funguje i ve starším prohlížeči, jen bude delší.
 */
export async function encodeStateToShareUrl(state: PlannerState): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let payload: string;
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    void writer.write(bytes);
    void writer.close();
    const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    payload = `gz.${bytesToBase64Url(compressed)}`;
  } else {
    payload = `raw.${bytesToBase64Url(bytes)}`;
  }
  const url = new URL(window.location.href);
  url.hash = `${HASH_PARAM}${payload}`;
  return url.toString();
}

export type ShareDecodeResult =
  | { ok: true; state: PlannerState }
  | { ok: false; error: string };

/** Rozparsuje `#share=...` fragment zpět na `PlannerState`. `null`, pokud fragment
 * odkaz na sdílený rozvrh vůbec nenese (běžné otevření appky beze sdílení). */
export async function decodeShareHash(hash: string): Promise<ShareDecodeResult | null> {
  const stripped = hash.replace(/^#/, '');
  if (!stripped.startsWith(HASH_PARAM)) return null;
  const payload = stripped.slice(HASH_PARAM.length);
  const dotIndex = payload.indexOf('.');
  if (dotIndex < 0) return { ok: false, error: 'Odkaz je poškozený nebo neplatný.' };
  const kind = payload.slice(0, dotIndex);
  const data = payload.slice(dotIndex + 1);
  try {
    const bytes = base64UrlToBytes(data);
    let jsonBytes: Uint8Array;
    if (kind === 'gz') {
      if (typeof DecompressionStream === 'undefined') {
        return { ok: false, error: 'Tento prohlížeč neumí dekomprimovat sdílený odkaz.' };
      }
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      void writer.write(Uint8Array.from(bytes));
      void writer.close();
      jsonBytes = new Uint8Array(await new Response(ds.readable).arrayBuffer());
    } else if (kind === 'raw') {
      jsonBytes = bytes;
    } else {
      return { ok: false, error: 'Odkaz je poškozený nebo neplatný.' };
    }
    const json = new TextDecoder().decode(jsonBytes);
    const parsed = parsePlannerState(JSON.parse(json));
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return { ok: true, state: parsed.value };
  } catch {
    return { ok: false, error: 'Odkaz je poškozený nebo neplatný.' };
  }
}
