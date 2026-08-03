import { safeGetItem, safeSetItem } from './storage';

// Public by necessity - the browser calls this directly, so it's visible in
// the shipped bundle regardless of where the source keeps it. It isn't a
// secret: the backend protects itself with a signed per-load ticket, rate
// limits, and validation, not by hiding this URL.
const COMMENTS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzxxWF8-lCszlOYBnZld3YxLL0_ErLFWgFIjIpNYHaYiJUCFPLIvP2tbhhQK5Kd3fdS6Q/exec';

export class CommentsApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
        super(message);
        this.name = 'CommentsApiError';
        this.code = code;
    }
}

export interface Comment {
    id: string;
    postId: number;
    parentId: string | null;
    name: string | null;
    anonymous: boolean;
    body: string;
    createdAt: string;
    updatedAt: string | null;
    deleted: boolean;
}

interface FetchCommentsResult {
    comments: Comment[];
    ticket: string;
}

const ERROR_MESSAGES: Record<string, string> = {
    invalid_name: 'Please enter a name.',
    invalid_email: 'Please enter a valid email address.',
    invalid_body: 'Comment must be between 1 and 5000 characters.',
    too_many_urls: 'Too many links in that comment - please trim it down.',
    too_fast: 'That was submitted a little too quickly - please try again.',
    stale_form: 'This form has been open a while - refreshing the page should fix it.',
    rate_limited: "You're commenting a bit fast - please wait a few minutes and try again.",
    duplicate: "Looks like you've already posted this comment.",
    post_full: 'This post has reached its comment limit.',
    invalid_parent: "The comment you're replying to is no longer available.",
    not_found: 'This comment no longer exists.',
    forbidden: "This comment isn't editable from this browser.",
    missing_ticket: 'Could not verify this page load - please refresh and try again.',
    invalid_ticket: 'Could not verify this page load - please refresh and try again.',
    expired_ticket: 'Could not verify this page load - please refresh and try again.',
    ticket_exhausted: 'Please refresh the page to comment again.',
    invalid_post_id: 'Something went wrong loading comments for this post.',
    missing_author_key: 'Something went wrong identifying your browser - please refresh and try again.',
    server_error: 'Something went wrong on our end - please try again in a moment.',
};

function friendlyMessage(code: string): string {
    return ERROR_MESSAGES[code] ?? 'Something went wrong - please try again.';
}

async function postJson<T>(payload: unknown): Promise<T> {
    // Must stay a CORS-simple request: text/plain body, no custom headers.
    // Apps Script can't answer an OPTIONS preflight, so anything that
    // triggers one (application/json, custom headers) fails outright.
    const res = await fetch(COMMENTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new CommentsApiError('network_error', 'Could not reach the comments service.');
    }
    const body = await res.json();
    if (!body.ok) {
        const code = body.error || 'server_error';
        throw new CommentsApiError(code, friendlyMessage(code));
    }
    return body as T;
}

export async function fetchComments(postId: number): Promise<FetchCommentsResult> {
    const res = await fetch(`${COMMENTS_ENDPOINT}?postId=${postId}`);
    if (!res.ok) {
        throw new CommentsApiError('network_error', 'Could not reach the comments service.');
    }
    const body = await res.json();
    if (!body.ok) {
        const code = body.error || 'server_error';
        throw new CommentsApiError(code, friendlyMessage(code));
    }
    return { comments: body.comments as Comment[], ticket: body.ticket as string };
}

export interface CreateCommentInput {
    postId: number;
    parentId: string | null;
    name: string;
    email: string;
    anonymous: boolean;
    body: string;
    ticket: string;
    renderedAt: number;
    // Honeypot fields - always sent empty by real users, filled by bots.
    website?: string;
    phone?: string;
}

export async function createComment(input: CreateCommentInput): Promise<Comment> {
    const authorKey = getOrCreateAuthorKey();
    const result = await postJson<{ ok: true; comment: Comment | null }>({
        action: 'create',
        ...input,
        authorKey,
    });
    if (!result.comment) {
        // Honeypot path: server fakes success without creating a row.
        throw new CommentsApiError('server_error', 'Something went wrong - please try again.');
    }
    rememberOwnComment(result.comment.id);
    return result.comment;
}

export async function updateComment(id: string, body: string): Promise<{ body: string; updatedAt: string }> {
    const authorKey = getOrCreateAuthorKey();
    const result = await postJson<{ ok: true; comment: { id: string; body: string; updatedAt: string } }>({
        action: 'update',
        id,
        body,
        authorKey,
    });
    return result.comment;
}

export async function deleteComment(id: string): Promise<void> {
    const authorKey = getOrCreateAuthorKey();
    await postJson<{ ok: true }>({ action: 'delete', id, authorKey });
    forgetOwnComment(id);
}

// ---- Local identity -------------------------------------------------------
// Not an account system - just a random key kept in this browser so its
// owner can edit/delete what they posted. The server only ever sees its
// hash. Losing local storage (private tab, cleared site data, new device)
// forfeits edit rights by design - the comment itself is unaffected.

const AUTHOR_KEY_STORAGE_KEY = 'blog_comment_author';
const MINE_STORAGE_KEY = 'blog_comment_mine';

interface StoredAuthor {
    key: string;
    name: string;
    email: string;
}

export function getStoredAuthor(): { name: string; email: string } | null {
    const raw = safeGetItem(AUTHOR_KEY_STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as StoredAuthor;
        return { name: parsed.name || '', email: parsed.email || '' };
    } catch {
        return null;
    }
}

export function rememberAuthor(name: string, email: string): void {
    const existing = readStoredAuthorRecord();
    const next: StoredAuthor = { key: existing?.key ?? crypto.randomUUID(), name, email };
    safeSetItem(AUTHOR_KEY_STORAGE_KEY, JSON.stringify(next));
}

function readStoredAuthorRecord(): StoredAuthor | null {
    const raw = safeGetItem(AUTHOR_KEY_STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredAuthor;
    } catch {
        return null;
    }
}

function getOrCreateAuthorKey(): string {
    const existing = readStoredAuthorRecord();
    if (existing?.key) return existing.key;
    const key = crypto.randomUUID();
    safeSetItem(AUTHOR_KEY_STORAGE_KEY, JSON.stringify({ key, name: '', email: '' }));
    return key;
}

function readOwnCommentIds(): string[] {
    const raw = safeGetItem(MINE_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function rememberOwnComment(id: string): void {
    const ids = readOwnCommentIds();
    if (!ids.includes(id)) {
        ids.push(id);
        safeSetItem(MINE_STORAGE_KEY, JSON.stringify(ids));
    }
}

function forgetOwnComment(id: string): void {
    const ids = readOwnCommentIds().filter((existingId) => existingId !== id);
    safeSetItem(MINE_STORAGE_KEY, JSON.stringify(ids));
}

export function isOwnComment(id: string): boolean {
    return readOwnCommentIds().includes(id);
}
