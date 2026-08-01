// Generates the static shells this BrowserRouter SPA needs on GitHub Pages,
// which only serves flat files and has no server-side routing:
//
// 1. dist/404.html - a copy of the built index.html. GitHub Pages serves this
//    for any path with no matching file (keeping the requested URL in the
//    address bar), so deep links like /activities or /blog/edit/x still boot
//    the app and let the client router resolve them.
// 2. dist/<route>/index.html - real files for the top-level pages, so those
//    URLs return an actual 200 instead of falling through to 404.html.
// 3. dist/blog/<id>/index.html - one per published post, same shell but with
//    post-specific <title>/description/OG tags swapped in. Social/link-
//    preview crawlers fetch raw HTML without running JS, so they only ever
//    see whichever static file GitHub Pages hands them for that exact URL -
//    this is what makes per-post previews (image, title, excerpt) work.
//
// It also renders a landscape (1200x630) og:image variant for every cover
// and the site default. Source images are square, but link-preview boxes on
// Facebook/LinkedIn/etc. are ~1.91:1 and hard-crop whatever they're given -
// a square image loses its top and bottom. Each variant is a blurred,
// darkened fill of the source behind the same image shown uncropped
// ("contain"), the same letterbox technique already used for .post-cover
// and the About page photo - so nothing in the original ever gets cut off.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SITE_ORIGIN = 'https://jhrahman.github.io';
const DIST_DIR = join(process.cwd(), 'dist');
const POSTS_DIR = join(process.cwd(), 'src/content/posts');
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

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

/** Renders a 1200x630 landscape og:image: blurred cover fill behind the same image shown uncropped. */
async function makeOgImage(sourcePath, outPath) {
    const background = await sharp(sourcePath)
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover' })
        .blur(42)
        .modulate({ brightness: 0.55 })
        .toBuffer();

    // Fill as much of the frame as possible without cropping - only back off
    // enough to leave a thin breathing margin, not the wide idle space a
    // heavier shrink leaves (which is what made the image read as "zoomed
    // out" instead of a proper full-bleed card).
    const foregroundMeta = await sharp(sourcePath).metadata();
    const scale = Math.min(OG_WIDTH / foregroundMeta.width, OG_HEIGHT / foregroundMeta.height) * 0.97;
    const foreground = await sharp(sourcePath)
        .resize(Math.round(foregroundMeta.width * scale), Math.round(foregroundMeta.height * scale), { fit: 'inside' })
        .toBuffer();
    const fgMeta = await sharp(foreground).metadata();

    await sharp(background)
        .composite([{
            input: foreground,
            left: Math.round((OG_WIDTH - fgMeta.width) / 2),
            top: Math.round((OG_HEIGHT - fgMeta.height) / 2),
        }])
        .jpeg({ quality: 84 })
        .toFile(outPath);
}

const template = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');

// 1. SPA fallback for GitHub Pages.
writeFileSync(join(DIST_DIR, '404.html'), template);

// 2. Static shells for the top-level routes.
for (const route of ['about', 'activities', 'contact', 'blog']) {
    const dir = join(DIST_DIR, route);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), template);
}

// 3. Site-default og:image (used by the homepage shell and any post without a cover).
mkdirSync(join(DIST_DIR, 'images'), { recursive: true });
await makeOgImage(join(DIST_DIR, 'images/myphoto.png'), join(DIST_DIR, 'images/og-default.jpg'));
const DEFAULT_IMAGE = `${SITE_ORIGIN}/images/og-default.jpg`;

// 4. Per-post shells with real OG meta baked in.
function withPostMeta(html, { title, description, image, canonical }) {
    return html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description"[\s\S]*?\/>/, `<meta name="description" content="${description}" />`)
        .replace(/<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${title}" />`)
        .replace(/<meta property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${description}" />`)
        .replace(/<meta property="og:type"[\s\S]*?\/>/, '<meta property="og:type" content="article" />')
        .replace(/<meta property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${canonical}" />`)
        .replace(/<meta property="og:image"[\s\S]*?\/>/, `<meta property="og:image" content="${image}" />`)
        .replace(/<meta name="twitter:card"[\s\S]*?\/>/, '<meta name="twitter:card" content="summary_large_image" />')
        .replace('</head>', `    <link rel="canonical" href="${canonical}" />\n</head>`);
}

const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.json'));
let count = 0;

for (const file of files) {
    const post = JSON.parse(readFileSync(join(POSTS_DIR, file), 'utf8'));
    if (post.draft) continue;

    const title = escapeHtml(`${post.title} — Jahidur Rahman`);
    const description = escapeHtml(post.excerpt || stripHtml(post.html).slice(0, 160));
    const canonical = `${SITE_ORIGIN}/blog/${post.id}`;

    let image = DEFAULT_IMAGE;
    if (post.cover) {
        const coverFsPath = join(DIST_DIR, post.cover.replace(/^\//, ''));
        if (existsSync(coverFsPath)) {
            const ogDir = join(DIST_DIR, 'images', 'blog', post.slug);
            mkdirSync(ogDir, { recursive: true });
            await makeOgImage(coverFsPath, join(ogDir, 'og-cover.jpg'));
            image = `${SITE_ORIGIN}/images/blog/${post.slug}/og-cover.jpg`;
        }
    }

    const html = withPostMeta(template, { title, description, image, canonical });

    const dir = join(DIST_DIR, 'blog', String(post.id));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    count++;
}

console.log(`generate-og-pages: wrote 404.html, 4 route shells, 1 default og:image, and ${count} post preview page(s)`);
