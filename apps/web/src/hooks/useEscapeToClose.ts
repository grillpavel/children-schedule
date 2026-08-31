'use client';

import { useEffect } from 'react';

/** Zavře popup/menu klávesou Escape — sjednocené chování napříč dialogy a
 * dropdown menu (design_review_95.md), stejné jako referenční „+ Vlastní událost“. */
export function useEscapeToClose(onClose: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
}
