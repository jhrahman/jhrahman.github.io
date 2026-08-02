import DOMPurify from 'dompurify';
import { createLowlight, common } from 'lowlight';
import type { Root as HastRoot, Element as HastElement, Text as HastText } from 'hast';
import type { Post } from '../types/blog';
import { toBase64, blobToBase64, getFileContent, listDirectory, commitFiles, type FileChange } from './github';
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
}

/**
 * Reads every file under the old slug's image folder so its content can be
 * re-staged at the new path in the same commit as everything else - moving
 * a file has to be an add-at-new-path + delete-at-old-path within one
 * commit, since the Contents/Git APIs have no rename endpoint. Returns
 * old-URL -> new-URL pairs so the caller can rewrite any already-published
 * <img src> / cover references, plus the FileChange entries themselves.
 */
async function planImageFolderMove(
    token: string,
    oldSlug: string,
    newSlug: string,
    onProgress?: (message: string) => void
): Promise<{ replacements: Array<[string, string]>; changes: FileChange[] }> {
    const files = await listDirectory(token, buildImageDir(oldSlug));
    if (!files || files.length === 0) return { replacements: [], changes: [] };

    const replacements: Array<[string, string]> = [];
    const changes: FileChange[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        onProgress?.(`Reading image ${i + 1} of ${files.length} to move…`);
        const content = await getFileContent(token, file.path);
        if (!content) continue; // vanished between listing and reading - nothing to move
        const newPath = `${buildImageDir(newSlug)}/${file.name}`;
        changes.push({ path: newPath, content: content.base64Content });
        changes.push({ path: file.path, content: null });
        replacements.push([publicUrlFor(file.path), publicUrlFor(newPath)]);
    }

    return { replacements, changes };
}

async function stageImage(slug: string, file: File): Promise<{ path: string; url: string; base64: string }> {
    const processed = await processImage(file);
    const path = buildImagePath(slug, file.name, processed.ext);
    const base64 = await blobToBase64(processed.blob);
    return { path, url: publicUrlFor(path), base64 };
}

/** Swaps every blob: <img src> for its final repo-hosted URL, staging each upload's content as a FileChange rather than committing it immediately. */
async function resolveImages(
    slug: string,
    html: string,
    pendingImages: Map<string, File>,
    changes: FileChange[],
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
        onProgress?.(`Preparing image ${resolved.size + 1} of ${pendingImages.size}…`);
        const staged = await stageImage(slug, file);
        changes.push({ path: staged.path, content: staged.base64 });
        resolved.set(src, staged.url);
        img.setAttribute('src', staged.url);
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
    const changes: FileChange[] = [];

    onProgress?.('Preparing content…');
    // New images pasted into the editor this session already upload under
    // the *new* slug (below), so only pre-existing images - the ones a
    // rename actually needs to move - live under the old folder.
    const move = isRename
        ? await planImageFolderMove(token, previousSlug, slug, onProgress)
        : { replacements: [] as Array<[string, string]>, changes: [] as FileChange[] };
    changes.push(...move.changes);

    const htmlWithImages = await resolveImages(slug, rawHtml, pendingImages, changes, onProgress);
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
        onProgress?.('Preparing cover image…');
        const processed = await processImage(coverFile);
        const path = buildCoverPath(slug, processed.ext);
        const base64 = await blobToBase64(processed.blob);
        changes.push({ path, content: base64 });
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

    changes.push({ path: `src/content/posts/${slug}.json`, content: toBase64(JSON.stringify(post, null, 4) + '\n') });
    if (isRename && previousSlug) {
        changes.push({ path: `src/content/posts/${previousSlug}.json`, content: null });
    }

    onProgress?.('Publishing…');
    const message = previousSlug
        ? (isRename ? `blog: rename "${post.title}"` : `blog: update "${post.title}"`)
        : `blog: publish "${post.title}"`;
    const result = await commitFiles(token, changes, message);

    return { post, commitSha: result.commitSha };
}
