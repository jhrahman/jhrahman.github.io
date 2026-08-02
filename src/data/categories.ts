import type { Category, Post } from '../types/blog';
import { allPostsIncludingDrafts, posts } from './posts';

// Build-time glob, same static philosophy as posts.ts - categories are
// baked into the bundle, not fetched at runtime.
const modules = import.meta.glob<{ default: Category }>('../content/categories/*.json', { eager: true });

const allCategories: Category[] = Object.values(modules)
    .map((m) => m.default)
    .sort((a, b) => a.title.localeCompare(b.title));

export const categories: Category[] = allCategories;

export function getCategory(slug: string): Category | undefined {
    return allCategories.find((c) => c.slug === slug);
}

/**
 * Every post in a category, in series order (Part 1 -> Part N), not
 * newest-first. Posts without a part number sort after numbered ones;
 * ties (including two unnumbered posts) fall back to publish date, oldest
 * first, so a series always reads as a coherent sequence.
 */
export function partsOf(slug: string, includeDrafts = false): Post[] {
    const source = includeDrafts ? allPostsIncludingDrafts : posts;
    return source
        .filter((p) => p.category === slug)
        .sort((a, b) => {
            if (a.part != null && b.part != null) return a.part - b.part;
            if (a.part != null) return -1;
            if (b.part != null) return 1;
            return a.date.localeCompare(b.date);
        });
}

export interface CategoryStats {
    parts: number;
    totalReadingTime: number;
    latestDate: string | null;
}

export function categoryStats(slug: string, includeDrafts = false): CategoryStats {
    const parts = partsOf(slug, includeDrafts);
    return {
        parts: parts.length,
        totalReadingTime: parts.reduce((sum, p) => sum + p.readingTime, 0),
        latestDate: parts.length > 0 ? parts.reduce((max, p) => (p.date > max ? p.date : max), parts[0].date) : null,
    };
}

/** Category's own cover if set, otherwise falls back to Part 1's cover. */
export function coverFor(category: Category): string | null {
    if (category.cover) return category.cover;
    return partsOf(category.slug)[0]?.cover ?? null;
}

/** Next free part number when adding a new post to this category. */
export function nextPartNumber(slug: string): number {
    const parts = partsOf(slug, true);
    return parts.reduce((max, p) => Math.max(max, p.part ?? 0), 0) + 1;
}

/** In-series prev/next, in the same partsOf() order used everywhere else. */
export function getSeriesAdjacent(post: Post, includeDrafts = false): { prev: Post | null; next: Post | null } {
    if (!post.category) return { prev: null, next: null };
    const parts = partsOf(post.category, includeDrafts);
    const index = parts.findIndex((p) => p.slug === post.slug);
    if (index === -1) return { prev: null, next: null };
    return {
        prev: index > 0 ? parts[index - 1] : null,
        next: index < parts.length - 1 ? parts[index + 1] : null,
    };
}
