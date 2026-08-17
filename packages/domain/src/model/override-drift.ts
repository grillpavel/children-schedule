import type { Activity, ActivityOverride } from './types.js';

/**
 * Stabilní podpis katalogových hodnot kroužku, které lze přepsat overridem
 * (název + cena). Slouží k detekci, zda se zdroj změnil od uživatelovy úpravy.
 * Čisté a deterministické.
 */
export function activitySignature(activity: Pick<Activity, 'name' | 'price'>): string {
  return JSON.stringify({
    n: activity.name,
    a: activity.price.amount,
    p: activity.price.period,
  });
}

/**
 * `true`, když override nese podpis zdroje (`baseSignature`) a ten se liší od
 * aktuálního katalogu — tedy katalog se od uživatelovy úpravy změnil (C8-E3).
 */
export function overrideSourceChanged(
  activity: Pick<Activity, 'name' | 'price'>,
  override: Pick<ActivityOverride, 'baseSignature'>,
): boolean {
  return (
    override.baseSignature !== undefined &&
    override.baseSignature !== activitySignature(activity)
  );
}
