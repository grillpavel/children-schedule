'use client';

/** Next.js App Router error boundary — chybí, dokud aplikace neměla žádnou cestu
 * zpět po neošetřené chybě renderu (audit after_review_71 §6): bílá obrazovka bez
 * zprávy a jediná záchrana byl ruční refresh. Rozvrh samotný zůstává v localStorage
 * (autosave) i po chybě — `reset()` zkusí segment znovu vykreslit bez plného reloadu. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center">
      <h1 className="text-lg font-bold text-slate-900">Něco se nepodařilo</h1>
      <p className="max-w-md text-sm text-slate-600">
        Aplikace narazila na neočekávanou chybu. Váš rozvrh zůstává uložený v tomto
        prohlížeči (autosave) — zkuste to obnovit; pokud problém přetrvá, stáhněte
        si zálohu přes „Otevřít“/„Uložit“ po obnovení.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
        >
          Obnovit
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        >
          Načíst stránku znovu
        </button>
      </div>
      {error.digest && <p className="text-[11px] text-slate-400">Kód chyby: {error.digest}</p>}
    </div>
  );
}
