import type { Post } from '../types/blog';

// Build-time glob, same static philosophy as the hardcoded `projects` array
// in Activities.tsx - posts are baked into the bundle, not fetched at
// runtime, so there's no loading state, no API rate limit, and full offline
// support for visitors.
const modules = import.meta.glob<{ default: Post }>('../content/posts/*.json', { eager: true });

/** Sole author of every post on this site - see the "Posted By" field in PostEditor. */
export const DEFAULT_AUTHOR = 'Jahidur Rahman';

const allPosts: Post[] = Object.values(modules)
    // category/part/author are newer fields - default them for any post JSON
    // saved before they existed, rather than requiring a one-time file migration.
    .map((m) => ({ ...m.default, category: m.default.category ?? null, part: m.default.part ?? null, author: m.default.author || DEFAULT_AUTHOR }))
    .sort((a, b) => b.date.localeCompare(a.date));

/** Published posts only, newest first - what visitors see. */
export const posts: Post[] = allPosts.filter((p) => !p.draft);

/** Every post including drafts - only ever used behind an isOwner check. */
export const allPostsIncludingDrafts: Post[] = allPosts;

export function getPost(slug: string, includeDrafts = false): Post | undefined {
    const source = includeDrafts ? allPostsIncludingDrafts : posts;
    return source.find((p) => p.slug === slug);
}

/** Looks up a post by its short numeric id - what the public URL uses. */
export function getPostById(id: number, includeDrafts = false): Post | undefined {
    const source = includeDrafts ? allPostsIncludingDrafts : posts;
    return source.find((p) => p.id === id);
}

/** Next id to assign when publishing a brand new post. */
export function nextPostId(): number {
    return allPostsIncludingDrafts.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

export const allTags: string[] = [...new Set(posts.flatMap((p) => p.tags))].sort((a, b) =>
    a.localeCompare(b)
);

export function pickFeatured(source: Post[]): Post[] {
    const featured = source.filter((p) => p.featured);
    return featured.length > 0 ? featured : source.slice(0, 1);
}

/**
 * Global chronological prev/next. When a post belongs to a category, callers
 * should prefer the in-series neighbours from partsOf() in categories.ts
 * instead - kept as a separate helper there (rather than folded in here) to
 * avoid a posts.ts -> categories.ts -> posts.ts import cycle.
 */
export function getAdjacentPosts(slug: string): { prev: Post | null; next: Post | null } {
    const index = posts.findIndex((p) => p.slug === slug);
    if (index === -1) return { prev: null, next: null };
    return {
        prev: index < posts.length - 1 ? posts[index + 1] : null,
        next: index > 0 ? posts[index - 1] : null,
    };
}

export function slugify(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'post';
}

export function computeReadingTime(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

export function deriveExcerpt(html: string, maxLength = 160): string {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}
