import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CSSProperties, MouseEvent } from 'react';
import { posts } from '../data/posts';
import { buildFeed, entryKey } from '../data/blogFeed';
import PostCard from '../components/PostCard';
import CategoryCard from '../components/CategoryCard';
import './Home.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const Home = () => {
    const socialLinks = [
        { icon: 'fab fa-facebook-f', label: 'Facebook', url: 'https://www.facebook.com/jhrahman62/', brand: '#1877F2' },
        { icon: 'fab fa-linkedin-in', label: 'LinkedIn', url: 'https://www.linkedin.com/in/jhrahman/', brand: '#0A66C2' },
        { icon: 'fab fa-github', label: 'GitHub', url: 'https://github.com/jhrahman', brand: '#333333' },
    ];

    const latestEntries = buildFeed(posts).slice(0, 3);

    const scrollToLatest = (e: MouseEvent<HTMLAnchorElement>) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const target = document.getElementById('latest');
        if (!target) return;
        e.preventDefault();

        const startY = window.scrollY;
        const targetY = target.getBoundingClientRect().top + startY - 80; // matches scroll-margin-top
        const distance = targetY - startY;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.scrollTo(0, targetY);
            return;
        }

        const duration = 650;
        const startTime = performance.now();
        const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

        const step = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            window.scrollTo(0, startY + distance * easeInOutCubic(progress));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    return (
        <motion.div
            className="page home-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="hero-glow hero-glow-1" aria-hidden="true"></div>
            <div className="hero-glow hero-glow-2" aria-hidden="true"></div>
            <div className="container home-container">
                <motion.div
                    className="hero-content"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                >
                    <div className="hero-grid">
                        <motion.div
                            className="hero-visual"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
                        >
                            <div className="profile-image-wrapper">
                                <img
                                    src={`${import.meta.env.BASE_URL}images/myphoto.png`}
                                    alt="Jahidur Rahman"
                                    className="profile-image"
                                />
                            </div>
                        </motion.div>

                        <div className="hero-copy">
                            <motion.h1
                                className="hero-name"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.6 }}
                            >
                                <span className="gradient-text">Jahidur Rahman</span>
                            </motion.h1>

                            <motion.div
                                className="hero-capabilities"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6, duration: 0.6, staggerChildren: 0.1 }}
                            >
                                {[
                                    { icon: 'fa-vial', label: 'Test Automation' },
                                    { icon: 'fa-shield-halved', label: 'Quality Assurance' },
                                    { icon: 'fa-bug', label: 'Issue Triage' },
                                ].map((cap, index) => (
                                    <motion.span
                                        key={cap.label}
                                        className="hero-capability glass-effect"
                                        initial={{ y: 15, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.65 + index * 0.1, duration: 0.5 }}
                                        whileHover={{ y: -3 }}
                                    >
                                        <i className={`fas ${cap.icon}`} aria-hidden="true"></i>
                                        {cap.label}
                                    </motion.span>
                                ))}
                            </motion.div>

                            <motion.p
                                className="hero-tagline"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.95, duration: 0.6 }}
                            >
                                I'd rather catch a bug on my desk than have a customer catch it in production.
                            </motion.p>

                            <motion.div
                                className="hero-actions"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.05, duration: 0.6 }}
                            >
                                <Link to="/activities" className="hero-btn hero-btn-primary">
                                    View My Work
                                </Link>
                                <Link to="/about" className="hero-btn hero-btn-secondary">
                                    View My Profile
                                </Link>
                            </motion.div>

                            <motion.div
                                className="social-links"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.1, duration: 0.6 }}
                            >
                                {socialLinks.map((link, index) => (
                                    <motion.a
                                        key={link.label}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link glass-effect"
                                        style={{ '--brand-color': link.brand } as CSSProperties}
                                        whileHover={{ scale: 1.1, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.8 + index * 0.1, type: 'spring' }}
                                        aria-label={link.label}
                                    >
                                        <i className={link.icon}></i>
                                    </motion.a>
                                ))}
                            </motion.div>
                        </div>
                    </div>

                    <motion.a
                        href="#latest"
                        className="hero-scroll-cue"
                        onClick={scrollToLatest}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.3, duration: 0.6 }}
                    >
                        <span>Latest writing</span>
                        <i className="fas fa-chevron-down" aria-hidden="true"></i>
                    </motion.a>
                </motion.div>
            </div>

            {latestEntries.length > 0 && (
                <section id="latest" className="home-latest">
                    <div className="container">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-100px' }}
                        >
                            <div className="home-latest-head">
                                <h2 className="home-latest-title">Latest writing</h2>
                                <Link to="/blog" className="home-latest-link">
                                    All posts <i className="fas fa-arrow-right" aria-hidden="true"></i>
                                </Link>
                            </div>
                            <div className="home-latest-grid">
                                {latestEntries.map((entry) =>
                                    entry.kind === 'post' ? (
                                        <PostCard key={entryKey(entry)} post={entry.post} />
                                    ) : (
                                        <CategoryCard key={entryKey(entry)} category={entry.category} />
                                    )
                                )}
                            </div>
                        </motion.div>
                    </div>
                </section>
            )}
        </motion.div>
    );
};

export default Home;
