// Mirrors publish.ts, but a category has no HTML body, so this deliberately
// skips lowlight/DOMPurify to keep this a light chunk alongside deletePost.ts
// rather than pulling the syntax-highlighting engine into every route that
// touches categories.
import type { Category } from '../types/blog';
import { toBase64, blobToBase64, getFileSha, putFile, GitHubApiError } from './github';
import { processImage, buildCategoryCoverPath, publicUrlFor } from './images';

export interface PublishCategoryInput {
    token: string;
    slug: string;
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

export async function publishCategory(input: PublishCategoryInput): Promise<PublishCategoryResult> {
    const { token, slug, title, description, featured, coverFile, existingCover, existingDate } = input;

    if (!slug.trim()) throw new Error('A category needs a URL slug before it can be saved.');
    if (!title.trim()) throw new Error('A category needs a title before it can be saved.');

    let cover = existingCover;
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

    return { category, commitSha: result.commitSha };
}
