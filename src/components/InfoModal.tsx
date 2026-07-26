import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { AccentColor } from '../App';
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

const InfoModal = ({ isOpen, onClose, theme, toggleTheme, accentColor, onAccentChange }: InfoModalProps) => {
    const [currentTime, setCurrentTime] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [copyrightYear, setCopyrightYear] = useState('');

    useEffect(() => {
        setCopyrightYear(new Date().getFullYear().toString());

        const updateTime = () => {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const bdTime = new Date(utc + (3600000 * 6));

            const timeOptions: Intl.DateTimeFormatOptions = {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            };

            const dateOptions: Intl.DateTimeFormatOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };

            setCurrentTime(bdTime.toLocaleString('en-US', timeOptions));
            setCurrentDate(bdTime.toLocaleDateString('en-US', dateOptions));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
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
                        onClick={onClose}
                    />
                    <motion.div
                        className="modal-content glass-effect"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Settings and info"
                        initial={{ opacity: 0, scale: 0.95, x: 20, y: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 20, y: -20 }}
                        transition={{
                            type: 'spring',
                            damping: 20,
                            stiffness: 200,
                            duration: 0.3
                        }}
                    >
                        <button className="modal-close" onClick={onClose} aria-label="Close">
                            ✕
                        </button>

                        <h3 className="modal-title">
                            <i className="fas fa-sliders-h"></i> Settings & Info
                        </h3>

                        <div className="info-items">
                            <div className="info-item">
                                <span className="info-icon">
                                    <i className="fas fa-adjust"></i>
                                </span>
                                <div className="info-content-row">
                                    <div className="info-label">Appearance</div>
                                    <button
                                        className="theme-toggle-btn"
                                        onClick={toggleTheme}
                                    >
                                        {theme === 'light' ? (
                                            <>
                                                <i className="fas fa-moon"></i> Switch to Dark Mode
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-sun"></i> Switch to Light Mode
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="info-item">
                                <span className="info-icon">
                                    <i className="fas fa-palette"></i>
                                </span>
                                <div className="info-content-row">
                                    <div className="info-label">Accent Color</div>
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
                            </div>

                            <div className="info-item">
                                <span className="info-icon">
                                    <i className="fas fa-clock"></i>
                                </span>
                                <div>
                                    <div className="info-label">Local Time (UTC+6)</div>
                                    <div className="info-value">{currentTime}</div>
                                    <div className="info-date">{currentDate}</div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <p>© {copyrightYear} Jahidur Rahman</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default InfoModal;
