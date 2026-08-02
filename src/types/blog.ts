export interface Post {
    id: number; // stable, assigned once at first publish - used for the public URL
    slug: string;
    title: string;
    excerpt: string;
    tags: string[];
    cover: string | null;
    date: string; // ISO, set on first publish
    updated: string | null; // ISO, set on re-publish
    readingTime: number; // minutes, computed from word count on save
    featured: boolean; // pins to the hero slot on the Blog list page
    draft: boolean; // hidden from visitors, visible to the signed-in owner
    html: string; // sanitized TipTap output
    category: string | null; // Category.slug this post belongs to; null = standalone post
    part: number | null; // 1-based position within the category; null when uncategorised
}

export interface Category {
    slug: string; // URL segment, e.g. "playwright-series"
    title: string; // display name, e.g. "Playwright with TypeScript"
    description: string; // blurb shown on the card and the category hero
    cover: string | null;
    featured: boolean; // pins the category card to the Blog list hero, same as Post.featured
    date: string; // ISO, set on creation
    updated: string | null; // ISO, set on re-save
}
