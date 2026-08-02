import { useEffect, useRef, useState } from 'react';
import './ScrollButtons.css';

const SHOW_TOP_THRESHOLD = 400; // px scrolled down before "back to top" becomes eligible
const HIDE_BOTTOM_THRESHOLD = 400; // px remaining before "go to bottom" stops being eligible
const IDLE_HIDE_DELAY = 1000; // ms of no scrolling before the buttons hide

/**
 * Floating one-click jump-to-top / jump-to-bottom buttons for long post
 * pages. Only ever shown while the visitor is actively scrolling - they
 * appear the moment scrolling starts and hide shortly after it stops,
 * rather than sitting on screen permanently once eligible. Hovering (or
 * keyboard-focusing) a button holds it visible so it never vanishes out
 * from under a pointer that's mid-click.
 */
const ScrollButtons = () => {
    const [showTop, setShowTop] = useState(false);
    const [showBottom, setShowBottom] = useState(false);
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hovering = useRef(false);

    const scheduleHide = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            if (!hovering.current) setVisible(false);
        }, IDLE_HIDE_DELAY);
    };

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
            scheduleHide();
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

    if (!visible || (!showTop && !showBottom)) return null;

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

    const onMouseEnter = () => {
        hovering.current = true;
        if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    const onMouseLeave = () => {
        hovering.current = false;
        scheduleHide();
    };

    return (
        <div
            className="scroll-buttons"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onMouseEnter}
            onBlur={onMouseLeave}
        >
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
