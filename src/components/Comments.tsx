import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    fetchComments, createComment, updateComment, deleteComment,
    CommentsApiError, Comment,
} from '../lib/comments';
import CommentForm, { CommentFormValues } from './CommentForm';
import CommentItem from './CommentItem';
import './Comments.css';

interface CommentsProps {
    id: number;
}

const Comments = ({ id }: CommentsProps) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [ticket, setTicket] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const renderedAtRef = useRef(Date.now());

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const result = await fetchComments(id);
            setComments(result.comments);
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
        const top: Comment[] = [];
        const byParent = new Map<string, Comment[]>();
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

    const handleNewComment = async (values: CommentFormValues) => {
        setSubmitting(true);
        setSubmitError(null);
        try {
            const created = await submitWithTicketRetry(null, values);
            setComments((prev) => [...prev, created]);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async (parentId: string, values: CommentFormValues) => {
        const created = await submitWithTicketRetry(parentId, values);
        setComments((prev) => [...prev, created]);
    };

    const handleUpdate = async (commentId: string, body: string) => {
        const result = await updateComment(commentId, body);
        setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, body: result.body, updatedAt: result.updatedAt } : c)));
    };

    const handleDelete = async (commentId: string) => {
        await deleteComment(commentId);
        setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, deleted: true, body: '', name: null } : c)));
    };

    return (
        <section className="comments-section" aria-label="Comments">
            <h2 className="comments-heading">Discussion{comments.length > 0 ? ` (${comments.filter((c) => !c.deleted).length})` : ''}</h2>

            <CommentForm
                variant="new"
                submitLabel="Post comment"
                busyLabel="Posting…"
                busy={submitting}
                error={submitError}
                onSubmit={handleNewComment}
            />

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
                                    key={comment.id}
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
