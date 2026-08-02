import { useEffect, useState } from 'react';
import './ScrollButtons.css';

const SHOW_TOP_THRESHOLD = 400; // px scrolled down before "back to top" appears
const HIDE_BOTTOM_THRESHOLD = 400; // px remaining before "go to bottom" hides

/** Floating one-click jump-to-top / jump-to-bottom buttons for long post pages. */
const ScrollButtons = () => {
    const [showTop, setShowTop] = useState(false);
    const [showBottom, setShowBottom] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            const scrollY = window.scrollY;
            const distanceFromBottom = document.documentElement.scrollHeight - (scrollY + window.innerHeight);
            setShowTop(scrollY > SHOW_TOP_THRESHOLD);
            setShowBottom(distanceFromBottom > HIDE_BOTTOM_THRESHOLD);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    if (!showTop && !showBottom) return null;

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

    return (
        <div className="scroll-buttons">
            {showTop && (
                <button type="button" className="scroll-btn animate-fade-in" onClick={scrollToTop} aria-label="Scroll to top">
                    <i className="fas fa-arrow-up" aria-hidden="true"></i>
                </button>
            )}
            {showBottom && (
                <button type="button" className="scroll-btn animate-fade-in" onClick={scrollToBottom} aria-label="Scroll to bottom">
                    <i className="fas fa-arrow-down" aria-hidden="true"></i>
                </button>
            )}
        </div>
    );
};

export default ScrollButtons;
