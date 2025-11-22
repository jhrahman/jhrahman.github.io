import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import './InfoModal.css';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

const InfoModal = ({ isOpen, onClose, theme, toggleTheme }: InfoModalProps) => {
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
                        <button className="modal-close" onClick={onClose}>
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
