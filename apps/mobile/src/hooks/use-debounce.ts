import { useEffect, useState } from "react";

/**
 * 값이 delay(ms) 동안 안정되면 그 값을 반환한다(순수).
 * 그 사이의 빠른 변경은 무시되어, 마지막 값만 반영된다.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
