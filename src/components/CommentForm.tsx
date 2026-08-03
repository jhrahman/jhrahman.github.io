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
    const [expanded, setExpanded] = useState(variant !== 'new');
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const showIdentityFields = variant !== 'edit';

    useEffect(() => {
        if (variant === 'reply') bodyRef.current?.focus();
    }, [variant]);

    const expandForm = () => {
        if (!expanded) setExpanded(true);
    };

    useEffect(() => {
        if (variant !== 'new' || !expanded) return;

        const handlePointerDown = (e: MouseEvent) => {
            const section = formRef.current?.closest('.comments-section');
            const target = e.target as Node;
            // Clicking anywhere inside the discussion card (comment list,
            // headings, whitespace) shouldn't collapse the form - only a
            // click outside the whole section should. Collapsing never
            // loses anything typed - the textarea itself stays visible and
            // its value is untouched either way.
            if (section?.contains(target)) return;
            setExpanded(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [variant, expanded]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        const trimmedBody = body.trim();
        if (trimmedBody.length < 1 || trimmedBody.length > MAX_BODY_LEN) {
            setValidationError(`Comment must be between 1 and ${MAX_BODY_LEN} characters.`);
            return;
        }
        if (showIdentityFields && !anonymous) {
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
            name: anonymous ? '' : name.trim(),
            email: anonymous ? '' : email.trim(),
            anonymous,
            body: trimmedBody,
            website,
            phone,
        });

        if (variant !== 'edit') {
            setBody('');
        }
        if (variant === 'new') {
            setExpanded(false);
        }
    };

    const remaining = MAX_BODY_LEN - body.length;
    const shownError = validationError || error;

    return (
        <form
            ref={formRef}
            className={`comment-form comment-form--${variant} ${busy ? 'comment-form--busy' : ''} ${expanded ? 'comment-form--expanded' : 'comment-form--collapsed'}`}
            onSubmit={handleSubmit}
        >
            {showIdentityFields && (
                <div className={`comment-form-collapsible ${expanded ? 'is-expanded' : ''}`}>
                    <div className="comment-form-collapsible-inner">
                        <div className="comment-form-row">
                            <div className="comment-form-field">
                                <label htmlFor={`comment-name-${variant}`}>Name</label>
                                <input
                                    id={`comment-name-${variant}`}
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={60}
                                    required={!anonymous}
                                    disabled={anonymous || busy || !expanded}
                                    tabIndex={expanded ? undefined : -1}
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
                                    required={!anonymous}
                                    disabled={anonymous || busy || !expanded}
                                    tabIndex={expanded ? undefined : -1}
                                    placeholder="alex.morgan@mailbox.dev"
                                    autoComplete="email"
                                />
                                <span className="comment-form-hint">Never shown publicly - only visible to the site owner.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="comment-form-field">
                {showIdentityFields && expanded && <label htmlFor={`comment-body-${variant}`}>Comment</label>}
                <textarea
                    id={`comment-body-${variant}`}
                    ref={bodyRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onFocus={expandForm}
                    onClick={expandForm}
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
                <div className={`comment-form-collapsible ${expanded ? 'is-expanded' : ''}`}>
                    <div className="comment-form-collapsible-inner">
                        <label className="comment-form-anonymous">
                            <input
                                type="checkbox"
                                checked={anonymous}
                                onChange={(e) => setAnonymous(e.target.checked)}
                                disabled={busy || !expanded}
                                tabIndex={expanded ? undefined : -1}
                            />
                            Comment anonymously
                        </label>
                    </div>
                </div>
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
