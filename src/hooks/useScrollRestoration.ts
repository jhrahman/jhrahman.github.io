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
    // True once any restoreScroll call has happened. Used to require a POP
    // (back/forward) navigation before restoring on every call *except* the
    // very first - the first call also covers a hard refresh, which has no
    // "navigation type" of its own to check (react-router reports the same
    // location.key, e.g. "default", that the very first-ever visit would
    // also get). A stored entry only ever exists for that key if this exact
    // tab session already scrolled that page once - sessionStorage doesn't
    // survive into a new tab/window - so there's no real "stray entry" risk
    // in restoring it on that first call too.
    const hasNavigatedRef = useRef(false);
    // The key/value restoreScroll last applied, so the window 'load'
    // correction just below knows what to re-apply - and can bail out if
    // the user has already navigated elsewhere by the time it fires.
    const lastRestoredRef = useRef<{ key: string; y: number } | null>(null);
    locationKeyRef.current = location.key;
    navigationTypeRef.current = navigationType;

    // history.scrollRestoration is set to 'manual' in main.tsx, before React
    // mounts at all - see the comment there for why that timing matters.

    // A hard/cache-bypassing refresh (Ctrl+Shift+R) re-fetches every asset -
    // images especially - instead of resolving most of them from cache
    // near-instantly the way a normal refresh does. restoreScroll() below
    // still fires at the right moment relative to the *code-block* height
    // (see the useLayoutEffect ordering note in BlogPost.tsx), but images
    // embedded in the post keep loading well after that, and each one
    // finishing pushes the content below it further down the page - so the
    // saved pixel offset can end up landing well past where it should by
    // the time everything's actually settled. `window`'s `load` event fires
    // once every resource (including images) has finished, so re-applying
    // the same restore at that point corrects for whatever drifted in
    // between - a no-op on a normal refresh, where everything's usually
    // already settled by the time `load` fires anyway.
    useEffect(() => {
        if (document.readyState === 'complete') return;
        const onLoad = () => {
            const applied = lastRestoredRef.current;
            if (!applied || applied.key !== locationKeyRef.current) return;
            window.scrollTo({ top: applied.y, left: 0, behavior: 'instant' as ScrollBehavior });
        };
        window.addEventListener('load', onLoad, { once: true });
        return () => window.removeEventListener('load', onLoad);
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
        const isFirstCall = !hasNavigatedRef.current;
        hasNavigatedRef.current = true;

        const stored = safeGetItem(STORAGE_PREFIX + locationKeyRef.current, sessionStorage);
        const canRestore = stored !== null && (isFirstCall || navigationTypeRef.current === 'POP');

        const y = canRestore ? (Number.isFinite(parseInt(stored!, 10)) ? parseInt(stored!, 10) : 0) : 0;
        window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior });
        lastRestoredRef.current = { key: locationKeyRef.current, y };
    };

    return { restoreScroll };
}
