import {
  type Catalog,
} from '@krouzky/domain';

/**
 * REÁLNÁ DATA — Nové Strašecí, školní rok 2026/2027.  Verze 3, 10. 8. 2026.
 *
 * ZDROJE
 *   [DDM]    https://www.ddmrako.cz/krouzky ......... katalog 2026/2027
 *   [SCNS]   https://www.scns.cz/index.php/treninky . rozvrh, akt. 9. 8. 2026
 *            https://www.scns.cz/index.php/cenik .... ceník, akt. 9. 8. 2026
 *   [FOTBAL] podklad od provozovatele katalogu (TJ Sokol NS, fotbalový oddíl)
 *   [SKAUT]  https://musketyri.skauting.cz/
 *   [ZUS]    https://www.zusbubu.cz/inpage/skolne-714/
 *   [MESTO]  https://www.novestraseci.cz/volny-cas/spolky-kluby-strany/
 *
 * PRAVIDLO #1: nic se nedopočítává. Neznámá hodnota = Number.NaN (souřadnice,
 * cena), aby výpočet spadl viditelně místo tichého nesmyslu. Chybějící rozvrh
 * = záznam patří do NS_PENDING, ne do katalogu.
 *
 * ---------------------------------------------------------------------------
 * POŽADOVANÉ ZMĚNY V @krouzky/domain
 * ---------------------------------------------------------------------------
 *  1) Price['period'] += 'per_year'
 *
 *  2) Activity['category'] +=
 *     'science' | 'tech' | 'dance' | 'art' | 'games' | 'outdoor'
 *     | 'martial_arts' | 'athletics'
 *
 *  3) CHYBÍ ENTITA MÍSTA KONÁNÍ. Organizátor ≠ místo. DDM sídlí v Rakovníku
 *     a učí na sedmi místech; SCNS trénuje ve čtyřech tělocvičnách a u staršího
 *     žactva se místo mění den ode dne. Bez místa u SessionGroup nelze počítat
 *     dojezd ze školy — což je jádro plánovače.
 *     → Catalog.venues: Venue[] + SessionGroup.venueId. Zatím v NS_VENUES.
 *
 *  4) CHYBÍ MODEL „VYBER SI N Z M TERMÍNŮ“. Dnes umíme jen:
 *     (a) alternativní skupiny — vybere se právě jedna,
 *     (b) skupina s více povinnými sessions (dvoufázový trénink).
 *     SCNS má třetí režim: dítě si vybere 1–3 tréninky týdně a CENA SE PODLE
 *     POČTU MĚNÍ (4 800 vs 6 500 Kč/rok). Zatím modelováno jako (a),
 *     cenové hladiny jsou v NS_ACTIVITY_META.priceTiers.
 *
 *  5) SEZÓNNÍ PLATNOST MÍSTA. Rozvrh SCNS má sloupec „tělocvična zima“ —
 *     tělocvičny platí pro zimní část, jinak se trénuje venku.
 *     Fotbal má stejný problém (tráva vs. umělka vs. zimní příprava).
 *
 *  6) Price['amount'] MUSÍ BÝT NULLABLE. Fotbalový oddíl má ověřený rozvrh,
 *     ale nezveřejněné příspěvky. Dnes musím psát Number.NaN, aby plánovač
 *     nespočítal rozpočet jako by byl kroužek zdarma.
 * ---------------------------------------------------------------------------
 */

/** Školní rok dle § 24 školského zákona (vyučování končí 30. 6.). */
const SCHOOL_YEAR = { start: '2026-09-01', end: '2027-06-30' };

const VERIFIED_AT = '2026-08-10';

/** Souřadnice nedohledané v oficiálním zdroji. */
const NO_COORD = { lat: Number.NaN, lon: Number.NaN };

/** Cena existuje, ale není zveřejněná. NIKDY nenahrazovat nulou. */
const PRICE_UNKNOWN = { amount: Number.NaN, period: 'per_year' as const };

/** GPS ZŠ / DDM, Komenského nám. 209 — z oficiálních stránek města. */
const ZS_COORD = { lat: 50.152636, lon: 13.901779 };

// ===========================================================================
// MÍSTA KONÁNÍ (dočasně mimo Catalog — viz bod 3)
// ===========================================================================

export type NsVenue = {
  id: string;
  /** Označení místa přesně tak, jak ho používá organizátor ve svém rozvrhu. */
  sourceLabel: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  lat: number;
  lon: number;
  outsideTown?: boolean;
  note?: string;
};

export const NS_VENUES: Record<string, NsVenue> = {
  // --- Areál ZŠ, Komenského nám. 209 --------------------------------------
  'zs-ucebna': {
    id: 'zs-ucebna',
    sourceLabel: 'DDM STRA - učebna ZŠ Nové Strašecí',
    name: 'ZŠ J. A. Komenského — učebna',
    street: 'Komenského nám. 209',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...ZS_COORD,
  },
  'zs-telocvicna': {
    id: 'zs-telocvicna',
    sourceLabel: 'DDM STRA - tělocvična ZŠ Nové Strašecí',
    name: 'ZŠ J. A. Komenského — tělocvična',
    street: 'Komenského nám. 209',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...ZS_COORD,
    note:
      'DDM tělocvičny nerozlišuje, SCNS ano („nová“, „stará“, „dřevěná“). ' +
      'Ověřit, kterou konkrétně DDM myslí.',
  },
  'telocvicna-skolni-nova': {
    id: 'telocvicna-skolni-nova',
    sourceLabel: 'nová školní (SCNS)',
    name: 'ZŠ J. A. Komenského — nová tělocvična',
    street: 'Komenského nám. 209',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...ZS_COORD,
    note: 'Umístění potvrzeno provozovatelem katalogu: nová tělocvična je v ZŠ Nové Strašecí.',
  },
  'ddm-ns': {
    id: 'ddm-ns',
    sourceLabel: 'DDM STRA - DDM Nové Strašecí',
    name: 'DDM Nové Strašecí (pracoviště)',
    street: 'Komenského nám. 209',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...ZS_COORD,
  },

  // --- Ostatní tělocvičny --------------------------------------------------
  'telocvicna-skolni-stara': {
    id: 'telocvicna-skolni-stara',
    sourceLabel: 'stará školní (SCNS)',
    name: 'Tělocvična „Školní – Stará“',
    street: 'U Školy',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note: 'Vchod naproti poště.',
  },
  'telocvicna-skolni-drevena': {
    id: 'telocvicna-skolni-drevena',
    sourceLabel: 'dřevěná školní (SCNS)',
    name: 'Tělocvična „Školní – Dřevěná“',
    street: 'Poděbradova',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note: 'Vchod přes školní dvůr.',
  },

  // --- Sportoviště ---------------------------------------------------------
  'hala-bios': {
    id: 'hala-bios',
    sourceLabel: 'DDM STRA - hala BIOS',
    name: 'Sportovní hala BIOS',
    street: 'Husova 1146',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note:
      'Pouze sportoviště, nikdy organizátor. Kromě DDM je to i domácí hala ' +
      'basketbalových Keltů (dle registru ČBF).',
  },
  'sokolovna-ns': {
    id: 'sokolovna-ns',
    sourceLabel: 'DDM STRA - Sokolovna Nové Strašecí',
    name: 'Sokolovna Nové Strašecí',
    street: '',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note: 'Přesná adresa i souřadnice k doplnění.',
  },
  'ms-kocourek': {
    id: 'ms-kocourek',
    sourceLabel: 'DDM STRA - MŠ Kocourek',
    name: 'MŠ Kocourek / hokejbalové hřiště „Kocourek aréna“',
    street: 'Jiřího Šotky 723',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note:
      'KOLIZE NÁZVŮ: DDM „MŠ Kocourek“ (Jiřího Šotky 723), SCNS „Kocourek“ ' +
      '(Ke Stadionu 1150), HBC „Kocourek aréna“. Rozhodnout, zda jde o jedno ' +
      'místo v areálu Na Kocourku, nebo o dvě sousední.',
  },
  'telocvicna-kocourek': {
    id: 'telocvicna-kocourek',
    sourceLabel: 'Kocourek (SCNS)',
    name: 'Tělocvična Kocourek',
    street: 'Ke Stadionu 1150',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note: 'Adresa dle scns.cz/kontakty. Viz kolize názvů u ms-kocourek.',
  },
  'fotbalovy-stadion': {
    id: 'fotbalovy-stadion',
    sourceLabel: 'Hřiště Nové Strašecí',
    name: 'Fotbalový stadion Nové Strašecí',
    street: 'U Stadionu 957',
    city: 'Nové Strašecí',
    postalCode: '271 01',
    ...NO_COORD,
    note:
      'Dvě hřiště (tráva + umělá tráva Megagrass 2050), PumpTrack a čtyři ' +
      'antukové tenisové kurty. Zdroj: novestraseci.cz. ' +
      'Fotbalový rozvrh nerozlišuje, na kterém z hřišť trénink probíhá.',
  },
  'zs-revnicov': {
    id: 'zs-revnicov',
    sourceLabel: 'DDM STRA - Tělocvična ZŠ Řevničov',
    name: 'Tělocvična ZŠ Řevničov',
    street: 'Masarykova 211',
    city: 'Řevničov',
    postalCode: '270 54',
    ...NO_COORD,
    outsideTown: true,
    note: 'MIMO Nové Strašecí (~6 km). Adresa dle registru hal ČBF.',
  },
};

