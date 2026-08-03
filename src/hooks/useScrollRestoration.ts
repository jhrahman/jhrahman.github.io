import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { safeGetItem, safeSetItem } from '../lib/storage';

const STORAGE_PREFIX = 'scrollPos:';

/**
 * Restores scroll position on back/forward navigation instead of always
 * landing at the top. Positions are keyed by history entry (location.key)
 * and persisted to sessionStorage so they survive a refresh, matching how
 * native browser scroll restoration behaves - but we take manual control
 * of it so it can be timed to the route-change fade transition in App.tsx
 * instead of firing before the new page has even mounted.
 */
export function useScrollRestoration() {
    const location = useLocation();
    const navigationType = useNavigationType();

    // Refs (not state) so the values are current inside restoreScroll without
    // re-subscribing effects or causing extra renders - it only needs to read
    // "what's true right now" at the moment the exit animation finishes.
    const locationKeyRef = useRef(location.key);
    const navigationTypeRef = useRef(navigationType);
    // True once any restoreScroll call has happened - guards against
    // restoring on the very first page the app boots on, where a stray
    // sessionStorage entry (e.g. left over from an earlier hard reload that
    // happened to land on the same default history key) would otherwise get
    // applied even though there's no real "back" to return from yet.
    const hasNavigatedRef = useRef(false);
    locationKeyRef.current = location.key;
    navigationTypeRef.current = navigationType;

    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    useEffect(() => {
        let frame = 0;
        const handleScroll = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                safeSetItem(STORAGE_PREFIX + locationKeyRef.current, String(window.scrollY), sessionStorage);
            });
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(frame);
        };
    }, []);

    const restoreScroll = () => {
        const canRestore = hasNavigatedRef.current && navigationTypeRef.current === 'POP';
        hasNavigatedRef.current = true;

        if (canRestore) {
            const stored = safeGetItem(STORAGE_PREFIX + locationKeyRef.current, sessionStorage);
            const y = stored ? parseInt(stored, 10) : 0;
            window.scrollTo({ top: Number.isFinite(y) ? y : 0, left: 0, behavior: 'instant' as ScrollBehavior });
        } else {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        }
    };

    return { restoreScroll };
}
