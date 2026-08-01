import { useEffect } from 'react';

const DEFAULT_TITLE = 'Jahidur Rahman — Software QA & Test Automation Engineer';
const DEFAULT_DESCRIPTION =
    'Portfolio of Md Jahidur Rahman — Software QA and Test Automation engineer specializing in Playwright, API testing, and CI/CD automation for cloud-based SaaS applications.';

function setMeta(selector: string, attr: string, value: string) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
}

/**
 * Sets document.title and OG/description meta tags for the current post,
 * restoring the site defaults on unmount. This is a HashRouter SPA with no
 * server-side rendering, so crawlers still only see one URL - this hook
 * improves social-share previews and browser history, not search indexing.
 */
export function useDocumentMeta(title?: string, description?: string, image?: string) {
    useEffect(() => {
        const fullTitle = title ? `${title} — Jahidur Rahman` : DEFAULT_TITLE;
        document.title = fullTitle;
        setMeta('meta[property="og:title"]', 'content', fullTitle);
        setMeta('meta[name="description"]', 'content', description || DEFAULT_DESCRIPTION);
        setMeta('meta[property="og:description"]', 'content', description || DEFAULT_DESCRIPTION);
        if (image) setMeta('meta[property="og:image"]', 'content', image);

        return () => {
            document.title = DEFAULT_TITLE;
            setMeta('meta[property="og:title"]', 'content', DEFAULT_TITLE);
            setMeta('meta[name="description"]', 'content', DEFAULT_DESCRIPTION);
            setMeta('meta[property="og:description"]', 'content', DEFAULT_DESCRIPTION);
        };
    }, [title, description, image]);
}
