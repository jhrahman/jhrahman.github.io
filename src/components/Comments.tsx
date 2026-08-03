import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    fetchComments, createComment, updateComment, deleteComment,
    CommentsApiError,
} from '../lib/comments';
import CommentForm, { CommentFormValues } from './CommentForm';
import CommentItem, { LocalComment } from './CommentItem';
import './Comments.css';

interface CommentsProps {
    id: number;
}

const Comments = ({ id }: CommentsProps) => {
    const [comments, setComments] = useState<LocalComment[]>([]);
    const [ticket, setTicket] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    // Surfaces failures from optimistic actions (reply/edit/delete) that
    // have already closed their own form and can no longer show an inline
    // error themselves.
    const [actionError, setActionError] = useState<string | null>(null);
    const renderedAtRef = useRef(Date.now());

    const genTempId = () => `temp-${crypto.randomUUID()}`;

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const result = await fetchComments(id);
            setComments(result.comments.map((c) => ({ ...c, clientId: c.id })));
            setTicket(result.ticket);
            renderedAtRef.current = Date.now();
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Could not load comments.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    const { topLevel, repliesByParent } = useMemo(() => {
        const top: LocalComment[] = [];
        const byParent = new Map<string, LocalComment[]>();
        for (const c of comments) {
            if (c.parentId) {
                // A deleted reply can't have replies of its own (one level
                // of nesting only), so it has nothing left to preserve -
                // drop it outright rather than leaving a tombstone.
                if (c.deleted) continue;
                const list = byParent.get(c.parentId) ?? [];
                list.push(c);
                byParent.set(c.parentId, list);
            } else {
                top.push(c);
            }
        }
        // A deleted top-level comment only needs to stick around as a
        // tombstone while it still has live replies under it - otherwise
        // it would just accumulate as permanent clutter.
        const visibleTop = top.filter((c) => !c.deleted || (byParent.get(c.id)?.length ?? 0) > 0);
        visibleTop.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        for (const list of byParent.values()) {
            list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        return { topLevel: visibleTop, repliesByParent: byParent };
    }, [comments]);

    const submitWithTicketRetry = useCallback(
        async (parentId: string | null, values: CommentFormValues) => {
            if (!ticket) {
                await load();
                throw new CommentsApiError('missing_ticket', 'Please try again.');
            }
            try {
                return await createComment({
                    postId: id,
                    parentId,
                    name: values.name,
                    email: values.email,
                    anonymous: values.anonymous,
                    body: values.body,
                    ticket,
                    renderedAt: renderedAtRef.current,
                    website: values.website,
                    phone: values.phone,
                });
            } catch (err) {
                if (err instanceof CommentsApiError && (err.code === 'expired_ticket' || err.code === 'ticket_exhausted')) {
                    const fresh = await fetchComments(id);
                    setTicket(fresh.ticket);
                    renderedAtRef.current = Date.now();
                    return await createComment({
                        postId: id,
                        parentId,
                        name: values.name,
                        email: values.email,
                        anonymous: values.anonymous,
                        body: values.body,
                        ticket: fresh.ticket,
                        renderedAt: renderedAtRef.current,
                        website: values.website,
                        phone: values.phone,
                    });
                }
                throw err;
            }
        },
        [id, ticket, load]
    );

    // Every handler below applies its change to local state immediately and
    // resolves right away, so the calling form can clear/collapse without
    // waiting on the network - the real request (a Google Apps Script round
    // trip, typically several seconds) runs in the background. A failure
    // rolls the optimistic change back and surfaces `actionError`.

    const handleNewComment = async (values: CommentFormValues) => {
        setSubmitError(null);
        const tempId = genTempId();
        const optimistic: LocalComment = {
            id: tempId,
            clientId: tempId,
            postId: id,
            parentId: null,
            name: values.anonymous ? null : values.name || null,
            anonymous: values.anonymous,
            body: values.body,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            deleted: false,
        };
        setComments((prev) => [...prev, optimistic]);

        void submitWithTicketRetry(null, values)
            .then((created) => {
                setComments((prev) => prev.map((c) => (c.clientId === tempId ? { ...created, clientId: tempId } : c)));
            })
            .catch((err) => {
                setComments((prev) => prev.filter((c) => c.clientId !== tempId));
                setSubmitError(err instanceof Error ? err.message : 'Could not post your comment - please try again.');
            });
    };

    const handleReply = async (parentId: string, values: CommentFormValues) => {
        const tempId = genTempId();
        const optimistic: LocalComment = {
            id: tempId,
            clientId: tempId,
            postId: id,
            parentId,
            name: values.anonymous ? null : values.name || null,
            anonymous: values.anonymous,
            body: values.body,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            deleted: false,
        };
        setComments((prev) => [...prev, optimistic]);

        void submitWithTicketRetry(parentId, values)
            .then((created) => {
                setComments((prev) => prev.map((c) => (c.clientId === tempId ? { ...created, clientId: tempId } : c)));
            })
            .catch((err) => {
                setComments((prev) => prev.filter((c) => c.clientId !== tempId));
                setActionError(err instanceof Error ? err.message : 'Could not post your reply - please try again.');
            });
    };

    const handleUpdate = async (commentId: string, body: string) => {
        const previousBody = comments.find((c) => c.id === commentId)?.body;
        setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body } : c)));

        void updateComment(commentId, body)
            .then((result) => {
                setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body: result.body, updatedAt: result.updatedAt } : c)));
            })
            .catch((err) => {
                setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body: previousBody ?? c.body } : c)));
                setActionError(err instanceof Error ? err.message : 'Could not save your edit - please try again.');
            });
    };

    const handleDelete = async (commentId: string) => {
        const previous = comments.find((c) => c.id === commentId);
        setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, deleted: true, body: '', name: null } : c)));

        void deleteComment(commentId)
            .then(({ deletedReplyIds }) => {
                if (deletedReplyIds.length === 0) return;
                const idsToMark = new Set(deletedReplyIds);
                setComments((prev) => prev.map((c) => (idsToMark.has(c.id) ? { ...c, deleted: true, body: '', name: null } : c)));
            })
            .catch((err) => {
                if (previous) {
                    setComments((prev) => prev.map((c) => (c.id === commentId ? previous : c)));
                }
                setActionError(err instanceof Error ? err.message : 'Could not delete your comment - please try again.');
            });
    };

    return (
        <section className="comments-section" aria-label="Comments">
            <h2 className="comments-heading">Discussion{comments.length > 0 ? ` (${comments.filter((c) => !c.deleted).length})` : ''}</h2>

            <CommentForm
                variant="new"
                submitLabel="Post comment"
                busyLabel="Posting…"
                error={submitError}
                onSubmit={handleNewComment}
            />

            <AnimatePresence initial={false}>
                {actionError && (
                    <motion.div
                        key="action-error"
                        className="comments-status comments-status--error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <p>{actionError}</p>
                        <button type="button" className="comment-btn comment-btn-ghost" onClick={() => setActionError(null)}>
                            Dismiss
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
                {loading && (
                    <motion.p
                        key="loading"
                        className="comments-status"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        Loading comments…
                    </motion.p>
                )}

                {loadError && !loading && (
                    <motion.div
                        key="error"
                        className="comments-status comments-status--error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <p>{loadError}</p>
                        <button type="button" className="comment-btn comment-btn-ghost" onClick={() => void load()}>
                            Retry
                        </button>
                    </motion.div>
                )}

                {!loading && !loadError && topLevel.length === 0 && (
                    <motion.p
                        key="empty"
                        className="comments-status"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        Be the first to comment.
                    </motion.p>
                )}

                {!loading && !loadError && topLevel.length > 0 && (
                    <motion.ul
                        key="list"
                        className="comment-list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <AnimatePresence initial={false}>
                            {topLevel.map((comment) => (
                                <CommentItem
                                    key={comment.clientId}
                                    comment={comment}
                                    replies={repliesByParent.get(comment.id) ?? []}
                                    onReply={handleReply}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.ul>
                )}
            </AnimatePresence>
        </section>
    );
};

export default Comments;
