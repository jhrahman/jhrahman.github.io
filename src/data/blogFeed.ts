import type { Category, Post } from '../types/blog';
import { categories, categoryStats } from './categories';

/**
 * The mixed index feed shown on /blog: standalone posts and category
 * "series" cards side by side. A post that belongs to a category never
 * appears here on its own - the category card is its only door in, per
 * partsOf() in categories.ts, which is the single source of truth for a
 * series's part order everywhere else (the category page, the in-post
 * series rail, and prev/next).
 */
export type FeedEntry =
    | { kind: 'post'; date: string; post: Post }
    | { kind: 'category'; date: string; category: Category };

export function buildFeed(visiblePosts: Post[], includeDrafts = false): FeedEntry[] {
    const standalone: FeedEntry[] = visiblePosts
        .filter((p) => p.category === null)
        .map((post) => ({ kind: 'post', date: post.date, post }));

    const categoryEntries: FeedEntry[] = categories
        .map((category) => {
            const stats = categoryStats(category.id, includeDrafts);
            // A category with zero visible parts (e.g. every part is still a
            // draft and the viewer isn't the owner) has nothing to show.
            if (stats.parts === 0) return null;
            // Resurface the series by its most recently published part, not
            // its own creation date, so a new installment brings it back to
            // the top of the feed like any other update.
            return { kind: 'category', date: stats.latestDate ?? category.date, category } as FeedEntry;
        })
        .filter((e): e is FeedEntry => e !== null);

    return [...standalone, ...categoryEntries].sort((a, b) => b.date.localeCompare(a.date));
}

export function pickFeaturedEntries(entries: FeedEntry[]): FeedEntry[] {
    const featured = entries.filter((e) => (e.kind === 'post' ? e.post.featured : e.category.featured));
    return featured.length > 0 ? featured : entries.slice(0, 1);
}

export function entryKey(entry: FeedEntry): string {
    return entry.kind === 'post' ? `post-${entry.post.slug}` : `category-${entry.category.id}`;
}
