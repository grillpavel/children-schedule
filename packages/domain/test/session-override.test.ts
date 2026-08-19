import { describe, it, expect } from 'vitest';
import { effectiveSession, applySessionOverrides } from '../src/model/session-override.js';
import { TEST_CATALOG } from './fixtures/catalog.js';

const baseSession = {
  id: 's1',
  groupId: 'g1',
  weekday: 1 as const,
  startMinutes: 900,
  endMinutes: 960,
  validFrom: '2026-09-01',
  validTo: '2027-06-30',
};

describe('effectiveSession (design_review_69.md)', () => {
  it('bez override vrátí session beze změny', () => {
    expect(effectiveSession(baseSession, undefined)).toEqual(baseSession);
  });

  it('override přepíše jen zadaná pole, zbytek zůstává z katalogu', () => {
    const result = effectiveSession(baseSession, {
      sessionId: 's1',
      startMinutes: 1000,
    });
    expect(result.startMinutes).toBe(1000);
    expect(result.endMinutes).toBe(960);
    expect(result.weekday).toBe(1);
  });

  it('override může přepsat i den v týdnu', () => {
    const result = effectiveSession(baseSession, { sessionId: 's1', weekday: 3 });
    expect(result.weekday).toBe(3);
  });
});

describe('applySessionOverrides (design_review_69.md)', () => {
  it('beze změny vrátí stejnou referenci katalogu, pokud nejsou žádné přepisy', () => {
    expect(applySessionOverrides(TEST_CATALOG, [])).toBe(TEST_CATALOG);
  });

  it('přepíše jen session s odpovídajícím sessionId, ostatní zůstávají', () => {
    const patched = applySessionOverrides(TEST_CATALOG, [
      { sessionId: 'TEST_s_keramika_po', startMinutes: 1000, endMinutes: 1060 },
    ]);
    const keramika = patched.sessionGroups
      .find((g) => g.id === 'TEST_keramika_po')!
      .sessions.find((s) => s.id === 'TEST_s_keramika_po')!;
    expect(keramika.startMinutes).toBe(1000);
    expect(keramika.endMinutes).toBe(1060);

    const florbal = patched.sessionGroups
      .find((g) => g.id === 'TEST_florbal_posT')!
      .sessions.find((s) => s.id === 'TEST_s_florbal_po')!;
    expect(florbal.startMinutes).toBe(930); // nedotčeno
  });

  it('nemutuje vstupní katalog', () => {
    const before = JSON.stringify(TEST_CATALOG);
    applySessionOverrides(TEST_CATALOG, [
      { sessionId: 'TEST_s_keramika_po', startMinutes: 1000, endMinutes: 1060 },
    ]);
    expect(JSON.stringify(TEST_CATALOG)).toBe(before);
  });
});
