import { useLayoutEffect, useEffect, useState } from 'react';
import './ReadingProgress.css';

/** Accent-colored bar pinned directly under the navbar, tracking scroll through the post body. */
const ReadingProgress = ({ targetRef }: { targetRef: React.RefObject<HTMLElement> }) => {
    const [progress, setProgress] = useState(0);
    const [navHeight, setNavHeight] = useState(80);

    // Measure the real navbar height instead of assuming a fixed value, so
    // the bar always sits flush against it (and stays correct if the navbar's
    // own size ever changes at a breakpoint) rather than drifting into the
    // page content below.
    useLayoutEffect(() => {
        const measure = () => {
            const nav = document.querySelector('.navbar');
            if (nav) setNavHeight(nav.getBoundingClientRect().height);
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    useEffect(() => {
        const onScroll = () => {
            const el = targetRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const total = rect.height - window.innerHeight;
            const scrolled = -rect.top;
            const pct = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0;
            setProgress(pct);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [targetRef]);

    return (
        <div className="reading-progress-track" style={{ top: `${navHeight}px` }} aria-hidden="true">
            <div className="reading-progress-fill" style={{ width: `${progress}%` }} />
        </div>
    );
};

export default ReadingProgress;
