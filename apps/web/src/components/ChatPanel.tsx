'use client';

/**
 * Zástupný panel pro chat. Skutečné tool-calling a preview/apply přijde v M1
 * (viz docs/05-chat-llm-spec.md). Do té doby zůstává rozvrh plně ovladatelný
 * ručně bez LLM — to je záměr milníku M0.
 */
export function ChatPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm font-medium text-slate-600">
        Chat bude dostupný v příští verzi (M0 je bez LLM).
      </p>
      <p className="text-xs text-slate-400">
        Zatím sestavte rozvrh ručně — vyberte kroužky vlevo a vyexportujte do
        kalendáře.
      </p>
    </div>
  );
}
