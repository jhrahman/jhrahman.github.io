import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import './Home.css';

const Home = () => {
    const socialLinks = [
        { icon: 'fab fa-facebook-f', label: 'Facebook', url: 'https://www.facebook.com/jhrahman62/', brand: '#1877F2' },
        { icon: 'fab fa-linkedin-in', label: 'LinkedIn', url: 'https://www.linkedin.com/in/jhrahman/', brand: '#0A66C2' },
        { icon: 'fab fa-github', label: 'GitHub', url: 'https://github.com/jhrahman', brand: '#333333' },
    ];

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
                    <motion.div
                        className="profile-image-wrapper"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
                    >
                        <img
                            src={`${import.meta.env.BASE_URL}images/myphoto.png`}
                            alt="Jahidur Rahman"
                            className="profile-image"
                        />
                    </motion.div>

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
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Home;
