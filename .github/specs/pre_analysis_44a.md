Aplikace je specializovaný nástroj na skládání rozvrhu dětských kroužků (katalog z DDM Rakovník a okolí). Má jasný účel: vybrat kroužky, vidět kolize, náklady a volné dny. Základní myšlenka je dobrá, ale v současné podobě působí jako polofunkční prototyp – přehlcený, nepřehledný a málo uživatelsky přívětivý.
Hlavní problémy (co je špatně)
1. Informační přetížení a chaotický layout

Horní lišta je přeplněná (dítě, kalendář, název, barva, věk, uloženo, otevřít/uložit/další + varianty).
Tři panely najednou (katalog vlevo, prázdný rozvrh uprostřed, detaily/souhrn vpravo) vytváří „dashboardový chaos“.
Na desktopu je levý katalog zbytečně úzký a dlouhý, střední plocha prázdná a pravý panel téměř nevyužitý.
Na mobilu se vše hroutí do tabů (Katalog / Rozvrh / Info), ale horní lišta zůstává přeplněná a důležité ovládací prvky jsou malé.

2. Onboarding a první dojem

Prázdný stav s textem „Rozvrh je zatím prázdný“ + tipy je lepší než nic, ale stále působí sucho.
Uživatel hned neví, co dělat jako první (přidat dítě? vybrat věk? filtrovat?).
Chybí jasný „Start here“ flow nebo interaktivní průvodce.

3. Katalog a filtry

Hierarchie kategorií (SPORT A POHYB → Míčové a týmové sporty…) je v pořádku, ale karty kroužků jsou textově husté a vizuálně slabé.
Filtry (dny, věk, „Vejde se mi to“, pořadatelé) jsou rozptýlené a málo výrazné.
Chybí rychlé akce (přidat jedním klikem + okamžitá zpětná vazba o kolizi).

4. Rozvrh a vizualizace

Týdenní pohled je hlavní, ale prázdný stav je příliš „bílá plocha“.
Chybí silná vizuální hierarchi e kolizí (červená/oranžová) a volných slotů.
Není jasné, jak se zobrazují náklady, obsazenost a varianty vedle sebe.
Přepínače Den / 3 dny / Týden / Měsíc + Agenda/Mřížka jsou zbytečně složité.

5. Ukládání a perzistence

„Rozvrh existuje jen v tomto okně“ + manuální Uložit je největší UX hřích. Lidé očekávají autosave nebo alespoň jasný cloud/local storage s možností sdílení.
Varianty (Varianta A + Kopie) jsou dobrý nápad, ale špatně komunikované.

6. Další slabiny

Mobilní verze není optimalizovaná (příliš mnoho prvků nahoře, špatná hierarchie).
Chybí accessibility (kontrasty, velikosti touch targetů, klávesnice).
Žádná moderní „delight“ (mikroanimace, progress, smart suggestions).
Barvy a typografie jsou průměrné – působí genericky.

Co funguje dobře (silné stránky)

Lokální katalog s reálnými daty (ceny, časy, věkové kategorie, pořadatel).
Myšlenka variant rozvrhů a detekce kolizí.
Filtry podle dnů a věku.
Prázdný stav s tipy (alespoň něco).
Jednoduchá myšlenka „vyber z katalogu → uvidíš kolize a náklady“.

Jak to posunout na state-of-the-art (extra user-friendly + přehledné)
1. Redesign informační architektury (nejvyšší priorita)

Jednosloupcový / progressive disclosure flow:
Rychlý setup (jméno dítěte + věk + preferované dny) → 30 sekund.
Chytrý katalog s okamžitým náhledem.
Rozvrh jako hlavní fokus (týdenní timeline).
Souhrn (náklady, kolize, export) vždy dostupný, ale ne vždy viditelný.

Na desktopu: katalog vlevo (collapsible), hlavní rozvrh uprostřed (větší), detail/souhrn jako slide-over nebo bottom sheet.
Na mobilu: bottom navigation + sticky header s minimem prvků.

2. Prázdný stav a onboarding

Ilustrovaný empty state + velký CTA „Přidat první kroužek“.
Volitelný 3-krokový tour (nebo contextual tips, které se postupně mizí).
Po přidání prvního kroužku okamžitě ukázat, jak vypadá kolize a volný den.

3. Katalog – udělat ho „sticky a smart“

Karty kroužků: větší, s barevným pruhem podle kategorie, jasnou cenou a časem, jedním velkým „+“ tlačítkem.
Live filtr: při změně věku/dnů se katalog okamžitě filtruje + zvýrazní „doporučené“.
„Vejde se mi to“ jako hlavní smart filtr (automaticky počítá kolize s už vybranými).
Možnost pinovat oblíbené / porovnávat 2–3 kroužky side-by-side.

