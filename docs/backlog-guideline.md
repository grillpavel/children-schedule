# Backlog — jak na to

Konvence pro `docs/backlog.md`. Doplňuje procesní smlouvu
[`.github/instructions/dev-process.instructions.md`](../.github/instructions/dev-process.instructions.md).

## Kdy vzniká řádek

- Rozhodnutí „teď X neděláme, ale později ano“ ze spec `§3 Non-goals`.
- Odložená optimalizace nebo technický dluh zjištěný při implementaci.
- **Nikdy** sem nepatří blokující nebo uživatelsky viditelná vada — ta dostane
  spec + `CHANGE-<id>` + opravu hned.

## Tvar řádku

| Pole | Pravidlo |
|------|----------|
| `BL-<NNN>` | Stabilní, monotónní. Nikdy nepřečíslovat ani nemazat. |
| `type` | Právě jeden: `tech-debt` · `optimization` · `limitation` · `deferred-bug`. |
| `origin` | Povinný zpětný odkaz: `CHANGE-<id>` / spec `§3` / PR #. |
| `status` | `open` → `in-progress` → `done`. Hotové zůstávají jako audit. |

## Životní cyklus

1. Odložení → nový řádek `open` s `origin`.
2. Vyzvednutí → `in-progress`, napiš spec + nový `CHANGE-<id>`, implementuj.
3. Merge → `done` se zavírajícím `CHANGE-<id>`; do CHANGELOGu `Closes BL-<NNN>`.
