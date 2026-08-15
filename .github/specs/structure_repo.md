# Zde info pro testování
Skoro. Pod test/ jde většina, ale ne všechno. Tři soubory musí jinam, jinak nebudou fungovat.
Cílová struktura repa CHILDREN_SCHEDULE
CHILDREN_SCHEDULE/
├─ .github/
│  ├─ copilot-instructions.md      ← MIMO test/
│  └─ workflows/
│     └─ e2e.yml                   ← MIMO test/
│
├─ test/
│  ├─ README.md
│  ├─ playwright.config.ts
│  ├─ specs/
│  │  └─ smoke.spec.ts             ← Copilot sem dopíše zbytek
│  ├─ helpers/
│  │  ├─ profiles.ts
│  │  └─ ics-raw.ts
│  ├─ fixtures/                    ← zatím prázdné, doplníš katalog
│  ├─ docs/
│  │  ├─ test-spec.md              ← testovací specifikace
│  │  ├─ changes-6-7.md
│  │  ├─ changes-8.md
│  │  └─ changes-9.md
│  ├─ snapshots/                   ← vytvoří Playwright sám
│  ├─ .results/                    ← gitignored
│  └─ .report/                     ← gitignored
│
├─ package.json                    ← MIMO test/
├─ .gitignore                      ← MIMO test/
└─ ...zbytek aplikace
Kam který stažený soubor patří
Soubory se stáhly s plochými názvy, tady je přiřazení:
Stažený soubor	Cílová cesta
README.md	test/README.md
playwright.config.ts	test/playwright.config.ts
smoke.spec.ts	test/specs/smoke.spec.ts
profiles.ts	test/helpers/profiles.ts
ics-raw.ts	test/helpers/ics-raw.ts
krouzky-planner-test-spec.md	test/docs/test-spec.md
krouzky-planner-changes-6-7.md	test/docs/changes-6-7.md
krouzky-planner-changes-8.md	test/docs/changes-8.md
krouzky-planner-changes-9.md	test/docs/changes-9.md
copilot-instructions.md	.github/copilot-instructions.md
e2e.yml	.github/workflows/e2e.yml
package.json	kořen (jen scripts a devDependencies slouč do svého)
.gitignore	kořen (jen doplň řádky)