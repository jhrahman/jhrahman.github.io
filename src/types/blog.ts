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
    category: number | null; // Category.id this post belongs to; null = standalone post. A stable numeric FK (not the slug) so renaming a category can never orphan its parts.
    part: number | null; // 1-based position within the category; null when uncategorised
    author: string; // byline shown next to the date on the post page - see DEFAULT_AUTHOR in data/posts.ts for the fallback older posts get
}

export interface Category {
    id: number; // stable, assigned once at creation - used for the public URL and as the FK from Post.category
    slug: string; // URL segment, e.g. "playwright-series" - a renamable display attribute, not an identifier
    title: string; // display name, e.g. "Playwright with TypeScript"
    description: string; // blurb shown on the card and the category hero
    cover: string | null;
    featured: boolean; // pins the category card to the Blog list hero, same as Post.featured
    date: string; // ISO, set on creation
    updated: string | null; // ISO, set on re-save
}
