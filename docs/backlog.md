# Backlog

Živý seznam vědomě odloženého. Pravidla: [docs/backlog-guideline.md](backlog-guideline.md).
Každý řádek má stabilní `BL-<NNN>` (nikdy se nepřečísluje), jeden `type`
(`tech-debt` · `optimization` · `limitation` · `deferred-bug`) a povinný `origin`.

| ID | Stav | Typ | Popis | Origin |
|----|------|-----|-------|--------|
| BL-001 | open | limitation | Notifikace podle polohy (proximity alarm) — nestandardní, jen Apple. | CHANGE-1, spec `design_review_1.md` §3 |
| BL-002 | done | limitation | Vložený náhled mapy v panelu detailů. Vyřešeno keyless OpenStreetMap náhledem. | CHANGE-1 §3 → uzavřeno CHANGE-2 (FR-8) |
| BL-003 | open | limitation | Měsíční opakování podle data (např. „3. úterý“). Opakování zůstává po týdnech. | CHANGE-1, spec `design_review_1.md` §3 |
| BL-004 | open | limitation | Napovídání adresy (Mapy.cz suggest: ulice/město/PSČ) — vyžaduje API klíč a síť. | CHANGE-2, spec `design_review_2.md` §3 |
| BL-005 | open | limitation | Nativní vložení Mapy.cz (značkové dlaždice) — vyžaduje API klíč / share kód. | CHANGE-2, spec `design_review_2.md` §3 |
| BL-006 | open | limitation | Volná barva mimo 12barevnou paletu — porušila by kontrast paletky a ICS `COLOR` (CSS3 klíčové slovo). | CHANGE-4, spec `design_review_3.md` §3 |
| BL-007 | open | limitation | Přepisy kroužků na úrovni dítěte (dnes globálně přes `activityId`). | CHANGE-4, spec `design_review_3.md` §3 |
| BL-008 | open | limitation | Místa konání bez zveřejněných GPS (BIOS, Sokolovna, Kocourek, Řevničov) — náhled mapy skrytý do doplnění souřadnic. | CHANGE-5, spec `design_review_4.md` §3 |
| BL-009 | open | limitation | Organizace `NS_PENDING` (ZŠUŠ, Kelti, HBC, Sokol oddíly, skaut, hasiči…) — chybí rozvrh/cena, nelze načíst bez vymyšlení dat. | CHANGE-5, spec `design_review_4.md` §3 |
| BL-010 | open | limitation | Doplňkové poplatky (karate +1000, basketbal členské příspěvky) nejsou započteny do zobrazené ceny. | CHANGE-5, spec `design_review_4.md` §3 |
| BL-011 | open | limitation | Pokyny k přihlášení (`NS_ACTIVITY_META.note`) se v detailu nezobrazují — žijí mimo doménový model. | CHANGE-6, spec `design_review_5.md` §3 |
| BL-012 | open | limitation | Cena podle počtu tréninků (SCNS 4 800 vs 6 500 Kč) — katalog nese jen jednu základní cenu. | CHANGE-7, spec `design_review_6.md` §3 |
| BL-013 | open | limitation | Sezónní platnost místa (`winterVenueOnly`) — tělocvičny jen pro zimní část. | CHANGE-7, spec `design_review_6.md` §3 |
| BL-014 | open | limitation | Více míst na skupinu / místo podle dne (atletika, gymnastika) — adaptér bere první. | CHANGE-7, spec `design_review_6.md` §3 |
| BL-015 | open | limitation | Import `.ics` vždy vytvoří vlastní události — nepropojí zpět s katalogovými zápisy (ICS nemá id katalogu). | CHANGE-8, spec `design_review_7.md` §3 |
