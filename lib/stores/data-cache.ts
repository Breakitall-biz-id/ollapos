'use client';

import { create } from 'zustand';

type CacheEntry<T> = {
    data: T;
    fetchedAt: number;
};

// TTL = 2 minutes — data is considered fresh within this window
const CACHE_TTL_MS = 2 * 60 * 1000;

type DataCacheState = {
    entries: Record<string, CacheEntry<unknown>>;
    get: <T>(key: string) => T | null;
    set: <T>(key: string, data: T) => void;
    invalidate: (key: string) => void;
    invalidateAll: () => void;
    isFresh: (key: string) => boolean;
};

export const useDataCache = create<DataCacheState>((set, get) => ({
    entries: {},

    get: <T,>(key: string): T | null => {
        const entry = get().entries[key];
        if (!entry) return null;
        return entry.data as T;
    },

    set: <T,>(key: string, data: T) => {
        set((state) => ({
            entries: {
                ...state.entries,
                [key]: { data, fetchedAt: Date.now() },
            },
        }));
    },

    invalidate: (key: string) => {
        set((state) => {
            const { [key]: _, ...rest } = state.entries;
            return { entries: rest };
        });
    },

    invalidateAll: () => {
        set({ entries: {} });
    },

    isFresh: (key: string): boolean => {
        const entry = get().entries[key];
        if (!entry) return false;
        return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
    },
}));

/**
 * Helper hook for cached server action fetching.
 * Usage:
 *   const { data, loading, refresh } = useCachedFetch('products', getProductsForCurrentPangkalan);
 *
 * - Returns cached data instantly if fresh
 * - Fetches in background if stale
 * - Shows loading only on first fetch
 */
export function useCachedData<T>(key: string): {
    data: T | null;
    setData: (data: T) => void;
    isFresh: boolean;
    invalidate: () => void;
} {
    const cache = useDataCache();
    return {
        data: cache.get<T>(key),
        setData: (data: T) => cache.set(key, data),
        isFresh: cache.isFresh(key),
        invalidate: () => cache.invalidate(key),
    };
}
