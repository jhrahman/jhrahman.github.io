/**
 * Embeds are an allowlist of known providers, never arbitrary iframes: a pasted
 * URL is parsed into that provider's canonical embed URL, and anything else is
 * rejected. The same allowlist backs the HTML sanitizer (lib/sanitize.ts) and
 * the Content-Security-Policy `frame-src` in index.html - keep all three in sync.
 */
export interface EmbedInfo {
    src: string;
    provider: string;
    title: string;
}

export const EMBED_HOSTS = [
    'www.youtube-nocookie.com',
    'player.vimeo.com',
    'www.loom.com',
    'codesandbox.io',
    'stackblitz.com',
    'codepen.io',
];

const YOUTUBE_ID = /^[\w-]{11}$/;

/** Accepts "90", "90s" or "1h2m3s" (YouTube's share-link formats); returns 0 when unparseable. */
function parseTimestamp(value: string | null): number {
    if (!value) return 0;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!m) return 0;
    return (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
}

export function parseEmbedUrl(input: string): EmbedInfo | null {
    let url: URL;
    try {
        url = new URL(input.trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:') return null;

    const host = url.hostname.replace(/^www\./, '');
    const parts = url.pathname.split('/').filter(Boolean);

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
        let id: string | undefined;
        if (host === 'youtu.be') id = parts[0];
        else if (parts[0] === 'watch') id = url.searchParams.get('v') ?? undefined;
        else if (['embed', 'shorts', 'live'].includes(parts[0])) id = parts[1];
        if (!id || !YOUTUBE_ID.test(id)) return null;
        const seconds = parseTimestamp(url.searchParams.get('t') ?? url.searchParams.get('start'));
        const query = seconds > 0 ? `?start=${seconds}` : '';
        return { src: `https://www.youtube-nocookie.com/embed/${id}${query}`, provider: 'YouTube', title: 'YouTube video' };
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        const id = parts.find((p) => /^\d+$/.test(p));
        if (!id) return null;
        return { src: `https://player.vimeo.com/video/${id}`, provider: 'Vimeo', title: 'Vimeo video' };
    }

    if (host === 'loom.com') {
        const id = parts[0] === 'share' || parts[0] === 'embed' ? parts[1] : undefined;
        if (!id || !/^[a-f0-9]+$/i.test(id)) return null;
        return { src: `https://www.loom.com/embed/${id}`, provider: 'Loom', title: 'Loom video' };
    }

    if (host === 'codesandbox.io') {
        // Current share links are /p/sandbox/<name>-<id>; the embed route wants just the trailing id.
        const id = parts[0] === 'embed' || parts[0] === 's' ? parts[1] : parts[0] === 'p' ? parts[2]?.split('-').pop() : undefined;
        if (!id || !/^[\w-]+$/.test(id)) return null;
        return { src: `https://codesandbox.io/embed/${id}`, provider: 'CodeSandbox', title: 'CodeSandbox' };
    }

    if (host === 'stackblitz.com') {
        if (parts[0] !== 'edit' || !parts[1]) return null;
        if (!/^[\w-]+$/.test(parts[1])) return null;
        return { src: `https://stackblitz.com/edit/${parts[1]}?embed=1`, provider: 'StackBlitz', title: 'StackBlitz project' };
    }

    if (host === 'codepen.io') {
        // /user/pen/id or /user/embed/id
        if (parts.length < 3 || !['pen', 'embed'].includes(parts[1])) return null;
        if (!/^[\w-]+$/.test(parts[0]) || !/^[\w-]+$/.test(parts[2])) return null;
        return { src: `https://codepen.io/${parts[0]}/embed/${parts[2]}`, provider: 'CodePen', title: 'CodePen' };
    }

    return null;
}

/** True only for https URLs on an allowlisted embed host. */
export function isAllowedEmbedSrc(src: string | null): boolean {
    if (!src) return false;
    try {
        const url = new URL(src);
        return url.protocol === 'https:' && EMBED_HOSTS.includes(url.hostname);
    } catch {
        return false;
    }
}

export const EMBED_HELP = 'Paste a YouTube, Vimeo, Loom, CodeSandbox, StackBlitz or CodePen link.';
