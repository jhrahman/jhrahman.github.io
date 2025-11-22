import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import './Navbar.css';

interface NavbarProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    onInfoClick: () => void;
}

const Navbar = ({ theme, toggleTheme, onInfoClick }: NavbarProps) => {
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
                    <Link to="/" className="logo">
                        <img src="/favicon/favicon-32x32.png" alt="Logo" className="logo-image" />
                    </Link>

                    {/* Desktop Nav */}
                    <div className="nav-links desktop-nav">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
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
                            aria-label="Menu"
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
