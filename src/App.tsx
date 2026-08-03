import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useState, useEffect, useLayoutEffect, lazy, Suspense, type ReactNode } from 'react';
import Navbar from './components/Navbar';
import InfoModal from './components/InfoModal';
import Home from './pages/Home';
import About from './pages/About';
import Activities from './pages/Activities';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import CategoryPage from './pages/CategoryPage';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './lib/auth';
import { safeGetItem, safeSetItem } from './lib/storage';
import { useScrollRestoration } from './hooks/useScrollRestoration';

const PostEditor = lazy(() => import('./pages/PostEditor'));
const CategoryManager = lazy(() => import('./pages/CategoryManager'));

// Gate runs before the lazy element renders, so the chunk import never fires
// unless this resolves true.
function RequireOwner({ children }: { children: ReactNode }) {
    const { isOwner } = useAuth();
    if (!isOwner) return <Navigate to="/blog" replace />;
    return <>{children}</>;
}

// Mounts fresh on every route change (it shares its parent's key), so its
// layout effect fires at the exact moment the new page's DOM lands - which,
// thanks to AnimatePresence's mode="wait", is only after the previous page
// has fully exited. That timing matters: restoring scroll any earlier (e.g.
// via onExitComplete) runs against a document that doesn't contain the new
// page's content yet, so the browser clamps any restored position taller
// than the still-empty page back to ~0.
function RouteScrollRestorer({ onMount, children }: { onMount: () => void; children: ReactNode }) {
    useLayoutEffect(() => {
        onMount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <>{children}</>;
}

export type AccentColor = 'ocean' | 'charcoal' | 'olive' | 'deep-orange' | 'emerald' | 'cerulean' | 'klein-blue' | 'petrol-navy' | 'denim';

const getInitialTheme = (): 'dark' | 'light' =>
    (safeGetItem('theme') as 'dark' | 'light') || 'dark';

const getInitialAccent = (): AccentColor =>
    (safeGetItem('accentColor') as AccentColor) || 'petrol-navy';

function AppContent() {
    const location = useLocation();
    const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
    const [accentColor, setAccentColor] = useState<AccentColor>(getInitialAccent);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const { restoreScroll } = useScrollRestoration();

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
            <main id="main-content">
                {/* mode="wait" holds the outgoing page mounted until its exit
                    animation finishes, then mounts the new page. RouteScrollRestorer
                    shares the Routes key, so its layout effect fires exactly
                    once the new page's DOM lands - before paint, so the jump
                    (or restore) is invisible - and only once that page's
                    content actually exists to scroll into. */}
                <AnimatePresence mode="wait">
                    {/* Suspense is scoped to each lazy route's element (not wrapped
                        around <Routes>) so it doesn't sit between AnimatePresence
                        and its keyed child - that would break the exit animation. */}
                    <RouteScrollRestorer key={location.pathname} onMount={restoreScroll}>
                        <Routes location={location} key={location.pathname}>
                            <Route path="/" element={<Home />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/activities" element={<Activities />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/blog" element={<Blog />} />
                            {/* Must precede /blog/:id so these segments aren't parsed as an id */}
                            <Route path="/blog/new" element={<RequireOwner><Suspense fallback={<div className="page-loading" aria-busy="true" />}><PostEditor /></Suspense></RequireOwner>} />
                            <Route path="/blog/edit/:id" element={<RequireOwner><Suspense fallback={<div className="page-loading" aria-busy="true" />}><PostEditor /></Suspense></RequireOwner>} />
                            <Route path="/blog/categories" element={<RequireOwner><Suspense fallback={<div className="page-loading" aria-busy="true" />}><CategoryManager /></Suspense></RequireOwner>} />
                            <Route path="/blog/category/:id" element={<CategoryPage />} />
                            <Route path="/blog/:id" element={<BlogPost />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </RouteScrollRestorer>
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
