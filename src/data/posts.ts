import type { Post } from '../types/blog';

// Build-time glob, same static philosophy as the hardcoded `projects` array
// in Activities.tsx - posts are baked into the bundle, not fetched at
// runtime, so there's no loading state, no API rate limit, and full offline
// support for visitors.
const modules = import.meta.glob<{ default: Post }>('../content/posts/*.json', { eager: true });

const allPosts: Post[] = Object.values(modules)
    .map((m) => m.default)
    .sort((a, b) => b.date.localeCompare(a.date));

/** Published posts only, newest first - what visitors see. */
export const posts: Post[] = allPosts.filter((p) => !p.draft);

/** Every post including drafts - only ever used behind an isOwner check. */
export const allPostsIncludingDrafts: Post[] = allPosts;

export function getPost(slug: string, includeDrafts = false): Post | undefined {
    const source = includeDrafts ? allPostsIncludingDrafts : posts;
    return source.find((p) => p.slug === slug);
}

export const allTags: string[] = [...new Set(posts.flatMap((p) => p.tags))].sort((a, b) =>
    a.localeCompare(b)
);

export function pickFeatured(source: Post[]): Post[] {
    const featured = source.filter((p) => p.featured);
    return featured.length > 0 ? featured : source.slice(0, 1);
}

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
