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

export interface PutFileResult {
    commitSha: string;
    contentSha: string;
}

export async function putFile(
    token: string,
    path: string,
    base64Content: string,
    message: string,
    sha?: string | null
): Promise<PutFileResult> {
    const res = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}`, {
        method: 'PUT',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            content: base64Content,
            branch: BRANCH,
            ...(sha ? { sha } : {}),
        }),
    });
    if (!res.ok) return readError(res);
    const body = await res.json();
    return { commitSha: body.commit?.sha, contentSha: body.content?.sha };
}

export async function deleteFile(
    token: string,
    path: string,
    sha: string,
    message: string
): Promise<void> {
    const res = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}`, {
        method: 'DELETE',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sha, branch: BRANCH }),
    });
    if (!res.ok) return readError(res);
}

export const actionsUrl = `https://github.com/${OWNER}/${REPO}/actions`;
