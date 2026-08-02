import { useEffect, useRef, useState } from 'react';
import './ScrollButtons.css';

const SHOW_TOP_THRESHOLD = 400; // px scrolled down before "back to top" becomes eligible
const HIDE_BOTTOM_THRESHOLD = 400; // px remaining before "go to bottom" stops being eligible
const IDLE_HIDE_DELAY = 2500; // ms of no scrolling before the buttons hide - long enough to move the cursor over and click after stopping

/**
 * Floating one-click jump-to-top / jump-to-bottom buttons for long post
 * pages. Visibility is driven purely by scroll activity - visible the
 * moment scrolling starts, hidden a few seconds after it stops, full
 * stop. (An earlier version also stayed visible while hovered/focused,
 * meant to protect an in-progress click; in practice it meant an idle
 * cursor merely resting near the button - very likely right after using
 * it - kept it stuck open indefinitely, which is worse than the problem
 * it was solving.) Faded with a CSS transition rather than mounted/
 * unmounted outright, so it reads as a deliberate fade, not a pop.
 */
const ScrollButtons = () => {
    const [showTop, setShowTop] = useState(false);
    const [showBottom, setShowBottom] = useState(false);
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const computeEligibility = () => {
            const scrollY = window.scrollY;
            const distanceFromBottom = document.documentElement.scrollHeight - (scrollY + window.innerHeight);
            setShowTop(scrollY > SHOW_TOP_THRESHOLD);
            setShowBottom(distanceFromBottom > HIDE_BOTTOM_THRESHOLD);
        };
        // A resize (or the initial mount) only updates *eligibility* - it
        // never reveals the buttons on its own, only an actual scroll does.
        const onScroll = () => {
            computeEligibility();
            setVisible(true);
            if (hideTimer.current) clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setVisible(false), IDLE_HIDE_DELAY);
        };
        computeEligibility();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', computeEligibility);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', computeEligibility);
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, []);

    if (!showTop && !showBottom) return null;

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

    return (
        <div className={`scroll-buttons ${visible ? 'is-visible' : ''}`}>
            {showTop && (
                <button
                    type="button"
                    className="scroll-btn"
                    onClick={scrollToTop}
                    aria-label="Scroll to top"
                    tabIndex={visible ? 0 : -1}
                >
                    <i className="fas fa-arrow-up" aria-hidden="true"></i>
                </button>
            )}
            {showBottom && (
                <button
                    type="button"
                    className="scroll-btn"
                    onClick={scrollToBottom}
                    aria-label="Scroll to bottom"
                    tabIndex={visible ? 0 : -1}
                >
                    <i className="fas fa-arrow-down" aria-hidden="true"></i>
                </button>
            )}
        </div>
    );
};

export default ScrollButtons;
