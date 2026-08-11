# Krouzky Planner: Changes 8

**Verze dokumentu:** 1.0
**Datum:** 11. 8. 2026
**Rozsah:** pravý sloupec (Souhrn rozvrhu, Detail kroužku, Detail vlastní události, editace, provenience dat)
**Navazuje na:** Changes 6 (sekce F, G) a Changes 7. Kde se překrývají, platí ID z tohoto dokumentu.
**Formát:** ID, priorita (P0 blokuje / P1 vysoká / P2 polish), akceptační kritérium (AK)

---

## 0. Rozsah ověření

Repo není veřejné a pravý panel se plní až po kliknutí, takže z vyrenderovaného DOM je ověřený pouze prázdný stav: tři údaje („0 kroužků“, „Volných všedních dnů: 5“, „Žádné konflikty“) a dva taby (Info, Chat). Vše ostatní v tomto dokumentu je návrh cílového stavu, ne audit implementace. Před zadáním ověř body V-16 až V-20.

| ID | Ověřit | Jak |
|---|---|---|
| V-16 | Zda je detail kroužku dostupný **před** přidáním do rozvrhu, nebo až po něm | Klik na kartu v katalogu bez přidání |
| V-17 | Zda jsou editační pole trvale zapnutá, nebo za přepínačem | Otevřít detail libovolného kroužku |
| V-18 | Zda se uživatelské úpravy (název, adresa, cena) ukládají do exportovaného JSON | Upravit adresu, uložit, znovu načíst |
| V-19 | Zda katalog vůbec obsahuje pole `uzávěrka přihlášek` a `odkaz na přihlášku` | Kontrola datového souboru |
| V-20 | Zda katalog obsahuje `sezona od` a `sezona do` | Kontrola datového souboru; absence je pravděpodobná příčina prázdného srpnového kalendáře |

---

## 1. Vady současného návrhu

Šest vad, které se objevují napříč dosavadními návrhy pravého panelu. Každá má odpovídající změnu níže.

| ID | Vada | Řeší |
|---|---|---|
| C8-X1 | Editační pole jsou trvale zapnutá. Devět z deseti otevření panelu je čtení. Panel, který vypadá jako formulář, se hůř čte, láká k nechtěné změně a působí nedodělaně. | C8-F1 |
| C8-X2 | Chybí model overrides. Uživatelská úprava přepíše ověřený údaj a aplikace ho dál prezentuje jako ověřený fakt. Po aktualizaci katalogu je stará úprava tiše zachována. | C8-E |
| C8-X3 | Součet ceny lže. Šest položek katalogu má „Cena neuvedena“ a cenové režimy se liší. Holý součet je číslo, kterému rodič uvěří a které je špatně. | C8-B3 |
| C8-X4 | Heatmapa měří hodiny a hodnotí je barevnou škálou zelená až červená. Tím aplikace rozhoduje za rodiče, co je moc. Navíc hodiny nejsou skutečný náklad rodiny. | C8-B4, C8-B5 |
| C8-X5 | Chybí uzávěrka přihlášek a akce „přihlásit se“. V září je uzávěrka nejčasověji kritické pole v aplikaci a přihlášení je jediná akce, kvůli které rodič aplikaci otevřel. Bez toho flow končí slepě. | C8-D5, C8-B6 |
| C8-X6 | Prázdný stav zobrazuje graf samých nul. Graf, který nic neukazuje, je výplň, ne informace. | C8-A1 |

---

## 2. Stavy panelu

