import {
  type Catalog,
} from '@krouzky/domain';

/**
 * REÁLNÁ DATA — Nové Strašecí a okolí, školní rok 2026/2027.
 *
 * Zdroj pravdy pro tento soubor: oficiální katalog DDM Rakovník
 * https://www.ddmrako.cz/krouzky (sekce „Kroužky 2026/2027“), staženo 10. 8. 2026.
 * Každý záznam má v NS_ACTIVITY_META přímý odkaz na detail kroužku.
 *
 * PRAVIDLO #1 SE NEPORUŠUJE: nic se nedopočítává ani neodhaduje.
 * Co není v oficiálním zdroji, je buď `Number.NaN` (souřadnice) nebo
 * v NS_PENDING (organizace bez zveřejněného rozvrhu / ceny).
 *
 * ---------------------------------------------------------------------------
 * POŽADOVANÉ ZMĚNY V @krouzky/domain (jinak tento soubor neprojde tsc)
 * ---------------------------------------------------------------------------
 *  1) Price['period'] musí obsahovat 'per_year'.
 *     DDM účtuje výhradně roční sazbu (volitelně dělenou na dvě pololetí).
 *
 *  2) Activity['category'] musí obsahovat:
 *     'science' | 'tech' | 'dance' | 'art' | 'games' | 'outdoor' | 'martial_arts'
 *     (demo mělo jen 'crafts' | 'sport' | 'music').
 *
 *  3) CHYBÍ ENTITA „MÍSTO KONÁNÍ“. Toto je hlavní strukturální mezera.
 *     Model dnes umí jen `Provider.address`, ale organizátor ≠ místo konání:
 *     DDM Rakovník sídlí v Rakovníku a učí v hale BIOS, v ZŠ, v Sokolovně,
 *     na Kocourku a v Řevničově. Bez místa u session nelze počítat dojezd
 *     ze školy (Child.schoolAddress), což je jádro plánovače.
 *     Doporučení: `Catalog.venues: Venue[]` + `SessionGroup.venueId: string`.
 *     Do té doby jsou místa vedena vedle katalogu v NS_VENUES / NS_ACTIVITY_META.
 * ---------------------------------------------------------------------------
 */

/** Školní rok dle § 24 školského zákona (vyučování končí 30. 6.). */
const SCHOOL_YEAR = { start: '2026-09-01', end: '2027-06-30' };

/**
 * Reálné datum zahájení kroužků DDM pro 2026/27 NENÍ zveřejněno.
 * V minulých letech to byla polovina září (2025/26: 15. 9. 2025).
 * Do ověření se používá rámec školního roku výše — NEDOPLŇOVAT odhadem.
 */
const VERIFIED_AT = '2026-08-10';

/** Souřadnice, které se nepodařilo dohledat z oficiálního zdroje. */
const NO_COORD = { lat: Number.NaN, lon: Number.NaN };

// ---------------------------------------------------------------------------
// MÍSTA KONÁNÍ (dočasně mimo Catalog — viz bod 3 výše)
// ---------------------------------------------------------------------------

export type NsVenue = {
  id: string;
  /** Přesně tak, jak místo označuje DDM ve svém katalogu. */
  ddmLabel: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  lat: number;
  lon: number;
  /** true = mimo Nové Strašecí, plánovač musí varovat na dojezd */
  outsideTown?: boolean;
  note?: string;
};

export const NS_VENUES: Record<string, NsVenue> = {
  'zs-ucebna': {
    id: 'zs-ucebna',
    ddmLabel: 'DDM STRA - učebna ZŠ Nové Strašecí',
    name: 'ZŠ J. A. Komenského — učebna',
    street: 'Komenského nám. 209',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    // GPS převzato z oficiálních stránek města (50° 9′ 9.489″N, 13° 54′ 6.403″E)
    lat: 50.152636,
    lon: 13.901779,
  },
  'zs-telocvicna': {
    id: 'zs-telocvicna',
    ddmLabel: 'DDM STRA - tělocvična ZŠ Nové Strašecí',
    name: 'ZŠ J. A. Komenského — tělocvična',
    street: 'Komenského nám. 209',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    lat: 50.152636,
    lon: 13.901779,
  },
  'ddm-ns': {
    id: 'ddm-ns',
    ddmLabel: 'DDM STRA - DDM Nové Strašecí',
    name: 'DDM Nové Strašecí (pracoviště)',
    street: 'Komenského nám. 209',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    lat: 50.152636,
    lon: 13.901779,
  },
  'hala-bios': {
    id: 'hala-bios',
    ddmLabel: 'DDM STRA - hala BIOS',
    name: 'Sportovní hala BIOS',
    street: 'Husova 1146',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note: 'BIOS je POUZE sportoviště, nikdy organizátor. Souřadnice doplnit.',
  },
  'sokolovna-ns': {
    id: 'sokolovna-ns',
    ddmLabel: 'DDM STRA - Sokolovna Nové Strašecí',
    name: 'Sokolovna Nové Strašecí',
    street: '',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note: 'Přesná adresa a souřadnice k doplnění.',
  },
  'ms-kocourek': {
    id: 'ms-kocourek',
    ddmLabel: 'DDM STRA - MŠ Kocourek',
    name: 'MŠ Kocourek / Kocourek aréna',
    street: 'Jiřího Šotky 723',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note:
      'Hokejbalové hřiště u MŠ Kocourek („Kocourek aréna“) — domácí hřiště HBC Nové Strašecí. ' +
      'Adresa převzata ze seznamu školských zařízení města; souřadnice doplnit.',
  },
  'zs-revnicov': {
    id: 'zs-revnicov',
    ddmLabel: 'DDM STRA - Tělocvična ZŠ Řevničov',
    name: 'Tělocvična ZŠ Řevničov',
    street: '',
    city: 'Řevničov',
    postalCode: '270 54',
    ...NO_COORD,
    outsideTown: true,
    note: 'MIMO Nové Strašecí (~6 km). Plánovač musí u tohoto místa řešit dopravu rodičem.',
  },
};

