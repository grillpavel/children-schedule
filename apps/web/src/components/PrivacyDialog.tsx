'use client';

import { IconClose } from './Icons';

/** Souhrn ochrany soukromí (design_review_71.md) — dostupný z Toolbaru „Další ▾“.
 * Aplikace nemá backend ani účty; jediný reálný odtok dat je geokódování adresy
 * na Nominatim (OpenStreetMap) při uložení adresy v CustomEntryDialog/DetailsPanel. */
export function PrivacyDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="privacy-dialog-title" className="text-base font-bold text-slate-900">
            Soukromí a data
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavřít"
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-700">
          <section>
            <h3 className="font-semibold text-slate-900">Cookies</h3>
            <p>Aplikace nepoužívá žádné cookies ani sledovací či analytické nástroje.</p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900">Kde žijí vaše data</h3>
            <p>
              Rozvrh existuje jen v paměti tohoto prohlížeče (autosave přes{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">localStorage</code>) — nic se
              neodesílá na žádný server aplikace. Soubor si kdykoliv stáhnete tlačítkem „Uložit“ nebo
              naimportujete na jiném počítači/telefonu tlačítkem „Otevřít“.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900">Jediná výjimka: hledání adresy na mapě</h3>
            <p>
              Když zadáte nebo upravíte adresu kroužku či vlastní události, text adresy se odešle na{' '}
              <a
                href="https://nominatim.org/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                Nominatim (OpenStreetMap)
              </a>
              , aby šlo zobrazit odkaz na mapu. Nic jiného se nikam neposílá. Zásady ochrany soukromí
              OpenStreetMap:{' '}
              <a
                href="https://osmfoundation.org/wiki/Privacy_Policy"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                osmfoundation.org
              </a>
              .
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900">Export</h3>
            <p>
              Kalendář (.ics), obrázek rozvrhu (.png) i záloha (.json) se generují přímo ve vašem
              prohlížeči a jen se stahují do vašeho zařízení — nikam jinam se neodesílají.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900">Toto je demo</h3>
            <p>
              Jedná se o demo — katalog kroužků (názvy, časy, ceny, kontakty) je ukázková datová sada,
              veškeré informace byly nalezeny na volně dostupných serverech a informace nemusí být
              aktuální; před přihlášením je vždy ověřte přímo u pořadatele.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
