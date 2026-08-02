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
    slug: string;
    theme: 'dark' | 'light';
}

const Comments = ({ slug, theme }: CommentsProps) => {
    // theme is in the dep array so the widget re-initializes on dark/light
    // toggle - CommentBox takes literal color strings, not CSS vars, so it
    // can't react to a `data-theme` attribute change on its own.
    useEffect(() => {
        const css = getComputedStyle(document.documentElement);
        const removeCommentBox = commentBox(COMMENTBOX_PROJECT_ID, {
            className: 'commentbox',
            defaultBoxId: `commentbox-${slug}`,
            // Keyed on the post's stable slug rather than the page location,
            // matching the giscus `term` this replaces, so a thread survives
            // any future change to the URL scheme.
            createBoxUrl: () => `${window.location.origin}/blog/${slug}`,
            sortOrder: 'newest',
            backgroundColor: css.getPropertyValue('--bg-secondary').trim() || null,
            textColor: css.getPropertyValue('--text-primary').trim() || null,
            subtextColor: css.getPropertyValue('--text-secondary').trim() || null,
        });
        return removeCommentBox;
    }, [slug, theme]);

    return (
        <section className="comments-section" aria-label="Comments">
            <h2 className="comments-heading">Discussion</h2>
            <div className="commentbox" />
        </section>
    );
};

export default Comments;
