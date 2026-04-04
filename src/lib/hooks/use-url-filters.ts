"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface UseUrlFiltersOptions<
  TFilter extends string,
  TSort extends string = "desc" | "asc",
  TSortField extends string = "date",
> {
  defaultFilter?: TFilter;
  defaultSearch?: string;
  defaultSort?: TSort;
  defaultSortField?: TSortField;
  defaultPage?: number;
}

export function useUrlFilters<
  TFilter extends string = "all",
  TSort extends string = "desc" | "asc",
  TSortField extends string = "date",
>({
  defaultFilter = "all" as TFilter,
  defaultSearch = "",
  defaultSort = "desc" as TSort,
  defaultSortField = "date" as TSortField,
  defaultPage = 1,
}: UseUrlFiltersOptions<TFilter, TSort, TSortField> = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("q") ?? defaultSearch;
  const filter = (searchParams.get("f") as TFilter) ?? defaultFilter;
  const sort = (searchParams.get("s") as TSort) ?? defaultSort;
  const sortField = (searchParams.get("sf") as TSortField) ?? defaultSortField;
  const pageStr = searchParams.get("p");
  const page = pageStr ? parseInt(pageStr, 10) : defaultPage;

  const setFilters = useCallback(
    (updates: {
      q?: string;
      f?: TFilter;
      s?: TSort;
      sf?: TSortField;
      p?: number;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.q !== undefined) {
        if (updates.q) params.set("q", updates.q);
        else params.delete("q");
      }
      if (updates.f !== undefined) {
        if (updates.f && updates.f !== "all") params.set("f", updates.f);
        else params.delete("f");
      }
      if (updates.s !== undefined) {
        if (updates.s !== defaultSort) params.set("s", updates.s);
        else params.delete("s");
      }
      if (updates.sf !== undefined) {
        if (updates.sf !== defaultSortField) params.set("sf", updates.sf);
        else params.delete("sf");
      }
      if (updates.p !== undefined) {
        if (updates.p > 1) params.set("p", updates.p.toString());
        else params.delete("p");
      }

      // If anything other than page changes, reset page to 1
      if (
        (updates.q !== undefined ||
          updates.f !== undefined ||
          updates.s !== undefined ||
          updates.sf !== undefined) &&
        updates.p === undefined
      ) {
        params.delete("p");
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router, defaultSort, defaultSortField],
  );

  const setSearch = useCallback((q: string) => setFilters({ q }), [setFilters]);
  const setFilter = useCallback(
    (f: TFilter) => setFilters({ f }),
    [setFilters],
  );
  const setSort = useCallback((s: TSort) => setFilters({ s }), [setFilters]);
  const setSortField = useCallback(
    (sf: TSortField) => setFilters({ sf }),
    [setFilters],
  );
  const setPage = useCallback((p: number) => setFilters({ p }), [setFilters]);

  // Sort asc helper
  const sortAsc = sort === ("asc" as TSort);
  const setSortAsc = useCallback(
    (asc: boolean) => setFilters({ s: (asc ? "asc" : "desc") as TSort }),
    [setFilters],
  );

  return {
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    page,
    setPage,
    setFilters,
  };
}
