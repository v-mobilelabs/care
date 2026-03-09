/**
 * useRTDBListener — subscribe to a Firebase Realtime Database path.
 *
 * Usage:
 *   const { data, loading, error } = useRTDBListener<MyType>('/path/to/data');
 *
 *   // With pagination and ordering (default pageSize is 5)
 *   const { data, loading, error, loadMore, hasMore } = useRTDBListener<Message[]>(
 *     '/messages/userId',
 *     {
 *       pageSize: 20, // override default
 *       orderBy: { type: 'child', key: 'createdAt' },
 *       orderDirection: 'desc'
 *     }
 *   );
 *
 * Returns loading state, data snapshot, and any error encountered.
 */
"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ref,
  query,
  onValue,
  limitToFirst,
  limitToLast,
  orderByChild,
  orderByKey,
  orderByValue,
  type Query,
} from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";

export type OrderByType = "child" | "key" | "value";
export type OrderDirection = "asc" | "desc";

export interface RTDBListenerOptions {
  /** Number of items to load per page. Defaults to 5. */
  pageSize?: number;
  /** Order by configuration */
  orderBy?: {
    type: OrderByType;
    /** Required if type is 'child' */
    key?: string;
  };
  /** Order direction. Defaults to 'asc' */
  orderDirection?: OrderDirection;
}

export interface RTDBListenerState<T> {
  /** The data snapshot from RTDB. Null if path doesn't exist or loading. */
  data: T | null;
  /** True while waiting for the first snapshot. */
  loading: boolean;
  /** True while loading more data. */
  loadingMore: boolean;
  /** Error object if the subscription failed (e.g., permission denied). */
  error: any | null;
  /** Load the next page of data. Only available when pageSize is set. */
  loadMore: (() => void) | null;
  /** Whether there's more data to load. */
  hasMore: boolean;
}

export function useRTDBListener<T = unknown>(
  path: string | null | undefined,
  options?: RTDBListenerOptions,
): RTDBListenerState<T> {
  const { pageSize = 5, orderBy, orderDirection = "asc" } = options || {};

  const [state, setState] = useState<RTDBListenerState<T>>({
    data: null,
    loading: true,
    loadingMore: false,
    error: null,
    loadMore: null,
    hasMore: false,
  });

  const [currentLimit, setCurrentLimit] = useState(pageSize);

  useEffect(() => {
    if (!path) {
      setState({
        data: null,
        loading: false,
        loadingMore: false,
        error: null,
        loadMore: null,
        hasMore: false,
      });
      return;
    }

    // Reset state when path or options change
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setCurrentLimit(pageSize);

    const db = getClientDatabase();
    const dataRef = ref(db, path);

    let queryRef: Query = dataRef;

    // Apply orderBy
    if (orderBy) {
      switch (orderBy.type) {
        case "child":
          if (!orderBy.key) {
            console.error(
              "useRTDBListener: orderBy.key is required when type is 'child'",
            );
            break;
          }
          queryRef = query(queryRef, orderByChild(orderBy.key));
          break;
        case "key":
          queryRef = query(queryRef, orderByKey());
          break;
        case "value":
          queryRef = query(queryRef, orderByValue());
          break;
      }
    }

    // Apply limit
    if (currentLimit > 0) {
      if (orderDirection === "desc") {
        queryRef = query(queryRef, limitToLast(currentLimit));
      } else {
        queryRef = query(queryRef, limitToFirst(currentLimit));
      }
    }

    const unsubscribe = onValue(
      queryRef,
      (snapshot) => {
        const data = snapshot.val() as T | null;

        // For primitive values (string, number, boolean, null), pagination doesn't apply
        const isPrimitive =
          data === null ||
          typeof data === "string" ||
          typeof data === "number" ||
          typeof data === "boolean";

        let hasMore = false;

        if (!isPrimitive) {
          // Convert to array if it's an object (for pagination tracking)
          let items: any[] = [];
          if (typeof data === "object" && !Array.isArray(data)) {
            items = Object.entries(data).map(([key, value]) => ({
              key,
              ...value,
            }));
          } else if (Array.isArray(data)) {
            items = data;
          }

          // Check if there's more data
          hasMore = items.length >= currentLimit;
        }

        setState({
          data,
          loading: false,
          loadingMore: false,
          error: null,
          loadMore: () => handleLoadMore(),
          hasMore,
        });
      },
      (error) => {
        console.error("useRTDBListener: error reading path", path, error);
        setState({
          data: null,
          loading: false,
          loadingMore: false,
          error,
          loadMore: null,
          hasMore: false,
        });
      },
    );

    return unsubscribe;
  }, [
    path,
    pageSize,
    orderBy?.type,
    orderBy?.key,
    orderDirection,
    currentLimit,
  ]);

  const handleLoadMore = useCallback(() => {
    setState((prev) => ({ ...prev, loadingMore: true }));
    setCurrentLimit((prev) => prev + pageSize);
  }, [pageSize]);

  return state;
}
