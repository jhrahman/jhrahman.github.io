export const OWNER = 'jhrahman';
export const REPO = 'jhrahman.github.io';
export const BRANCH = 'master';

const API_BASE = 'https://api.github.com';

export class GitHubApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.name = 'GitHubApiError';
        this.status = status;
    }
}

export interface GitHubUser {
    login: string;
    avatarUrl: string;
}

export interface VerifyResult {
    user: GitHubUser;
    tokenExpiry: string | null;
}

function headers(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };
}

async function readError(res: Response): Promise<never> {
    let message = res.statusText;
    try {
        const body = await res.json();
        if (typeof body?.message === 'string') message = body.message;
    } catch {
    }
    throw new GitHubApiError(res.status, message);
}

export async function verifyToken(token: string): Promise<VerifyResult> {
    const userRes = await fetch(`${API_BASE}/user`, { headers: headers(token) });
    if (!userRes.ok) {
        if (userRes.status === 401) {
            throw new GitHubApiError(401, 'That token was rejected by GitHub. Check that it was copied in full and hasn\'t expired.');
        }
        return readError(userRes);
    }
    const userBody = await userRes.json();
    const tokenExpiry = userRes.headers.get('github-authentication-token-expiration');

    if (typeof userBody?.login !== 'string' || userBody.login.toLowerCase() !== OWNER.toLowerCase()) {
        throw new GitHubApiError(403, `This token belongs to a different GitHub account. Only ${OWNER} can publish here.`);
    }

    const repoRes = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}`, { headers: headers(token) });
    if (!repoRes.ok) return readError(repoRes);
    const repoBody = await repoRes.json();

    if (!repoBody?.permissions?.push) {
        throw new GitHubApiError(403, 'This token does not have write access to this repository. Create a fine-grained token with "Contents: Read and write" permission scoped to this repo.');
    }

    return {
        user: { login: userBody.login, avatarUrl: userBody.avatar_url },
        tokenExpiry,
    };
}

export function toBase64(input: string): string {
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.slice(result.indexOf(',') + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export async function getFileSha(token: string, path: string): Promise<string | null> {
    const res = await fetch(
        `${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
        { headers: headers(token) }
    );
    if (res.status === 404) return null;
    if (!res.ok) return readError(res);
    const body = await res.json();
    return body.sha as string;
}

export interface FileContent {
    base64Content: string;
}

/** Downloads a file's raw (still base64-encoded) content - used to move a file to a new path (read the old content here, then stage it as a create-at-new-path + delete-at-old-path pair for commitFiles), since neither the Contents API nor the Git Data API has a rename/move endpoint. */
export async function getFileContent(token: string, path: string): Promise<FileContent | null> {
    const res = await fetch(
        `${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
        { headers: headers(token) }
    );
    if (res.status === 404) return null;
    if (!res.ok) return readError(res);
    const body = await res.json();
    // GitHub returns base64 content with embedded newlines every 60 chars -
    // strip them so it round-trips cleanly through commitFiles' blob content.
    return { base64Content: (body.content as string).replace(/\n/g, '') };
}

export interface RepoFile {
    name: string;
    path: string;
    sha: string;
    type: string;
}

export async function listDirectory(token: string, path: string): Promise<RepoFile[] | null> {
    const res = await fetch(
        `${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
        { headers: headers(token) }
    );
    if (res.status === 404) return null;
    if (!res.ok) return readError(res);
    const body = await res.json();
    return Array.isArray(body) ? body : null;
}

export interface FileChange {
    path: string;
    /** base64-encoded content to write at this path, or null to delete it. */
    content: string | null;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Commits any number of file adds/updates/deletes as ONE atomic commit via
 * the Git Data API (blobs + a tree + a commit + a ref update), instead of
 * the Contents API's one-commit-per-file-call that putFile/deleteFile use.
 *
 * This is the fix for a real, observed race: every commit to this repo
 * triggers its own independent GitHub Pages build+deploy, and nothing
 * guarantees those deploys finish in the order the commits were made -
 * whichever one finishes last in wall-clock time wins and overwrites the
 * live site, even if it was built from an older, incomplete commit. An
 * operation that's logically "one edit" - a post rename that moves images
 * and replaces the old file, a delete that removes a JSON file and its
 * whole image folder - has to land as one commit, or it can visibly go
 * live in a half-finished state depending on how the deploys happen to
 * queue. Any call site that changes more than one file must go through
 * here rather than multiple putFile/deleteFile calls.
 *
 * Retries a few times, rebuilding on the new HEAD, if the final ref update
 * conflicts (branch moved between reading it and writing here) - a
 * transient race on the *read* of HEAD, not a lost update, since the tree
 * is only built from whatever HEAD was current at the start of this call.
 */
export async function commitFiles(
    token: string,
    changes: FileChange[],
    message: string,
    attempt = 1
): Promise<{ commitSha: string }> {
    if (changes.length === 0) throw new Error('commitFiles called with no changes.');

    const refRes = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`, { headers: headers(token) });
    if (!refRes.ok) return readError(refRes);
    const refBody = await refRes.json();
    const baseCommitSha = refBody.object.sha as string;

    const baseCommitRes = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/git/commits/${baseCommitSha}`, { headers: headers(token) });
    if (!baseCommitRes.ok) return readError(baseCommitRes);
    const baseCommitBody = await baseCommitRes.json();
    const baseTreeSha = baseCommitBody.tree.sha as string;

    const tree = await Promise.all(changes.map(async (change) => {
        if (change.content === null) {
            return { path: change.path, mode: '100644', type: 'blob', sha: null };
        }
        const blobRes = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/git/blobs`, {
            method: 'POST',
            headers: { ...headers(token), 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: change.content, encoding: 'base64' }),
        });
        if (!blobRes.ok) return readError(blobRes);
        const blobBody = await blobRes.json();
        return { path: change.path, mode: '100644', type: 'blob', sha: blobBody.sha as string };
    }));

    const treeRes = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/git/trees`, {
        method: 'POST',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_tree: baseTreeSha, tree }),
    });
    if (!treeRes.ok) return readError(treeRes);
    const treeBody = await treeRes.json();

    const commitRes = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/git/commits`, {
        method: 'POST',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, tree: treeBody.sha, parents: [baseCommitSha] }),
    });
    if (!commitRes.ok) return readError(commitRes);
    const commitBody = await commitRes.json();

    const updateRefRes = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
        method: 'PATCH',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: commitBody.sha }),
    });
    if (!updateRefRes.ok) {
        if (updateRefRes.status === 422 && attempt < 4) {
            await sleep(300 * attempt);
            return commitFiles(token, changes, message, attempt + 1);
        }
        return readError(updateRefRes);
    }

    return { commitSha: commitBody.sha as string };
}

export const actionsUrl = `https://github.com/${OWNER}/${REPO}/actions`;
