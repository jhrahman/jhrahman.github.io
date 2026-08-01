import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { getPostById, getAdjacentPosts } from '../data/posts';
import { useAuth } from '../lib/auth';
import { deletePost } from '../lib/publish';
import { GitHubApiError } from '../lib/github';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import ReadingProgress from '../components/ReadingProgress';
import TableOfContents, { useToc } from '../components/TableOfContents';
import Comments from '../components/Comments';
import NotFound from './NotFound';
import './BlogPost.css';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getStoredTheme(): 'dark' | 'light' {
    return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
}

const BlogPost = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isOwner, getToken } = useAuth();
    const pageRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>(getStoredTheme);
    const [deleting, setDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState('Deleting…');
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const numericId = Number(id);
    const post = Number.isInteger(numericId) ? getPostById(numericId, isOwner) : undefined;

    // Track theme changes for the giscus iframe, which can't read CSS vars.
    useEffect(() => {
        const observer = new MutationObserver(() => setTheme(getStoredTheme()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const sanitizedHtml = useMemo(
        () => (post ? DOMPurify.sanitize(post.html, { ADD_ATTR: ['target', 'rel'] }) : ''),
        [post]
    );

    const toc = useToc(bodyRef, [sanitizedHtml]);

    // Click-to-zoom lightbox: delegate a single listener rather than binding
    // one per <img>, since the body's images come from sanitized HTML, not
    // React-rendered elements.
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') setLightboxSrc((target as HTMLImageElement).src);
        };
        el.addEventListener('click', onClick);
        return () => el.removeEventListener('click', onClick);
    }, [sanitizedHtml]);

    useEffect(() => {
        if (!lightboxSrc) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxSrc(null);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [lightboxSrc]);

    // Copy-to-clipboard buttons on code blocks, injected after the sanitized
    // HTML has rendered.
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const blocks = Array.from(el.querySelectorAll('pre'));
        const cleanups: (() => void)[] = [];

        blocks.forEach((pre) => {
            if (pre.querySelector('.code-copy-btn')) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'code-copy-btn';
            btn.setAttribute('aria-label', 'Copy code');
            btn.innerHTML = '<i class="fas fa-copy"></i>';
            const onClick = () => {
                const code = pre.querySelector('code')?.textContent ?? '';
                navigator.clipboard?.writeText(code).then(() => {
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500);
                });
            };
            btn.addEventListener('click', onClick);
            pre.appendChild(btn);
            cleanups.push(() => btn.removeEventListener('click', onClick));
        });

        return () => cleanups.forEach((fn) => fn());
    }, [sanitizedHtml]);

    useDocumentMeta(post?.title, post?.excerpt, post?.cover ?? undefined);

    if (!post) return <NotFound />;

    const { prev, next } = getAdjacentPosts(post.slug);

    const shareableUrl = `${window.location.origin}${import.meta.env.BASE_URL}blog/${post.id}`;

    const share = async () => {
        const url = shareableUrl;
        if (navigator.share) {
            try {
                await navigator.share({ title: post.title, text: post.excerpt, url });
            } catch {
                // User cancelled the native share sheet - nothing to do.
            }
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API unavailable - the user can still copy the URL manually.
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareableUrl);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch {
            // Clipboard API unavailable - the user can still copy the URL manually.
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) return;
        const token = getToken();
        if (!token) {
            setDeleteError('You are signed out. Sign in again from the settings panel.');
            return;
        }
        setDeleting(true);
        setDeleteError(null);
        try {
            await deletePost(token, post.slug, post.title, (message) => setDeleteMessage(message));
            navigate('/blog');
        } catch (err) {
            setDeleting(false);
            setDeleteError(
                err instanceof GitHubApiError
                    ? `GitHub rejected this: ${err.message}`
                    : err instanceof Error ? err.message : 'Something went wrong while deleting.'
            );
        }
    };

    return (
        <motion.div
            ref={pageRef}
            className="page blog-post-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <ReadingProgress targetRef={pageRef} />

            <div className="container">
                <Link to="/blog" className="back-to-blog">
                    <i className="fas fa-arrow-left"></i> Back to Blog
                </Link>

                <header className="post-header">
                    {post.draft && <span className="draft-badge post-header-draft">Draft</span>}
                    <h1 className="post-title gradient-text">{post.title}</h1>
                    <div className="post-header-meta">
                        <span>{formatDate(post.date)}</span>
                        {post.updated && <span>· Updated {formatDate(post.updated)}</span>}
                        <span>· {post.readingTime} min read</span>
                    </div>
                    {post.tags.length > 0 && (
                        <div className="post-card-tags">
                            {post.tags.map((tag) => (
                                <span key={tag} className="post-tag-pill">{tag}</span>
                            ))}
                        </div>
                    )}
                    {isOwner && (
                        <div className="post-owner-actions">
                            <button className="edit-post-btn" onClick={() => navigate(`/blog/edit/${post.slug}`)}>
                                <i className="fas fa-pen"></i> Edit post
                            </button>
                            <button className="delete-post-btn" onClick={handleDelete} disabled={deleting}>
                                <i className={`fas ${deleting ? 'fa-spinner fa-spin' : 'fa-trash'}`}></i>
                                {deleting ? deleteMessage : 'Delete post'}
                            </button>
                        </div>
                    )}
                    {deleteError && <p className="delete-post-error">{deleteError}</p>}
                </header>

                {post.cover && (
                    <div className="post-cover">
                        <img src={post.cover} alt="" />
                    </div>
                )}

                <TableOfContents items={toc} variant="mobile" />

                <div className={`post-layout ${toc.length === 0 ? 'no-toc' : ''}`}>
                    <div
                        ref={bodyRef}
                        className="post-body"
                        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                    />
                    <TableOfContents items={toc} variant="desktop" />
                </div>

                <div className="post-footer-actions">
                    <button className="share-btn" onClick={share}>
                        <i className={`fas ${copied ? 'fa-check' : 'fa-share-alt'}`}></i>
                        {copied ? 'Link copied' : 'Share'}
                    </button>
                    <button
                        className="copy-link-btn"
                        onClick={copyLink}
                        aria-label="Copy post link"
                        title="Copy post link"
                    >
                        <i className={`fas ${linkCopied ? 'fa-check' : 'fa-link'}`}></i>
                    </button>
                </div>

                {(prev || next) && (
                    <nav className="post-adjacent-nav" aria-label="More posts">
                        {prev ? (
                            <Link to={`/blog/${prev.id}`} className="post-adjacent-link prev">
                                <span className="post-adjacent-label"><i className="fas fa-arrow-left"></i> Previous</span>
                                <span className="post-adjacent-title">{prev.title}</span>
                            </Link>
                        ) : <span />}
                        {next && (
                            <Link to={`/blog/${next.id}`} className="post-adjacent-link next">
                                <span className="post-adjacent-label">Next <i className="fas fa-arrow-right"></i></span>
                                <span className="post-adjacent-title">{next.title}</span>
                            </Link>
                        )}
                    </nav>
                )}

                <Comments slug={post.slug} theme={theme} />
            </div>

            {lightboxSrc && (
                <motion.div
                    className="lightbox-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setLightboxSrc(null)}
                >
                    <button className="lightbox-close" onClick={() => setLightboxSrc(null)} aria-label="Close preview">✕</button>
                    <img src={lightboxSrc} alt="" className="lightbox-image" onClick={(e) => e.stopPropagation()} />
                </motion.div>
            )}
        </motion.div>
    );
};

export default BlogPost;