4. Rozvrh – vizuální král

Týdenní timeline s jasným time gridem (ne jen karty).
Kolize = silná červená + tooltip s vysvětlením.
Volné sloty = jemné tečkované oblasti „volno“.
Drag & drop přetahování kroužků mezi dny (pokud to dává smysl).
Souběžné zobrazení 2–3 variant (taby nebo split view).
Okamžitý součet nákladů + progress bar „zbývá volných odpolední“.

5. Ukládání, sdílení a multi-child

Autosave do localStorage + možnost „Uložit do cloudu“ / exportovat odkaz.
Sdílení odkazu (read-only nebo editable) pro druhého rodiče / prarodiče.
Více dětí s barevným kódováním a možností „společný pohled“.

6. Moderní UX detaily (to, co odděluje dobré od skvělého)

Mikroanimace při přidání/odebrání (smooth slide + color flash).
Smart suggestions: „Tento kroužek koliduje, ale ve stejný den je volný X“.
Rychlé akce: long-press na kartě → detail + přidat.
Dark mode + vysoký kontrast.
Keyboard shortcuts + skvělé touch targets (min. 44 px).
Export do PDF / Google Calendar / iCal.
Offline-first (PWA).

7. Prioritizovaný roadmap (doporučené pořadí)

Opravit layout + empty state + autosave (největší bolest).
Vylepšit karty katalogu + live filtry + okamžitá detekce kolizí.
Silná vizualizace týdenního rozvrhu.
Multi-child + sdílení.
Delight (animace, suggestions, export).

Shrnutí
Aplikace má solidní domain knowledge (reálné kroužky, ceny, věk), ale trpí typickými problémy raného produktu: příliš mnoho věcí najednou, slabá vizuální hierarchie a chybějící „flow“.
Když se zredukuje kognitivní zátěž, udělá se jasný progressive disclosure a posílí se vizuální feedback (kolize, náklady, volno), může z toho vzniknout velmi užitečný a příjemný nástroj – něco mezi specialized kids activity planner a moderním calendar builderem.
Pokud chceš, můžu připravit konkrétní wireframy (textové nebo prioritizovaný seznam změn do Figma/React), návrh komponent nebo konkrétní copy pro empty states a tipy. Stačí říct, kam se chceš posunout nejdřív.


## Kritické review
Kritické review – přesně co je špatně a proč to musíš opravit
Aplikace řeší reálný problém (skládání kroužků bez kolizí + náklady), ale v současné podobě je to prototyp s vysokou kognitivní zátěží. Rodič, který chce rychle složit rozvrh dítěti, tu stráví víc času orientací než rozhodováním. Níže jsou konkrétní problémy seřazené podle závažnosti + přesný důvod, proč to vadí.
1. Největší problém: Informační chaos a špatná hierarchie (Critical)
Co je špatně:

Horní lišta obsahuje 8–10 prvků najednou (dítě, kalendář, název, barva, věk, stav uložení, otevřít/uložit/další, varianty).
Tři panely (katalog | rozvrh | detail) jsou vždy viditelné, i když rozvrh je prázdný.
Na mobilu se to sice schová do tabů, ale horní lišta zůstává přeplněná.

Proč to vadí:
Rodič má průměrně 30–60 sekund pozornosti. Když první pohled vypadá jako „dashboard pro power-usera“, většina lidí se vzdá nebo dělá chyby. Moderní nástroje (Linear, Notion, Calendly, Famnly) drží v daném okamžiku maximálně 1–2 primární akce.
Přesné zlepšení:

Progressive disclosure. Při prvním otevření ukaž jen: „Kolik je dítěti?“ + „Které dny můžeš“ + velké CTA „Najít kroužky“.
Katalog a rozvrh se objeví až po základní konfiguraci.
Detail kroužku a souhrn nákladů/kolizí jako slide-over nebo bottom sheet, ne permanentní panel.

2. Ukládání je nebezpečné a neintuitivní (Critical)
Co je špatně:
Text „Rozvrh existuje jen v tomto okně“ + manuální tlačítko Uložit.
Proč to vadí:
Lidé očekávají autosave. Když omylem zavřou kartu nebo se stránka reloadne, přijdou o práci. To je přímý důvod k opuštění aplikace a nedůvěře.
Přesné zlepšení:

Autosave do localStorage okamžitě při každé změně.
Viditelný stav „Uloženo před 3 s“ + možnost „Sdílet odkaz“ (read-only nebo editable).
Volitelný export do PDF / iCal / Google Calendar.

