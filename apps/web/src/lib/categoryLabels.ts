import type { ActivityCategory } from '@krouzky/domain';

/** Sdíleno mezi `DetailsPanel` (zobrazení katalogové aktivity) a
 * `CustomEntryDialog`/vlastní událost (CHANGE-112, design_review_105.md) —
 * dřív existovala jen v `DetailsPanel.tsx`; vlastní událost přišla o výběr
 * kategorie kvůli chybějícímu poli, ne kvůli chybějícímu popisku. */
export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  sport: 'Sport',
  athletics: 'Atletika',
  art: 'Výtvarka',
  music: 'Hudba',
  dance: 'Tanec',
  drama: 'Divadlo',
  language: 'Jazyky',
  science_tech: 'Věda a technika',
  science: 'Věda',
  tech: 'Technika',
  crafts: 'Rukodělky',
  games: 'Hry',
  outdoor: 'Příroda a turistika',
  martial_arts: 'Bojové sporty',
  scouting: 'Skauting',
  other: 'Ostatní',
};
