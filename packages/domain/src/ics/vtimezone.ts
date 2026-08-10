/**
 * Statický VTIMEZONE blok pro Europe/Prague.
 * Bez něj se u některých klientů rozjede čas po přechodu na letní čas.
 * Vkládá se do každého vygenerovaného kalendáře.
 */
export const VTIMEZONE_EUROPE_PRAGUE: readonly string[] = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Prague',
  'BEGIN:STANDARD',
  'DTSTART:19701025T030000',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'TZNAME:CET',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T020000',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'TZNAME:CEST',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
] as const;
