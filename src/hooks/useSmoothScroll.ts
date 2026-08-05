import { useCallback, useEffect, useState } from 'react';
import Lenis from 'lenis';

/**
 * Module-level handle to the live Lenis instance (there's only ever one,
 * mounted once at the app root). Exposed so other code that needs to
 * scroll the page programmatically - ScrollButtons, TableOfContents -
 * can hand the request to Lenis instead of calling the native
 * `window.scrollTo`/`scrollIntoView` with `behavior: 'smooth'`.
 *
 * That distinction matters: Lenis is *also* animating scroll position on
 * every frame. Asking the browser's native smooth-scroll to animate at the
 * same time starts two independent easing curves writing to scrollTop in
 * the same window, and the visible result is a jitter/fight between them
 * rather than one clean glide - the "shaky" feeling. Routing every
 * programmatic scroll through this one instance keeps a single animation
 * source of truth.
 */
let activeLenis: Lenis | null = null;

/** Smooth-scrolls to a target via the live Lenis instance; falls back to an
 *  instant native jump if Lenis isn't mounted (e.g. reduced-motion users,
 *  who opted out of animated scrolling entirely). */
export function smoothScrollTo(target: number | string | HTMLElement, options?: Parameters<Lenis['scrollTo']>[1]) {
    if (activeLenis) {
        activeLenis.scrollTo(target, options);
        return;
    }
    if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: 'auto' });
    } else {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        el?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
}

/**
 * Buttery inertia-based smooth scrolling for the whole document, mounted
 * once at the app root. The native `scroll-behavior: smooth` + trackpad/
 * wheel scrolling Chrome ships on Windows feels stepped and abrupt (the
 * itch that motivated the hand-rolled easeInOutCubic animation in
 * Home.tsx's "scroll to latest" link) - Lenis replaces the raw wheel/touch
 * delta with an eased, momentum-driven scroll on every input device, which
 * is what gives sites like sunnypatel.net their satisfying glide.
 *
 * Purely additive: it smooths the *input*, it doesn't hijack scroll
 * position, so existing `window.scrollTo` / `scrollIntoView` callers
 * (ScrollButtons, TableOfContents, useScrollRestoration) keep working
 * unchanged - Lenis observes and re-syncs to those the same way it does
 * native scrolling.
 */
export function useSmoothScroll() {
    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const lenis = new Lenis({
            // `lerp` (continuous interpolation toward the target every frame)
            // rather than a fixed `duration` tween - `duration`/`easing` are
            // for one-shot jumps (see smoothScrollTo below), but applying them
            // to *continuous* wheel input means every new wheel tick restarts
            // a whole eased animation from scratch, which reads as a series
            // of little tweens rather than one fluid glide. `lerp` blends
            // toward the target continuously, the same way trackpad/OS
            // momentum scrolling actually works - it's the mode sites like
            // sunnypatel.net are built on, and what was missing here.
            lerp: 0.1,
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.4,
            syncTouch: false,
            // NOT `allowNestedScroll: true` - it sounds like the fix for
            // nested scroll containers (the TOC panel), but it works by
            // running `getComputedStyle` over every DOM node under the
            // cursor's event path on *every single wheel event, everywhere
            // on the page*, to detect whether it happens to be scrollable.
            // Over a syntax-highlighted code block - one DOM node per
            // token, so a deep composedPath - that check is expensive
            // enough to cause a visible hitch each time the cursor crosses
            // one while scrolling. The TOC is the only nested scroller in
            // the app, so it's handled explicitly instead (marked
            // data-lenis-prevent + its own small Lenis instance below) -
            // no global per-wheel-event DOM walk needed.
        });
        activeLenis = lenis;

        let rafId: number;
        function raf(time: number) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
            activeLenis = null;
        };
    }, []);
}

/**
 * Gives one self-contained scrollable panel (currently just the blog post
 * Table of Contents) the same lerp-smoothed feel as the main page, via its
 * own independent Lenis instance scoped to that element.
 *
 * Returns a *callback ref* rather than accepting a `RefObject` - this
 * component's TOC panel doesn't exist on its first render (its `items`
 * prop starts empty and is filled in by a later effect once the post's
 * headings exist in the DOM), so a plain `useRef` + `useEffect(fn, [])`
 * would run its setup before the panel ever mounts, find `ref.current`
 * still null, and never retry (that was the actual bug: the panel's own
 * scroll silently never started). A callback ref fires exactly when the
 * DOM node attaches (or detaches), no matter which render that happens on,
 * so `node` below - and the effect that depends on it - update correctly
 * whenever the panel actually appears.
 *
 * The element passed in must also carry a `data-lenis-prevent` attribute -
 * that tells the *page-level* Lenis instance to ignore wheel events over
 * it entirely, so this instance is the only thing driving its scroll
 * (see the comment on `allowNestedScroll` above for why the page-level
 * instance doesn't try to detect nested scrollers itself).
 */
export function useNestedSmoothScroll<T extends HTMLElement>() {
    const [node, setNode] = useState<T | null>(null);
    const ref = useCallback((el: T | null) => setNode(el), []);

    useEffect(() => {
        if (!node) return;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const lenis = new Lenis({
            wrapper: node,
            content: (node.firstElementChild as HTMLElement) ?? node,
            lerp: 0.12,
            smoothWheel: true,
            wheelMultiplier: 1,
            syncTouch: false,
        });

        let rafId: number;
        function raf(time: number) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
        };
    }, [node]);

    return ref;
}
