import { useEffect, useRef, useState, FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getStoredAuthor, rememberAuthor } from '../lib/comments';

const MAX_BODY_LEN = 5000;

export interface CommentFormValues {
    name: string;
    email: string;
    anonymous: boolean;
    body: string;
    // Honeypot fields - always empty from a real user, read by bots that
    // fill every field they can find.
    website: string;
    phone: string;
}

interface CommentFormProps {
    variant: 'new' | 'reply' | 'edit';
    initialBody?: string;
    submitLabel: string;
    busyLabel?: string;
    busy?: boolean;
    error?: string | null;
    onSubmit: (values: CommentFormValues) => Promise<void> | void;
    onCancel?: () => void;
}

const CommentForm = ({ variant, initialBody = '', submitLabel, busyLabel, busy, error, onSubmit, onCancel }: CommentFormProps) => {
    const stored = getStoredAuthor();
    const [name, setName] = useState(stored?.name ?? '');
    const [email, setEmail] = useState(stored?.email ?? '');
    const [anonymous, setAnonymous] = useState(false);
    const [body, setBody] = useState(initialBody);
    const [website, setWebsite] = useState('');
    const [phone, setPhone] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    const showIdentityFields = variant !== 'edit';

    useEffect(() => {
        if (variant === 'reply') bodyRef.current?.focus();
    }, [variant]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        const trimmedBody = body.trim();
        if (trimmedBody.length < 1 || trimmedBody.length > MAX_BODY_LEN) {
            setValidationError(`Comment must be between 1 and ${MAX_BODY_LEN} characters.`);
            return;
        }
        if (showIdentityFields) {
            if (!name.trim()) {
                setValidationError('Please enter your name.');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                setValidationError('Please enter a valid email address.');
                return;
            }
            rememberAuthor(name.trim(), email.trim());
        }

        await onSubmit({
            name: name.trim(),
            email: email.trim(),
            anonymous,
            body: trimmedBody,
            website,
            phone,
        });

        if (variant !== 'edit') {
            setBody('');
        }
    };

    const remaining = MAX_BODY_LEN - body.length;
    const shownError = validationError || error;

    return (
        <form className={`comment-form comment-form--${variant} ${busy ? 'comment-form--busy' : ''}`} onSubmit={handleSubmit}>
            {showIdentityFields && (
                <div className="comment-form-row">
                    <div className="comment-form-field">
                        <label htmlFor={`comment-name-${variant}`}>Name</label>
                        <input
                            id={`comment-name-${variant}`}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={60}
                            required
                            disabled={anonymous || busy}
                            placeholder="Alex Morgan"
                            autoComplete="name"
                        />
                    </div>
                    <div className="comment-form-field">
                        <label htmlFor={`comment-email-${variant}`}>Email</label>
                        <input
                            id={`comment-email-${variant}`}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={anonymous || busy}
                            placeholder="alex.morgan@mailbox.dev"
                            autoComplete="email"
                        />
                        <span className="comment-form-hint">Never shown publicly - only visible to the site owner.</span>
                    </div>
                </div>
            )}

            <div className="comment-form-field">
                {showIdentityFields && <label htmlFor={`comment-body-${variant}`}>Comment</label>}
                <textarea
                    id={`comment-body-${variant}`}
                    ref={bodyRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={MAX_BODY_LEN}
                    required
                    disabled={busy}
                    rows={variant === 'new' ? 4 : 3}
                    placeholder={variant === 'reply' ? 'Write a reply…' : 'Share your thoughts…'}
                />
                <span className="comment-form-counter" aria-live="polite">
                    {remaining <= 500 ? `${remaining} characters left` : ''}
                </span>
            </div>

            {showIdentityFields && (
                <label className="comment-form-anonymous">
                    <input
                        type="checkbox"
                        checked={anonymous}
                        onChange={(e) => setAnonymous(e.target.checked)}
                        disabled={busy}
                    />
                    Comment anonymously
                </label>
            )}

            {/* Honeypot fields - hidden from sighted users and from assistive
                tech alike, never part of tab order. A filled value means a
                bot, not a person. */}
            <div className="comment-form-honeypot" aria-hidden="true">
                <label htmlFor={`comment-website-${variant}`}>Website</label>
                <input
                    id={`comment-website-${variant}`}
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                />
                <label htmlFor={`comment-phone-${variant}`}>Phone</label>
                <input
                    id={`comment-phone-${variant}`}
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>

            <AnimatePresence initial={false} mode="wait">
                {shownError && (
                    <motion.p
                        key={shownError}
                        className="comment-form-error"
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                    >
                        {shownError}
                    </motion.p>
                )}
            </AnimatePresence>

            <div className="comment-form-actions">
                {onCancel && (
                    <motion.button
                        type="button"
                        className="comment-btn comment-btn-ghost"
                        onClick={onCancel}
                        disabled={busy}
                        whileHover={busy ? undefined : { scale: 1.02 }}
                        whileTap={busy ? undefined : { scale: 0.97 }}
                    >
                        Cancel
                    </motion.button>
                )}
                <motion.button
                    type="submit"
                    className="comment-btn comment-btn-primary"
                    disabled={busy}
                    whileHover={busy ? undefined : { scale: 1.02 }}
                    whileTap={busy ? undefined : { scale: 0.97 }}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={busy ? 'busy' : 'idle'}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                        >
                            {busy ? (busyLabel ?? 'Submitting…') : submitLabel}
                        </motion.span>
                    </AnimatePresence>
                </motion.button>
            </div>
        </form>
    );
};

export default CommentForm;