// ===========================================================================
// KATALOG
// ===========================================================================

export const NS_CATALOG: Catalog = {
  city: 'Nové Strašecí',

  providers: [
    {
      id: 'ddm-rakovnik',
      name: 'Dům dětí a mládeže Rakovník, příspěvková organizace',
      kind: 'ddm',
      address: {
        street: 'S. K. Neumanna 251, Rakovník II',
        city: 'Rakovník',
        ...NO_COORD,
      },
      contact: {
        phone: '+420 731 610 569',
        personName: 'Jitka Samšuková (vedoucí pracoviště Nové Strašecí)',
      },
    },
    {
      id: 'scns',
      name: 'Sportovní Centrum Nové Strašecí, z. s.',
      kind: 'sport_club',
      address: { street: 'Ke Stadionu 1150', city: 'Nové Strašecí', ...NO_COORD },
      contact: {
        phone: '+420 606 268 804',
        personName: 'Lukáš Knobloch (manager klubu, trenér atletiky)',
      },
    },
    {
      id: 'sokol-fotbal',
      name: 'TJ Sokol Nové Strašecí, z. s. — fotbalový oddíl',
      kind: 'sport_club',
      address: { street: 'U Stadionu 957', city: 'Nové Strašecí', ...NO_COORD },
      contact: {
        phone: '+420 602 682 401',
        personName: 'Ing. Jiří Jurgovski (j.jurgi@seznam.cz)',
      },
    },
  ],

  activities: [
    // =====================================================================
    // DDM RAKOVNÍK — pracoviště Nové Strašecí
    // =====================================================================
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
        'skládání dalekohledu, večerní pozorování kvalitním dalekohledem.',
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
        'Možnosti robota, programování, konstrukce robotů, stavebnice. Pro žáky 2. stupně ZŠ.',
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
      description: 'Základy programování, logické myšlení, robotizace. Pro 3.–6. třídu.',
    },
    {
      id: 'ddm-dovedne-ruce',
      providerId: 'ddm-rakovnik',
      name: 'Dovedné ruce',
      category: 'crafts',
      ageMin: 6,
      ageMax: 10,
      price: { amount: 1300, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description: 'Výroba drobných dárků z různých materiálů, základní techniky ručních prací.',
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
        'Výtvarné dovednosti dle fantazie i předloh, různé malířské techniky, kombinování materiálů.',
    },
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
        'Turistika po okolí, příroda a životní prostředí, turistické značení, ekologie, ' +
        'mapy a plány města, venkovní hry, stopovačky a bojovky.',
    },
    {
      id: 'ddm-sportovni-i',
      providerId: 'ddm-rakovnik',
      name: 'Sportovní kroužek I. (mladší žactvo)',
      category: 'sport',
      ageMin: 5,
      ageMax: 9,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description: 'Všeobecná sportovní průprava — atletika, gymnastika, míčové hry, koordinace.',
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
      description: 'Všeobecná sportovní průprava — atletika, gymnastika, míčové hry, koordinace.',
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
      description: 'Pohybové schopnosti, herní činnosti, pravidla her, týmová spolupráce.',
    },
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
        'Informativní schůzka v hale BIOS během září.',
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
        'Informativní schůzka v hale BIOS během září.',
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
      description: 'Hra a herní situace, pravidla, nácvik technik, mistrovské zápasy, řízená hra.',
    },
    {
      id: 'ddm-hokejbal-i',
      providerId: 'ddm-rakovnik',
      name: 'Hokejbal I. — minipřípravka',
      category: 'sport',
      ageMin: 5,
      ageMax: 7,
      price: { amount: 1000, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description: 'Základní hokejbalové dovednosti, pravidla, práce s holí, turnaje.',
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
        'Herní situace, technika hry, útočné a obranné činnosti jednotlivců i brankářů, ' +
        'týmová spolupráce, fair play.',
    },
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
        'Všeobecné pohybové dovednosti s důrazem na basketbalovou techniku, spolupráce, ' +
        'disciplína, vytrvalost. Ročníky 2014–2017, soutěž Šmoulinka cup. ' +
        'POZOR: kromě poplatku DDM se vybírají členské příspěvky (výše nezveřejněna).',
    },
    {
      id: 'ddm-basketbal-chlapci',
      providerId: 'ddm-rakovnik',
      name: 'Basketbal — chlapci 13–18 let',
      category: 'sport',
      ageMin: 13,
      ageMax: 18,
      targetGender: 'boys',
      price: { amount: 1200, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Výkonnostní basketbal — individuální činnost jednotlivce, pohybový i mentální rozvoj. ' +
        'Licencovaní trenéři, soutěžní zápasy. ' +
        'POZOR: všechny tréninky i zápasy jsou v ZŠ Řevničov, tedy MIMO Nové Strašecí.',
    },
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
        'Postoje karate, obratnostní a pohybová cvičení, základy zápasu dle pravidel. ' +
        'POZOR: klub karate vybírá navíc 1 000 Kč/rok — reálné minimum 2 300 Kč/rok.',
    },
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
        'Základní hip hop, house a hype prvky. Přihlašování NEJDŘÍVE přes HB Dance Praha, ' +
        'teprve potom do systému DDM. Platba hromadně — neplaťte sami.',
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
        'Pokročilá skupina. Přihlašování NEJDŘÍVE přes HB Dance Praha, ' +
        'teprve potom do systému DDM. Platba hromadně — neplaťte sami.',
    },

    // =====================================================================
    // SPORTOVNÍ CENTRUM NOVÉ STRAŠECÍ (SCNS)
    // Věk ODVOZEN z ročníku narození — autoritativní je birthYears v META.
    // =====================================================================
    {
      id: 'scns-atletika-0',
      providerId: 'scns',
      name: 'Atletická miniškolička (Atletika 0)',
      category: 'athletics',
      ageMin: 3,
      ageMax: 4,
      price: { amount: 4800, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Nejmenší organizovaná skupina, ročník 2023. Tréninky hravou formou s individuálním ' +
        'přístupem, cílem je zapojit děti do sportování. V ceně klubové tričko.',
    },
    {
      id: 'scns-atletika-1',
      providerId: 'scns',
      name: 'Atletická školička (Atletika I)',
      category: 'athletics',
      ageMin: 4,
      ageMax: 6,
      price: { amount: 4800, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Nejpočetnější skupina klubu, ročníky 2021 a 2022. Důraz na všeobecnou přípravu, ' +
        'rychlost a koordinaci; v zimě gymnastická průprava. Trenér Lukáš Knobloch. ' +
        'Cena platí pro 1 trénink týdně; při 2 a více je 6 500 Kč/rok.',
    },
    {
      id: 'scns-atletika-2',
      providerId: 'scns',
      name: 'Atletická minipřípravka (Atletika II)',
      category: 'athletics',
      ageMin: 6,
      ageMax: 9,
      price: { amount: 4800, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Ročníky 2019 a 2020, po individuálním posouzení i 2018. Navazuje na Atletiku I, ' +
        'důslednější kontrola technických dovedností. Trenér Lukáš Knobloch. ' +
        'Cena platí pro 1 trénink týdně; při 2 a více je 6 500 Kč/rok.',
    },
    {
      id: 'scns-atletika-pripravka',
      providerId: 'scns',
      name: 'Atletika — přípravka',
      category: 'athletics',
      ageMin: 8,
      ageMax: 11,
      price: { amount: 6500, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Ročníky 2016, 2017 a dle posouzení 2018. Závodní skupina — skok do dálky a do výšky, ' +
        'překážky, vrh koulí, běžecké tratě, bez brzké specializace. Závody nejsou povinné. ' +
        'Při individuálním plánu (max. 1x týdně) je cena 4 800 Kč/rok.',
    },
    {
      id: 'scns-atletika-mladsi-zactvo',
      providerId: 'scns',
      name: 'Atletika — mladší žactvo',
      category: 'athletics',
      ageMin: 11,
      ageMax: 13,
      price: { amount: 6500, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Ročníky 2014 a 2015. Závodní skupina jezdící na akce Českého atletického svazu, ' +
        'trénink všech disciplín bez specializace, možnost individuálních tréninků. ' +
        'Trenéři Lukáš Knobloch a Kamil Černý. ' +
        'Při individuálním plánu (max. 1x týdně) je cena 4 800 Kč/rok.',
    },
    {
      id: 'scns-atletika-starsi-zactvo',
      providerId: 'scns',
      name: 'Atletika — starší žactvo a dorost',
      category: 'athletics',
      ageMin: 13,
      ageMax: 19,
      price: { amount: 6500, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Ročník 2013 a starší. Plně specializovaná závodní skupina, celoroční účast na závodech ' +
        'ČAS. PODMÍNKOU je účast na závodech a pravidelná docházka. ' +
        'Trenéři Michaela Drábková a Kamil Černý. ' +
        'Při individuálním plánu (max. 1x týdně) je cena 4 800 Kč/rok.',
    },
    {
      id: 'scns-gymnastika',
      providerId: 'scns',
      name: 'Gymnastika pro děti',
      category: 'sport',
      ageMin: 6,
      ageMax: 18,
      price: { amount: 4800, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Základy gymnastiky, cvičení na nářadí, hravou formou bez zavedeného drilu. ' +
        'Dělená na začátečníky a pokročilé, zařazení podle individuálního posouzení. ' +
        'Pro děti ročníku 2020 a starší. Trenéři Michal Hynek a Tomáš Hamouz. ' +
        'Cena platí pro 1 trénink týdně; při 2 týdně je 6 500 Kč/rok.',
    },
    {
      id: 'scns-box-deti',
      providerId: 'scns',
      name: 'Škola boxu — děti',
      category: 'martial_arts',
      ageMin: 7,
      ageMax: 15,
      price: { amount: 4800, period: 'per_year' },
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Osvojení základní boxerské techniky a rozvoj pohybových schopností. ' +
        'Nábory celoročně během tréninku. Zařazení podle individuálního posouzení. ' +
        'Trenér Luboš Lacina. Cena platí pro 1 trénink týdně; při 2 a více je 6 500 Kč/rok.',
    },

    // =====================================================================
    // TJ SOKOL NOVÉ STRAŠECÍ — FOTBAL
    // Rozvrh ověřen. CENA NENÍ ZVEŘEJNĚNA → PRICE_UNKNOWN (NaN), ne nula.
    // Věk odvozen ze standardních kategorií FAČR — viz ageSource v META.
    // =====================================================================
    {
      id: 'fotbal-mini-pripravka',
      providerId: 'sokol-fotbal',
      name: 'Fotbal — mini přípravka',
      category: 'sport',
      ageMin: 5,
      ageMax: 7,
      price: PRICE_UNKNOWN,
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Nejmladší fotbalová kategorie. Trenér Michal Drtina, +420 606 644 294. ' +
        'Členské příspěvky nejsou veřejně zveřejněny — ověřit u oddílu.',
    },
    {
      id: 'fotbal-mladsi-pripravka',
      providerId: 'sokol-fotbal',
      name: 'Fotbal — mladší přípravka',
      category: 'sport',
      ageMin: 7,
      ageMax: 9,
      price: PRICE_UNKNOWN,
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Trenér Marek Kedroň, +420 603 363 951. Asistent Jakub Jančařík, ' +
        'jakub.jancarik@email.cz, +420 724 522 046. ' +
        'Členské příspěvky nejsou veřejně zveřejněny — ověřit u oddílu.',
    },
    {
      id: 'fotbal-starsi-pripravka',
      providerId: 'sokol-fotbal',
      name: 'Fotbal — starší přípravka',
      category: 'sport',
      ageMin: 9,
      ageMax: 11,
      price: PRICE_UNKNOWN,
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Trenér Jan Kočí, +420 731 220 090. Vedoucí týmu Karel Uher, +420 702 023 877. ' +
        'Členské příspěvky nejsou veřejně zveřejněny — ověřit u oddílu.',
    },
    {
      id: 'fotbal-mladsi-zaci',
      providerId: 'sokol-fotbal',
      name: 'Fotbal — mladší žáci',
      category: 'sport',
      ageMin: 11,
      ageMax: 13,
      price: PRICE_UNKNOWN,
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Trenér Martin Hrbek, +420 732 945 601. Vedoucí týmu Lukáš Mrázek, +420 606 741 292. ' +
        'Asistent a trenér brankářů David Růžička, +420 603 358 101. ' +
        'Členské příspěvky nejsou veřejně zveřejněny — ověřit u oddílu.',
    },
    {
      id: 'fotbal-starsi-zaci',
      providerId: 'sokol-fotbal',
      name: 'Fotbal — starší žáci',
      category: 'sport',
      ageMin: 13,
      ageMax: 15,
      price: PRICE_UNKNOWN,
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Jediná kategorie se třemi tréninky týdně. Trenér Ing. Ivan Haužvic, +420 734 546 373. ' +
        'Vedoucí týmu Karel Mai. ' +
        'Členské příspěvky nejsou veřejně zveřejněny — ověřit u oddílu.',
    },
    {
      id: 'fotbal-dorost',
      providerId: 'sokol-fotbal',
      name: 'Fotbal — dorost',
      category: 'sport',
      ageMin: 15,
      ageMax: 19,
      price: PRICE_UNKNOWN,
      lastVerifiedAt: VERIFIED_AT,
      description:
        'Trenér Mgr. Marek Hartman, hartman9@seznam.cz, +420 734 546 373. ' +
        'Vedoucí týmu Ing. Jiří Jurgovski, j.jurgi@seznam.cz, +420 602 682 401. ' +
        'Členské příspěvky nejsou veřejně zveřejněny — ověřit u oddílu.',
    },
  ],

  sessionGroups: [
    // ===================== DDM — jeden termín týdně =====================
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

    // ============ DDM — dva POVINNÉ tréninky v jedné skupině ============
    g('ddm-florbal-i', [s(3, 990, 1080), s(4, 990, 1080)]),
    g('ddm-florbal-ii', [s(3, 840, 930), s(5, 840, 930)]),
    g('ddm-florbal-iii', [s(1, 1110, 1200), s(4, 1110, 1200)]),
    g('ddm-hokejbal-i', [s(2, 960, 1080), s(4, 960, 1080)]),
    g('ddm-hokejbal-ii', [s(2, 960, 1080), s(4, 960, 1080)]),
    g('ddm-hokejbal-iii', [s(1, 960, 1080), s(3, 960, 1080)]),
    g('ddm-basketbal-pripravka', [s(1, 990, 1080), s(3, 990, 1080)]),
    g('ddm-basketbal-chlapci', [s(2, 1005, 1095), s(4, 1005, 1095)]),
    g('ddm-karate', [s(1, 1050, 1140), s(3, 1050, 1140)]),

    // ===================== SCNS — volitelné termíny =====================
    // Modelováno jako alternativy, ale realita je „vyber 1–3“. Viz bod 4.
    g('scns-atletika-0', [s(1, 975, 1020)], 'Pondělí 16:15'),

    g('scns-atletika-1', [s(1, 960, 1020)], 'Pondělí 16:00'),
    g('scns-atletika-1', [s(4, 900, 960)], 'Čtvrtek 15:00', 2),
    g('scns-atletika-1', [s(4, 960, 1020)], 'Čtvrtek 16:00', 3),

    g('scns-atletika-2', [s(1, 900, 960)], 'Pondělí 15:00'),
    g('scns-atletika-2', [s(2, 840, 900)], 'Úterý 14:00', 2),
    g('scns-atletika-2', [s(4, 840, 900)], 'Čtvrtek 14:00', 3),

    g('scns-atletika-pripravka', [s(2, 900, 990)], 'Úterý 15:00'),
    g('scns-atletika-pripravka', [s(3, 900, 990)], 'Středa 15:00', 2),
    g('scns-atletika-pripravka', [s(5, 900, 990)], 'Pátek 15:00', 3),

    g('scns-atletika-mladsi-zactvo', [s(2, 990, 1080)], 'Úterý 16:30'),
    g('scns-atletika-mladsi-zactvo', [s(3, 990, 1080)], 'Středa 16:30', 2),
    g('scns-atletika-mladsi-zactvo', [s(5, 990, 1080)], 'Pátek 16:30', 3),

    g('scns-atletika-starsi-zactvo', [s(2, 990, 1080)], 'Úterý 16:30'),
    g('scns-atletika-starsi-zactvo', [s(3, 990, 1080)], 'Středa 16:30', 2),
    g('scns-atletika-starsi-zactvo', [s(5, 990, 1080)], 'Pátek 16:30', 3),

    g('scns-gymnastika', [s(3, 990, 1080)], 'Středa 16:30'),
    g('scns-gymnastika', [s(5, 990, 1110)], 'Pátek 16:30', 2),

    g('scns-box-deti', [s(1, 1020, 1080)], 'Pondělí 17:00'),
    g('scns-box-deti', [s(2, 1020, 1140)], 'Úterý 17:00', 2),
    g('scns-box-deti', [s(4, 1020, 1080)], 'Čtvrtek 17:00', 3),

    // ============ FOTBAL — všechny tréninky kategorie povinné ============
    g('fotbal-mini-pripravka', [s(2, 960, 1020), s(4, 960, 1020)]),
    g('fotbal-mladsi-pripravka', [s(2, 990, 1080), s(4, 990, 1080)]),
    g('fotbal-starsi-pripravka', [s(2, 960, 1050), s(5, 960, 1050)]),
    g('fotbal-mladsi-zaci', [s(1, 990, 1080), s(3, 990, 1080)]),
    g('fotbal-starsi-zaci', [s(1, 990, 1080), s(3, 990, 1080), s(4, 990, 1080)]),
    g('fotbal-dorost', [s(2, 1020, 1110), s(5, 990, 1080)]),
  ],
};

// ===========================================================================
// HELPERY
// ===========================================================================

type RawSession = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startMinutes: number;
  endMinutes: number;
};

/** Jeden termín. Čas v minutách od půlnoci (14:00 → 840). */
function s(
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  startMinutes: number,
  endMinutes: number,
): RawSession {
  return { weekday, startMinutes, endMinutes };
}

/**
 * Jedna skupina = jedna varianta docházky.
 * Sessions UVNITŘ skupiny jsou povinné, více skupin nad aktivitou = alternativy.
 */
function g(
  activityId: string,
  sessions: RawSession[],
  label?: string,
  variant = 1,
) {
  const groupId = variant === 1 ? `${activityId}-g` : `${activityId}-g${variant}`;
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

// ===========================================================================
// METADATA MIMO DOMÉNOVÝ MODEL
// ===========================================================================

export type VerificationStatus =
  | 'verified_2026_2027'
  | 'verified_2025_2026'
  | 'organization_verified'
  | 'needs_confirmation'
  | 'price_missing'
  | 'price_incomplete'
  | 'schedule_missing'
  | 'source_blocked';

export type NsActivityMeta = {
  venueId: (keyof typeof NS_VENUES) | (keyof typeof NS_VENUES)[];
  sourceUrl?: string;
  /** Odkaz na přihlášku; když chybí, použije se `sourceUrl` (C8-D5). */
  applicationUrl?: string;
  /** Uzávěrka přihlášek `YYYY-MM-DD` — DOPLNIT ověřenou hodnotou (BL-017). */
  applicationDeadline?: string;
  source?: string;
  verification: VerificationStatus;
  isNew?: boolean;
  /** AUTORITATIVNÍ u SCNS — ageMin/ageMax v Activity jsou odvozené. */
  birthYears?: number[];
  /** Odkud pochází ageMin/ageMax, pokud nejsou přímo ze zdroje. */
  ageSource?: 'source' | 'derived_from_birth_years' | 'derived_from_facr_categories';
  priceTiers?: { label: string; amount: number; firstSemester?: number; secondSemester?: number }[];
  additionalFees?: { payer: string; amount: number | null; period: 'per_year'; mandatory: boolean }[];
  instructor?: string;
  /** Uvedené tělocvičny platí pro zimní část sezóny. */
  winterVenueOnly?: boolean;
  note?: string;
};

const DDM = 'https://www.ddmrako.cz/krouzky/';
const SCNS_ROZVRH = 'https://www.scns.cz/index.php/treninky';

export const NS_ACTIVITY_META: Record<string, NsActivityMeta> = {
  // ---- DDM -------------------------------------------------------------
  'ddm-astronomie': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2011-astronomicky-krouzek`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-veda-je-zabava': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2013-veda-je-zabava`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-robotika': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2016-inteligentni-robotika`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-elektrotechnik': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2017-mlady-elektrotechnik`, verification: 'verified_2026_2027', ageSource: 'source', isNew: true },
  'ddm-programovani': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2015-programovani`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-dovedne-ruce': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2018-dovedne-ruce`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-vytvarne-tvoreni': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2019-vytvarne-tvoreni`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-deskove-hry': { venueId: 'zs-ucebna', sourceUrl: `${DDM}2014-deskove-a-jine-hry`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-venkovni-dobrodruzstvi': { venueId: 'ddm-ns', sourceUrl: `${DDM}2012-venkovni-dobrodruzstvi`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-sportovni-i': { venueId: 'zs-telocvicna', sourceUrl: `${DDM}2010-sportovni-krouzek-i-mladsi-zactvo`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-sportovni-ii': { venueId: 'zs-telocvicna', sourceUrl: `${DDM}2022-sportovni-krouzek-ii-starsi-zactvo`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-micove-hry': { venueId: 'zs-telocvicna', sourceUrl: `${DDM}2009-micove-hry`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-florbal-i': { venueId: 'hala-bios', sourceUrl: `${DDM}2000-florbal-i-elevky-minizakyne`, verification: 'verified_2026_2027', ageSource: 'source', note: 'BIOS = pouze místo konání.' },
  'ddm-florbal-ii': { venueId: 'hala-bios', sourceUrl: `${DDM}2001-florbal-ii-mladsi-zakyne`, verification: 'verified_2026_2027', ageSource: 'source', note: 'BIOS = pouze místo konání.' },
  'ddm-florbal-iii': { venueId: 'hala-bios', sourceUrl: `${DDM}2002-florbal-iii-starsi-zakyne-a-dorostenky`, verification: 'verified_2026_2027', ageSource: 'source', note: 'BIOS = pouze místo konání.' },
  'ddm-hokejbal-i': { venueId: 'ms-kocourek', sourceUrl: `${DDM}2006-hokejbal-i-minipripravka`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-hokejbal-ii': { venueId: 'ms-kocourek', sourceUrl: `${DDM}2007-hokejbal-ii-pripravka`, verification: 'verified_2026_2027', ageSource: 'source' },
  'ddm-hokejbal-iii': { venueId: 'ms-kocourek', sourceUrl: `${DDM}2008-hokejbal-iii-zaci`, verification: 'verified_2026_2027', ageSource: 'source' },

  'ddm-basketbal-pripravka': {
    venueId: 'hala-bios',
    sourceUrl: `${DDM}2004-basketbal-pripravka`,
    verification: 'price_incomplete',
    ageSource: 'source',
    birthYears: [2014, 2015, 2016, 2017],
    additionalFees: [{ payer: 'členské příspěvky (výše nezveřejněna)', amount: null, period: 'per_year', mandatory: true }],
    note:
      'Vlastní kroužek DDM (Šmoulinka cup). NENÍ to kroužek Kelti — katalog DDM ' +
      'u tohoto kroužku Kelty vůbec neuvádí. Kelti jsou samostatný oddíl TJ Sokol NS.',
  },
  'ddm-basketbal-chlapci': {
    venueId: 'zs-revnicov',
    sourceUrl: `${DDM}2005-basketbal-chlapci-13-18-let`,
    verification: 'verified_2026_2027',
    ageSource: 'source',
    note: 'Jediný basketbalový kroužek DDM odkazující na nsbasket.cz (Kelti). Koná se v Řevničově.',
  },
  'ddm-karate': {
    venueId: 'zs-telocvicna',
    sourceUrl: `${DDM}2003-karate`,
    verification: 'verified_2026_2027',
    ageSource: 'source',
    additionalFees: [{ payer: 'Club Karate TIGER', amount: 1000, period: 'per_year', mandatory: true }],
    note: 'Známé minimum celkem: 1 300 + 1 000 = 2 300 Kč/rok.',
  },
  'ddm-street-dance-zacatecnici': {
    venueId: 'sokolovna-ns',
    sourceUrl: `${DDM}2020-street-dance-ns-zacatecnici`,
    verification: 'verified_2026_2027',
    ageSource: 'source',
    note: 'Přihlášky přes HB Dance Praha: Jan Bartoš 774 944 272 / Veronika Vostatková 776 701 358.',
  },
  'ddm-street-dance-pokrocili': {
    venueId: 'sokolovna-ns',
    sourceUrl: `${DDM}2023-street-dance-ns-pokrocili`,
    verification: 'verified_2026_2027',
    ageSource: 'source',
    note: 'Přihlášky přes HB Dance Praha: Jan Bartoš 774 944 272 / Veronika Vostatková 776 701 358.',
  },

  // ---- SCNS -------------------------------------------------------------
  'scns-atletika-0': {
    venueId: 'telocvicna-kocourek',
    sourceUrl: SCNS_ROZVRH,
    verification: 'verified_2026_2027',
    birthYears: [2023],
    ageSource: 'derived_from_birth_years',
    instructor: 'Klára Doušová',
    winterVenueOnly: true,
    priceTiers: [{ label: 'roční', amount: 4800, firstSemester: 3300, secondSemester: 1500 }],
    note: 'V ceně klubové tričko. VS pro atletiku 1001, účet 1028811109/5500.',
  },
  'scns-atletika-1': {
    venueId: 'telocvicna-kocourek',
    sourceUrl: SCNS_ROZVRH,
    verification: 'verified_2026_2027',
    birthYears: [2021, 2022],
    ageSource: 'derived_from_birth_years',
    instructor: 'Lukáš Knobloch',
    winterVenueOnly: true,
    priceTiers: [
      { label: '1x týdně', amount: 4800, firstSemester: 3300, secondSemester: 1500 },
      { label: '2x a více týdně', amount: 6500, firstSemester: 5000, secondSemester: 1500 },
    ],
    note:
      'V rozvrhu sdílí řádek s miniškoličkou. Pondělní termín 16:00–17:00 se překrývá ' +
      's miniškoličkou 16:15–17:00 (jiný trenér) — jde o paralelní skupiny na Kocourku.',
  },
  'scns-atletika-2': {
    venueId: 'telocvicna-kocourek',
    sourceUrl: SCNS_ROZVRH,
    verification: 'verified_2026_2027',
    birthYears: [2019, 2020, 2018],
    ageSource: 'derived_from_birth_years',
    instructor: 'Lukáš Knobloch',
    winterVenueOnly: true,
    priceTiers: [
      { label: '1x týdně', amount: 4800, firstSemester: 3300, secondSemester: 1500 },
      { label: '2x a více týdně', amount: 6500, firstSemester: 5000, secondSemester: 1500 },
    ],
    note: 'Ročník 2018 jen po individuálním posouzení.',
  },
  'scns-atletika-pripravka': {
    venueId: 'telocvicna-kocourek',
    sourceUrl: SCNS_ROZVRH,
    verification: 'verified_2026_2027',
    birthYears: [2016, 2017, 2018],
    ageSource: 'derived_from_birth_years',
    instructor: 'Lukáš Knobloch',
    winterVenueOnly: true,
    priceTiers: [
      { label: 'standard', amount: 6500, firstSemester: 5000, secondSemester: 1500 },
      { label: 'individuální plán, max. 1x týdně', amount: 4800, firstSemester: 3300, secondSemester: 1500 },
    ],
    note: 'Ročník 2018 jen po individuálním posouzení — překrývá se s Atletikou II.',
  },
  'scns-atletika-mladsi-zactvo': {
    venueId: 'telocvicna-skolni-nova',
    sourceUrl: SCNS_ROZVRH,
    verification: 'verified_2026_2027',
    birthYears: [2014, 2015],
    ageSource: 'derived_from_birth_years',
    instructor: 'Lukáš Knobloch + Kamil Černý',
    winterVenueOnly: true,
    priceTiers: [
      { label: 'standard', amount: 6500, firstSemester: 5000, secondSemester: 1500 },
      { label: 'individuální plán, max. 1x týdně', amount: 4800, firstSemester: 3300, secondSemester: 1500 },
    ],
    note: 'Všechny tři tréninky v nové tělocvičně ZŠ Nové Strašecí.',
  },
  'scns-atletika-starsi-zactvo': {
    venueId: ['telocvicna-skolni-nova', 'telocvicna-kocourek'],
    sourceUrl: SCNS_ROZVRH,
    verification: 'verified_2026_2027',
    birthYears: [2013],
    ageSource: 'derived_from_birth_years',
    instructor: 'Michaela Drábková + Kamil Černý',
    winterVenueOnly: true,
    priceTiers: [
      { label: 'standard', amount: 6500, firstSemester: 5000, secondSemester: 1500 },
      { label: 'individuální plán, max. 1x týdně', amount: 4800, firstSemester: 3300, secondSemester: 1500 },
    ],
    note:
      'RŮZNÁ MÍSTA PODLE DNE: úterý nová tělocvična ZŠ, středa a pátek Kocourek. ' +
      'Ročník 2013 a starší, horní hranice není stanovena. Podmínkou je účast na závodech.',
  },
  'scns-gymnastika': {
    venueId: ['telocvicna-skolni-drevena', 'telocvicna-skolni-stara'],
    sourceUrl: SCNS_ROZVRH,
    verification: 'verified_2026_2027',
    birthYears: [2020],
    ageSource: 'derived_from_birth_years',
    instructor: 'Michal Hynek, Tomáš Hamouz',
    winterVenueOnly: true,
    priceTiers: [
      { label: '1x týdně', amount: 4800, firstSemester: 3300, secondSemester: 1500 },
      { label: '2x týdně', amount: 6500, firstSemester: 5000, secondSemester: 1500 },
    ],
    note:
      'RŮZNÁ MÍSTA PODLE DNE: středa dřevěná školní, pátek stará školní. ' +
      'Rozvrh uvádí „individuální posouzení“; ročník 2020 a starší dle popisu oddílu. ' +
      'ageMax 18 je odhad pro UI, ne údaj ze zdroje. VS pro gymnastiku 1003.',
  },
  'scns-box-deti': {
    venueId: 'telocvicna-kocourek',
    sourceUrl: SCNS_ROZVRH,
    verification: 'verified_2026_2027',
    ageSource: 'source',
    instructor: 'Luboš Lacina',
    winterVenueOnly: true,
    priceTiers: [
      { label: '1x týdně', amount: 4800, firstSemester: 3300, secondSemester: 1500 },
      { label: '2x a více týdně', amount: 6500, firstSemester: 5000, secondSemester: 1500 },
    ],
    note:
      'Věk 7–15 let dle popisu oddílu; rozvrh uvádí „individuální posouzení“. ' +
      'Úterní trénink je delší (17:00–19:00). VS pro box 1002.',
  },

  // ---- FOTBAL -----------------------------------------------------------
  'fotbal-mini-pripravka': {
    venueId: 'fotbalovy-stadion',
    source: 'Podklad od provozovatele katalogu (TJ Sokol NS, fotbalový oddíl)',
    verification: 'price_missing',
    ageSource: 'derived_from_facr_categories',
    instructor: 'Michal Drtina (+420 606 644 294)',
    note: 'Věk odvozen z kategorie U7 — POTVRDIT ročníky u trenéra.',
  },
  'fotbal-mladsi-pripravka': {
    venueId: 'fotbalovy-stadion',
    source: 'Podklad od provozovatele katalogu',
    verification: 'price_missing',
    ageSource: 'derived_from_facr_categories',
    instructor: 'Marek Kedroň (+420 603 363 951), asistent Jakub Jančařík (+420 724 522 046)',
    note:
      'Věk odvozen z kategorie U9 — POTVRDIT. ' +
      'POZOR: ve zdrojovém podkladu měl odkaz na e-mail Jančaříka chybný cíl ' +
      '(j.jurgi@seznam.cz). Zde je použita adresa z popisku: jakub.jancarik@email.cz.',
  },
  'fotbal-starsi-pripravka': {
    venueId: 'fotbalovy-stadion',
    source: 'Podklad od provozovatele katalogu',
    verification: 'price_missing',
    ageSource: 'derived_from_facr_categories',
    instructor: 'Jan Kočí (+420 731 220 090), vedoucí Karel Uher (+420 702 023 877)',
    note: 'Věk odvozen z kategorie U11 — POTVRDIT. Jediná kategorie s tréninkem v pátek.',
  },
  'fotbal-mladsi-zaci': {
    venueId: 'fotbalovy-stadion',
    source: 'Podklad od provozovatele katalogu',
    verification: 'price_missing',
    ageSource: 'derived_from_facr_categories',
    instructor:
      'Martin Hrbek (+420 732 945 601), vedoucí Lukáš Mrázek (+420 606 741 292), ' +
      'trenér brankářů David Růžička (+420 603 358 101)',
    note: 'Věk odvozen z kategorie U13 — POTVRDIT.',
  },
  'fotbal-starsi-zaci': {
    venueId: 'fotbalovy-stadion',
    source: 'Podklad od provozovatele katalogu',
    verification: 'price_missing',
    ageSource: 'derived_from_facr_categories',
    instructor: 'Ing. Ivan Haužvic (+420 734 546 373), vedoucí Karel Mai',
    note:
      'Věk odvozen z kategorie U15 — POTVRDIT. Tři tréninky týdně (Po, St, Čt). ' +
      'POZOR: telefon 734 546 373 je v podkladu uveden i u trenéra dorostu Hartmana — ' +
      'ověřit, zda nejde o překlep.',
  },
  'fotbal-dorost': {
    venueId: 'fotbalovy-stadion',
    source: 'Podklad od provozovatele katalogu',
    verification: 'price_missing',
    ageSource: 'derived_from_facr_categories',
    instructor:
      'Mgr. Marek Hartman (hartman9@seznam.cz, +420 734 546 373), ' +
      'vedoucí Ing. Jiří Jurgovski (j.jurgi@seznam.cz, +420 602 682 401)',
    note:
      'Věk odvozen z kategorie U19 — POTVRDIT. Jediná kategorie s posunutým začátkem ' +
      'v úterý (17:00). Viz poznámka ke sdílenému telefonu u starších žáků.',
  },
};

// ===========================================================================
// MIMO KATALOG — ověřené organizace bez kompletních dat pro plánovač
// ===========================================================================

export type NsPendingOrg = {
  id: string;
  name: string;
  kind: string;
  website?: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  missing: ('schedule' | 'end_time' | 'price' | 'age_groups' | 'existence')[];
  verification: VerificationStatus;
  /** Co už víme — aby se to při doplňování nemuselo hledat znovu. */
  known?: string;
  note?: string;
};

export const NS_PENDING: NsPendingOrg[] = [
  {
    id: 'kelti-nove-straseci',
    name: 'Kelti Nové Strašecí — basketbalový oddíl TJ Sokol Nové Strašecí, z. s.',
    kind: 'sport_club',
    website: 'http://www.nsbasket.cz/',
    email: 'lenka.nikodymova@email.cz',
    phone: '+420 737 206 785',
    contactPerson: 'Lenka Nikodýmová (organizační pracovník)',
    address: 'TJ Sokol Nové Strašecí, Na Spravedlnosti 1186, 271 01 Nové Strašecí',
    missing: ['schedule', 'price'],
    verification: 'source_blocked',
    known:
      'Klub založen 2014, IČ 16981448, v registru ČBF vedeny 4 týmy. ' +
      'MLÁDEŽNICKÉ KATEGORIE: Mladší žáci U14 (Žákovská liga), Žáci U15 (Nadregionální ' +
      'soutěž), Kadeti U17 (Nadregionální soutěž). ' +
      'TRENÉŘI: Jaroslav Bílek (kelti@nsbasket.cz), Jan Utěšil (723 345 212, ' +
      'utesil.jan@gmail.com), František Hubáček (606 888 308), Jiří Nikodým. ' +
      'DVĚ DOMÁCÍ HALY dle registru ČBF: Hala BIOS (Husova 1146, kapacita 100) ' +
      'a ZŠ Řevničov (Masarykova 211). ' +
      'Souřadnice klubu dle sportmap.cz: 50.14657, 13.90575.',
    note:
      'ROZVRH TRÉNINKŮ SE NEPODAŘILO ZÍSKAT: nsbasket.cz zakazuje automatizovaný ' +
      'přístup (robots.txt) a v registru ČBF tréninkové časy nejsou — ten eviduje ' +
      'jen zápasy. Nutno opsat ručně nebo zavolat Lence Nikodýmové. ' +
      'SAMOSTATNÝ KLUB — nezaměňovat s kroužkem „Basketbal – přípravka“ DDM. ' +
      'Kelti NEJSOU v oficiálním seznamu spolků města, ačkoli mají mládežnické týmy ' +
      've třech celostátních soutěžích.',
  },
  {
    id: 'stolni-tenis-nove-straseci',
    name: 'Stolní tenis Nové Strašecí („ST N. Strašecí“)',
    kind: 'sport_club',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'needs_confirmation',
    known:
      'Oddíl PROKAZATELNĚ EXISTUJE: družstvo „ST N. Strašecí A“ hraje I. třídu okresní ' +
      'soutěže Regionálního svazu stolního tenisu Rakovník (Rozpis mistrovských soutěží ' +
      '2025/2026, rakovnik.cuscz.cz). Kontakt na RSST: Jiří Lédl (předseda RSST Rakovník).',
    note:
      'DĚTSKÝ ODDÍL NENÍ DOLOŽEN. Nenašel jsem klubový web, kontakt, hernu ani ' +
      'mládežnickou kategorii; oddíl NENÍ v oficiálním seznamu spolků města ani ' +
      've výsledcích krajských přeborů mládeže Středočeského svazu. ' +
      'Doložené je zatím jen dospělé družstvo A. ' +
      'DALŠÍ KROK: dotaz na RSST Rakovník nebo na město — existuje mládežnická ' +
      'přípravka a kde se hraje? Bez toho do plánovače nepatří.',
  },
  {
    id: 'tenis-nove-straseci',
    name: 'Tenisové kurty Nové Strašecí',
    kind: 'venue',
    phone: '+420 728 316 832',
    address: 'U Stadionu 957, 271 01 Nové Strašecí',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'needs_confirmation',
    known:
      'Čtyři antukové kurty v areálu fotbalového stadionu (společně s dvěma hřišti ' +
      'a PumpTrackem). Město uvádí možnost rekreační hry na tel. 728 316 832.',
    note:
      'POZOR NA PŘEDPOKLAD: podklad předpokládal tenisový oddíl pod TJ Sokol NS, ale ' +
      'to jsem NEDOLOŽIL. Oficiální seznam spolků města uvádí pod Sokolem jen fotbal, ' +
      'florbal a Ski Team — tenis ne. Město popisuje kurty jako sportoviště pro ' +
      'rekreační hru, ne jako oddíl. ' +
      'Nenašel jsem tenisovou školu, mládežnickou skupinu ani trenéra. ' +
      'DALŠÍ KROK: zavolat na 728 316 832 a zjistit, zda existuje dětská tenisová ' +
      'školička a kdo ji vede. Dokud ne, je to VENUE, nikoli aktivita.',
  },
  {
    id: 'junak-musketyri',
    name: 'Junák – český skaut, středisko Mušketýři Nové Strašecí, z. s.',
    kind: 'youth_org',
    website: 'https://musketyri.skauting.cz/',
    email: 'musketyri@skaut.cz',
    phone: '+420 607 119 885',
    contactPerson: 'Jakub Bechyně (vedoucí střediska)',
    address: 'Tovární 381, 271 01 Nové Strašecí',
    missing: ['end_time', 'price'],
    verification: 'verified_2026_2027',
    known:
      'Čtyři dětské oddíly se známými začátky schůzek: ' +
      'Skauti (kluci od 6. třídy) sobota 14:00, vedoucí Jan Vrba 773 682 890; ' +
      'Skautky (holky od 6. třídy) pátek 16:00, vedoucí Tereza Šilarová 723 517 042; ' +
      'Vlčata (kluci od 1. třídy) pátek 16:00, vedoucí Jiří Verner 732 589 982; ' +
      'Světlušky (holky od 1. třídy) pátek 15:30, vedoucí Kristýna Fejtková 777 914 478. ' +
      'Účet 2602994929/2010.',
    note:
      'CHYBÍ POUZE KONEC SCHŮZEK A ČLENSKÝ PŘÍSPĚVEK — jeden telefonát a čtyři aktivity ' +
      'jdou do katalogu. Oficiální seznam spolků města má u skautů ZASTARALÉ ÚDAJE ' +
      '(skautici.bubakov.net, musketyrins@gmail.com); platí musketyri.skauting.cz ' +
      'a musketyri@skaut.cz.',
  },
  {
    id: 'scns-cviceni-pro-nejmensi',
    name: 'SCNS — Cvičení pro nejmenší',
    kind: 'sport_club',
    website: SCNS_ROZVRH,
    phone: '+420 606 268 804',
    contactPerson: 'Lukáš Knobloch',
    missing: ['age_groups'],
    verification: 'verified_2026_2027',
    known:
      'Úterý a čtvrtek, dva bloky po 30 minutách: 8:30–9:00 a 9:00–9:30, tělocvična Kocourek. ' +
      'Dvouměsíční permanentka 800 Kč, jednotlivý vstup 150 Kč.',
    note:
      'Věková hranice je na webu jen slovně („Jakmile začnete chodit“). Dopolední čas — ' +
      'pro školní plánovač irelevantní, pro předškoláky ano.',
  },
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
    known:
      'Obory: hudební, výtvarný, taneční, literárně-dramatický. ' +
      'Měsíční školné 2025/26: hudební skupinová 320 Kč, hudební individuální 380 Kč, ' +
      'výtvarný 340 Kč, taneční 320 Kč, LDO 320 Kč — ke každému +80 Kč SRPŠ; ' +
      'sborový zpěv a souborová práce 100 Kč bez SRPŠ.',
    note:
      'Ceník 2026/27 zatím nezveřejněn. NEMODELOVAT jako běžný kroužek — rozvrh se skládá ' +
      'individuálně podle nástroje a pedagoga. ZUŠ NENÍ v seznamu spolků města ' +
      '(je vedena jako školské zařízení).',
  },
  {
    id: 'tj-sokol-florbal',
    name: 'TJ Sokol Nové Strašecí — florbalový oddíl',
    kind: 'sport_club',
    website: 'http://www.florbalns.cz/',
    email: 'p.chochola@email.cz',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'source_blocked',
    known:
      'Registrován u Českého florbalu (tým 29132), uveden mezi oddíly zapojenými do ' +
      'zářijového náborového měsíce pro děti 5–15 let v regionu Praha a Střední Čechy.',
    note:
      'Web zakazuje automatizovaný přístup. Pozn.: p.chochola@email.cz — Mgr. Petr Chochola ' +
      'je zároveň ředitelem ZŠ, což vysvětluje dostupnost tělocvičen. ' +
      'Po doplnění fotbalu je tohle největší zbývající kus mládežnické nabídky.',
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
    known:
      'Kategorie podle ročníků: Mikropřípravka 2018 a mladší, Minipřípravka 2016–2017, ' +
      'Přípravka 2014–2015, Mladší žáci 2012–2013, Starší žáci 2010–2011, Junioři 2006–2007. ' +
      'Domácí hřiště Kocourek aréna.',
    note:
      'Rozpis tréninků je na webu POUZE JAKO OBRÁZEK — nutno opsat ručně. ' +
      'OVĚŘIT, zda DDM Hokejbal I–III není fakticky přípravka HBC pod hlavičkou DDM ' +
      '(stejné místo, stejné věkové dělení).',
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
    known: 'Rezervační systém: https://studiocvicka.inrs.cz/rs',
    note:
      'Zveřejněn přehled aktivit pro 2025/2026, nabídka 2026/27 ještě ne. ' +
      'Pozn.: město uvádí jiný e-mail (studiocvicka@seznam.cz) než web (info@studiocvicka.cz).',
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
    note: 'Partner kroužku Karate DDM, vybírá vlastní 1 000 Kč/rok. Vlastní tréninky neověřeny.',
  },
  {
    id: 'tj-sokol-ski-team',
    name: 'TJ Sokol Nové Strašecí — Ski Team',
    kind: 'sport_club',
    website: 'https://skiteam.webnode.cz/',
    email: 'jirinovas@email.cz',
    missing: ['schedule', 'price', 'age_groups'],
    verification: 'organization_verified',
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
    id: 'klub-pratel-deti-dd',
    name: 'Klub přátel dětí dětských domovů se sídlem v Novém Strašecí',
    kind: 'culture',
    website: 'http://www.prateledetidd.cz/',
    email: 'klubprateldetidd@seznam.cz',
    missing: ['schedule', 'price', 'age_groups', 'existence'],
    verification: 'organization_verified',
    note: 'Doplněno ze seznamu spolků města — v předchozích verzích datasetu chybělo.',
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
      'ŠKOLA NEMÁ VLASTNÍ KATALOG KROUŽKŮ. Podle výroční zprávy poskytuje prostory a její ' +
      'pedagogové vedou kroužky POD HLAVIČKOU DDM. Do plánovače patří jako místo, ' +
      'ne jako organizátor. V areálu jsou nejméně tři tělocvičny (nová, stará, dřevěná).',
  },
];

// ===========================================================================
// PŘEHLED
// ===========================================================================

export const NS_STATS = {
  season: '2026/2027',
  verifiedAt: VERIFIED_AT,
  /** Aktivity s ověřeným dnem, časem a věkem. Cena může chybět (viz price_missing). */
  plannableActivities: NS_CATALOG.activities.length,
  /** Termínů celkem (aktivita může mít víc variant docházky). */
  sessionGroups: NS_CATALOG.sessionGroups.length,
  organizationsPendingVerification: NS_PENDING.length,
  sources: [
    'https://www.ddmrako.cz/krouzky',
    'https://www.scns.cz/index.php/treninky',
    'https://www.scns.cz/index.php/cenik',
    'https://musketyri.skauting.cz/',
    'https://www.zusbubu.cz/inpage/skolne-714/',
    'https://www.novestraseci.cz/volny-cas/spolky-kluby-strany/',
  ],
};
