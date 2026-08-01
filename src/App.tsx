import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react';
import Navbar from './components/Navbar';
import InfoModal from './components/InfoModal';
import Home from './pages/Home';
import About from './pages/About';
import Activities from './pages/Activities';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './lib/auth';
import { safeGetItem, safeSetItem } from './lib/storage';

const PostEditor = lazy(() => import('./pages/PostEditor'));

// Gate runs before the lazy element renders, so the chunk import never fires
// unless this resolves true.
function RequireOwner({ children }: { children: ReactNode }) {
    const { isOwner } = useAuth();
    if (!isOwner) return <Navigate to="/blog" replace />;
    return <>{children}</>;
}

export type AccentColor = 'ocean' | 'charcoal' | 'olive' | 'deep-orange' | 'emerald' | 'cerulean' | 'klein-blue' | 'petrol-navy' | 'denim';

const getInitialTheme = (): 'dark' | 'light' =>
    (safeGetItem('theme') as 'dark' | 'light') || 'dark';

const getInitialAccent = (): AccentColor =>
    (safeGetItem('accentColor') as AccentColor) || 'petrol-navy';

function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }, [pathname]);

    return null;
}

function AppContent() {
    const location = useLocation();
    const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
    const [accentColor, setAccentColor] = useState<AccentColor>(getInitialAccent);
    const [showInfoModal, setShowInfoModal] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-accent', accentColor);
    }, [accentColor]);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        safeSetItem('theme', newTheme);
    };

    const changeAccentColor = (color: AccentColor) => {
        setAccentColor(color);
        safeSetItem('accentColor', color);
    };

    return (
        <>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <Navbar
                onInfoClick={() => setShowInfoModal(true)}
            />
            <ScrollToTop />
            <main id="main-content">
                <AnimatePresence mode="wait">
                    {/* Suspense is scoped to each lazy route's element (not wrapped
                        around <Routes>) so it doesn't sit between AnimatePresence
                        and its keyed child - that would break the exit animation. */}
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/activities" element={<Activities />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/blog" element={<Blog />} />
                        {/* Must precede /blog/:id so "new" isn't parsed as an id */}
                        <Route path="/blog/new" element={<RequireOwner><Suspense fallback={<div className="page-loading" aria-busy="true" />}><PostEditor /></Suspense></RequireOwner>} />
                        <Route path="/blog/edit/:slug" element={<RequireOwner><Suspense fallback={<div className="page-loading" aria-busy="true" />}><PostEditor /></Suspense></RequireOwner>} />
                        <Route path="/blog/:id" element={<BlogPost />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </AnimatePresence>
            </main>
            <InfoModal
                isOpen={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                theme={theme}
                toggleTheme={toggleTheme}
                accentColor={accentColor}
                onAccentChange={changeAccentColor}
            />
        </>
    );
}

function App() {
    return (
        <MotionConfig reducedMotion="user">
            <Router>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </Router>
        </MotionConfig>
    );
}

export default App;
