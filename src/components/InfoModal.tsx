import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AccentColor } from '../App';
import { useAuth } from '../lib/auth';
import './InfoModal.css';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    accentColor: AccentColor;
    onAccentChange: (color: AccentColor) => void;
}

const accentOptions: { value: AccentColor; label: string; swatch: string }[] = [
    { value: 'petrol-navy', label: 'Petrol Navy', swatch: '#0e6684' },
    { value: 'ocean', label: 'Ocean', swatch: '#3b82f6' },
    { value: 'cerulean', label: 'Cerulean', swatch: '#0ea5e9' },
    { value: 'klein-blue', label: 'Klein Blue', swatch: '#2547c9' },
    { value: 'denim', label: 'Denim', swatch: '#4a6d99' },
    { value: 'charcoal', label: 'Charcoal', swatch: '#64748b' },
    { value: 'olive', label: 'Olive', swatch: '#7a8b3f' },
    { value: 'deep-orange', label: 'Deep Orange', swatch: '#f4511e' },
    { value: 'emerald', label: 'Emerald', swatch: '#10b981' },
];

function PublishAccessRow({ onClose }: { onClose: () => void }) {
    const { user, isOwner, tokenExpiry, signIn, signOut } = useAuth();
    const [expanded, setExpanded] = useState(false);
    const [token, setToken] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const daysUntilExpiry = tokenExpiry
        ? Math.ceil((new Date(tokenExpiry).getTime() - Date.now()) / 86400000)
        : null;

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        const result = await signIn(token.trim());
        setSubmitting(false);
        setToken('');
        if (result.ok) {
            setExpanded(false);
        } else {
            setError(result.error);
        }
    };

    if (isOwner && user) {
        return (
            <div className="info-row publish-row signed-in">
                <div className="publish-identity">
                    <img src={user.avatarUrl} alt="" className="publish-avatar" />
                    <div className="publish-row-body">
                        <span className="publish-username">@{user.login}</span>
                        {daysUntilExpiry !== null && (
                            <span className={`token-expiry ${daysUntilExpiry <= 7 ? 'warn' : ''}`}>
                                Token expires in {daysUntilExpiry}d
                            </span>
                        )}
                    </div>
                </div>
                <div className="publish-actions">
                    <Link to="/blog/new" className="publish-link-btn" onClick={onClose}>
                        <i className="fas fa-plus" aria-hidden="true"></i> New post
                    </Link>
                    <button className="publish-signout-btn" onClick={signOut}>
                        <i className="fas fa-right-from-bracket" aria-hidden="true"></i> Sign out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="info-row publish-row">
            <button className="publish-toggle" onClick={() => setExpanded((s) => !s)} aria-expanded={expanded}>
                <i className="fas fa-lock" aria-hidden="true"></i>
                <span>Publish access</span>
                <i className={`fas fa-chevron-down publish-chevron ${expanded ? 'open' : ''}`} aria-hidden="true"></i>
            </button>
            {expanded && (
                <form className="publish-signin-form" onSubmit={handleSignIn}>
                    <input
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Fine-grained GitHub token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        disabled={submitting}
                    />
                    <button type="submit" disabled={submitting || !token.trim()}>
                        {submitting
                            ? <><i className="fas fa-spinner fa-spin"></i> Signing in…</>
                            : 'Sign in'
                        }
                    </button>
                    {error && <p className="publish-error">{error}</p>}
                </form>
            )}
        </div>
    );
}

const InfoModal = ({ isOpen, onClose, theme, toggleTheme, accentColor, onAccentChange }: InfoModalProps) => {
    const { isOwner, publishAccessRevealed } = useAuth();
    const [footerTime, setFooterTime] = useState('');
    const [fullDate, setFullDate] = useState('');
    const [copyrightYear, setCopyrightYear] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setCopyrightYear(new Date().getFullYear().toString());

        const update = () => {
            const now = new Date();
            setFooterTime(
                new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka',
                }).format(now)
            );
            setFullDate(
                new Intl.DateTimeFormat('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Dhaka',
                }).format(now)
            );
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handlePointerDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (modalRef.current?.contains(target)) return;
            if (target.closest('[data-info-trigger]')) return;
            onClose();
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />
                    <motion.div
                        ref={modalRef}
                        className="modal-content glass-effect"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Settings and info"
                        initial={{ opacity: 0, scale: 0.95, x: 20, y: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 20, y: -20 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 220, duration: 0.25 }}
                    >
                        <button className="modal-close" onClick={onClose} aria-label="Close">
                            ✕
                        </button>

                        <h3 className="modal-title">
                            <i className="fas fa-sliders-h"></i> Settings & Info
                        </h3>

                        <div className="info-row">
                            <span className="info-label">Appearance</span>
                            <div className="theme-segmented" role="radiogroup" aria-label="Appearance">
                                <button
                                    type="button"
                                    className={theme === 'light' ? 'active' : ''}
                                    onClick={() => theme !== 'light' && toggleTheme()}
                                    role="radio"
                                    aria-checked={theme === 'light'}
                                >
                                    <i className="fas fa-sun"></i> Light
                                </button>
                                <button
                                    type="button"
                                    className={theme === 'dark' ? 'active' : ''}
                                    onClick={() => theme !== 'dark' && toggleTheme()}
                                    role="radio"
                                    aria-checked={theme === 'dark'}
                                >
                                    <i className="fas fa-moon"></i> Dark
                                </button>
                            </div>
                        </div>

                        <div className="info-row">
                            <span className="info-label">Accent Color</span>
                            <div className="accent-swatch-row" role="radiogroup" aria-label="Accent color">
                                {accentOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`accent-swatch ${accentColor === option.value ? 'active' : ''}`}
                                        style={{ backgroundColor: option.swatch }}
                                        onClick={() => onAccentChange(option.value)}
                                        role="radio"
                                        aria-checked={accentColor === option.value}
                                        aria-label={option.label}
                                        title={option.label}
                                    >
                                        {accentColor === option.value && (
                                            <i className="fas fa-check" aria-hidden="true"></i>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(isOwner || publishAccessRevealed) && <PublishAccessRow onClose={onClose} />}

                        <div className="modal-footer" title={fullDate}>
                            <span>{footerTime} · Dhaka</span>
                            <span>© {copyrightYear} Jahidur Rahman</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default InfoModal;
