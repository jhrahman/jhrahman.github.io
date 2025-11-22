import { motion } from 'framer-motion';
import './Home.css';

const Home = () => {
    const socialLinks = [
        { icon: 'fab fa-facebook-f', label: 'Facebook', url: 'https://www.facebook.com/jhrahman62/' },
        { icon: 'fab fa-linkedin-in', label: 'LinkedIn', url: 'https://www.linkedin.com/in/jhrahman/' },
        { icon: 'fab fa-github', label: 'GitHub', url: 'https://github.com/jhrahman' },
    ];

    return (
        <motion.div
            className="page home-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
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
                            src="/images/myphoto.png"
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

                    <motion.p
                        className="hero-title"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                    >
                        IT Engineer
                    </motion.p>

                    <motion.div
                        className="social-links"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                    >
                        {socialLinks.map((link, index) => (
                            <motion.a
                                key={link.label}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link glass-effect"
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
