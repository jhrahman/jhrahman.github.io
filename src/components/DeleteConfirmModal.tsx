import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitHubApiError } from '../lib/github';
import './DeleteConfirmModal.css';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    /** What's being deleted, e.g. "post" or "category" - used in the copy. */
    kind: string;
    /** Name of the item, shown in the warning. */
    name: string;
    /** Performs the delete. Throw to surface an error in the modal. */
    onConfirm: (onProgress: (message: string) => void) => Promise<void>;
    /** Closes the modal without deleting (only reachable before/instead of deleting, or after a failure). */
    onClose: () => void;
    /** Called once the user dismisses the success state. */
    onDone: () => void;
}

type Phase = 'confirm' | 'working' | 'success' | 'error';

const DeleteConfirmModal = ({ isOpen, kind, name, onConfirm, onClose, onDone }: DeleteConfirmModalProps) => {
    const [phase, setPhase] = useState<Phase>('confirm');
    const [progress, setProgress] = useState('Deleting…');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPhase('confirm');
            setProgress('Deleting…');
            setError('');
        }
    }, [isOpen]);

    // Dismissing while the delete is running would hide the outcome, so it's blocked until it settles.
    const dismiss = () => {
        if (phase === 'working') return;
        if (phase === 'success') onDone();
        else onClose();
    };

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') dismiss();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    });

    const handleConfirm = async () => {
        setPhase('working');
        try {
            await onConfirm(setProgress);
            setPhase('success');
        } catch (err) {
            setError(
                err instanceof GitHubApiError
                    ? `GitHub rejected this: ${err.message}`
                    : err instanceof Error ? err.message : 'Something went wrong while deleting.'
            );
            setPhase('error');
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="delete-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}
                >
                    <motion.div
                        className="delete-modal glass-effect"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-modal-title"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                    >
                        {phase === 'confirm' && (
                            <>
                                <div className="delete-modal-icon danger"><i className="fas fa-triangle-exclamation" aria-hidden="true"></i></div>
                                <h3 id="delete-modal-title">Delete this {kind}?</h3>
                                <p>
                                    <strong>"{name}"</strong> will be permanently removed{kind === 'post' ? ', along with its images and attached files' : ''}. This can't be undone.
                                </p>
                                <div className="delete-modal-actions">
                                    <button type="button" className="delete-modal-btn" onClick={onClose} autoFocus>Cancel</button>
                                    <button type="button" className="delete-modal-btn danger" onClick={handleConfirm}>Yes, delete</button>
                                </div>
                            </>
                        )}

                        {phase === 'working' && (
                            <>
                                <div className="delete-modal-icon"><i className="fas fa-spinner fa-spin" aria-hidden="true"></i></div>
                                <h3 id="delete-modal-title">Deleting…</h3>
                                <p role="status">{progress}</p>
                            </>
                        )}

                        {phase === 'success' && (
                            <>
                                <div className="delete-modal-icon success"><i className="fas fa-circle-check" aria-hidden="true"></i></div>
                                <h3 id="delete-modal-title">Deletion started</h3>
                                <p role="status">
                                    The {kind} has been removed from the repository. The site is now redeploying, so it may take a minute or two before the change appears live.
                                </p>
                                <div className="delete-modal-actions">
                                    <button type="button" className="delete-modal-btn primary" onClick={onDone} autoFocus>Done</button>
                                </div>
                            </>
                        )}

                        {phase === 'error' && (
                            <>
                                <div className="delete-modal-icon danger"><i className="fas fa-circle-xmark" aria-hidden="true"></i></div>
                                <h3 id="delete-modal-title">Couldn't delete</h3>
                                <p role="alert">{error}</p>
                                <div className="delete-modal-actions">
                                    <button type="button" className="delete-modal-btn" onClick={onClose}>Close</button>
                                    <button type="button" className="delete-modal-btn danger" onClick={handleConfirm}>Try again</button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default DeleteConfirmModal;
