import { useEffect, useState } from 'react';
import { smoothScrollTo, useNestedSmoothScroll } from '../hooks/useSmoothScroll';
import './TableOfContents.css';

export interface TocItem {
    id: string;
    text: string;
    level: number;
}

/** Builds a TOC from h2/h3 elements inside the given container ref, once the post HTML has rendered. */
export function useToc(containerRef: React.RefObject<HTMLElement>, deps: unknown[]): TocItem[] {
    const [items, setItems] = useState<TocItem[]>([]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const headings = Array.from(el.querySelectorAll('h2, h3')) as HTMLElement[];
        const used = new Set<string>();

        const built = headings.map((h, i) => {
            let id = h.id || h.textContent?.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `section-${i}`;
            while (used.has(id)) id = `${id}-${i}`;
            used.add(id);
            h.id = id;
            return { id, text: h.textContent || '', level: h.tagName === 'H2' ? 2 : 3 };
        });

        setItems(built);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return items;
}

interface TableOfContentsProps {
    items: TocItem[];
    variant?: 'desktop' | 'mobile';
}

const TableOfContents = ({ items, variant = 'desktop' }: TableOfContentsProps) => {
    // Must run unconditionally (before the items.length early return below)
    // per the rules of hooks. Gives the desktop TOC panel - the one place
    // in the app with its own internal overflow-y: auto scroll - the same
    // lerp-smoothed feel as the main page, via its own small Lenis
    // instance. tocRef only ever gets attached to the desktop <nav> below;
    // it's a no-op until that happens (mobile variant, or while items is
    // still empty on the first render).
    const tocRef = useNestedSmoothScroll<HTMLElement>();

    if (items.length === 0) return null;

    // Routed through the shared Lenis instance (see useSmoothScroll) rather
    // than native `scrollIntoView({ behavior: 'smooth' })` - two competing
    // scroll animations (native + Lenis) running at once is what was
    // causing visible jitter. Lenis reads `scroll-margin-top` from the
    // heading itself, so the offset below the sticky navbar/reading-progress
    // bar (set in prose.css) still applies exactly as before.
    const scrollTo = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (el) smoothScrollTo(el);
    };

    if (variant === 'mobile') {
        return (
            <details className="toc toc-mobile">
                <summary>On this page</summary>
                <ul>
                    {items.map((item) => (
                        <li key={item.id} className={`toc-level-${item.level}`}>
                            <a href={`#${item.id}`} onClick={scrollTo(item.id)}>{item.text}</a>
                        </li>
                    ))}
                </ul>
            </details>
        );
    }

    return (
        // data-lenis-prevent tells the page-level Lenis instance (see
        // useSmoothScroll) to ignore wheel events here entirely, so this
        // panel's own nested Lenis instance (useNestedSmoothScroll above)
        // is the only thing driving its scroll.
        <nav className="toc toc-desktop" aria-label="Table of contents" ref={tocRef} data-lenis-prevent>
            <div className="toc-desktop-inner">
                <span className="toc-heading">On this page</span>
                <ul>
                    {items.map((item) => (
                        <li key={item.id} className={`toc-level-${item.level}`}>
                            <a href={`#${item.id}`} onClick={scrollTo(item.id)}>{item.text}</a>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export default TableOfContents;