| ID | Stav | Kdy nastane | Obsah | Prio |
|---|---|---|---|---|
| C8-S1 | A. Souhrn, prázdný | 0 kroužků | Nadpis, jedna věta, primární CTA, dva tipy. Žádné grafy, žádné nuly. | P0 |
| C8-S2 | B. Souhrn, naplněný | 1+ kroužek | Metriky, obsazenost, konflikty, uzávěrky, rychlé akce | P0 |
| C8-S3 | C. Detail, **není v rozvrhu** | klik na kartu v katalogu | Čtecí režim, výběr termínu, primární CTA „Přidat do rozvrhu“ | P0 |
| C8-S4 | D. Detail, **je v rozvrhu** | klik na událost v kalendáři | Čtecí režim, změna termínu, změna barvy, odebrat | P0 |
| C8-S5 | E. Detail vlastní události | klik na vlastní událost | Jiná pole: opakování, připomínka, místo | P1 |
| C8-S6 | F. Konflikt | klik na varovný odznak | Obě strany konfliktu vedle sebe plus návrhy řešení | P1 |
| C8-S7 | G. Editace | klik na „Upravit“ nebo na hodnotu | Formulář, tlačítka Uložit a Zrušit | P0 |

**Stav C8-S3 je nejdůležitější a dnes pravděpodobně chybí.** Dosavadní návrhy předpokládají, že detail vidíš až po přidání. To je obráceně: rodič potřebuje detail k rozhodnutí, jestli přidat, a potřebuje vybrat termín **před** přidáním, ne po něm.

**AK-S:** Klik na kartu v katalogu otevře detail, aniž by kroužek přidal do rozvrhu. V detailu lze vybrat termín a teprve pak potvrdit přidání.

---

## 3. Souhrn rozvrhu (stavy A a B)

### A. Prázdný stav

| ID | Změna | Prio |
|---|---|---|
| C8-A1 | Žádné grafy, žádné nulové heatmapy, žádné „0 kroužků“. Obsah: nadpis „Zatím žádné kroužky“, jedna vysvětlující věta, primární CTA „Vybrat z katalogu“ (na mobilu přepne tab), pod tím dva tipy („Začni filtrem podle dne“, „Kroužky běží zpravidla od října do května“). | P0 |
| C8-A2 | Sdělení „Rozvrh existuje jen v tomto okně, uložte si ho“ zde patří jako trvale viditelný, nikoli drobný text. | P0 |

### B. Naplněný stav

Cílový obsah:

```
Souhrn rozvrhu · Varianta A

4 kroužky            2 děti
3 obsazená odpoledne z 5
6 cest týdně         9 h týdně
6 200 Kč/rok · 2 kroužky bez ceny
       (≈ 690 Kč/měs za 9 měsíců)

Obsazenost odpolední
Po  ██ ██          2 kroužky, 2 cesty
Út  ████           1 kroužek,  1 cesta
St  volno
Čt  ██ ██ ██       3 kroužky, 2 cesty
Pá  ██             1 kroužek,  1 cesta

Upozornění                        [2]
⚠ Čt 16:00 Karate × Programování
  Překryv 45 min          [Vyřešit]
⚠ Út 15:45 → 16:00, DDM → Sokolovna
  12 min na přesun        [Zobrazit]
ℹ 3 lekce padnou na prázdniny
  (v .ics vynecháno)

Uzávěrky
🔴 Atletika, přihlášky do 14. 9. (za 4 dny)
🟠 Karate, přihlášky do 30. 9.

[ Uložit ]  [ Exportovat ]  [ Porovnat varianty ]
```

