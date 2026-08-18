Prošel jsem aplikaci znovu (desktop + mobil). Desktop zůstává použitelný.
Mobil a tablet jsou stále největší slabinou a brání tomu, aby aplikace působila jako špičkový produkt.

Celkové hodnocení (mobil + tablet)























































OblastSkóreKomentářBottom navigation7/10Existuje, ale obsah tabů není dostatečně silnýDomů / Přehled5.5/10Má DNES + TENTO TÝDEN + Doporučení, ale onboarding karta přetrvává a hierarch ie je slabáDoporučení6.5/10Badge jsou dobré, karty stále příliš textovéKatalog4/10Desktopová logika na malém displejiRozvrh4/10Není středobodem zážitkuKolize5/10Existují, ale nejsou dostatečně silné a vysvětlujícíIntuitivnost ovládání4/10Největší problémTablet3/10Nejhorší breakpointCelkové skóre4.9/10Stále spíš „lepší katalog“ než „osobní asistent“

Nejkritičtější zjištění
1. Horní lišta je stále příliš hustá (P0)
Na mobilu zabírá zbytečně mnoho vertikálního prostoru:

Jméno + Přidat dítě
Věk
Uloženo
Undo/Redo
Další

Obsah začíná příliš nízko. To je základní mobilní chyba.
2. Domů stále není schedule-first
I když už máte sekce DNES a TENTO TÝDEN, onboarding karta „Vítejte! Rychlé nastavení“ zůstává dominantní.
Po prvním nastavení by měla zmizet. Hlavní fokus musí být na týdnu dítěte.
3. Karty doporučení a katalogu jsou stále příliš informačně husté
Rodič potřebuje během 1 sekundy pochopit:

Co to je
Kdy
Kolik to stojí
Jestli se vejde

Aktuální karty to nesplňují dost dobře.
4. Kolize nejsou state-of-the-art
Badge „Bez kolize“ je dobrý začátek, ale chybí:

🟠 Těsná návaznost
🔴 Přímá kolize s konkrétním názvem aktivity
Možnost „Přesto přidat“
Jasné vysvětlení

5. Tablet je stále katastrofa
Žádný specifický layout pro 768–1024 px. Vypadá to jako rozbitý hybrid.
6. Chybí silný koncept „Najít volné místo“
Funkce existuje v pozadí, ale není postavená jako hlavní způsob práce s aplikací.

Co přesně změnit, aby ovládání bylo the best
1. Mobilní header (nejvyšší priorita)
Cíl: Max 56–64 px výšky.
Nechat pouze:
text[M] Matěj · 9 let ▼          ✓ Uloženo     ⋯
Všechno ostatní (věk, undo, Další…) schovat do menu nebo do profilu dítěte.
2. Domů – nová hierarchie (P0)
Po dokončení nastavení:
textMatěj · 9 let ▼

DNES
Dnes nic nemáte naplánované.

TENTO TÝDEN
Po  · Volno
Út  · Volno
...

DOPORUČUJEME
🥇 Basketbal — Po 16:30
   ✓ Vhodné · ✓ Bez kolize · 100 Kč
   [ Přidat do rozvrhu ]
Onboarding karta se zobrazí pouze při prvním spuštění.
3. Karty – dramatické zjednodušení (P0)
Mobilní karta (max 4 řádky):
text🏀 Basketbal — přípravka
8–11 let · Po 16:30
100 Kč/měs · DDM Rakovník

[ Přidat do rozvrhu ]
Všechno ostatní do Bottom Sheet.
4. Bottom Sheet detail (P0)
Po tapnutí:

Kompletní informace
Všechny termíny
Badge (Vhodné / Bez kolize / Kolize)
Velké tlačítko Přidat do rozvrhu
Swipe down = zavřít

5. Systém kolizí – musí být okamžitě pochopitelný (P0)

























StavVizuálTextBez kolize🟢✓ Bez kolizeTěsná návaznost🟠⚠️ Stihne přesun?Přímá kolize🔴❌ Kolize s „Karate 16:00–17:00“
Vždy umožnit Přesto přidat.
6. „Najít volné místo“ jako primární koncept (P0)
Udělat z toho hlavní akci na Domů i v Katalogu.
Aplikace sama řekne: „Pro Matěje tento týden máme 4 vhodné možnosti bez kolize.“
7. Tablet – vlastní layout (P0)
text┌─────────────┬──────────────────┬─────────────────┐
│ Filtry      │ Kroužky          │ Rozvrh dítěte   │
│             │                  │ (sticky)        │
└─────────────┴──────────────────┴─────────────────┘
8. Okamžitá zpětná vazba (P0)
Po přidání:
text✓ Přidáno do Matějova rozvrhu
[ Zobrazit rozvrh ]

Prioritizovaný seznam (pouze mobil + tablet)
P0 – bez toho to nebude state-of-the-art

Odlehčit mobilní header
Domů = čistě schedule-first (onboarding jen poprvé)
Dramaticky zjednodušit karty + Bottom Sheet
Silný vizuální systém kolizí (🟢🟠🔴 + vysvětlení)
„Najít volné místo“ jako hlavní koncept
Tablet specifický split-view
Okamžitá zpětná vazba po přidání
Agenda jako výchozí pohled rozvrhu na mobilu

P1
9. Časová dostupnost dítěte (ne jen věk + zájmy)
10. FAB pro vlastní událost
11. Sticky mini-rozvrh při procházení katalogu
12. Lepší empty states
13. Accessibility (44–48 px targets, kontrast, ne jen barva)

Finální verdikt
Aplikace se postupně zlepšuje (DNES sekce, badge, bottom nav), ale stále platí:
Je to lepší katalog kroužků, ne ještě osobní asistent rodiče.
Dokud:

header zůstane hustý,
Domů nebude primárně ukazovat týden dítěte,
karty nebudou extrémně jednoduché,
kolize nebudou dramatické a vysvětlující,
tablet nebude mít vlastní layout,

ovládání a intuitivnost na mobilu nedosáhne úrovně „the best“.
Největší páka teď je:

Header
Domů hierarchy
Karty + Bottom Sheet
Kolize

Chceš v dalším kroku konkrétní textové wireframy pro mobilní Domů + Katalog + Rozvrh + Tablet, nebo prioritizovaný backlog úkolů přímo pro vývojáře?