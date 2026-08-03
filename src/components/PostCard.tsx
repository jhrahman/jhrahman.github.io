import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Post } from '../types/blog';

const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, type: 'spring' as const } },
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Standalone-post card - shares .post-card* styling (defined in Blog.css, bundled
 * globally since Blog.tsx is never lazy-loaded) with CategoryCard's series variant. */
const PostCard = ({ post }: { post: Post }) => {
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
};

export default PostCard;
