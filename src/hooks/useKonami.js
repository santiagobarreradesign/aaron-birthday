import { useEffect, useRef } from 'react';
import { KONAMI_CODE } from '../config';

export default function useKonami(onActivate) {
  const idx = useRef(0);

  useEffect(() => {
    function handler(e) {
      if (e.key === KONAMI_CODE[idx.current]) {
        idx.current++;
        if (idx.current === KONAMI_CODE.length) {
          idx.current = 0;
          onActivate();
        }
      } else {
        idx.current = 0;
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onActivate]);
}
