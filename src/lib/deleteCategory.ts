import { getFileSha, listDirectory, commitFiles, type FileChange } from './github';
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
    id: number,
    slug: string,
    title: string,
    onProgress?: (message: string) => void
): Promise<void> {
    const parts = partsOf(id, true);
    if (parts.length > 0) {
        throw new Error(
            `"${title}" still has ${parts.length} post${parts.length === 1 ? '' : 's'} assigned to it. Unassign or delete ${parts.length === 1 ? 'it' : 'them'} first.`
        );
    }

    onProgress?.('Deleting category…');
    const path = `src/content/categories/${slug}.json`;
    const sha = await getFileSha(token, path);
    if (!sha) throw new Error(`No category found at "${slug}" to delete.`);

    // The JSON and its cover are removed together as one commit (see
    // commitFiles' doc comment) rather than as separate commits, each of
    // which would trigger its own independent deploy.
    const changes: FileChange[] = [{ path, content: null }];
    const coverDir = `public/images/blog/categories/${slug}`;
    const files = await listDirectory(token, coverDir);
    if (files) {
        for (const file of files) changes.push({ path: file.path, content: null });
    }

    await commitFiles(token, changes, `blog: delete category "${title}"`);
}
