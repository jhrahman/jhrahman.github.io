import { Link } from 'react-router-dom';
import type { Category, Post } from '../types/blog';
import './SeriesNav.css';

interface SeriesNavProps {
    category: Category;
    parts: Post[];
    currentSlug: string;
    variant?: 'desktop' | 'mobile';
}

/**
 * Full part list for the series the current post belongs to, so a reader
 * can jump to any other part without going back to the index. Ships in two
 * variants driven by the same data, the same desktop/mobile split already
 * used by TableOfContents: a sticky rail alongside the post on desktop, a
 * collapsed <details> card under the header on mobile.
 */
const SeriesNav = ({ category, parts, currentSlug, variant = 'desktop' }: SeriesNavProps) => {
    if (parts.length === 0) return null;

    const currentIndex = parts.findIndex((p) => p.slug === currentSlug);

    const list = (
        <ul>
            {parts.map((post, i) => {
                const isCurrent = post.slug === currentSlug;
                return (
                    <li key={post.slug} className={isCurrent ? 'series-nav-current' : ''}>
                        {isCurrent ? (
                            <span aria-current="page">
                                <span className="series-nav-part">Part {post.part ?? i + 1}</span>
                                <span className="series-nav-title">{post.title}</span>
                            </span>
                        ) : (
                            <Link to={`/blog/${post.id}`}>
                                <span className="series-nav-part">Part {post.part ?? i + 1}</span>
                                <span className="series-nav-title">
                                    {post.title}
                                    {post.draft && <span className="draft-badge">Draft</span>}
                                </span>
                            </Link>
                        )}
                    </li>
                );
            })}
        </ul>
    );

    if (variant === 'mobile') {
        return (
            <details className="series-nav series-nav-mobile" open={false}>
                <summary>
                    {category.title}
                    {currentIndex !== -1 && <span className="series-nav-summary-progress"> · Part {parts[currentIndex].part ?? currentIndex + 1} of {parts.length}</span>}
                </summary>
                {list}
            </details>
        );
    }

    return (
        <nav className="series-nav series-nav-desktop" aria-label="Parts in this series">
            <span className="series-nav-heading">
                <i className="fas fa-layer-group" aria-hidden="true"></i> {category.title}
            </span>
            {list}
        </nav>
    );
};

export default SeriesNav;
