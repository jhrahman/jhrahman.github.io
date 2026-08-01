// Split out of publish.ts: BlogPost.tsx (not lazy-loaded) needs deletePost
// for the owner's delete button, but publish.ts also pulls in the lowlight
// syntax-highlighting engine, which should only ever ship inside the lazy
// PostEditor chunk. Keeping this in its own module stops that from leaking
// into the main bundle every visitor downloads.
import { getFileSha, deleteFile, listDirectory } from './github';

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
    await deleteFile(token, path, sha, `blog: delete "${title}"`);

    const imageDir = `public/images/blog/${slug}`;
    const files = await listDirectory(token, imageDir);
    if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            onProgress?.(`Removing image ${i + 1} of ${files.length}…`);
            await deleteFile(token, files[i].path, files[i].sha, `blog: remove image for deleted post "${title}"`);
        }
    }

    try {
        sessionStorage.removeItem(autosaveDraftKey(slug));
    } catch {
        // Best-effort - not fatal if storage is unavailable.
    }
}
