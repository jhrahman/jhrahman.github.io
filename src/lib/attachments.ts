/** Largest attachment the editor will accept. Every file lives in git history forever, so this is deliberately far below GitHub's 100 MB hard limit. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/**
 * Allowlist, not a blocklist: only document/data/archive types a blog post
 * plausibly needs. Anything executable or script-like (html, svg, js, exe,
 * sh…) is rejected because attachments are served from the site's own
 * origin, where an uploaded .html/.svg would run with the site's privileges.
 */
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
    'pdf', 'txt', 'md', 'csv', 'json', 'yaml', 'yml', 'log',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'gz', 'tar',
] as const;

export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.map((e) => `.${e}`).join(',');

export function fileExtension(name: string): string {
    const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
}

/** Returns a user-facing reason the file can't be attached, or null if it's fine. */
export function validateAttachment(file: File): string | null {
    const ext = fileExtension(file.name);
    if (!(ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext)) {
        return `".${ext || 'unknown'}" files can't be attached. Allowed types: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(', ')}.`;
    }
    if (file.size === 0) return 'That file is empty.';
    if (file.size > MAX_ATTACHMENT_BYTES) {
        return `That file is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
    }
    return null;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'file';
}

/** Directory a post's attachments live in, parallel to buildImageDir. Served from <base>/files/blog/<slug>/. */
export function buildAttachmentDir(postSlug: string): string {
    return `public/files/blog/${postSlug}`;
}

/** Sanitized, timestamped so two uploads with the same name never overwrite each other or serve stale cached copies. */
export function buildAttachmentPath(postSlug: string, originalName: string): string {
    return `${buildAttachmentDir(postSlug)}/${Date.now()}-${attachmentSlug(originalName)}.${fileExtension(originalName)}`;
}
