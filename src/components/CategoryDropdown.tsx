import { useEffect, useRef, useState } from 'react';
import './CategoryDropdown.css';

export interface CategoryOption {
    id: string; // stringified Category.id - URL search params (the caller's source of truth) are always strings
    title: string;
    count: number;
}

interface CategoryDropdownProps {
    options: CategoryOption[];
    value: string | null;
    onChange: (id: string | null) => void;
}

/**
 * Custom listbox (not a native <select>) so each row can carry a part
 * count and pick up the site's glass/accent tokens the way the native
 * control can't. Full roving keyboard support per the WAI-ARIA listbox
 * pattern: trigger is a button, panel is role="listbox", rows are
 * role="option" - mirrors the accessibility approach already used for the
 * chip-based tag filter, just for a control that needs to stay closed
 * until opened.
 */
const CategoryDropdown = ({ options, value, onChange }: CategoryDropdownProps) => {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    const rows: (CategoryOption | null)[] = [null, ...options]; // null = "All categories"
    const selectedIndex = value ? options.findIndex((o) => o.id === value) + 1 : 0;
    const selected = value ? options.find((o) => o.id === value) : null;

    useEffect(() => {
        if (!open) return;
        setActiveIndex(selectedIndex === -1 ? 0 : selectedIndex);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [open, activeIndex]);

    const commit = (row: CategoryOption | null) => {
        onChange(row?.id ?? null);
        setOpen(false);
        triggerRef.current?.focus();
    };

    const onTriggerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
        }
    };

    const onListKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
                break;
            case 'Home':
                e.preventDefault();
                setActiveIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setActiveIndex(rows.length - 1);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                commit(rows[activeIndex]);
                break;
            case 'Escape':
                e.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
                break;
            case 'Tab':
                setOpen(false);
                break;
        }
    };

    return (
        <div className="category-dropdown" ref={rootRef}>
            <button
                type="button"
                ref={triggerRef}
                className={`category-dropdown-trigger ${value ? 'active' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={onTriggerKeyDown}
            >
                <i className="fas fa-layer-group" aria-hidden="true"></i>
                <span>{selected ? selected.title : 'All categories'}</span>
                <i className={`fas fa-chevron-down category-dropdown-caret ${open ? 'open' : ''}`} aria-hidden="true"></i>
            </button>

            {open && (
                <ul
                    className="category-dropdown-panel"
                    role="listbox"
                    aria-label="Filter by category"
                    tabIndex={-1}
                    onKeyDown={onListKeyDown}
                    // Focus lands here as soon as the panel mounts so arrow
                    // keys work immediately without an extra Tab press.
                    ref={(el) => {
                        listRef.current = el;
                        el?.focus();
                    }}
                >
                    {rows.map((row, i) => (
                        <li
                            key={row?.id ?? 'all'}
                            data-index={i}
                            role="option"
                            aria-selected={i === selectedIndex}
                            className={`category-dropdown-option ${i === activeIndex ? 'active' : ''} ${i === selectedIndex ? 'selected' : ''}`}
                            onMouseEnter={() => setActiveIndex(i)}
                            onClick={() => commit(row)}
                        >
                            <span>{row ? row.title : 'All categories'}</span>
                            {row && <span className="category-dropdown-count">{row.count}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CategoryDropdown;
