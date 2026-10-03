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

export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, CONFIG);
}
