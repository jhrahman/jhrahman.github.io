export interface Post {
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
}