| ID | Změna | Prio |
|---|---|---|
| C8-B1 | Primární metriky: počet kroužků, počet dětí, **obsazená odpoledne z pěti**, **počet cest týdně**. Hodiny týdně jsou sekundární číslo. | P0 |
| C8-B2 | Definuj metriky přímo v UI přes tooltip. „Odpoledne je volné, když mezi 13:00 a 19:00 není žádná událost.“ Dnešní „Volných všedních dnů: 5“ je neurčité a nepřezkoumatelné. | P0 |
| C8-B3 | Cena se **nikdy** nezobrazuje jako holý součet. Vždy ve tvaru `6 200 Kč/rok · 2 kroužky bez uvedené ceny` plus odvozené Kč/měsíc s uvedeným počtem měsíců sezony. | P0 |
| C8-B4 | Obsazenost odpolední zobraz **neutrálně**, bez barevné škály zelená až červená. Kolik je moc, rozhoduje rodič, ne aplikace. | P0 |
| C8-B5 | Volitelný uživatelský strop: „upozorni mě nad N obsazených odpolední“ a „nad N Kč/měsíc“. Varování se zobrazí až po jeho překročení. | P1 |
| C8-B6 | Samostatný blok **Uzávěrky** s odpočtem do termínu, seřazený vzestupně. V září to bude nejnavštěvovanější část panelu. | P0 |
| C8-B7 | Klik na den v přehledu obsazenosti přepne kalendář na ten den. | P1 |
| C8-B8 | Rychlé akce: Uložit, Exportovat, Porovnat varianty. **Bez destruktivních akcí.** „Smazat vše“ patří do menu, ne do panelu, který uživatel používá k prohlížení. | P0 |
| C8-B9 | Blok Upozornění zobrazuj s počtem v odznaku a rozděl na tři závažnosti: konflikt (⚠ červená), upozornění na těsný přesun (⚠ oranžová), informace o prázdninách (ℹ neutrální). | P1 |
| C8-B10 | U každého konfliktu tlačítko **Vyřešit**, které nabídne konkrétní alternativní termíny seřazené podle toho, kolik dalších konfliktů by vyvolaly. Bez akce je výpis konfliktů jen stížnost. | P1 |

**AK-B:** Při rozvrhu obsahujícím alespoň jednu položku bez ceny se v souhrnu nikdy nezobrazí holý součet bez uvedení počtu položek bez ceny.

---

## 4. Datový inventář detailu

Úrovně viditelnosti: **T0** vždy nad fold, **T1** vždy pod fold, **T2** sbalená sekce, **T3** jen když hodnota existuje.

Celkem zhruba 38 polí. Do sloupce širokého 320 px se jich najednou vejde asi osm. Odstupňovaná viditelnost je proto povinná, ne volitelná.

### C8-D1 Identita

| Pole | Zdroj | Úroveň | Edit | Když chybí |
|---|---|---|---|---|
| Název | katalog | T0 | ano | povinné |
| Barva | uživatel | T0 | ano | auto z kategorie |
| Poskytovatel | katalog | T0 | ne | povinné |
| Kategorie a podkategorie | katalog | T0 | ne | „Nezařazeno“ |
| Věkové rozmezí | katalog | T0 | ne | „neuvedeno“, položku nefiltrovat podle věku |
| Popis | katalog | T2 | ano | sekci skrýt |

### C8-D2 Termín (P0)

| Pole | Zdroj | Úroveň | Edit | Když chybí |
|---|---|---|---|---|
| Seznam všech variant termínu | katalog | T0 | ne | „termín neuveden, kontaktujte poskytovatele“ |
| Vybraná varianta | uživatel | T0 | ano | první varianta jako předvolba |
| Den, čas od, čas do | katalog | T0 | ano | povinné pro zobrazení v kalendáři |
| Délka lekce | odvozeno | T0 | ne | dopočítat |
| Frekvence (týdně, 1/14 dní) | katalog | T1 | ano | výchozí týdně |
| Sezona od, sezona do | katalog | T1 | ano | výchozí 1. 10. až 31. 5. |
| Počet lekcí za sezonu | odvozeno | T1 | ne | dopočítat po odečtení výjimek |
| Výjimky (svátky, prázdniny) | systém | T1 | ne | seznam vynechaných dat |

Pole `sezona od` a `sezona do` v katalogu pravděpodobně chybí (V-20) a je to nejpravděpodobnější příčina toho, že se aplikace otevírá na prázdný srpnový týden.

### C8-D3 Cena (P0)

| Pole | Zdroj | Úroveň | Edit | Když chybí |
|---|---|---|---|---|
| Částka | katalog | T0 | ano | **„Cena neuvedena“ výrazně**, ne potichu |
| Režim (rok, pololetí, měsíc) | katalog | T0 | ano | povinné, jinak nelze normalizovat |
| Kč/měsíc | odvozeno | T0 | ne | dopočítat ze sezony |
| Kč/lekce | odvozeno | T1 | ne | dopočítat |
| Co cena zahrnuje | katalog | T2 | ano | sekci skrýt |
| Sourozenecká sleva | katalog | T3 | ano | skrýt |

