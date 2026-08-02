import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../lib/storage';

const STORAGE_KEY = 'blog_filters';

interface StoredFilters {
    category?: string;
    tag?: string;
}

function readStored(): StoredFilters {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw) as StoredFilters;
    } catch {
        return {};
    }
}

function writeStored(filters: StoredFilters) {
    if (!filters.category && !filters.tag) {
        safeRemoveItem(STORAGE_KEY);
        return;
    }
    safeSetItem(STORAGE_KEY, JSON.stringify(filters));
}

/**
 * Blog list filter state (category, tag, free-text search), backed by URL
 * search params as the single source of truth so every filtered view is a
 * shareable link. Category + tag are mirrored to localStorage so they
 * survive a hard refresh and navigating away and back - per spec, they
 * persist until the visitor explicitly clears them (the chip's X), not just
 * for the session. `q` is deliberately left out of that mirror: a search
 * box that refills itself on a later, unrelated visit reads as a bug, while
 * a restored category/tag filter is the requested behavior.
 */
export function useBlogFilters() {
    const [searchParams, setSearchParams] = useSearchParams();
    const restored = useRef(false);

    // One-time restore: only when the URL arrives with no filter params of
    // its own (a bare /blog visit), so an explicit link like
    // /blog?category=x always wins over whatever was stored previously.
    useEffect(() => {
        if (restored.current) return;
        restored.current = true;
        if (searchParams.has('category') || searchParams.has('tag')) return;
        const stored = readStored();
        if (!stored.category && !stored.tag) return;
        const next = new URLSearchParams(searchParams);
        if (stored.category) next.set('category', stored.category);
        if (stored.tag) next.set('tag', stored.tag);
        setSearchParams(next, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('q') ?? '';

    const update = (patch: { category?: string | null; tag?: string | null; search?: string | null }) => {
        const next = new URLSearchParams(searchParams);

        if (patch.category !== undefined) {
            if (patch.category) next.set('category', patch.category);
            else next.delete('category');
        }
        if (patch.tag !== undefined) {
            if (patch.tag) next.set('tag', patch.tag);
            else next.delete('tag');
        }
        if (patch.search !== undefined) {
            if (patch.search) next.set('q', patch.search);
            else next.delete('q');
        }

        setSearchParams(next, { replace: true });
        writeStored({
            category: patch.category !== undefined ? (patch.category ?? undefined) : (category ?? undefined),
            tag: patch.tag !== undefined ? (patch.tag ?? undefined) : (tag ?? undefined),
        });
    };

    const setCategory = (value: string | null) => update({ category: value });
    const setTag = (value: string | null) => update({ tag: value });
    const setSearch = (value: string) => update({ search: value || null });

    const clearCategory = () => setCategory(null);
    const clearTag = () => setTag(null);
    const clearAll = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('category');
        next.delete('tag');
        setSearchParams(next, { replace: true });
        safeRemoveItem(STORAGE_KEY);
    };

    return { category, tag, search, setCategory, setTag, setSearch, clearCategory, clearTag, clearAll };
}
