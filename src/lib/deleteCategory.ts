import { getFileSha, deleteFile, listDirectory } from './github';
import { partsOf } from '../data/categories';

/**
 * Refuses to delete a category that still has posts pointing at it - the
 * bundled posts snapshot is build-time (same caveat nextPostId() already
 * lives with), which is fine here since this only needs to catch the
 * common case of "forgot to unassign the parts first"; a stale snapshot
 * fails safe by refusing, never by deleting something still in use.
 */
export async function deleteCategory(
    token: string,
    slug: string,
    title: string,
    onProgress?: (message: string) => void
): Promise<void> {
    const parts = partsOf(slug, true);
    if (parts.length > 0) {
        throw new Error(
            `"${title}" still has ${parts.length} post${parts.length === 1 ? '' : 's'} assigned to it. Unassign or delete ${parts.length === 1 ? 'it' : 'them'} first.`
        );
    }

    onProgress?.('Deleting category…');
    const path = `src/content/categories/${slug}.json`;
    const sha = await getFileSha(token, path);
    if (!sha) throw new Error(`No category found at "${slug}" to delete.`);
    await deleteFile(token, path, sha, `blog: delete category "${title}"`);

    const coverDir = `public/images/blog/categories/${slug}`;
    const files = await listDirectory(token, coverDir);
    if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            onProgress?.(`Removing image ${i + 1} of ${files.length}…`);
            await deleteFile(token, files[i].path, files[i].sha, `blog: remove cover for deleted category "${title}"`);
        }
    }
}
