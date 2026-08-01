import DOMPurify from 'dompurify';
import type { Post } from '../types/blog';
import { toBase64, blobToBase64, getFileSha, putFile, deleteFile, GitHubApiError } from './github';
import { processImage, buildImagePath, buildCoverPath, publicUrlFor } from './images';
import { computeReadingTime, deriveExcerpt } from '../data/posts';

const PURIFY_CONFIG = {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target', 'rel'],
};

export interface PublishInput {
    token: string;
    slug: string;
    title: string;
    excerpt: string;
    tags: string[];
    featured: boolean;
    draft: boolean;
    rawHtml: string;
    pendingImages: Map<string, File>;
    coverFile: File | null;
    existingCover: string | null;
    existingDate: string | null;
    onProgress?: (message: string) => void;
}

export interface PublishResult {
    post: Post;
    commitSha: string;
}

async function uploadImage(token: string, slug: string, file: File): Promise<string> {
    const processed = await processImage(file);
    const path = buildImagePath(slug, file.name, processed.ext);
    const base64 = await blobToBase64(processed.blob);
    await putFile(token, path, base64, `blog: add image for "${slug}"`);
    return publicUrlFor(path);
}

async function resolveImages(
    token: string,
    slug: string,
    html: string,
    pendingImages: Map<string, File>,
    onProgress?: (message: string) => void
): Promise<string> {
    if (pendingImages.size === 0) return html;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const imgs = Array.from(doc.querySelectorAll('img[src^="blob:"]'));
    const resolved = new Map<string, string>();

    for (const img of imgs) {
        const src = img.getAttribute('src')!;
        if (resolved.has(src)) {
            img.setAttribute('src', resolved.get(src)!);
            continue;
        }
        const file = pendingImages.get(src);
        if (!file) continue;
        onProgress?.(`Uploading image ${resolved.size + 1} of ${pendingImages.size}…`);
        const url = await uploadImage(token, slug, file);
        resolved.set(src, url);
        img.setAttribute('src', url);
    }

    return doc.body.innerHTML;
}

function wrapTables(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('table').forEach((table) => {
        if (table.parentElement?.classList.contains('table-wrapper')) return;
        const wrapper = doc.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
    return doc.body.innerHTML;
}

export async function publishPost(input: PublishInput): Promise<PublishResult> {
    const {
        token, slug, title, excerpt, tags, featured, draft,
        rawHtml, pendingImages, coverFile, existingCover, existingDate, onProgress,
    } = input;

    if (!slug.trim()) throw new Error('A post needs a URL slug before it can be published.');
    if (!title.trim()) throw new Error('A post needs a title before it can be published.');

    onProgress?.('Preparing content…');
    const htmlWithImages = await resolveImages(token, slug, rawHtml, pendingImages, onProgress);
    const sanitized = DOMPurify.sanitize(htmlWithImages, PURIFY_CONFIG);
    const cleanHtml = wrapTables(sanitized);

    let cover = existingCover;
    if (coverFile) {
        onProgress?.('Uploading cover image…');
        const processed = await processImage(coverFile);
        const path = buildCoverPath(slug, processed.ext);
        const base64 = await blobToBase64(processed.blob);
        let coverSha: string | null = null;
        try {
            coverSha = await getFileSha(token, path);
        } catch (err) {
            if (!(err instanceof GitHubApiError && err.status === 404)) throw err;
        }
        await putFile(token, path, base64, `blog: cover image for "${title}"`, coverSha);
        cover = publicUrlFor(path);
    }

    const now = new Date().toISOString();
    const post: Post = {
        slug,
        title: title.trim(),
        excerpt: excerpt.trim() || deriveExcerpt(cleanHtml),
        tags: tags.map((t) => t.trim()).filter(Boolean),
        cover,
        date: existingDate ?? now,
        updated: existingDate ? now : null,
        readingTime: computeReadingTime(cleanHtml),
        featured,
        draft,
        html: cleanHtml,
    };

    const path = `src/content/posts/${slug}.json`;
    onProgress?.('Publishing…');

    let sha: string | null = null;
    try {
        sha = await getFileSha(token, path);
    } catch (err) {
        if (!(err instanceof GitHubApiError && err.status === 404)) throw err;
    }

    const message = sha ? `blog: update "${post.title}"` : `blog: publish "${post.title}"`;
    const result = await putFile(token, path, toBase64(JSON.stringify(post, null, 4) + '\n'), message, sha);

    return { post, commitSha: result.commitSha };
}

export async function deletePost(token: string, slug: string, title: string): Promise<void> {
    const path = `src/content/posts/${slug}.json`;
    const sha = await getFileSha(token, path);
    if (!sha) throw new Error(`No post found at "${slug}" to delete.`);
    await deleteFile(token, path, sha, `blog: delete "${title}"`);
}
