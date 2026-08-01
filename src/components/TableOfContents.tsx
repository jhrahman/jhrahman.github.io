import { useEffect, useState } from 'react';
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
    if (items.length === 0) return null;

    const scrollTo = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        <nav className="toc toc-desktop" aria-label="Table of contents">
            <span className="toc-heading">On this page</span>
            <ul>
                {items.map((item) => (
                    <li key={item.id} className={`toc-level-${item.level}`}>
                        <a href={`#${item.id}`} onClick={scrollTo(item.id)}>{item.text}</a>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default TableOfContents;
