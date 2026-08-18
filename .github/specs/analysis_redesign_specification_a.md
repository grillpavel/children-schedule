State-of-the-art kritické UX review – Mobil & Tablet
(aktuální verze na https://children-schedule-web.vercel.app)
Prošel jsem aplikaci znovu v aktuálním stavu. Desktop je použitelný, ale mobil a tablet stále působí jako zmenšený desktop, ne jako nativní mobilní produkt. To je hlavní problém.
Rodič na telefonu nechce „procházet katalog“. Chce co nejrychleji odpovědět na otázku:
„Co se teď hodí mému dítěti, kdy to je, kolik to stojí a jestli se to nekříží?“
Aktuální UX na to odpovídá jen částečně.

1. Celkové hodnocení (mobil)


















































OblastHodnoceníKomentářBottom navigation7/10Existuje, ale obsah tabů není dostatečně silnýOnboarding / rychlé nastavení6/10Dobré, ale zůstává na Domů příliš dlouhoDoporučení7/10Badge jsou dobré, karty jsou ale slabéKatalog4/10Stále desktopová logikaRozvrh4/10Není středobodem zážitkuKolize5/10Existují, ale nejsou dostatečně silné vizuálněIntuitivnost ovládání4/10Největší slabinaTablet3/10Nejhorší breakpoint
Celkové skóre mobil+tablet: 4.8 / 10
Aplikace má dobrý základ dat a logiky, ale zážitek na mobilu ještě není state-of-the-art.

2. Nejkritičtější problémy (seřazeno podle závažnosti)
1. Horní lišta je stále příliš hustá
Na mobilu zabírá zbytečně moc místa:

Jméno dítěte + Přidat dítě
Věk
Uloženo
Undo/Redo
Další

Důsledek: Obsah začíná příliš nízko. Uživatel musí hned scrollovat.
State-of-the-art řešení:
Header max 56–64 px. Pouze:

Avatar + jméno dítěte
Přepínač dětí
✓ Uloženo
Menu (⋯)

Vše ostatní schovat.
2. Domů není schedule-first
Aktuálně Domů obsahuje:

Onboarding kartu (pořád viditelnou)
Tento týden (prázdný)
Doporučení

To je lepší než dřív, ale stále to není „osobní asistent“.
Správný model:

Po dokončení nastavení onboarding zmizí
Hlavní obsah = Tento týden (Agenda)
Pod ním silná doporučení

3. Karty kroužků jsou stále příliš informačně husté
Na mobilu je vidět příliš mnoho textu najednou.
Rodič potřebuje během 1 sekundy pochopit:

Co to je
Kdy
Kolik
Jestli se vejde

Aktuální karty to nesplňují dostatečně.
4. Kolize nejsou dostatečně dramatické a vysvětlující
Badge „Bez kolize“ je dobrý začátek, ale chybí:

🟠 Těsná návaznost
🔴 Přímá kolize s konkrétním názvem
Možnost „Přesto přidat“
Vysvětlení proč

5. Tablet je katastrofa
Tablet (iPad) není ani mobil, ani desktop. Aktuálně vypadá rozbitě.
Potřebuje vlastní 2–3 sloupcový layout.
6. Chybí „Najít volné místo“ jako primární koncept
Funkce „Bez konfliktu“ existuje, ale není postavená jako hlavní způsob práce s aplikací.

3. Co je potřeba změnit, aby ovládání bylo the best
A. Mobilní header (P0)
Před:
Příliš mnoho prvků
Po:
text[M] Matěj · 9 let ▼          ✓ Uloženo     ⋯
B. Domů – nová struktura (P0)
textMatěj · 9 let ▼

DNES
15:30 Programování
16:30 Basketbal

TENTO TÝDEN
Po  · 16:30 Basketbal
Út  · Volno
St  · 15:00 Angličtina
...

DOPORUČUJEME
🥇 Basketbal — Po 16:30
   ✓ Vhodné · ✓ Bez kolize · 100 Kč
   [ Přidat do rozvrhu ]

🥈 Karate — Po 17:30
   ✓ Vhodné · ✓ Bez kolize
   [ Přidat do rozvrhu ]
Onboarding karta se zobrazí pouze při prvním spuštění.
C. Karty kroužků – dramatické zjednodušení (P0)
Mobilní karta (maximálně 4 řádky):
text🏀 Basketbal — přípravka
8–11 let · Po 16:30
100 Kč/měs · DDM Rakovník

[ Přidat do rozvrhu ]
Všechno ostatní do Bottom Sheet.
D. Bottom Sheet detail (P0)
Po tapnutí na kartu:

Název + kategorie
Všechny termíny
Cena
Lokalita
Badge (Vhodné / Bez kolize / Kolize)
Velké tlačítko Přidat do rozvrhu
Swipe down = zavřít

E. Systém kolizí – state-of-the-art (P0)

























StavVizuálTextBez kolize🟢✓ Bez kolizeTěsná návaznost🟠⚠️ Stihne přesun?Přímá kolize🔴❌ Kolize s „Karate 16:00–17:00“
Vždy umožnit Přesto přidat.
F. „Najít volné místo“ (P0)
Udělat z toho primární akci na Domů i v Katalogu.
Po aktivaci aplikace sama řekne:
Pro Matěje tento týden máme 4 vhodné možnosti bez kolize.
G. Tablet layout (P0)
Tablet musí mít vlastní rozložení:
text┌─────────────┬──────────────────┬─────────────────┐
│ Filtry      │ Kroužky          │ Rozvrh dítěte   │
│             │                  │                 │
│             │                  │ Sticky přehled  │
└─────────────┴──────────────────┴─────────────────┘
H. Okamžitá zpětná vazba (P0)
Po přidání:
text✓ Přidáno do Matějova rozvrhu
[ Zobrazit rozvrh ]
Snackbar 2–3 sekundy.
I. Vlastní událost přes FAB (P1)
V Rozvrhu velké + tlačítko:
textPřidat
• Kroužek
• Škola
• Lékař
• Jiné

4. Prioritizovaný seznam změn (pouze mobil + tablet)
P0 – bez toho to nebude state-of-the-art

Odlehčit mobilní header
Domů = schedule-first (Tento týden + Doporučení)
Dramaticky zjednodušit karty + Bottom Sheet
Silný vizuální systém kolizí (🟢🟠🔴 + vysvětlení)
„Najít volné místo“ jako hlavní koncept
Tablet specifický split layout
Okamžitá zpětná vazba po přidání
Agenda jako výchozí pohled rozvrhu na mobilu

P1

Časová dostupnost dítěte (ne jen věk a zájmy)
FAB pro vlastní událost
Sticky mini-rozvrh při procházení katalogu
Lepší empty states
Accessibility (44–48 px, kontrast, ne jen barva)


5. Finální verdikt
Aplikace má dobrou datovou a logickou základnu.
Doporučení s badge a bottom navigation jsou kroky správným směrem.
Ale na mobilu a tabletu stále platí:
Je to lepší katalog, ne ještě osobní asistent rodiče.
Aby ovládání a intuitivnost byly opravdu „the best“, musí se změnit mentální model:
Od:
Katalog → filtr → kroužek → přidat
K:
Dítě → jeho čas → doporučení → rozvrh → kolize
Dokud Domů nebude primárně ukazovat „jak vypadá týden dítěte“ a karty nebudou extrémně jednoduché, aplikace na mobilu nedosáhne state-of-the-art úrovně.