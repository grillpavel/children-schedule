/**
 * Escapování a zalamování řádků podle RFC 5545.
 * Řádky se ukončují CRLF a zalamují na 75 oktetů (pozor na vícebajtové UTF-8).
 */

/**
 * Escapuje textová pole (SUMMARY, DESCRIPTION, LOCATION, ...).
 * Nikdy nepoužívat na UID, DTSTART, RRULE.
 * Pořadí je důležité — zpětné lomítko se escapuje první.
 */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const encoder = new TextEncoder();

function byteLength(text: string): number {
  return encoder.encode(text).length;
}

/**
 * Zalomí jeden logický řádek na fyzické řádky o max. 75 oktetech.
 * Pokračovací řádky začínají jednou mezerou (která se do limitu počítá).
 * Zalamuje po znacích (code points), takže nikdy nerozdělí vícebajtový znak.
 */
export function foldLine(line: string): string {
  const segments: string[] = [];
  let segment = '';
  let bytes = 0;
  let isFirst = true;

  for (const ch of line) {
    const chBytes = byteLength(ch);
    // První řádek: 75 oktetů. Pokračovací: 74 + vedoucí mezera = 75.
    const max = isFirst ? 75 : 74;
    if (bytes + chBytes > max) {
      segments.push(segment);
      segment = '';
      bytes = 0;
      isFirst = false;
    }
    segment += ch;
    bytes += chBytes;
  }
  segments.push(segment);
  return segments.join('\r\n ');
}

/** Spojí obsahové řádky do jednoho ICS těla s CRLF a zalamováním. */
export function joinIcsLines(lines: readonly string[]): string {
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
