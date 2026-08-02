import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Category } from '../types/blog';
import { categoryStats, coverFor } from '../data/categories';

const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, type: 'spring' as const } },
};

interface CategoryCardProps {
    category: Category;
    variant?: 'grid' | 'featured';
    includeDrafts?: boolean;
}

/** Featurable "series" card - same visual language as PostCard/featured-card so it sits naturally in the same grid. */
const CategoryCard = ({ category, variant = 'grid', includeDrafts = false }: CategoryCardProps) => {
    const stats = categoryStats(category.slug, includeDrafts);
    const cover = coverFor(category);
    const linkClass = variant === 'featured' ? 'featured-card-link' : 'post-card-link';
    const coverClass = variant === 'featured' ? 'featured-card-cover' : 'post-card-cover';
    const contentClass = variant === 'featured' ? 'featured-card-content' : 'post-card-content';
    const titleClass = variant === 'featured' ? 'featured-card-title' : 'post-card-title';

    return (
        <motion.article
            className={`${variant === 'featured' ? 'featured-card' : 'post-card'} glass-effect category-card`}
            variants={itemVariants}
            whileHover={{ y: -8 }}
        >
            <Link to={`/blog/category/${category.slug}`} className={linkClass} aria-label={category.title}>
                <div className={coverClass} style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
                    {cover ? (
                        <img src={cover} alt="" loading="lazy" />
                    ) : (
                        <div className="post-card-cover-placeholder" aria-hidden="true">
                            <i className="fas fa-layer-group"></i>
                        </div>
                    )}
                    <span className="category-badge">
                        <i className="fas fa-layer-group" aria-hidden="true"></i> Series
                    </span>
                </div>
                <div className={contentClass}>
                    <div className="post-card-meta">
                        <span>{stats.parts} part{stats.parts === 1 ? '' : 's'}</span>
                        <span aria-hidden="true">·</span>
                        <span>~{stats.totalReadingTime} min</span>
                    </div>
                    <h3 className={titleClass}>{category.title}</h3>
                    <p className="post-card-excerpt">{category.description}</p>
                </div>
            </Link>
        </motion.article>
    );
};

export default CategoryCard;