3. Katalog je textově hustý a pomalý na rozhodnutí (High)
Co je špatně:
Karty kroužků obsahují moc textu v malém prostoru (název, organizace, věk, čas, cena, počet termínů). Filtry jsou rozptýlené a nevýrazné. Chybí jasná primární akce.
Proč to vadí:
Rodič porovnává 5–10 možností. Když musí číst hustý text, kognitivní zátěž stoupá a rozhodování se zpomaluje. „Vejde se mi to“ filtr je skvělý nápad, ale je schovaný.
Přesné zlepšení:

Karty: barevný pruh kategorie + velký čas + cena + jeden výrazný „+“ button.
Live filtrování: při změně věku nebo dnů se katalog okamžitě pročistí a zvýrazní vhodné položky.
„Vejde se mi to“ jako výchozí/toggle filtr, který počítá kolize s už vybranými kroužky v reálném čase.
Možnost pinovat 2–3 kroužky a porovnávat je side-by-side.

4. Prázdný stav a onboarding jsou slabé (High)
Co je špatně:
Velká bílá plocha + text „Rozvrh je zatím prázdný“ + tři tipy dole.
Proč to vadí:
Prázdný stav je nejdůležitější obrazovka. Když nepůsobí přátelsky a jasně nevede k akci, uživatel neví, co má udělat jako první.
Přesné zlepšení:

Ilustrovaný empty state + jedno velké CTA „Přidat první kroužek“.
Po přidání prvního kroužku okamžitě ukázat, jak vypadá kolize a volný slot (learning by doing).
Contextual tips, které se po 1–2 použitích samy schovají.

5. Rozvrh nemá silnou vizualizaci (High)
Co je špatně:
Týdenní pohled je jen prázdná plocha. Kolize a volné dny nejsou vizuálně dominující. Přepínače Den/3 dny/Týden/Měsíc + Agenda/Mřížka přidávají zbytečnou komplexitu.
Proč to vadí:
Hlavní hodnota aplikace je „vidím kolize a volno“. Když to není okamžitě čitelné, ztrácí se důvod používat nástroj místo Excelu nebo papíru.
Přesné zlepšení:

Time-grid timeline (ne jen karty).
Kolize = silná červená + krátký tooltip.
Volné odpoledne = jemné tečkované oblasti.
Okamžitý součet nákladů + počet zbývajících volných slotů.
Varianty jako taby nebo split-view, ne schované.

6. Mobilní zkušenost (Medium–High)
Co je špatně:
Horní lišta zůstává přeplněná, touch targety jsou malé, hierarchie není optimalizovaná pro palec.
Proč to vadí:
Většina rodičů bude aplikaci používat na telefonu (ve frontě, večer na gauči). Špatná mobilní verze = nízká retence.
Přesné zlepšení:

Sticky minimální header.
Bottom navigation (Katalog / Rozvrh / Souhrn).
Velké touch targety (min. 44 px) a gesture-friendly interakce.

7. Další konkrétní detaily, které snižují kvalitu

ProblémProč to vadíCo udělatBarva kroužku se vybírá v horní lištěOddělené od kontextuBarva se přiřadí automaticky nebo v detailu kroužku„Vlastní událost“ je schovaná doleLidé ji přehlédnouPřesunout do primárních akcíŽádný smart suggestionAplikace jen zobrazuje, neradí„Tento kroužek koliduje, ale ve stejný den je volný X“Chybí multi-child pohledRodiny mají více dětíBarevné kódování + přepínač dětíŽádný export / tiskLidé chtějí mít rozvrh u lednice nebo v kalendářiPDF + iCal
Shrnutí priorit (co dělat jako první)

Autosave + odstranění „existuje jen v tomto okně“ – okamžitě zvyšuje důvěru.
Zjednodušit první obrazovku (progressive disclosure) – sníží bounce rate.
Předělat karty katalogu + live filtr „vejde se mi to“ – zrychlí rozhodování.
Silná vizualizace kolizí a volných slotů – dodá hlavní hodnotu.
Mobilní optimalizace – většina uživatelů je na telefonu.

Aplikace má dobrý základ (reálná data, detekce kolizí, varianty). Problém není v chybějících funkcích, ale v tom, že současné UI nutí uživatele pracovat proti nástroji místo s ním. Když tohle opravíš, posune se z „funguje, ale je to nepříjemné“ na „tohle bych doporučil ostatním rodičům“.
Chceš teď prioritizovaný seznam konkrétních UI změn (včetně copy a layoutu), nebo radši rozpad na implementační úkoly?