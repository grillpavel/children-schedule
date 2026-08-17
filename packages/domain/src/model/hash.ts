/**
 * FNV-1a (32bit) — deterministický hash řetězce.
 * Používá se pro stabilní přiřazení barvy kroužku z `activity.id`.
 * Stejný vstup ⇒ vždy stejný výstup, napříč sezeními i uživateli.
 */
export function hashFnv1a(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32bit FNV prime multiply, drženo v uint32 rozsahu
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
