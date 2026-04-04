import { useMemo } from "react";

export interface Spread {
  left: number | null;
  right: number | null;
}

/**
 * Groups pages into spread rows: cover alone on right, interior paired,
 * back cover alone on left.
 */
export function useSpreads(pageCount: number): Spread[] {
  return useMemo(() => {
    const result: Spread[] = [];
    if (pageCount === 0) return result;
    if (pageCount === 1) return [{ left: null, right: 0 }];

    // Cover (page 0) alone on right
    result.push({ left: null, right: 0 });

    // Interior pages (1 to N-2) paired
    for (let i = 1; i <= pageCount - 2; i += 2) {
      result.push({
        left: i,
        right: i + 1 <= pageCount - 2 ? i + 1 : null,
      });
    }

    // Back cover (last page) alone on left
    result.push({ left: pageCount - 1, right: null });

    return result;
  }, [pageCount]);
}
