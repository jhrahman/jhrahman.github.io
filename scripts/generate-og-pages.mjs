// Generates a static, crawler-only HTML shell per blog post so link
// previews on social platforms (Facebook, LinkedIn, Slack, etc.) show that
// post's real title/excerpt/cover instead of the site's default preview.
//
// Those crawlers fetch a URL's raw HTML without running JavaScript, and
// GitHub Pages has no server logic to vary the response per path, so the
// SPA's own client-rendered meta tags (set after the app boots) are never
// seen by them. Each generated file is a plain static page at a real path
// (dist/blog/<id>/index.html) with the correct <meta> tags already baked
// in, which then redirects real visitors into the hash-routed app.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE_ORIGIN = 'https://jhrahman.github.io';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/images/myphoto.png`;
const POSTS_DIR = join(process.cwd(), 'src/content/posts');
const OUT_DIR = join(process.cwd(), 'dist/blog');

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.json'));
let count = 0;

for (const file of files) {
    const post = JSON.parse(readFileSync(join(POSTS_DIR, file), 'utf8'));
    if (post.draft) continue;

    const title = escapeHtml(`${post.title} — Jahidur Rahman`);
    const description = escapeHtml(post.excerpt || stripHtml(post.html).slice(0, 160));
    const image = post.cover ? `${SITE_ORIGIN}${post.cover}` : DEFAULT_IMAGE;
    const redirectTarget = `${SITE_ORIGIN}/#/blog/${post.id}`;
    const canonical = `${SITE_ORIGIN}/blog/${post.id}`;

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${canonical}" />
<meta name="twitter:card" content="summary_large_image" />
<meta http-equiv="refresh" content="0; url=${redirectTarget}" />
</head>
<body>
<p>Redirecting to <a href="${redirectTarget}">${title}</a>…</p>
</body>
</html>
`;

    const dir = join(OUT_DIR, String(post.id));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    count++;
}

console.log(`generate-og-pages: wrote ${count} post preview page(s) to dist/blog/`);
