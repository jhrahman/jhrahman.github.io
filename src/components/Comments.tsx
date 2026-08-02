import { useEffect } from 'react';
import commentBox from 'commentbox.io';
import './Comments.css';

// Public identifier, not a secret - the widget sends it from the browser on
// every load, so it's visible in the shipped bundle regardless of where the
// source keeps it. Access is restricted by the authorized-domain whitelist
// in the CommentBox.io dashboard (jhrahman.github.io + localhost), not by
// hiding this value.
const COMMENTBOX_PROJECT_ID = '5720489884385280-proj';

interface CommentsProps {
    id: number;
    theme: 'dark' | 'light';
}

const Comments = ({ id, theme }: CommentsProps) => {
    // theme is in the dep array so the widget re-initializes on dark/light
    // toggle - CommentBox takes literal color strings, not CSS vars, so it
    // can't react to a `data-theme` attribute change on its own.
    useEffect(() => {
        const css = getComputedStyle(document.documentElement);
        const removeCommentBox = commentBox(COMMENTBOX_PROJECT_ID, {
            className: 'commentbox',
            defaultBoxId: `commentbox-${id}`,
            // Keyed on the post's stable numeric id - the one thing about a
            // post that's guaranteed to never change - rather than its slug
            // or the page location, so a comment thread can never be
            // orphaned by a title/slug rename. This also happens to be the
            // real canonical post URL (/blog/:id), unlike slug ever was.
            createBoxUrl: () => `${window.location.origin}/blog/${id}`,
            sortOrder: 'newest',
            backgroundColor: css.getPropertyValue('--bg-secondary').trim() || null,
            textColor: css.getPropertyValue('--text-primary').trim() || null,
            subtextColor: css.getPropertyValue('--text-secondary').trim() || null,
        });
        return removeCommentBox;
    }, [id, theme]);

    return (
        <section className="comments-section" aria-label="Comments">
            <h2 className="comments-heading">Discussion</h2>
            <div className="commentbox" />
        </section>
    );
};

export default Comments;