### C8-D4 Místo

| Pole | Zdroj | Úroveň | Edit | Když chybí |
|---|---|---|---|---|
| Název místa | katalog | T0 | ano | použít adresu |
| Ulice, město, PSČ | katalog | T1 | ano | **„adresa chybí“ jako viditelná mezera**, ne prázdno |
| lat, lon | geokódování při buildu | skryté | ne | bez souřadnic nefunguje mapa ani dojezdový konflikt |
| Mapa | odvozeno | T2 | ne | až po explicitním kliknutí „Zobrazit mapu“ |
| Odkaz do map | odvozeno | T1 | ne | sestavit z adresy |
| Vzdálenost a doba dojezdu z domova | odvozeno | T3 | ne | jen když má uživatel zadanou domovskou adresu |
| Poznámka k přístupu (vchod, parkování) | katalog | T3 | ano | skrýt |

### C8-D5 Kontakt a přihlášení (P0)

| Pole | Zdroj | Úroveň | Edit | Když chybí |
|---|---|---|---|---|
| **Odkaz na přihlášku** | katalog | **T0** | ano | fallback na web poskytovatele |
| **Uzávěrka přihlášek** | katalog | **T0** | ano | skrýt, v souhrnu evidovat jako neznámou |
| Telefon | katalog | T1 | ano | jako `tel:` odkaz |
| E-mail | katalog | T1 | ano | jako `mailto:` odkaz |
| Web | katalog | T1 | ano | |
| Vedoucí, lektor | katalog | T3 | ano | skrýt |
| Kapacita a volná místa | katalog | T3 | ne | skrýt, **nikdy neodhadovat** |
| Co s sebou, potvrzení lékaře | katalog | T3 | ano | skrýt |

Odkaz na přihlášku a uzávěrka patří nahoru, ne dolů. Jsou to jediná dvě pole, která vedou k akci mimo aplikaci, a tím k dokončení celého flow.

### C8-D6 Stav v rozvrhu

| Pole | Zdroj | Úroveň |
|---|---|---|
| V rozvrhu, ve které variantě | stav | T0 |
| Konflikt s čím, délka překryvu | odvozeno | T0 |
| Těsné navazování, kolik minut | odvozeno | T0 |
| Mimo věkové rozmezí | odvozeno | T0 |
| Které dítě (u vícedětného rozvrhu) | uživatel | T0 |

### C8-D7 Provenience

| Pole | Zdroj | Úroveň |
|---|---|---|
| Zdroj údajů (URL) | katalog | T2 |
| Datum ověření | katalog | T1 |
| Značka „upraveno uživatelem“ | stav | T0 u dotčeného pole |

### C8-D8 Uživatelská vrstva

| Pole | Úroveň |
|---|---|
| Poznámka rodiče | T2 |
| Označení „zvažujeme“ | T0 |

---

## 5. Model overrides

Bez tohoto se editace v panelu do roka obrátí proti důvěryhodnosti dat.

```json
{
  "clubId": "ddm-astronomicky",
  "overrides": {
    "price":   { "value": 1500, "editedAt": "2026-09-03" },
    "address": { "value": "Vysoká 123", "editedAt": "2026-09-03" }
  },
  "note": "Syn má zájem o hvězdy",
  "selectedSlot": "ut-1600"
}
```

