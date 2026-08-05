/**
 * Attaches a custom, always-interactive horizontal scrollbar to a code
 * block. Native OS/browser scrollbar dragging turned out to be unreliable
 * for these blocks in practice (thin auto-hiding OS scrollbars, inconsistent
 * click-and-drag behavior) - this one is plain DOM + Pointer Events, so its
 * behavior is fully within our control and identical on every device: drag
 * the thumb, or click anywhere on the track to jump there, with mouse or
 * touch either way.
 *
 * @param scrollEl the element that actually scrolls horizontally (the
 *   syntax-highlighted `code.hljs`, not the `<pre>` around it - see the
 *   comment in hljs-theme.css for why those are two different elements)
 * @param track a track element to render the thumb inside; hidden via
 *   `display: none` whenever there's nothing to scroll
 * @returns cleanup function that removes every listener and the thumb
 */
export function attachCustomScrollbar(scrollEl: HTMLElement, track: HTMLElement): () => void {
    const thumb = document.createElement('div');
    thumb.className = 'code-scrollbar-thumb';
    track.appendChild(thumb);

    let dragging = false;
    let dragStartClientX = 0;
    let dragStartScrollLeft = 0;

    function update() {
        const { scrollWidth, clientWidth, scrollLeft } = scrollEl;
        const canScroll = scrollWidth > clientWidth + 1;
        track.style.display = canScroll ? '' : 'none';
        if (!canScroll) return;

        const trackWidth = track.clientWidth;
        const thumbWidth = Math.max(32, (clientWidth / scrollWidth) * trackWidth);
        const maxThumbOffset = trackWidth - thumbWidth;
        const maxScrollLeft = scrollWidth - clientWidth;
        const thumbOffset = maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * maxThumbOffset : 0;

        thumb.style.width = `${thumbWidth}px`;
        thumb.style.transform = `translateX(${thumbOffset}px)`;
    }

    function onThumbPointerDown(e: PointerEvent) {
        e.preventDefault(); // don't let a drag start a text selection in the code
        dragging = true;
        dragStartClientX = e.clientX;
        dragStartScrollLeft = scrollEl.scrollLeft;
        thumb.setPointerCapture(e.pointerId);
        thumb.classList.add('is-dragging');
    }

    function onThumbPointerMove(e: PointerEvent) {
        if (!dragging) return;
        const { scrollWidth, clientWidth } = scrollEl;
        const trackWidth = track.clientWidth;
        const maxThumbOffset = trackWidth - thumb.offsetWidth;
        if (maxThumbOffset <= 0) return;
        const maxScrollLeft = scrollWidth - clientWidth;
        const deltaX = e.clientX - dragStartClientX;
        scrollEl.scrollLeft = dragStartScrollLeft + (deltaX / maxThumbOffset) * maxScrollLeft;
    }

    function onThumbPointerUp(e: PointerEvent) {
        if (!dragging) return;
        dragging = false;
        thumb.releasePointerCapture(e.pointerId);
        thumb.classList.remove('is-dragging');
    }

    // Clicking the track itself (not the thumb) jumps the thumb - and the
    // content - toward that point, the standard scrollbar-track behavior.
    function onTrackPointerDown(e: PointerEvent) {
        if (e.target === thumb) return;
        const rect = track.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const trackWidth = track.clientWidth;
        const thumbWidth = thumb.offsetWidth;
        const maxThumbOffset = trackWidth - thumbWidth;
        if (maxThumbOffset <= 0) return;
        const targetThumbOffset = Math.min(Math.max(clickX - thumbWidth / 2, 0), maxThumbOffset);
        const { scrollWidth, clientWidth } = scrollEl;
        const maxScrollLeft = scrollWidth - clientWidth;
        scrollEl.scrollLeft = (targetThumbOffset / maxThumbOffset) * maxScrollLeft;
    }

    thumb.addEventListener('pointerdown', onThumbPointerDown);
    // Bound on window, not the thumb, so the drag keeps tracking even if the
    // pointer strays off the thumb mid-drag (setPointerCapture routes the
    // events back to it regardless of where the pointer visually is).
    window.addEventListener('pointermove', onThumbPointerMove);
    window.addEventListener('pointerup', onThumbPointerUp);
    track.addEventListener('pointerdown', onTrackPointerDown);
    scrollEl.addEventListener('scroll', update, { passive: true });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scrollEl);
    resizeObserver.observe(track);

    update();

    return () => {
        thumb.removeEventListener('pointerdown', onThumbPointerDown);
        window.removeEventListener('pointermove', onThumbPointerMove);
        window.removeEventListener('pointerup', onThumbPointerUp);
        track.removeEventListener('pointerdown', onTrackPointerDown);
        scrollEl.removeEventListener('scroll', update);
        resizeObserver.disconnect();
        thumb.remove();
    };
}
