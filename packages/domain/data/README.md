# Data domény

Tato složka obsahuje **ověřená** data, která aplikace používá za běhu.
Podle pravidla #1 se sem nikdy nesmí vkládat vymyšlené hodnoty.

## Soubory

| Vzor | Obsah | Zdroj |
|------|-------|-------|
| `catalog-{city}.json` | Poskytovatelé, kroužky, termíny | Ruční kurátorský sběr / scraper s lidskou revizí. Každá `Activity` musí mít `sourceUrl` a `lastVerifiedAt`. |
| `exceptions-{schoolYear}.json` | Státní svátky a školní prázdniny | Zákon č. 245/2000 Sb. (svátky) a sdělení MŠMT (prázdniny). Každý záznam musí mít neprázdný `source`. |

## Pravidla

- **Konkrétní datumy svátků a prázdnin se nesmí generovat z paměti modelu
  ani odhadovat.** Plní je člověk z oficiálního zdroje.
- Pohyblivé velikonoční svátky (Velký pátek, Velikonoční pondělí) lze
  dopočítat algoritmem Computus — to je deterministický výpočet, ne odhad.
  Viz `src/calendar/computus.ts`.
- Jarní prázdniny se liší podle okresu → `scope: 'district'` + `districtCode`.
- Chybějící hodnoty (kapacita, cena „dle dohody", chybějící adresa) se ukládají
  jako `undefined`, nikdy se nedopočítávají.

## Validace

Před použitím prožeňte soubory přes Zod schémata z balíčku:

```ts
import { parseCatalog, parseExceptionsFile } from '@krouzky/domain';
```

Neplatný soubor se odmítne s popisem chyby (`Result`).
