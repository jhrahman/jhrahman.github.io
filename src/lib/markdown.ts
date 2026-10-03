import { marked } from 'marked';
import { sanitizeHtml } from './sanitize';
import { parseEmbedUrl, embedIframeAttrs } from './embeds';
import { CALLOUT_TYPES } from './calloutExtension';

export interface MarkdownMeta {
    title?: string;
    excerpt?: string;
    tags?: string[];
}

export interface ParsedMarkdown {
    /** Sanitized HTML of the whole document - what the preview shows. */
    html: string;
    /** Same, minus a leading "# Title" line when it was promoted to the post title - what "Replace post content" loads. */
    htmlWithoutTitle: string;
    meta: MarkdownMeta;
}

const unquote = (v: string) => v.trim().replace(/^(['"])(.*)\1$/, '$2');

/** Minimal front-matter reader for the keys a post uses (title, description/excerpt, tags) - flat `key: value`, inline `[a, b]` lists, and `- item` lists. Not a general YAML parser. */
function parseFrontMatter(md: string): { body: string; meta: MarkdownMeta } {
    const match = md.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
    if (!match) return { body: md, meta: {} };

    const meta: MarkdownMeta = {};
    const lines = match[1].split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const kv = lines[i].match(/^([A-Za-z_-]+):\s*(.*)$/);
        if (!kv) continue;
        const key = kv[1].toLowerCase();
        let value = kv[2].trim();
        let list: string[] | null = null;

        if (value.startsWith('[') && value.endsWith(']')) {
            list = value.slice(1, -1).split(',').map(unquote).filter(Boolean);
        } else if (value === '') {
            const items: string[] = [];
            while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
                items.push(unquote(lines[++i].replace(/^\s*-\s+/, '')));
            }
            if (items.length) list = items;
        }

        if (key === 'tags') meta.tags = list ?? value.split(',').map(unquote).filter(Boolean);
        else if (key === 'title' && value) meta.title = unquote(value);
        else if ((key === 'description' || key === 'excerpt' || key === 'summary') && value) meta.excerpt = unquote(value);
    }
    return { body: md.slice(match[0].length), meta };
}

/** > [!NOTE] blockquotes -> the editor's callout node markup. */
function convertCallouts(doc: Document) {
    const marker = new RegExp(`^\\s*\\[!(${CALLOUT_TYPES.join('|')})\\]\\s*`, 'i');
    doc.querySelectorAll('blockquote').forEach((bq) => {
        const first = bq.firstElementChild;
        const text = first?.firstChild;
        if (!first || first.tagName !== 'P' || text?.nodeType !== Node.TEXT_NODE) return;
        const m = (text.textContent ?? '').match(marker);
        if (!m) return;
        text.textContent = (text.textContent ?? '').replace(marker, '');
        if (!first.textContent?.trim() && !first.querySelector('*')) first.remove();
        const div = doc.createElement('div');
        div.setAttribute('data-callout', m[1].toLowerCase());
        div.className = `callout callout-${m[1].toLowerCase()}`;
        while (bq.firstChild) div.appendChild(bq.firstChild);
        bq.replaceWith(div);
    });
}

/** GFM `- [ ]` items -> the task-list node markup (the editor parses data-type, not <input>). */
function convertTaskLists(doc: Document) {
    doc.querySelectorAll('li').forEach((li) => {
        const input = li.querySelector(':scope > input[type="checkbox"], :scope > p:first-child > input[type="checkbox"]');
        if (!input) return;
        li.setAttribute('data-type', 'taskItem');
        li.setAttribute('data-checked', input.hasAttribute('checked') ? 'true' : 'false');
        const next = input.nextSibling;
        if (next?.nodeType === Node.TEXT_NODE) next.textContent = (next.textContent ?? '').replace(/^\s+/, '');
        input.remove();
    });
    doc.querySelectorAll('ul').forEach((ul) => {
        const items = Array.from(ul.children);
        if (items.length && items.every((li) => li.getAttribute('data-type') === 'taskItem')) {
            ul.setAttribute('data-type', 'taskList');
        } else {
            items.forEach((li) => { li.removeAttribute('data-type'); li.removeAttribute('data-checked'); });
        }
    });
}

/** A paragraph that is only a supported provider URL (YouTube, CodeSandbox…) becomes an embed block, like GitHub/Docusaurus-style bare-link embeds. */
function convertEmbeds(doc: Document) {
    doc.querySelectorAll('p').forEach((p) => {
        const text = p.textContent?.trim() ?? '';
        if (!/^https:\/\/\S+$/.test(text)) return;
        const onlyLink = p.children.length === 1 && p.children[0].tagName === 'A' && p.children[0].getAttribute('href') === text;
        if (!onlyLink && p.children.length > 0) return;
        const info = parseEmbedUrl(text);
        if (!info) return;
        const wrap = doc.createElement('div');
        wrap.className = 'embed';
        wrap.setAttribute('data-embed', '');
        const iframe = doc.createElement('iframe');
        for (const [k, v] of Object.entries(embedIframeAttrs(info.src, info.title))) iframe.setAttribute(k, v);
        wrap.appendChild(iframe);
        p.replaceWith(wrap);
    });
}

function render(body: string): string {
    const raw = marked.parse(body, { gfm: true, breaks: false, async: false }) as string;
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    convertCallouts(doc);
    convertTaskLists(doc);
    convertEmbeds(doc);
    return sanitizeHtml(doc.body.innerHTML, { allowBlob: true });
}

export function parseMarkdown(md: string): ParsedMarkdown {
    const { body, meta } = parseFrontMatter(md);
    const html = render(body);

    // A leading "# Title" duplicates the post's own title field, so promote it
    // (unless front matter already supplied one) and leave it out of the body.
    const h1 = body.match(/^\s*#[ \t]+(.+?)[ \t#]*(?:\r?\n|$)/);
    if (!h1) return { html, htmlWithoutTitle: html, meta };
    const heading = h1[1].trim();
    if (!meta.title) meta.title = heading;
    // A different heading than the front-matter title is real content - keep it.
    if (meta.title !== heading) return { html, htmlWithoutTitle: html, meta };
    return { html, htmlWithoutTitle: render(body.slice(h1[0].length)), meta };
}
