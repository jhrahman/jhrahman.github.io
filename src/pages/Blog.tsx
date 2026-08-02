import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { posts, allPostsIncludingDrafts, allTags } from '../data/posts';
import { partsOf, categories, categoryStats, getCategoryById } from '../data/categories';
import { buildFeed, pickFeaturedEntries, entryKey, type FeedEntry } from '../data/blogFeed';
import { useAuth } from '../lib/auth';
import { useBlogFilters } from '../hooks/useBlogFilters';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import CategoryDropdown from '../components/CategoryDropdown';
import CategoryCard from '../components/CategoryCard';
import type { Post } from '../types/blog';
import './Blog.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, type: 'spring' as const } },
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function PostCard({ post }: { post: Post }) {
    return (
        <motion.article className="post-card glass-effect" variants={itemVariants} whileHover={{ y: -8 }}>
            <Link to={`/blog/${post.id}`} className="post-card-link" aria-label={post.title}>
                <div
                    className="post-card-cover"
                    style={post.cover ? { backgroundImage: `url(${post.cover})` } : undefined}
                >
                    {post.cover ? (
                        <img src={post.cover} alt="" loading="lazy" />
                    ) : (
                        <div className="post-card-cover-placeholder" aria-hidden="true">
                            <i className="fas fa-feather-alt"></i>
                        </div>
                    )}
                </div>
                <div className="post-card-content">
                    <div className="post-card-meta">
                        <span>{formatDate(post.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.readingTime} min read</span>
                    </div>
                    <h3 className="post-card-title">
                        {post.title}
                        {post.draft && <span className="draft-badge">Draft</span>}
                    </h3>
                    <p className="post-card-excerpt">{post.excerpt}</p>
                    {post.tags.length > 0 && (
                        <div className="post-card-tags">
                            {post.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="post-tag-pill">{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            </Link>
        </motion.article>
    );
}

function FeedCard({ entry, isOwner }: { entry: FeedEntry; isOwner: boolean }) {
    return entry.kind === 'post'
        ? <PostCard post={entry.post} />
        : <CategoryCard category={entry.category} includeDrafts={isOwner} />;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ');
}

const Blog = () => {
    const { isOwner } = useAuth();
    const { category: activeCategory, tag: activeTag, search, setCategory, setTag, setSearch, clearCategory, clearTag, clearAll } = useBlogFilters();

    useDocumentMeta('Blog', 'Notes on QA engineering, test automation, and building things.');

    const visiblePosts = isOwner ? allPostsIncludingDrafts : posts;
    const feed = useMemo(() => buildFeed(visiblePosts, isOwner), [visiblePosts, isOwner]);
    const featuredEntries = pickFeaturedEntries(feed);
    const featuredKeys = new Set(featuredEntries.map(entryKey));

    const categoryOptions = useMemo(
        () => categories
            // CategoryDropdown/URL params deal in strings, so the id is
            // stringified at this boundary - it's still the numeric id
            // underneath, not the slug.
            .map((c) => ({ id: String(c.id), title: c.title, count: categoryStats(c.id, isOwner).parts }))
            .filter((c) => c.count > 0),
        [isOwner]
    );

    const activeCategoryRecord = activeCategory ? getCategoryById(Number(activeCategory)) : undefined;
    const hasFilters = Boolean(activeCategory || activeTag || search.trim());
    const showFeatured = featuredEntries.length > 0 && !hasFilters;

    // Entry-level matching: a category "matches" search/tag when its own
    // title/description matches, OR any of its parts do - so a series is
    // never hidden just because the match lives inside Part 3's body.
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return feed.filter((entry) => {
            if (entry.kind === 'post') {
                const post = entry.post;
                if (activeTag && !post.tags.includes(activeTag)) return false;
                if (!q) return true;
                const haystack = `${post.title} ${post.excerpt} ${post.tags.join(' ')} ${stripHtml(post.html)}`.toLowerCase();
                return haystack.includes(q);
            }
            const parts = partsOf(entry.category.id, isOwner);
            if (activeTag && !parts.some((p) => p.tags.includes(activeTag))) return false;
            if (!q) return true;
            const haystack = `${entry.category.title} ${entry.category.description} ${parts.map((p) => `${p.title} ${p.excerpt} ${p.tags.join(' ')} ${stripHtml(p.html)}`).join(' ')}`.toLowerCase();
            return haystack.includes(q);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feed, search, activeTag, isOwner]);

    const gridEntries = filtered.filter((entry) => hasFilters || !featuredKeys.has(entryKey(entry)));

    const seriesParts = activeCategoryRecord ? partsOf(activeCategoryRecord.id, isOwner) : [];
    const seriesStats = activeCategoryRecord ? categoryStats(activeCategoryRecord.id, isOwner) : null;

    return (
        <motion.div
            className="page blog-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container">
                <div className="blog-header">
                    <motion.h1
                        className="page-title gradient-text"
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    >
                        Blog
                    </motion.h1>
                    {isOwner && (
                        <div className="blog-header-actions">
                            <Link to="/blog/categories" className="manage-categories-btn">
                                <i className="fas fa-layer-group"></i> Manage categories
                            </Link>
                            <Link to="/blog/new" className="new-post-btn">
                                <i className="fas fa-plus"></i> New post
                            </Link>
                        </div>
                    )}
                </div>

                <div className="blog-controls">
                    <div className="blog-controls-row">
                        <div className="blog-search">
                            <i className="fas fa-search" aria-hidden="true"></i>
                            <input
                                type="search"
                                placeholder="Search posts…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search posts"
                            />
                        </div>
                        {categoryOptions.length > 0 && (
                            <CategoryDropdown options={categoryOptions} value={activeCategory} onChange={setCategory} />
                        )}
                    </div>

                    {allTags.length > 0 && (
                        <div className="blog-tags" role="group" aria-label="Filter by tag">
                            <button
                                className={`blog-tag-chip ${activeTag === null ? 'active' : ''}`}
                                onClick={() => setTag(null)}
                            >
                                All
                            </button>
                            {allTags.map((tag) => (
                                <button
                                    key={tag}
                                    className={`blog-tag-chip ${activeTag === tag ? 'active' : ''}`}
                                    onClick={() => setTag(activeTag === tag ? null : tag)}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}

                    {(activeCategoryRecord || activeTag) && (
                        <div className="active-filters">
                            {activeCategoryRecord && (
                                <span className="active-filter-chip">
                                    {activeCategoryRecord.title}
                                    <button type="button" onClick={clearCategory} aria-label={`Clear ${activeCategoryRecord.title} filter`}>✕</button>
                                </span>
                            )}
                            {activeTag && (
                                <span className="active-filter-chip">
                                    {activeTag}
                                    <button type="button" onClick={clearTag} aria-label={`Clear ${activeTag} filter`}>✕</button>
                                </span>
                            )}
                            {activeCategoryRecord && activeTag && (
                                <button type="button" className="clear-all-filters" onClick={clearAll}>Clear all</button>
                            )}
                        </div>
                    )}
                </div>

                {activeCategoryRecord && seriesStats ? (
                    <>
                        <div className="blog-series-header">
                            <div>
                                <h2>{activeCategoryRecord.title}</h2>
                                <span className="series-count">{seriesStats.parts} part{seriesStats.parts === 1 ? '' : 's'} · ~{seriesStats.totalReadingTime} min total</span>
                            </div>
                            <Link to={`/blog/category/${activeCategoryRecord.id}`} className="view-series-link">
                                View the full series <i className="fas fa-arrow-right"></i>
                            </Link>
                        </div>
                        <div className="series-compact-list">
                            {seriesParts.map((post, i) => (
                                <Link key={post.slug} to={`/blog/${post.id}`} className="series-compact-row">
                                    <span className="post-part-badge">Part {post.part ?? i + 1}</span>
                                    <div className="series-compact-row-title">
                                        <h3>
                                            {post.title}
                                            {post.draft && <span className="draft-badge">Draft</span>}
                                        </h3>
                                    </div>
                                    <span className="series-compact-row-meta">{post.readingTime} min read</span>
                                </Link>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {showFeatured && featuredEntries.length === 1 && featuredEntries[0].kind === 'post' && (
                            <motion.article
                                className="post-hero glass-effect"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.6 }}
                            >
                                <Link to={`/blog/${featuredEntries[0].post.id}`} className="post-hero-link">
                                    <div
                                        className="post-hero-cover"
                                        style={featuredEntries[0].post.cover ? { backgroundImage: `url(${featuredEntries[0].post.cover})` } : undefined}
                                    >
                                        {featuredEntries[0].post.cover ? (
                                            <img src={featuredEntries[0].post.cover} alt="" />
                                        ) : (
                                            <div className="post-hero-cover-placeholder" aria-hidden="true">
                                                <i className="fas fa-feather-alt"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="post-hero-content">
                                        <span className="post-hero-badge">Featured</span>
                                        <h2 className="post-hero-title">{featuredEntries[0].post.title}</h2>
                                        <p className="post-hero-excerpt">{featuredEntries[0].post.excerpt}</p>
                                        <div className="post-card-meta">
                                            <span>{formatDate(featuredEntries[0].post.date)}</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{featuredEntries[0].post.readingTime} min read</span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.article>
                        )}

                        {showFeatured && (featuredEntries.length > 1 || (featuredEntries.length === 1 && featuredEntries[0].kind === 'category')) && (
                            <motion.div
                                className="featured-grid"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {featuredEntries.map((entry) =>
                                    entry.kind === 'post' ? (
                                        <motion.article
                                            key={entryKey(entry)}
                                            className="featured-card glass-effect"
                                            variants={itemVariants}
                                            whileHover={{ y: -6 }}
                                        >
                                            <Link to={`/blog/${entry.post.id}`} className="featured-card-link">
                                                <div
                                                    className="featured-card-cover"
                                                    style={entry.post.cover ? { backgroundImage: `url(${entry.post.cover})` } : undefined}
                                                >
                                                    {entry.post.cover ? (
                                                        <img src={entry.post.cover} alt="" loading="lazy" />
                                                    ) : (
                                                        <div className="post-card-cover-placeholder" aria-hidden="true">
                                                            <i className="fas fa-feather-alt"></i>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="featured-card-content">
                                                    <span className="post-hero-badge">Featured</span>
                                                    <h3 className="featured-card-title">{entry.post.title}</h3>
                                                    <p className="post-card-excerpt">{entry.post.excerpt}</p>
                                                    <div className="post-card-meta">
                                                        <span>{formatDate(entry.post.date)}</span>
                                                        <span aria-hidden="true">·</span>
                                                        <span>{entry.post.readingTime} min read</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        </motion.article>
                                    ) : (
                                        <CategoryCard key={entryKey(entry)} category={entry.category} variant="featured" includeDrafts={isOwner} />
                                    )
                                )}
                            </motion.div>
                        )}

                        {gridEntries.length > 0 ? (
                            <motion.div className="posts-grid" variants={containerVariants} initial="hidden" animate="visible">
                                {gridEntries.map((entry) => (
                                    <FeedCard key={entryKey(entry)} entry={entry} isOwner={isOwner} />
                                ))}
                            </motion.div>
                        ) : (
                            <div className="blog-empty">
                                <i className="fas fa-inbox" aria-hidden="true"></i>
                                <p>{visiblePosts.length === 0 ? 'No posts yet — check back soon.' : 'No posts match your search.'}</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default Blog;
