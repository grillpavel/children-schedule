/**
 * Balíček `@krouzky/chat` — LLM adaptér (milník M1).
 *
 * Zatím záměrně prázdný. Aplikace musí být plně funkční i bez tohoto balíčku
 * (viz docs/07-architecture.md §1). Nástroje `propose_*` a mapování na čisté
 * doménové funkce přijdou v M1 podle docs/05-chat-llm-spec.md.
 *
 * Pravidlo: LLM nikdy neurčuje časy ani termíny — smí volat pouze nástroje
 * definované zde, které delegují na `@krouzky/domain`.
 */
export {};
