import DOMPurify from 'dompurify';
import { isAllowedEmbedSrc } from './embeds';

// Registered once at import. Any iframe that survives the tag allowlist must
// point at an allowlisted embed host; everything else is dropped outright.
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName !== 'iframe') return;
    const el = node as Element;
    if (!isAllowedEmbedSrc(el.getAttribute('src'))) el.parentNode?.removeChild(el);
});

const CONFIG = {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target', 'rel', 'download', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy', 'sandbox'],
};

// DOMPurify's default URI allowlist plus blob:, which the Markdown editor needs
// while previewing images/files that are staged locally and not yet uploaded.
const URI_WITH_BLOB = /^(?:(?:https?|mailto|tel|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

export function sanitizeHtml(html: string, options: { allowBlob?: boolean } = {}): string {
    return DOMPurify.sanitize(html, options.allowBlob ? { ...CONFIG, ALLOWED_URI_REGEXP: URI_WITH_BLOB } : CONFIG);
}
