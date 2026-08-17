/**
 * Kontroly nad SYROVÝM textem .ics (T-600, T-601).
 * Parser normalizuje CRLF i folding, takže tyto chyby přes něj nikdy neuvidíš.
 */

export function assertCRLF(raw: string): string[] {
  const errors: string[] = [];
  const lfOnly = raw.split('\n').filter((l, i, arr) =>
    i < arr.length - 1 && !l.endsWith('\r')
  );
  if (lfOnly.length > 0) {
    errors.push(`${lfOnly.length} řádků nekončí CRLF`);
  }
  return errors;
}

export function assertFolding(raw: string): string[] {
  const errors: string[] = [];
  const lines = raw.split('\r\n');
  const enc = new TextEncoder();
  lines.forEach((line, i) => {
    const octets = enc.encode(line).length;
    if (octets > 75) {
      errors.push(`řádek ${i + 1}: ${octets} oktetů (limit 75)`);
    }
    // Pokračovací řádek musí začínat mezerou nebo tabulátorem.
    if (i > 0 && octets === 75 && !/^[ \t]/.test(lines[i + 1] ?? '')) {
      errors.push(`řádek ${i + 1}: chybí pokračovací mezera`);
    }
  });
  return errors;
}

/** Rozbalí foldované řádky zpět, aby se daly kontrolovat hodnoty. */
export function unfold(raw: string): string[] {
  return raw
    .replace(/\r\n[ \t]/g, '')
    .split('\r\n')
    .filter(Boolean);
}

/** Najde hodnotu vlastnosti, včetně parametrů. */
export function getProperty(raw: string, name: string): string[] {
  return unfold(raw)
    .filter((l) => l.startsWith(`${name};`) || l.startsWith(`${name}:`))
    .map((l) => l.slice(l.indexOf(':') + 1));
}