| ID | Pravidlo | Prio |
|---|---|---|
| C8-E1 | Overrides jsou **oddělená vrstva**, nikdy nepřepisují katalog v paměti. Render je katalog plus overrides. | P0 |
| C8-E2 | Přepsané pole ztrácí odznak „ověřeno k datu“ a dostane značku „upraveno vámi 3. 9.“. | P0 |
| C8-E3 | Při aktualizaci katalogu porovnej základní hodnotu s hodnotou v době editace. Pokud se zdroj změnil a existuje override, zobraz u pole varování „zdroj se změnil, tvoje úprava je z 3. 9.“ s možností přijmout nový údaj. | P1 |
| C8-E4 | Poznámka rodiče je čistě uživatelská vrstva, s katalogem nekoliduje a nikdy se nepřepisuje. | P1 |
| C8-E5 | Overrides, poznámka i vybraný termín musí být v uloženém JSON. Jinak editace zmizí se zavřením tabu a je horší než žádná. | P0 |

**AK-E:** Po úpravě ceny, uložení do souboru a opětovném načtení je úprava přítomna a označena jako uživatelská. U upraveného pole se nezobrazuje odznak ověření.

---

## 6. Chování a layout

| ID | Změna | Prio |
|---|---|---|
| C8-F1 | Výchozí režim panelu je **čtení**. Editace za tlačítkem „Upravit“ v hlavičce sekce nebo klikem přímo na hodnotu. Ne trvale zapnutá input pole. | P0 |
| C8-F2 | Hlavička panelu je sticky: název, barva, stav, primární CTA. Nesmí se odscrollovat. | P0 |
| C8-F3 | Primární CTA se mění podle stavu: „Přidat do rozvrhu“ (C), „Změnit termín“ (D). Sekundární CTA „Přihlásit se“ je viditelná vždy, když existuje odkaz. | P0 |
| C8-F4 | Sekce Termíny, Cena, Místo a Kontakt jsou T0 a T1. Sekce Popis, Poznámka a Zdroj jsou sbalené. | P0 |
| C8-F5 | Návrat na souhrn přes „← Zpět“ i klikem mimo panel. | P1 |
| C8-F6 | Panel se při nula kroužcích zúží nebo sbalí, aby neblokoval šířku kalendáře. | P0 |
| C8-F7 | Na mobilu je panel spodní sheet se třemi snap pointy: peek (název, stav, CTA), half (T0 a T1), full. | P1 |
| C8-F8 | Tab Chat skryj, dokud není hotový. Prázdný tab stojí víc důvěry, než kolik ta funkce v této aplikaci může přinést. | P0 |
| C8-F9 | Prázdné hodnoty nezobrazuj jako prázdný řádek. Buď pole skryj (T3), nebo ukaž explicitní „chybí“ s možností doplnit (T1). | P1 |

---

## 7. Pořadí implementace

1. C8-S3, C8-D2: detail před přidáním s výběrem termínu
2. C8-D5, C8-B6: odkaz na přihlášku a uzávěrky jako T0 plus blok uzávěrek v souhrnu
3. C8-B1 až C8-B4: revidované metriky souhrnu a poctivá cena
4. C8-B9, C8-B10: konflikty s akcí Vyřešit
5. C8-F1, C8-F2, C8-F6: čtecí režim, sticky hlavička, sbalitelný panel
6. C8-E1 až C8-E5: model overrides a provenience
7. C8-A1, C8-A2: prázdný stav
8. C8-D4: mapa až za explicitním kliknutím
9. C8-D8: poznámka rodiče

---

## 8. Definition of Done

1. Klik na kartu v katalogu otevře detail, aniž kroužek přidá do rozvrhu; termín lze vybrat před přidáním.
2. Rozvrh s alespoň jednou položkou bez ceny nikdy nezobrazí holý součet.
3. Každá metrika v souhrnu má tooltip s definicí.
4. Každý konflikt má akci, která nabídne alespoň jednu konkrétní alternativu, nebo srozumitelně sdělí, že žádná neexistuje.
5. Úprava pole přežije export a import a je označena jako uživatelská; upravené pole nenese odznak ověření.
6. Panel v prázdném stavu neobsahuje žádný graf ani nulové metriky.
7. Panel je plně obsluhovatelný klávesnicí, včetně přepnutí do editace a zpět.
8. Na šířce 375 px je v peek stavu viditelný název, stav a primární CTA bez scrollování.
