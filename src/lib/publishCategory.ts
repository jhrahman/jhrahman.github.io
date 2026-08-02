// Mirrors publish.ts, but a category has no HTML body, so this deliberately
// skips lowlight/DOMPurify to keep this a light chunk alongside deletePost.ts
// rather than pulling the syntax-highlighting engine into every route that
// touches categories.
import type { Category } from '../types/blog';
import { toBase64, blobToBase64, getFileSha, getFileContent, putFile, deleteFile, listDirectory, GitHubApiError } from './github';
import { processImage, buildCategoryCoverPath, buildCategoryImageDir, publicUrlFor } from './images';

export interface PublishCategoryInput {
    token: string;
    id: number;
    slug: string;
    /** The slug this category was previously saved under - null when creating a new one. */
    previousSlug: string | null;
    title: string;
    description: string;
    featured: boolean;
    coverFile: File | null;
    existingCover: string | null;
    existingDate: string | null;
}

export interface PublishCategoryResult {
    category: Category;
    commitSha: string;
    /** Set when the category itself saved fine but a rename's cleanup step didn't fully complete. */
    warning?: string;
}

/** Moves the category's cover folder to a new slug, same move-before-delete safety as publish.ts's moveImageFolder. */
async function moveCategoryFolder(
    token: string,
    oldSlug: string,
    newSlug: string
): Promise<{ replacedCover: string | null; cleanup: () => Promise<void> }> {
    const files = await listDirectory(token, buildCategoryImageDir(oldSlug));
    if (!files || files.length === 0) return { replacedCover: null, cleanup: async () => {} };

    let replacedCover: string | null = null;
    for (const file of files) {
        const content = await getFileContent(token, file.path);
        if (!content) continue;
        const newPath = `${buildCategoryImageDir(newSlug)}/${file.name}`;
        await putFile(token, newPath, content.base64Content, `blog: move cover for category "${newSlug}" (renamed from "${oldSlug}")`);
        replacedCover = publicUrlFor(newPath);
    }

    const cleanup = async () => {
        for (const file of files) {
            const sha = await getFileSha(token, file.path);
            if (sha) await deleteFile(token, file.path, sha, `blog: remove cover after renaming category to "${newSlug}"`);
        }
    };

    return { replacedCover, cleanup };
}

export async function publishCategory(input: PublishCategoryInput): Promise<PublishCategoryResult> {
    const { token, id, slug, previousSlug, title, description, featured, coverFile, existingCover, existingDate } = input;

    if (!slug.trim()) throw new Error('A category needs a URL slug before it can be saved.');
    if (!title.trim()) throw new Error('A category needs a title before it can be saved.');

    const isRename = previousSlug !== null && previousSlug !== slug;

    let cover = existingCover;
    let cleanupOldFolder: (() => Promise<void>) | null = null;
    if (isRename && previousSlug) {
        const move = await moveCategoryFolder(token, previousSlug, slug);
        if (move.replacedCover && cover === existingCover) cover = move.replacedCover;
        cleanupOldFolder = move.cleanup;
    }

    if (coverFile) {
        const processed = await processImage(coverFile);
        const path = buildCategoryCoverPath(slug, processed.ext);
        const base64 = await blobToBase64(processed.blob);
        let coverSha: string | null = null;
        try {
            coverSha = await getFileSha(token, path);
        } catch (err) {
            if (!(err instanceof GitHubApiError && err.status === 404)) throw err;
        }
        await putFile(token, path, base64, `blog: cover image for category "${title}"`, coverSha);
        cover = publicUrlFor(path);
    }

    const now = new Date().toISOString();
    const category: Category = {
        id,
        slug,
        title: title.trim(),
        description: description.trim(),
        cover,
        featured,
        date: existingDate ?? now,
        updated: existingDate ? now : null,
    };

    const path = `src/content/categories/${slug}.json`;

    let sha: string | null = null;
    try {
        sha = await getFileSha(token, path);
    } catch (err) {
        if (!(err instanceof GitHubApiError && err.status === 404)) throw err;
    }

    const message = sha ? `blog: update category "${category.title}"` : `blog: add category "${category.title}"`;
    const result = await putFile(token, path, toBase64(JSON.stringify(category, null, 4) + '\n'), message, sha);

    // As with posts: only remove the old copies once the new category JSON
    // is safely committed, so a failed rename can never lose the category.
    let warning: string | undefined;
    if (isRename && previousSlug) {
        try {
            if (cleanupOldFolder) await cleanupOldFolder();
            const oldPath = `src/content/categories/${previousSlug}.json`;
            const oldSha = await getFileSha(token, oldPath);
            if (oldSha) await deleteFile(token, oldPath, oldSha, `blog: remove old file after renaming category "${category.title}"`);
        } catch (err) {
            const detail = err instanceof GitHubApiError ? err.message : err instanceof Error ? err.message : String(err);
            warning = `Saved, but couldn't fully clean up the old slug "${previousSlug}" - please remove src/content/categories/${previousSlug}.json and any leftover files under public/images/blog/categories/${previousSlug}/ manually. (${detail})`;
        }
    }

    return { category, commitSha: result.commitSha, warning };
}
