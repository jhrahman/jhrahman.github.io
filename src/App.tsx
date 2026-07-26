import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import InfoModal from './components/InfoModal';
import Home from './pages/Home';
import About from './pages/About';
import Activities from './pages/Activities';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

export type AccentColor = 'ocean' | 'charcoal' | 'olive' | 'deep-orange' | 'emerald';

const getInitialTheme = (): 'dark' | 'light' =>
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';

const getInitialAccent = (): AccentColor =>
    (localStorage.getItem('accentColor') as AccentColor) || 'ocean';

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
        localStorage.setItem('theme', newTheme);
    };

    const changeAccentColor = (color: AccentColor) => {
        setAccentColor(color);
        localStorage.setItem('accentColor', color);
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
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/activities" element={<Activities />} />
                        <Route path="/contact" element={<Contact />} />
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
                <AppContent />
            </Router>
        </MotionConfig>
    );
}

export default App;
