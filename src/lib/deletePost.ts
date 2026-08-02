// Split out of publish.ts: BlogPost.tsx (not lazy-loaded) needs deletePost
// for the owner's delete button, but publish.ts also pulls in the lowlight
// syntax-highlighting engine, which should only ever ship inside the lazy
// PostEditor chunk. Keeping this in its own module stops that from leaking
// into the main bundle every visitor downloads.
import { getFileSha, listDirectory, commitFiles, type FileChange } from './github';

export function autosaveDraftKey(slug: string): string {
    return `blog_editor_draft_${slug}`;
}

export async function deletePost(
    token: string,
    slug: string,
    title: string,
    onProgress?: (message: string) => void
): Promise<void> {
    onProgress?.('Deleting post…');
    const path = `src/content/posts/${slug}.json`;
    const sha = await getFileSha(token, path);
    if (!sha) throw new Error(`No post found at "${slug}" to delete.`);

    // The JSON and every image are removed together as one commit (see
    // commitFiles' doc comment) - split across several commits, each would
    // trigger its own independent deploy, and those can finish out of
    // order and briefly (or not so briefly) resurrect a "half-deleted" post.
    const changes: FileChange[] = [{ path, content: null }];
    const imageDir = `public/images/blog/${slug}`;
    const files = await listDirectory(token, imageDir);
    if (files) {
        for (const file of files) changes.push({ path: file.path, content: null });
    }

    await commitFiles(token, changes, `blog: delete "${title}"`);

    try {
        sessionStorage.removeItem(autosaveDraftKey(slug));
    } catch {
        // Best-effort - not fatal if storage is unavailable.
    }
}
