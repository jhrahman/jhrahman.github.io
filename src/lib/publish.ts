import DOMPurify from 'dompurify';
import { createLowlight, common } from 'lowlight';
import type { Root as HastRoot, Element as HastElement, Text as HastText } from 'hast';
import type { Post } from '../types/blog';
import { toBase64, blobToBase64, getFileSha, putFile, GitHubApiError } from './github';
import { processImage, buildImagePath, buildCoverPath, publicUrlFor } from './images';
import { computeReadingTime, deriveExcerpt } from '../data/posts';

const lowlight = createLowlight(common);

const PURIFY_CONFIG = {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target', 'rel'],
};

export interface PublishInput {
    token: string;
    id: number;
    slug: string;
    title: string;
    excerpt: string;
    tags: string[];
    featured: boolean;
    draft: boolean;
    category: string | null;
    part: number | null;
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

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hastToHtml(node: HastRoot | HastElement | HastText): string {
    if (node.type === 'text') return escapeHtml(node.value);
    if (node.type === 'root' || node.type === 'element') {
        const children = (node.children as (HastElement | HastText)[] | undefined)?.map(hastToHtml).join('') ?? '';
        if (node.type === 'root') return children;
        const className = Array.isArray(node.properties?.className) ? node.properties.className.join(' ') : '';
        return className ? `<span class="${className}">${children}</span>` : children;
    }
    return '';
}

// The editor highlights code live via ProseMirror decorations, which are a
// view-only overlay - editor.getHTML() never includes them, so the HTML
// this app actually saves is plain, unstyled <pre><code> text. This
// re-tokenizes each code block's real text with the same lowlight engine
// and bakes the resulting hljs-* spans into the saved HTML, so published
// posts render with real syntax colors. Works for any language in the
// `common` lowlight bundle, not just whatever was picked in the editor -
// falls back to auto-detection when no language class is present.
function highlightCodeBlocks(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('pre > code').forEach((codeEl) => {
        const text = codeEl.textContent ?? '';
        if (!text.trim()) return;

        const requestedLang = codeEl.className.match(/language-([\w-]+)/)?.[1];
        let tree;
        let resolvedLang = requestedLang;
        try {
            if (requestedLang && requestedLang !== 'plaintext' && lowlight.registered(requestedLang)) {
                tree = lowlight.highlight(requestedLang, text);
            } else {
                tree = lowlight.highlightAuto(text);
                resolvedLang = (tree as HastRoot & { data?: { language?: string } }).data?.language;
            }
        } catch {
            tree = lowlight.highlightAuto(text);
            resolvedLang = (tree as HastRoot & { data?: { language?: string } }).data?.language;
        }

        codeEl.innerHTML = hastToHtml(tree as HastRoot);
        codeEl.className = codeEl.className.replace(/language-[\w-]+/g, '').trim();
        codeEl.classList.add('hljs');
        if (resolvedLang) codeEl.classList.add(`language-${resolvedLang}`);
    });
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
        token, id, slug, title, excerpt, tags, featured, draft, category, part,
        rawHtml, pendingImages, coverFile, existingCover, existingDate, onProgress,
    } = input;

    if (!slug.trim()) throw new Error('A post needs a URL slug before it can be published.');
    if (!title.trim()) throw new Error('A post needs a title before it can be published.');

    onProgress?.('Preparing content…');
    const htmlWithImages = await resolveImages(token, slug, rawHtml, pendingImages, onProgress);
    const htmlWithHighlighting = highlightCodeBlocks(htmlWithImages);
    const sanitized = DOMPurify.sanitize(htmlWithHighlighting, PURIFY_CONFIG);
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
        id,
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
        category,
        // A part number is meaningless without a series to belong to.
        part: category ? part : null,
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
