import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCategoryById, partsOf, categoryStats, coverFor } from '../data/categories';
import { useAuth } from '../lib/auth';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import ScrollButtons from '../components/ScrollButtons';
import NotFound from './NotFound';
import './CategoryPage.css';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const CategoryPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isOwner } = useAuth();
    const numericId = id ? Number(id) : null;
    const category = numericId !== null ? getCategoryById(numericId) : undefined;

    const parts = category ? partsOf(category.id, isOwner) : [];
    const stats = category ? categoryStats(category.id, isOwner) : null;
    const cover = category ? coverFor(category) : null;

    useDocumentMeta(category?.title, category?.description, cover ?? undefined);

    if (!category || !stats) return <NotFound />;

    return (
        <motion.div
            className="page category-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <ScrollButtons />

            <div className="container">
                <Link to="/blog" className="back-to-blog">
                    <i className="fas fa-arrow-left"></i> Back to Blog
                </Link>

                {/* Reuses the .post-hero split layout from Blog.css (image and
                    text in separate columns, not one overlaid on the other) -
                    text-over-photo looked good for a solid-colored blur but
                    broke down against a busy/light real cover image. */}
                <header className="post-hero category-hero glass-effect">
                    <div className="post-hero-link category-hero-link">
                        <div
                            className="post-hero-cover"
                            style={cover ? { backgroundImage: `url(${cover})` } : undefined}
                        >
                            {cover ? (
                                <img src={cover} alt="" />
                            ) : (
                                <div className="post-hero-cover-placeholder" aria-hidden="true">
                                    <i className="fas fa-layer-group"></i>
                                </div>
                            )}
                        </div>
                        <div className="post-hero-content">
                            <span className="post-hero-badge">
                                <i className="fas fa-layer-group" aria-hidden="true"></i> Series
                            </span>
                            <h1 className="post-hero-title gradient-text">{category.title}</h1>
                            <p className="post-hero-excerpt">{category.description}</p>
                            <div className="post-card-meta">
                                <span>{stats.parts} part{stats.parts === 1 ? '' : 's'}</span>
                                <span aria-hidden="true">·</span>
                                <span>~{stats.totalReadingTime} min total</span>
                            </div>
                            {isOwner && (
                                <button
                                    type="button"
                                    className="edit-category-btn"
                                    onClick={() => navigate(`/blog/categories?edit=${category.id}`)}
                                >
                                    <i className="fas fa-pen"></i> Edit category
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <ol className="category-parts-list">
                    {parts.map((post, i) => (
                        <li key={post.slug}>
                            <Link to={`/blog/${post.id}`} className="category-part-row glass-effect">
                                <span className="category-part-number">{post.part ?? i + 1}</span>
                                <div className="category-part-body">
                                    <h2>
                                        {post.title}
                                        {post.draft && <span className="draft-badge">Draft</span>}
                                    </h2>
                                    <p>{post.excerpt}</p>
                                    <div className="post-card-meta">
                                        <span>{formatDate(post.date)}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{post.readingTime} min read</span>
                                    </div>
                                </div>
                                <i className="fas fa-arrow-right category-part-arrow" aria-hidden="true"></i>
                            </Link>
                        </li>
                    ))}
                </ol>

                {parts.length === 0 && (
                    <div className="blog-empty">
                        <i className="fas fa-inbox" aria-hidden="true"></i>
                        <p>No parts published yet.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default CategoryPage;
