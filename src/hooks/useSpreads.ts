import { useMemo } from "react";
import { getSpreads, type Spread } from "@/lib/spreads";
import { useBook } from "@/context/BookContext";
import { getPrintBinding } from "@/lib/printProducts";

/** Left-aligned covers and printed interior pairings, including printer blanks. */
export function useSpreads(pageCount: number): Spread[] {
  const { book } = useBook();
  const binding = getPrintBinding(book.printSelection);
  return useMemo(() => getSpreads(pageCount, binding), [pageCount, binding]);
}
