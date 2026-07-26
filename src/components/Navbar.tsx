import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import './Navbar.css';

interface NavbarProps {
    onInfoClick: () => void;
}

const Navbar = ({ onInfoClick }: NavbarProps) => {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/about', label: 'About' },
        { path: '/activities', label: 'Activities' },
        { path: '/contact', label: 'Contact' },
    ];

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <>
            <motion.nav
                className="navbar glass-effect"
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="container navbar-content">
                    <Link to="/" className="logo" aria-label="Jahidur Rahman - Home">
                        <svg
                            className="logo-mark"
                            width="36"
                            height="36"
                            viewBox="0 0 40 40"
                            xmlns="http://www.w3.org/2000/svg"
                            role="img"
                            aria-hidden="true"
                        >
                            <defs>
                                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: 'var(--accent-primary)' }} />
                                    <stop offset="100%" style={{ stopColor: 'var(--accent-secondary)' }} />
                                </linearGradient>
                            </defs>
                            <circle cx="20" cy="20" r="20" fill="url(#logoGradient)" />
                            <text
                                x="19.5"
                                y="28.5"
                                textAnchor="middle"
                                fontFamily="'Lobster', cursive"
                                fontSize="23"
                                fill="#ffffff"
                            >
                                JH
                            </text>
                        </svg>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="nav-links desktop-nav">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                                aria-current={location.pathname === link.path ? 'page' : undefined}
                            >
                                {link.label}
                                {location.pathname === link.path && (
                                    <motion.div
                                        className="nav-link-underline"
                                        layoutId="underline"
                                        transition={{ duration: 0.3 }}
                                    />
                                )}
                            </Link>
                        ))}
                    </div>

                    <div className="nav-controls">
                        <button
                            className="icon-btn"
                            onClick={onInfoClick}
                            aria-label="Settings & Info"
                            title="Settings & Info"
                        >
                            <i className="fas fa-cog"></i>
                        </button>
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? '✕' : '☰'}
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Nav Drawer & Backdrop */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop - Click to close */}
                        <motion.div
                            className="mobile-nav-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setMobileMenuOpen(false)}
                        />

                        {/* Side Drawer */}
                        <motion.div
                            className="mobile-nav-drawer"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        >
                            <div className="drawer-header">
                                <span className="drawer-title">Menu</span>
                                <button
                                    className="drawer-close-btn"
                                    onClick={() => setMobileMenuOpen(false)}
                                    aria-label="Close menu"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mobile-nav-links">
                                {navLinks.map((link, index) => (
                                    <motion.div
                                        key={link.path}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 + 0.2 }}
                                    >
                                        <Link
                                            to={link.path}
                                            className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {link.label}
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
