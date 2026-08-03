import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Comment } from '../lib/comments';
import { isOwnComment } from '../lib/comments';
import CommentForm, { CommentFormValues } from './CommentForm';

function relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const units: [number, string][] = [
        [60, 'second'], [60, 'minute'], [24, 'hour'], [30, 'day'], [12, 'month'], [Infinity, 'year'],
    ];
    let value = diffSec;
    let unit = 'second';
    for (const [size, name] of units) {
        if (value < size) { unit = name; break; }
        value = Math.floor(value / size);
        unit = name;
    }
    if (unit === 'second' && value < 10) return 'just now';
    return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

function initialFor(name: string | null): string {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase() || '?';
}

const itemMotion = {
    layout: true,
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
    transition: { duration: 0.28, ease: 'easeOut' as const },
};

const expandMotion = {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' as const },
    exit: { opacity: 0, height: 0 },
    transition: { duration: 0.22, ease: 'easeOut' as const },
};

interface CommentItemProps {
    comment: Comment;
    replies?: Comment[];
    isReply?: boolean;
    onReply: (parentId: string, values: CommentFormValues) => Promise<void>;
    onUpdate: (id: string, body: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const CommentItem = ({ comment, replies = [], isReply = false, onReply, onUpdate, onDelete }: CommentItemProps) => {
    const [replying, setReplying] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const mine = isOwnComment(comment.id) && !comment.deleted;

    const handleReplySubmit = async (values: CommentFormValues) => {
        setBusy(true);
        setFormError(null);
        try {
            await onReply(comment.id, values);
            setReplying(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setBusy(false);
        }
    };

    const handleEditSubmit = async (values: CommentFormValues) => {
        setBusy(true);
        setFormError(null);
        try {
            await onUpdate(comment.id, values.body);
            setEditing(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        setBusy(true);
        try {
            await onDelete(comment.id);
        } catch {
            setBusy(false);
            setConfirmingDelete(false);
        }
    };

    if (comment.deleted) {
        return (
            <motion.li className={`comment-item ${isReply ? 'comment-item--reply' : ''}`} {...itemMotion}>
                <p className="comment-tombstone">This comment was deleted.</p>
                {replies.length > 0 && (
                    <ul className="comment-replies">
                        <AnimatePresence initial={false}>
                            {replies.map((reply) => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    isReply
                                    onReply={onReply}
                                    onUpdate={onUpdate}
                                    onDelete={onDelete}
                                />
                            ))}
                        </AnimatePresence>
                    </ul>
                )}
            </motion.li>
        );
    }

    return (
        <motion.li className={`comment-item ${isReply ? 'comment-item--reply' : ''}`} {...itemMotion}>
            <div className="comment-avatar" aria-hidden="true">{initialFor(comment.name)}</div>
            <div className="comment-body-col">
                <div className="comment-meta">
                    <span className="comment-author">{comment.name ?? 'Anonymous'}</span>
                    <span className="comment-time">{relativeTime(comment.createdAt)}</span>
                    {comment.updatedAt && <span className="comment-edited">(edited)</span>}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                    {editing ? (
                        <motion.div
                            key="edit-form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <CommentForm
                                variant="edit"
                                initialBody={comment.body}
                                submitLabel="Save"
                                busyLabel="Saving…"
                                busy={busy}
                                error={formError}
                                onSubmit={handleEditSubmit}
                                onCancel={() => { setEditing(false); setFormError(null); }}
                            />
                        </motion.div>
                    ) : (
                        <motion.p
                            key="text"
                            className="comment-text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            {comment.body}
                        </motion.p>
                    )}
                </AnimatePresence>

                {!editing && (
                    <div className="comment-actions">
                        {!isReply && (
                            <button type="button" className="comment-action-btn" onClick={() => setReplying((v) => !v)}>
                                {replying ? 'Cancel' : 'Reply'}
                            </button>
                        )}
                        {mine && (
                            <>
                                <button type="button" className="comment-action-btn" onClick={() => setEditing(true)}>
                                    Edit
                                </button>
                                <AnimatePresence mode="wait" initial={false}>
                                    {confirmingDelete ? (
                                        <motion.span
                                            key="confirm"
                                            className="comment-confirm-delete"
                                            initial={{ opacity: 0, x: -4 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -4 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            Delete this comment?
                                            <button type="button" className="comment-action-btn comment-action-btn--danger" onClick={handleDelete} disabled={busy}>
                                                {busy ? 'Deleting…' : 'Yes, delete'}
                                            </button>
                                            <button type="button" className="comment-action-btn" onClick={() => setConfirmingDelete(false)} disabled={busy}>
                                                Cancel
                                            </button>
                                        </motion.span>
                                    ) : (
                                        <motion.button
                                            key="delete"
                                            type="button"
                                            className="comment-action-btn"
                                            onClick={() => setConfirmingDelete(true)}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            Delete
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {replying && (
                        <motion.div key="reply-form" style={{ overflow: 'hidden' }} {...expandMotion}>
                            <CommentForm
                                variant="reply"
                                submitLabel="Reply"
                                busyLabel="Replying…"
                                busy={busy}
                                error={formError}
                                onSubmit={handleReplySubmit}
                                onCancel={() => { setReplying(false); setFormError(null); }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {replies.length > 0 && (
                    <ul className="comment-replies">
                        <AnimatePresence initial={false}>
                            {replies.map((reply) => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    isReply
                                    onReply={onReply}
                                    onUpdate={onUpdate}
                                    onDelete={onDelete}
                                />
                            ))}
                        </AnimatePresence>
                    </ul>
                )}
            </div>
        </motion.li>
    );
};

export default CommentItem;
