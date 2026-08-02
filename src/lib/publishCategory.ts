// Mirrors publish.ts, but a category has no HTML body, so this deliberately
// skips lowlight/DOMPurify to keep this a light chunk alongside deletePost.ts
// rather than pulling the syntax-highlighting engine into every route that
// touches categories.
import type { Category } from '../types/blog';
import { toBase64, blobToBase64, getFileContent, listDirectory, commitFiles, type FileChange } from './github';
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
}

/** Reads the category's cover folder so it can be re-staged at the new slug's path within the same commit - a move has to be an add-at-new-path + delete-at-old-path together, not two separate commits (see commitFiles' doc comment for why). */
async function planCategoryFolderMove(
    token: string,
    oldSlug: string,
    newSlug: string
): Promise<{ replacedCover: string | null; changes: FileChange[] }> {
    const files = await listDirectory(token, buildCategoryImageDir(oldSlug));
    if (!files || files.length === 0) return { replacedCover: null, changes: [] };

    let replacedCover: string | null = null;
    const changes: FileChange[] = [];
    for (const file of files) {
        const content = await getFileContent(token, file.path);
        if (!content) continue;
        const newPath = `${buildCategoryImageDir(newSlug)}/${file.name}`;
        changes.push({ path: newPath, content: content.base64Content });
        changes.push({ path: file.path, content: null });
        replacedCover = publicUrlFor(newPath);
    }

    return { replacedCover, changes };
}

export async function publishCategory(input: PublishCategoryInput): Promise<PublishCategoryResult> {
    const { token, id, slug, previousSlug, title, description, featured, coverFile, existingCover, existingDate } = input;

    if (!slug.trim()) throw new Error('A category needs a URL slug before it can be saved.');
    if (!title.trim()) throw new Error('A category needs a title before it can be saved.');

    const isRename = previousSlug !== null && previousSlug !== slug;
    const changes: FileChange[] = [];

    let cover = existingCover;
    if (isRename && previousSlug) {
        const move = await planCategoryFolderMove(token, previousSlug, slug);
        if (move.replacedCover && cover === existingCover) cover = move.replacedCover;
        changes.push(...move.changes);
    }

    if (coverFile) {
        const processed = await processImage(coverFile);
        const path = buildCategoryCoverPath(slug, processed.ext);
        const base64 = await blobToBase64(processed.blob);
        changes.push({ path, content: base64 });
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

    changes.push({ path: `src/content/categories/${slug}.json`, content: toBase64(JSON.stringify(category, null, 4) + '\n') });
    if (isRename && previousSlug) {
        changes.push({ path: `src/content/categories/${previousSlug}.json`, content: null });
    }

    const message = previousSlug
        ? (isRename ? `blog: rename category "${category.title}"` : `blog: update category "${category.title}"`)
        : `blog: add category "${category.title}"`;
    const result = await commitFiles(token, changes, message);

    return { category, commitSha: result.commitSha };
}