// ---------------------------------------------------------------------------
// KATALOG
// ---------------------------------------------------------------------------

export const NS_CATALOG: Catalog = {
  city: 'Nové Strašecí',
  providers: [
    {
      id: 'ddm-rakovnik',
      name: 'Dům dětí a mládeže Rakovník, příspěvková organizace',
      kind: 'ddm',
      address: {
        // Sídlo organizace. Pracoviště Nové Strašecí = Komenského nám. 209 (viz NS_VENUES).
        street: 'S. K. Neumanna 251, Rakovník II',
        city: 'Rakovník',
        ...NO_COORD,
      },
      contact: {
        phone: '+420 731 610 569',
        personName: 'Jitka Samšuková (vedoucí pracoviště Nové Strašecí)',
      },
    },
  ],

  activities: [
    // ---- Přírodověda / věda / technika -----------------------------------
    {
      id: 'ddm-astronomie',
      providerId: 'ddm-rakovnik',
      name: 'Astronomický kroužek',
      category: 'science',
      ageMin: 8,
      ageMax: 18,
      price: { amount: 1300, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Slunce, planety, hvězdy, Galaxie a uspořádání vesmíru. Pozorování oblohy, planetárium, ' +
        'skládání dalekohledu a večerní pozorování kvalitním dalekohledem.',
    },
    {
      id: 'ddm-veda-je-zabava',
      providerId: 'ddm-rakovnik',
      name: 'Věda je zábava',
      category: 'science',
      ageMin: 7,
      ageMax: 12,
      price: { amount: 1500, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description: 'Sestavování drobných výrobků, kladný vztah ke světu vědy, výzkumu a techniky.',
    },
    {
      id: 'ddm-robotika',
      providerId: 'ddm-rakovnik',
      name: 'Inteligentní robotika',
      category: 'tech',
      ageMin: 12,
      ageMax: 16,
      price: { amount: 1500, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Možnosti robota, programování, konstrukce robotů, stavebnice. Určeno žákům 2. stupně ZŠ.',
    },
    {
      id: 'ddm-elektrotechnik',
      providerId: 'ddm-rakovnik',
      name: 'Mladý elektrotechnik',
      category: 'tech',
      ageMin: 10,
      ageMax: 16,
      price: { amount: 1500, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description: 'Základy elektrotechniky a zajímavosti z elektroniky. Novinka 2026/27.',
    },
    {
      id: 'ddm-programovani',
      providerId: 'ddm-rakovnik',
      name: 'Programování',
      category: 'tech',
      ageMin: 7,
      ageMax: 12,
      price: { amount: 1500, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Základy programování, logické myšlení, robotizace. Určeno pro 3.–6. třídu.',
    },

    // ---- Tvoření / estetika ----------------------------------------------
    {
      id: 'ddm-dovedne-ruce',
      providerId: 'ddm-rakovnik',
      name: 'Dovedné ruce',
      category: 'crafts',
      ageMin: 6,
      ageMax: 10,
      price: { amount: 1300, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Výroba drobných dárků z různých materiálů, základní techniky ručních prací, střídání činností.',
    },
    {
      id: 'ddm-vytvarne-tvoreni',
      providerId: 'ddm-rakovnik',
      name: 'Výtvarné tvoření',
      category: 'art',
      ageMin: 5,
      ageMax: 10,
      price: { amount: 1300, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Výtvarné dovednosti dle vlastní fantazie i podle předloh, různé malířské techniky, kombinování materiálů.',
    },

    // ---- Hry / logika -----------------------------------------------------
    {
      id: 'ddm-deskove-hry',
      providerId: 'ddm-rakovnik',
      name: 'Deskové a jiné hry',
      category: 'games',
      ageMin: 6,
      ageMax: 10,
      price: { amount: 900, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description: 'Hry v kolektivu, logické a strategické myšlení, pravidla her, týmová spolupráce.',
    },

    // ---- Příroda / turistika ----------------------------------------------
    {
      id: 'ddm-venkovni-dobrodruzstvi',
      providerId: 'ddm-rakovnik',
      name: 'Venkovní dobrodružství',
      category: 'outdoor',
      ageMin: 6,
      ageMax: 15,
      price: { amount: 1100, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Turistické putování po okolí, příroda a životní prostředí, turistické značení, ekologie, ' +
        'mapy a plány města, venkovní hry, stopovačky a bojovky.',
    },

    // ---- Sport: všeobecná průprava ---------------------------------------
    {
      id: 'ddm-sportovni-i',
      providerId: 'ddm-rakovnik',
      name: 'Sportovní kroužek I. (mladší žactvo)',
      category: 'sport',
      ageMin: 5,
      ageMax: 9,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Všeobecná sportovní průprava — atletika, gymnastika, míčové hry, rozvoj rovnováhy a koordinace.',
    },
    {
      id: 'ddm-sportovni-ii',
      providerId: 'ddm-rakovnik',
      name: 'Sportovní kroužek II. (starší žactvo)',
      category: 'sport',
      ageMin: 9,
      ageMax: 12,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Všeobecná sportovní průprava — atletika, gymnastika, míčové hry, rozvoj rovnováhy a koordinace.',
    },
    {
      id: 'ddm-micove-hry',
      providerId: 'ddm-rakovnik',
      name: 'Míčové hry',
      category: 'sport',
      ageMin: 12,
      ageMax: 16,
      price: { amount: 1200, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Rozvoj pohybových schopností, herní činnosti, pravidla her, týmová spolupráce a komunikace.',
    },

    // ---- Sport: florbal (dívčí kategorie) ---------------------------------
    {
      id: 'ddm-florbal-i',
      providerId: 'ddm-rakovnik',
      name: 'Florbal I. — elévky + minižákyně',
      category: 'sport',
      ageMin: 6,
      ageMax: 8,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Základní florbalové dovednosti, herní činnosti, nácvik technik, mistrovské zápasy. ' +
        'Informativní schůzka proběhne v hale BIOS během září.',
    },
    {
      id: 'ddm-florbal-ii',
      providerId: 'ddm-rakovnik',
      name: 'Florbal II. — mladší žákyně',
      category: 'sport',
      ageMin: 8,
      ageMax: 12,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Základní florbalové dovednosti, herní činnosti, nácvik technik, mistrovské zápasy. ' +
        'Informativní schůzka proběhne v hale BIOS během září.',
    },
    {
      id: 'ddm-florbal-iii',
      providerId: 'ddm-rakovnik',
      name: 'Florbal III. — starší žákyně a dorostenky',
      category: 'sport',
      ageMin: 10,
      ageMax: 15,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Hra a herní situace, základní pravidla, nácvik technik, mistrovské zápasy, řízená hra.',
    },

    // ---- Sport: hokejbal ---------------------------------------------------
    {
      id: 'ddm-hokejbal-i',
      providerId: 'ddm-rakovnik',
      name: 'Hokejbal I. — minipřípravka',
      category: 'sport',
      ageMin: 5,
      ageMax: 7,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description: 'Základní hokejbalové dovednosti, základní pravidla, práce s holí, turnaje.',
    },
    {
      id: 'ddm-hokejbal-ii',
      providerId: 'ddm-rakovnik',
      name: 'Hokejbal II. — přípravka',
      category: 'sport',
      ageMin: 8,
      ageMax: 10,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description: 'Hokejbalové herní situace.',
    },
    {
      id: 'ddm-hokejbal-iii',
      providerId: 'ddm-rakovnik',
      name: 'Hokejbal III. — žáci',
      category: 'sport',
      ageMin: 11,
      ageMax: 14,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Herní hokejbalové situace, technika hry, útočné a obranné činnosti jednotlivců ' +
        'i brankářů, týmová spolupráce, fair play.',
    },

    // ---- Sport: basketbal --------------------------------------------------
    {
      id: 'ddm-basketbal-pripravka',
      providerId: 'ddm-rakovnik',
      name: 'Basketbal — přípravka',
      category: 'sport',
      ageMin: 8,
      ageMax: 11,
      price: { amount: 1200, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'První krok do týmového basketbalu: všeobecné pohybové dovednosti s důrazem na basketbalovou ' +
        'techniku, spolupráce, disciplína, vytrvalost. Pro ročníky 2014–2017, hraje se soutěž Šmoulinka cup. ' +
        'POZOR: kromě poplatku DDM se vybírají i členské příspěvky (výše nezveřejněna).',
    },
    {
      id: 'ddm-basketbal-chlapci',
      providerId: 'ddm-rakovnik',
      name: 'Basketbal — chlapci 13–18 let',
      category: 'sport',
      ageMin: 13,
      ageMax: 18,
      price: { amount: 1200, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Výkonnostní basketbal pro vyšší ročníky ZŠ — individuální činnost jednotlivce, pohybový ' +
        'i mentální rozvoj, všestrannost. Tréninky vedou licencovaní trenéři, hráči nastupují v soutěžích. ' +
        'POZOR: všechny tréninky i zápasy jsou v tělocvičně ZŠ Řevničov, tedy MIMO Nové Strašecí.',
    },

    // ---- Bojové sporty -----------------------------------------------------
    {
      id: 'ddm-karate',
      providerId: 'ddm-rakovnik',
      name: 'Karate',
      category: 'martial_arts',
      ageMin: 6,
      ageMax: 15,
      price: { amount: 1300, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Nácvik postojů karate, obratnostní a pohybová cvičení, základy zápasu dle pravidel. ' +
        'POZOR: klub karate vybírá navíc 1 000 Kč/rok samostatně — reálné minimum je 2 300 Kč/rok.',
    },

    // ---- Tanec -------------------------------------------------------------
    {
      id: 'ddm-street-dance-zacatecnici',
      providerId: 'ddm-rakovnik',
      name: 'Street dance NS — začátečníci',
      category: 'dance',
      ageMin: 5,
      ageMax: 8,
      price: { amount: 1300, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Základní hip hop, house a hype prvky, pohybové a taneční schopnosti, zkušení lektoři. ' +
        'Přihlašování NEJDŘÍVE přes HB Dance Praha, teprve potom do systému DDM. Platba probíhá hromadně — neplaťte sami.',
    },
    {
      id: 'ddm-street-dance-pokrocili',
      providerId: 'ddm-rakovnik',
      name: 'Street dance NS — pokročilí',
      category: 'dance',
      ageMin: 7,
      ageMax: 10,
      price: { amount: 1300, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Pokročilá skupina street dance. Přihlašování NEJDŘÍVE přes HB Dance Praha, ' +
        'teprve potom do systému DDM. Platba probíhá hromadně — neplaťte sami.',
    },
  ],

  sessionGroups: [
    // Jednodenní kroužky ----------------------------------------------------
    g('ddm-astronomie', [s(5, 840, 960)]),
    g('ddm-veda-je-zabava', [s(3, 840, 930)]),
    g('ddm-robotika', [s(1, 930, 1020)]),
    g('ddm-elektrotechnik', [s(3, 930, 1020)]),
    g('ddm-programovani', [s(1, 930, 990)]),
    g('ddm-dovedne-ruce', [s(1, 900, 960)]),
    g('ddm-vytvarne-tvoreni', [s(4, 840, 930)]),
    g('ddm-deskove-hry', [s(2, 810, 900)]),
    g('ddm-venkovni-dobrodruzstvi', [s(3, 840, 960)]),
    g('ddm-sportovni-i', [s(1, 915, 975)]),
    g('ddm-sportovni-ii', [s(2, 960, 1020)]),
    g('ddm-micove-hry', [s(4, 1020, 1140)]),
    g('ddm-street-dance-zacatecnici', [s(4, 870, 990)]),
    g('ddm-street-dance-pokrocili', [s(4, 870, 990)]),

    // Dvoudenní kroužky — obě session jsou POVINNÉ, proto jedna skupina ------
    g('ddm-florbal-i', [s(3, 990, 1080), s(4, 990, 1080)]),
    g('ddm-florbal-ii', [s(3, 840, 930), s(5, 840, 930)]),
    g('ddm-florbal-iii', [s(1, 1110, 1200), s(4, 1110, 1200)]),
    g('ddm-hokejbal-i', [s(2, 960, 1080), s(4, 960, 1080)]),
    g('ddm-hokejbal-ii', [s(2, 960, 1080), s(4, 960, 1080)]),
    g('ddm-hokejbal-iii', [s(1, 960, 1080), s(3, 960, 1080)]),
    g('ddm-basketbal-pripravka', [s(1, 990, 1080), s(3, 990, 1080)]),
    g('ddm-basketbal-chlapci', [s(2, 1005, 1095), s(4, 1005, 1095)]),
    g('ddm-karate', [s(1, 1050, 1140), s(3, 1050, 1140)]),
  ],
};

// ---------------------------------------------------------------------------
// HELPERY (stejná konvence jako demoData.ts)
// ---------------------------------------------------------------------------

type RawSession = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startMinutes: number;
  endMinutes: number;
};

/** Definice jednoho termínu. Čas v minutách od půlnoci (14:00 → 840). */
function s(
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  startMinutes: number,
  endMinutes: number,
): RawSession {
  return { weekday, startMinutes, endMinutes };
}

/**
 * Jedna skupina = jedna varianta docházky. Všechny sessions uvnitř skupiny
 * jsou POVINNÉ (dvoufázové tréninky), varianty výběru se modelují jako
 * více skupin nad stejnou aktivitou — v nabídce DDM 2026/27 taková zatím není.
 */
function g(activityId: string, sessions: RawSession[], label?: string) {
  const groupId = `${activityId}-g`;
  return {
    id: groupId,
    activityId,
    ...(label ? { label } : {}),
    sessions: sessions.map((x, i) => ({
      id: `${groupId}-s${i + 1}`,
      groupId,
      weekday: x.weekday,
      startMinutes: x.startMinutes,
      endMinutes: x.endMinutes,
      validFrom: SCHOOL_YEAR.start,
      validTo: SCHOOL_YEAR.end,
    })),
  };
}

// ---------------------------------------------------------------------------
// METADATA MIMO DOMÉNOVÝ MODEL
// zdroj, místo konání, doplňkové poplatky, stav ověření
// ---------------------------------------------------------------------------

export type VerificationStatus =
  | 'verified_2026_2027'
  | 'verified_2025_2026'
  | 'organization_verified'
  | 'needs_confirmation'
  | 'price_incomplete'
  | 'schedule_missing';

export type NsActivityMeta = {
  venueId: keyof typeof NS_VENUES;
  sourceUrl: string;
  verification: VerificationStatus;
  isNew?: boolean;
  /** Poplatky mimo cenu DDM. `amount: null` = existuje, ale výše nezveřejněna. */
  additionalFees?: { payer: string; amount: number | null; period: 'per_year'; mandatory: boolean }[];
  note?: string;
};

const DDM = 'https://www.ddmrako.cz/krouzky/';

export const NS_ACTIVITY_META: Record<string, NsActivityMeta> = {
  'ddm-astronomie': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2011-astronomicky-krouzek`, verification: 'verified_2026_2027' },
  'ddm-veda-je-zabava': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2013-veda-je-zabava`, verification: 'verified_2026_2027' },
  'ddm-robotika': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2016-inteligentni-robotika`, verification: 'verified_2026_2027' },
  'ddm-elektrotechnik': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2017-mlady-elektrotechnik`, verification: 'verified_2026_2027', isNew: true },
  'ddm-programovani': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2015-programovani`, verification: 'verified_2026_2027' },
  'ddm-dovedne-ruce': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2018-dovedne-ruce`, verification: 'verified_2026_2027' },
  'ddm-vytvarne-tvoreni': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2019-vytvarne-tvoreni`, verification: 'verified_2026_2027' },
  'ddm-deskove-hry': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2014-deskove-a-jine-hry`, verification: 'verified_2026_2027' },
  'ddm-venkovni-dobrodruzstvi': { venueId: 'ddm-ns', sourceUrl: `${DDM}2012-venkovni-dobrodruzstvi`, verification: 'verified_2026_2027' },
  'ddm-sportovni-i': { venueId: 'zs-telocvicna', sourceUrl: `${DDM}2010-sportovni-krouzek-i-mladsi-zactvo`, verification: 'verified_2026_2027' },
  'ddm-sportovni-ii': { venueId: 'zs-telocvicna', sourceUrl: `${DDM}2022-sportovni-krouzek-ii-starsi-zactvo`, verification: 'verified_2026_2027' },
  'ddm-micove-hry': { venueId: 'zs-telocvicna', sourceUrl: `${DDM}2009-micove-hry`, verification: 'verified_2026_2027' },

  'ddm-florbal-i': { venueId: 'hala-bios', sourceUrl: `${DDM}2000-florbal-i-elevky-minizakyne`, verification: 'verified_2026_2027', note: 'BIOS = pouze místo konání.' },
  'ddm-florbal-ii': { venueId: 'hala-bios', sourceUrl: `${DDM}2001-florbal-ii-mladsi-zakyne`, verification: 'verified_2026_2027', note: 'BIOS = pouze místo konání.' },
  'ddm-florbal-iii': { venueId: 'hala-bios', sourceUrl: `${DDM}2002-florbal-iii-starsi-zakyne-a-dorostenky`, verification: 'verified_2026_2027', note: 'BIOS = pouze místo konání.' },

  'ddm-hokejbal-i': { venueId: 'ms-kocourek', sourceUrl: `${DDM}2006-hokejbal-i-minipripravka`, verification: 'verified_2026_2027' },
  'ddm-hokejbal-ii': { venueId: 'ms-kocourek', sourceUrl: `${DDM}2007-hokejbal-ii-pripravka`, verification: 'verified_2026_2027' },
  'ddm-hokejbal-iii': { venueId: 'ms-kocourek', sourceUrl: `${DDM}2008-hokejbal-iii-zaci`, verification: 'verified_2026_2027' },

  'ddm-basketbal-pripravka': {
    venueId: 'hala-bios',
    sourceUrl: `${DDM}2004-basketbal-pripravka`,
    verification: 'price_incomplete',
    additionalFees: [{ payer: 'členské příspěvky (výše nezveřejněna)', amount: null, period: 'per_year', mandatory: true }],
    note:
      'Vlastní kroužek DDM (soutěž Šmoulinka cup). NENÍ to kroužek Kelti Nové Strašecí — ' +
      'katalog DDM u tohoto kroužku Kelty vůbec neuvádí. Kelti jsou samostatný oddíl TJ Sokol Nové Strašecí.',
  },
  'ddm-basketbal-chlapci': {
    venueId: 'zs-revnicov',
    sourceUrl: `${DDM}2005-basketbal-chlapci-13-18-let`,
    verification: 'verified_2026_2027',
    note:
      'Jediný basketbalový kroužek DDM, který se odkazuje na nsbasket.cz (Kelti). ' +
      'Koná se v Řevničově, tedy mimo Nové Strašecí.',
  },

  'ddm-karate': {
    venueId: 'zs-telocvicna',
    sourceUrl: `${DDM}2003-karate`,
    verification: 'verified_2026_2027',
    additionalFees: [{ payer: 'Club Karate TIGER', amount: 1000, period: 'per_year', mandatory: true }],
    note: 'Známé minimum celkem: 1 300 + 1 000 = 2 300 Kč/rok.',
  },

  'ddm-street-dance-zacatecnici': {
    venueId: 'sokolovna-ns',
    sourceUrl: `${DDM}2020-street-dance-ns-zacatecnici`,
    verification: 'verified_2026_2027',
    note: 'Přihlášky přes HB Dance Praha: Jan Bartoš 774 944 272 / Veronika Vostatková 776 701 358.',
  },
  'ddm-street-dance-pokrocili': {
    venueId: 'sokolovna-ns',
    sourceUrl: `${DDM}2023-street-dance-ns-pokrocili`,
    verification: 'verified_2026_2027',
    note: 'Přihlášky přes HB Dance Praha: Jan Bartoš 774 944 272 / Veronika Vostatková 776 701 358.',
  },
};

// ---------------------------------------------------------------------------
// ORGANIZACE MIMO KATALOG — ověřená existence, chybějící rozvrh nebo cena.
// Do NS_CATALOG se přesouvají teprve po doplnění dne, času a ceny.
// ---------------------------------------------------------------------------

export type NsPendingOrg = {
  id: string;
  name: string;
  kind: string;
  website?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  /** Co konkrétně chybí, aby šlo záznam vložit do plánovače. */
  missing: ('schedule' | 'price' | 'age_groups' | 'existence')[];
  verification: VerificationStatus;
  note?: string;
};

export const NS_PENDING: NsPendingOrg[] = [
  {
    id: 'zus-nove-straseci',
    name: 'Základní umělecká škola, Nové Strašecí, Komenského 189',
    kind: 'zus',
    website: 'https://www.zusbubu.cz/',
    email: 'info@zusnovestraseci.cz',
    phone: '+420 313 572 441',
    contactPerson: 'Mgr. Jiřina Kinkalová (ředitelka)',
    address: 'Komenského nám. 189, 271 01 Nové Strašecí',
    missing: ['schedule'],
    verification: 'verified_2025_2026',
    note:
      'Obory: hudební, výtvarný, taneční, literárně-dramatický. ' +
      'Měsíční školné 2025/26 (zdroj zusbubu.cz/inpage/skolne-714): hudební skupinová 320 Kč, ' +
      'hudební individuální 380 Kč, výtvarný 340 Kč, taneční 320 Kč, LDO 320 Kč — ke každému ' +
      '+80 Kč příspěvek SRPŠ; sborový zpěv 100 Kč bez SRPŠ. Ceník pro 2026/27 zatím nezveřejněn. ' +
      'ZUŠ NEMODELOVAT jako běžný kroužek — rozvrh se skládá individuálně podle nástroje a pedagoga. ' +
      'Pozn.: v registrech se stále drží starý e-mail zusnovstra@iol.cz, škola používá info@zusnovestraseci.cz.',
  },
  {
    id: 'studio-cvicka',
    name: 'Studio CvičKa',
    kind: 'private_studio',
    website: 'https://www.studiocvicka.cz/',
    email: 'info@studiocvicka.cz',
    phone: '+420 776 727 443',
    address: 'Havlíčkova 1155 (1. patro), 271 01 Nové Strašecí',
    missing: ['schedule', 'price'],
    verification: 'organization_verified',
    note:
      'Rezervační systém: https://studiocvicka.inrs.cz/rs — v době ověření zveřejněn přehled ' +
      'aktivit pro školní rok 2025/2026, nabídka 2026/27 ještě ne. ' +
      'Dřívější dětské kurzy (taneční 2,5–6 let, 6–16 let, pokročilí) NEPŘEBÍRAT do 2026/27 bez potvrzení.',
  },
  {
    id: 'kelti-nove-straseci',
    name: 'Kelti Nové Strašecí (basketbalový oddíl TJ Sokol Nové Strašecí z.s.)',
    kind: 'sport_club',
    website: 'http://www.nsbasket.cz/',
    email: 'lenka.nikodymova@email.cz',
    phone: '+420 737 206 785',
    contactPerson: 'Lenka Nikodýmová (organizační pracovník), Jaroslav Bílek — kelti@nsbasket.cz',
    address: 'Na Spravedlnosti 1186, 271 01 Nové Strašecí',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'organization_verified',
    note:
      'SAMOSTATNÝ KLUB — nezaměňovat s kroužkem „Basketbal – přípravka“ DDM. ' +
      'Evidován v ČBF pod TJ Sokol Nové Strašecí, mládežnické kategorie U14, U15, U17. ' +
      'Souřadnice klubu dle sportmap.cz: 50.14657, 13.90575.',
  },
  {
    id: 'hbc-nove-straseci',
    name: 'HBC Nové Strašecí (hokejbal)',
    kind: 'sport_club',
    website: 'https://www.hbcns.cz/',
    email: 'hbcns@centrum.cz',
    phone: '+420 731 925 965',
    contactPerson: 'Tomáš Duchoň; Aleš De Fin — šéftrenér mládeže, 728 921 277',
    missing: ['schedule', 'price'],
    verification: 'organization_verified',
    note:
      'Mládežnické kategorie dělené podle ročníků: Přípravka 2014–2015, Minipřípravka 2016–2017, ' +
      'Mikropřípravka 2018 a mladší, Mladší žáci 2012–2013, Starší žáci 2010–2011. ' +
      'Rozpis tréninků je na webu POUZE JAKO OBRÁZEK (hbcns.cz/treninky) — nutno opsat ručně. ' +
      'Domácí hřiště: Kocourek aréna — tedy stejné místo jako hokejbalové kroužky DDM. ' +
      'OVĚŘIT, zda DDM Hokejbal I–III není ve skutečnosti přípravka HBC pod hlavičkou DDM.',
  },
  {
    id: 'club-karate-tiger',
    name: 'Club Karate TIGER',
    kind: 'sport_club',
    website: 'http://karatetiger.wz.cz/',
    email: 'karatetiger@volny.cz',
    phone: '+420 603 425 234',
    contactPerson: 'Martin Valeš',
    missing: ['schedule'],
    verification: 'organization_verified',
    note: 'Partner kroužku Karate DDM; vybírá vlastní poplatek 1 000 Kč/rok. Vlastní tréninky neověřeny.',
  },
  {
    id: 'tj-sokol-fotbal',
    name: 'T.J. Sokol Nové Strašecí — fotbalový oddíl',
    kind: 'sport_club',
    website: 'http://fotbal-novestraseci.cz/',
    email: 'j.jurgi@seznam.cz',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'organization_verified',
  },
  {
    id: 'tj-sokol-florbal',
    name: 'T.J. Sokol Nové Strašecí — florbalový oddíl',
    kind: 'sport_club',
    website: 'http://www.florbalns.cz/',
    email: 'p.chochola@email.cz',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'organization_verified',
    note:
      'Registrován u Českého florbalu (ceskyflorbal.cz, tým 29132) a uveden mezi oddíly ' +
      'zapojenými do zářijového náborového měsíce pro děti 5–15 let.',
  },
  {
    id: 'tj-sokol-ski-team',
    name: 'T.J. Sokol Nové Strašecí — Ski Team',
    kind: 'sport_club',
    website: 'https://skiteam.webnode.cz/',
    email: 'jirinovas@email.cz',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'organization_verified',
  },
  {
    id: 'scns',
    name: 'Sportovní Centrum Nové Strašecí, z. s.',
    kind: 'sport_club',
    website: 'https://www.scns.cz/',
    email: 'luboslacina@seznam.cz',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'organization_verified',
    note: 'Atletika a dětská atletická přípravka; pořádá dětské atletické závody.',
  },
  {
    id: 'hc-nove-straseci',
    name: 'HC Nové Strašecí (lední hokej)',
    kind: 'sport_club',
    website: 'http://www.hcns.banda.cz/',
    email: 'suomy@centrum.cz',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'organization_verified',
  },
  {
    id: 'futsal-team-ns',
    name: 'Futsal Team Nové Strašecí',
    kind: 'sport_club',
    website: 'https://ftns.webnode.cz/',
    email: 'kjuba.j@gmail.com',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'organization_verified',
  },
  {
    id: 'junak-musketyri',
    name: 'Junák – český skaut, středisko Mušketýři Nové Strašecí',
    kind: 'youth_org',
    website: 'http://www.skautici.bubakov.net/',
    email: 'musketyrins@gmail.com',
    phone: '+420 732 589 982',
    address: 'Tovární 381, 271 01 Nové Strašecí',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'organization_verified',
  },
  {
    id: 'sdh-nove-straseci',
    name: 'Sbor dobrovolných hasičů Nové Strašecí — mladí hasiči',
    kind: 'youth_org',
    website: 'https://www.sdhns.com/',
    email: 'hasici@sdhns.com',
    address: 'Palackého 599, 271 01 Nové Strašecí',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'organization_verified',
  },
  {
    id: 'zko-nove-straseci',
    name: 'Základní kynologická organizace Nové Strašecí',
    kind: 'club',
    website: 'http://zkonovestraseci.wz.cz/',
    email: 's.midova@seznam.cz',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'organization_verified',
  },
  {
    id: 'nostradivadlo',
    name: 'NoStraDivadlo, o.s.',
    kind: 'culture',
    website: 'https://www.nostradivadlo.cz/',
    email: 'info@nostradivadlo.cz',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'organization_verified',
  },
  {
    id: 'ctyrlistek-ns',
    name: 'Soubor lidových písní a tanců Čtyřlístek Nové Strašecí',
    kind: 'culture',
    website: 'http://www.ctyrlistekns.cz/',
    email: 'gymn.novstra@iol.cz',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'organization_verified',
  },
  {
    id: 'male-stromy',
    name: 'Dětský klub Malých stromů',
    kind: 'culture',
    website: 'http://www.malestromy.cz/',
    email: 'janamatyskova15@seznam.cz',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'organization_verified',
  },
  {
    id: 'strasidylko',
    name: 'Spolek Strašidýlko',
    kind: 'culture',
    website: 'http://www.strasidylkozs.webnode.cz',
    email: 'strasidylkozs@email.cz',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'organization_verified',
  },
  {
    id: 'bubakov',
    name: 'Občanské sdružení bubakov.net',
    kind: 'culture',
    website: 'https://www.bubakov.net/',
    email: 'majzdva@bubakov.net',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'organization_verified',
  },
  {
    id: 'farnost-ns',
    name: 'Farnost Nové Strašecí',
    kind: 'culture',
    website: 'http://www.nove-straseci.eu/',
    email: 'straseci.fara@seznam.cz',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'organization_verified',
  },
  {
    id: 'zs-ms-komenskeho',
    name: 'ZŠ a MŠ J. A. Komenského v Novém Strašecí',
    kind: 'school',
    website: 'https://zsnovestraseci.cz/',
    email: 'skola@zsnovestraseci.cz',
    phone: '+420 311 240 400',
    contactPerson: 'Mgr. Petr Chochola (ředitel)',
    address: 'Komenského nám. 209, 271 01 Nové Strašecí',
    missing: ['existence'],
    verification: 'organization_verified',
    note:
      'ŠKOLA NEMÁ VLASTNÍ KATALOG KROUŽKŮ. Podle vlastní výroční zprávy poskytuje prostory ' +
      'a její pedagogové vedou kroužky POD HLAVIČKOU DDM. Do plánovače tedy nepatří jako ' +
      'samostatný organizátor — je to místo konání (viz NS_VENUES).',
  },
];

// ---------------------------------------------------------------------------
// PŘEHLED PRO PLÁNOVAČ
// ---------------------------------------------------------------------------

/** Kolik kroužků je dnes skutečně plánovatelných. */
export const NS_STATS = {
  season: '2026/2027',
  verifiedAt: VERIFIED_AT,
  plannableActivities: NS_CATALOG.activities.length, // 23
  organizationsPendingVerification: NS_PENDING.length,
  primarySource: 'https://www.ddmrako.cz/krouzky',
};
