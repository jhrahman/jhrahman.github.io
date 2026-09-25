import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface TagSliderProps {
    label: string;
    children: ReactNode;
}

/** Horizontally scrollable chip row with prev/next arrows. Desktop mice can't
 * scroll sideways and overlay scrollbars hide themselves, so the arrows (shown
 * only while there's more to reveal on that side) are the desktop affordance.
 * Touch swiping and shift+wheel keep working natively. */
const TagSlider = ({ label, children }: TagSliderProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    const update = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        update();
        // Re-measure when the container resizes or tags are added/removed.
        // (Not keyed on `children`: that is a new object every render.)
        const ro = new ResizeObserver(update);
        ro.observe(el);
        const mo = new MutationObserver(update);
        mo.observe(el, { childList: true });
        return () => {
            ro.disconnect();
            mo.disconnect();
        };
    }, [update]);

    const scrollByPage = (dir: 1 | -1) => {
        const el = ref.current;
        if (!el) return;
        el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
    };

    return (
        <div onMouseEnter={update} className={['tag-slider', canLeft && 'can-left', canRight && 'can-right'].filter(Boolean).join(' ')}>
            <button
                type="button"
                className="tag-slider-arrow left"
                onClick={() => scrollByPage(-1)}
                aria-label="Scroll tags left"
                tabIndex={canLeft ? 0 : -1}
                aria-hidden={!canLeft}
            >
                <i className="fas fa-chevron-left" aria-hidden="true"></i>
            </button>
            <div className="blog-tags" role="group" aria-label={label} ref={ref} onScroll={update}>
                {children}
            </div>
            <button
                type="button"
                className="tag-slider-arrow right"
                onClick={() => scrollByPage(1)}
                aria-label="Scroll tags right"
                tabIndex={canRight ? 0 : -1}
                aria-hidden={!canRight}
            >
                <i className="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
        </div>
    );
};

export default TagSlider;
