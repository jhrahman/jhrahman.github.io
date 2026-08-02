import DOMPurify from 'dompurify';
import { createLowlight, common } from 'lowlight';
import type { Root as HastRoot, Element as HastElement, Text as HastText } from 'hast';
import type { Post } from '../types/blog';
import { toBase64, blobToBase64, getFileSha, getFileContent, putFile, deleteFile, listDirectory, GitHubApiError } from './github';
import { processImage, buildImagePath, buildCoverPath, buildImageDir, publicUrlFor } from './images';
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
    /** The slug this post was previously saved under - null for a brand new post. When it differs from `slug`, publishPost migrates the post's file, its image folder, and every image URL already baked into its HTML to the new slug. */
    previousSlug: string | null;
    title: string;
    excerpt: string;
    tags: string[];
    featured: boolean;
    draft: boolean;
    category: number | null;
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
    /** Set when the post itself published fine but a rename's cleanup step (removing the old JSON/images) didn't fully complete - surfaced to the owner rather than silently leaving orphaned files. */
    warning?: string;
}

/**
 * Moves every file under the old slug's image folder to the new slug's
 * folder (download + re-upload, since the Contents API has no rename/move
 * endpoint), returning old-URL -> new-URL pairs so callers can rewrite any
 * already-published <img src> / cover references. Uploads all new copies
 * before deleting any old one, so a failure partway through never leaves a
 * post with zero copies of an image - at worst a harmless duplicate that a
 * retry cleans up (the old folder will already be empty on the next pass).
 */
async function moveImageFolder(
    token: string,
    oldSlug: string,
    newSlug: string,
    onProgress?: (message: string) => void
): Promise<{ replacements: Array<[string, string]>; cleanup: () => Promise<void> }> {
    const files = await listDirectory(token, buildImageDir(oldSlug));
    if (!files || files.length === 0) return { replacements: [], cleanup: async () => {} };

    const replacements: Array<[string, string]> = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        onProgress?.(`Moving image ${i + 1} of ${files.length} to the new slug…`);
        const content = await getFileContent(token, file.path);
        if (!content) continue; // vanished between listing and reading - nothing to move
        const newPath = `${buildImageDir(newSlug)}/${file.name}`;
        await putFile(token, newPath, content.base64Content, `blog: move image for "${newSlug}" (renamed from "${oldSlug}")`);
        replacements.push([publicUrlFor(file.path), publicUrlFor(newPath)]);
    }

    const cleanup = async () => {
        for (let i = 0; i < files.length; i++) {
            onProgress?.(`Removing old image ${i + 1} of ${files.length}…`);
            // Re-check the sha immediately before deleting rather than reusing
            // the one from the initial listing - it's the same file, but this
            // keeps the delete request valid even if something else touched
            // the folder in between.
            const sha = await getFileSha(token, files[i].path);
            if (sha) await deleteFile(token, files[i].path, sha, `blog: remove image after rename to "${newSlug}"`);
        }
    };

    return { replacements, cleanup };
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
        token, id, slug, previousSlug, title, excerpt, tags, featured, draft, category, part,
        rawHtml, pendingImages, coverFile, existingCover, existingDate, onProgress,
    } = input;

    if (!slug.trim()) throw new Error('A post needs a URL slug before it can be published.');
    if (!title.trim()) throw new Error('A post needs a title before it can be published.');

    const isRename = previousSlug !== null && previousSlug !== slug;

    onProgress?.('Preparing content…');
    // New images pasted into the editor this session already upload under
    // the *new* slug (below), so only pre-existing images - the ones a
    // rename actually needs to move - live under the old folder.
    const move = isRename
        ? await moveImageFolder(token, previousSlug, slug, onProgress)
        : { replacements: [] as Array<[string, string]>, cleanup: async () => {} };

    const htmlWithImages = await resolveImages(token, slug, rawHtml, pendingImages, onProgress);
    const htmlWithHighlighting = highlightCodeBlocks(htmlWithImages);
    const sanitized = DOMPurify.sanitize(htmlWithHighlighting, PURIFY_CONFIG);
    let cleanHtml = wrapTables(sanitized);

    let cover = existingCover;
    // Repoint every already-published image (and the cover, if it isn't
    // about to be replaced below) from the old folder to the new one.
    for (const [oldUrl, newUrl] of move.replacements) {
        cleanHtml = cleanHtml.split(oldUrl).join(newUrl);
        if (cover === oldUrl) cover = newUrl;
    }

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

    // Only remove the old copies once the new post JSON is safely committed
    // - if publishing the new JSON had thrown above, the old file and its
    // images are left completely untouched, so a failed rename can never
    // lose the post. A failure here, after the new copy already exists, is
    // reported as a warning rather than an error: the publish itself
    // succeeded, there's just a leftover to clean up by hand.
    let warning: string | undefined;
    if (isRename && previousSlug) {
        onProgress?.('Cleaning up the old slug…');
        try {
            await move.cleanup();
            const oldPostPath = `src/content/posts/${previousSlug}.json`;
            const oldSha = await getFileSha(token, oldPostPath);
            if (oldSha) await deleteFile(token, oldPostPath, oldSha, `blog: remove old file after renaming "${post.title}"`);
        } catch (err) {
            const detail = err instanceof GitHubApiError ? err.message : err instanceof Error ? err.message : String(err);
            warning = `Published, but couldn't fully clean up the old slug "${previousSlug}" - please remove src/content/posts/${previousSlug}.json and any leftover files under public/images/blog/${previousSlug}/ manually. (${detail})`;
        }
    }

    return { post, commitSha: result.commitSha, warning };
}
