import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { posts, allPostsIncludingDrafts, allTags, pickFeatured } from '../data/posts';
import { useAuth } from '../lib/auth';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
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

const Blog = () => {
    const { isOwner } = useAuth();
    const [search, setSearch] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);

    useDocumentMeta('Blog', 'Notes on QA engineering, test automation, and building things.');

    const visiblePosts = isOwner ? allPostsIncludingDrafts : posts;
    const featuredPosts = pickFeatured(visiblePosts);
    const featuredSlugs = new Set(featuredPosts.map((p) => p.slug));
    const showFeatured = featuredPosts.length > 0 && !search.trim() && !activeTag;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return visiblePosts.filter((post) => {
            if (activeTag && !post.tags.includes(activeTag)) return false;
            if (!q) return true;
            const haystack = `${post.title} ${post.excerpt} ${post.tags.join(' ')} ${post.html.replace(/<[^>]*>/g, ' ')}`.toLowerCase();
            return haystack.includes(q);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, activeTag, isOwner]);

    const gridPosts = filtered.filter((p) => activeTag || search.trim() || !featuredSlugs.has(p.slug));

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
                        <Link to="/blog/new" className="new-post-btn">
                            <i className="fas fa-plus"></i> New post
                        </Link>
                    )}
                </div>

                <div className="blog-controls">
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
                    {allTags.length > 0 && (
                        <div className="blog-tags" role="group" aria-label="Filter by tag">
                            <button
                                className={`blog-tag-chip ${activeTag === null ? 'active' : ''}`}
                                onClick={() => setActiveTag(null)}
                            >
                                All
                            </button>
                            {allTags.map((tag) => (
                                <button
                                    key={tag}
                                    className={`blog-tag-chip ${activeTag === tag ? 'active' : ''}`}
                                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {showFeatured && featuredPosts.length === 1 && (
                    <motion.article
                        className="post-hero glass-effect"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.6 }}
                    >
                        <Link to={`/blog/${featuredPosts[0].id}`} className="post-hero-link">
                            <div
                                className="post-hero-cover"
                                style={featuredPosts[0].cover ? { backgroundImage: `url(${featuredPosts[0].cover})` } : undefined}
                            >
                                {featuredPosts[0].cover ? (
                                    <img src={featuredPosts[0].cover} alt="" />
                                ) : (
                                    <div className="post-hero-cover-placeholder" aria-hidden="true">
                                        <i className="fas fa-feather-alt"></i>
                                    </div>
                                )}
                            </div>
                            <div className="post-hero-content">
                                <span className="post-hero-badge">Featured</span>
                                <h2 className="post-hero-title">{featuredPosts[0].title}</h2>
                                <p className="post-hero-excerpt">{featuredPosts[0].excerpt}</p>
                                <div className="post-card-meta">
                                    <span>{formatDate(featuredPosts[0].date)}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{featuredPosts[0].readingTime} min read</span>
                                </div>
                            </div>
                        </Link>
                    </motion.article>
                )}

                {showFeatured && featuredPosts.length > 1 && (
                    <motion.div
                        className="featured-grid"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {featuredPosts.map((post) => (
                            <motion.article
                                key={post.slug}
                                className="featured-card glass-effect"
                                variants={itemVariants}
                                whileHover={{ y: -6 }}
                            >
                                <Link to={`/blog/${post.id}`} className="featured-card-link">
                                    <div
                                        className="featured-card-cover"
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
                                    <div className="featured-card-content">
                                        <span className="post-hero-badge">Featured</span>
                                        <h3 className="featured-card-title">{post.title}</h3>
                                        <p className="post-card-excerpt">{post.excerpt}</p>
                                        <div className="post-card-meta">
                                            <span>{formatDate(post.date)}</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{post.readingTime} min read</span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.article>
                        ))}
                    </motion.div>
                )}

                {gridPosts.length > 0 ? (
                    <motion.div className="posts-grid" variants={containerVariants} initial="hidden" animate="visible">
                        {gridPosts.map((post) => (
                            <PostCard key={post.slug} post={post} />
                        ))}
                    </motion.div>
                ) : (
                    <div className="blog-empty">
                        <i className="fas fa-inbox" aria-hidden="true"></i>
                        <p>{visiblePosts.length === 0 ? 'No posts yet — check back soon.' : 'No posts match your search.'}</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Blog;
