import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import LinkExtension from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { useAuth } from '../lib/auth';
import { getPost, slugify, allTags, nextPostId } from '../data/posts';
import { publishPost, deletePost } from '../lib/publish';
import { GitHubApiError } from '../lib/github';
import EditorToolbar from '../components/EditorToolbar';
import './PostEditor.css';

const lowlight = createLowlight(common);
const AUTOSAVE_KEY_PREFIX = 'blog_editor_draft_';

interface DraftShape {
    title: string; excerpt: string; tags: string[]; featured: boolean; draft: boolean; html: string; slug: string;
}

type PublishState =
    | { phase: 'idle' }
    | { phase: 'working'; message: string }
    | { phase: 'success'; commitSha: string; id: number }
    | { phase: 'error'; message: string; fallback: DraftShape };

const PostEditor = () => {
    const { slug: routeSlug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { isOwner, getToken } = useAuth();
    const isEditing = Boolean(routeSlug);
    const existingPost = isEditing ? getPost(routeSlug!, true) : undefined;

    const autosaveKey = AUTOSAVE_KEY_PREFIX + (routeSlug ?? 'new');
    const pendingImages = useRef<Map<string, File>>(new Map());

    const [title, setTitle] = useState(existingPost?.title ?? '');
    const [slug, setSlug] = useState(existingPost?.slug ?? '');
    const [slugTouched, setSlugTouched] = useState(isEditing);
    const [excerpt, setExcerpt] = useState(existingPost?.excerpt ?? '');
    const [tags, setTags] = useState<string[]>(existingPost?.tags ?? []);
    const [tagInput, setTagInput] = useState('');
    const [featured, setFeatured] = useState(existingPost?.featured ?? false);
    const [draft, setDraft] = useState(existingPost?.draft ?? true);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(existingPost?.cover ?? null);
    const [publishState, setPublishState] = useState<PublishState>({ phase: 'idle' });
    const [restoredNotice, setRestoredNotice] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState('Deleting…');
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: false }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            FontFamily,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            LinkExtension.configure({ openOnClick: false, autolink: true }),
            Image,
            Placeholder.configure({ placeholder: 'Start writing…' }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlockLowlight.configure({ lowlight }),
        ],
        content: existingPost?.html ?? '',
        editorProps: { attributes: { class: 'editor-canvas' } },
    });

    useEffect(() => {
        if (!isOwner) navigate('/blog', { replace: true });
    }, [isOwner, navigate]);

    // Editing a slug that doesn't exist.
    useEffect(() => {
        if (isEditing && isOwner && !existingPost) navigate('/blog', { replace: true });
    }, [isEditing, isOwner, existingPost, navigate]);

    // Restore an autosaved draft once the editor is ready.
    useEffect(() => {
        if (!editor) return;
        try {
            const raw = sessionStorage.getItem(autosaveKey);
            if (!raw) return;
            const saved: DraftShape = JSON.parse(raw);
            if (!existingPost && (saved.title || saved.html)) {
                setTitle(saved.title);
                setSlug(saved.slug);
                setExcerpt(saved.excerpt);
                setTags(saved.tags);
                setFeatured(saved.featured);
                setDraft(saved.draft);
                editor.commands.setContent(saved.html);
                setRestoredNotice(true);
            }
        } catch {
            // Corrupt/unavailable autosave - just start fresh.
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

    // Autosave every few seconds so a refresh never loses work in progress.
    // Stops once a publish has succeeded - otherwise the next tick would
    // silently rewrite the just-cleared key with the same stale content.
    useEffect(() => {
        if (!editor) return;
        if (publishState.phase === 'success') return;
        const interval = setInterval(() => {
            const payload: DraftShape = { title, excerpt, tags, featured, draft, slug, html: editor.getHTML() };
            try {
                sessionStorage.setItem(autosaveKey, JSON.stringify(payload));
            } catch {
                // Autosave is best-effort - not fatal if storage is full/unavailable.
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [editor, title, excerpt, tags, featured, draft, slug, autosaveKey, publishState.phase]);

    useEffect(() => {
        if (!slugTouched) setSlug(slugify(title));
    }, [title, slugTouched]);

    const slugCollision = useMemo(() => {
        if (isEditing) return false;
        return Boolean(getPost(slug, true));
    }, [slug, isEditing]);

    const handleInsertImage = (file: File) => {
        if (!editor) return;
        const url = URL.createObjectURL(file);
        pendingImages.current.set(url, file);
        editor.chain().focus().setImage({ src: url }).run();
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const addTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) setTags([...tags, t]);
        setTagInput('');
    };

    const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

    const downloadFallback = (payload: DraftShape) => {
        const blob = new Blob([JSON.stringify(payload, null, 4)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${payload.slug || 'post'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePublish = async () => {
        if (!editor) return;
        const token = getToken();
        if (!token) {
            setPublishState({ phase: 'error', message: 'You are signed out. Sign in again from the settings panel.', fallback: { title, excerpt, tags, featured, draft, slug, html: editor.getHTML() } });
            return;
        }
        if (slugCollision) {
            setPublishState({ phase: 'error', message: `A post with the slug "${slug}" already exists. Choose a different URL slug.`, fallback: { title, excerpt, tags, featured, draft, slug, html: editor.getHTML() } });
            return;
        }

        setPublishState({ phase: 'working', message: 'Preparing…' });
        try {
            const result = await publishPost({
                token,
                id: existingPost?.id ?? nextPostId(),
                slug,
                title,
                excerpt,
                tags,
                featured,
                draft,
                rawHtml: editor.getHTML(),
                pendingImages: pendingImages.current,
                coverFile,
                existingCover: coverFile ? null : (existingPost?.cover ?? coverPreview),
                existingDate: existingPost?.date ?? null,
                onProgress: (message) => setPublishState({ phase: 'working', message }),
            });
            sessionStorage.removeItem(autosaveKey);
            setPublishState({ phase: 'success', commitSha: result.commitSha, id: result.post.id });
        } catch (err) {
            const message = err instanceof GitHubApiError
                ? `GitHub rejected this: ${err.message}`
                : err instanceof Error ? err.message : 'Something went wrong while publishing.';
            setPublishState({ phase: 'error', message, fallback: { title, excerpt, tags, featured, draft, slug, html: editor.getHTML() } });
        }
    };

    const handleDelete = async () => {
        if (!existingPost) return;
        if (!window.confirm(`Delete "${existingPost.title}"? This can't be undone.`)) return;
        const token = getToken();
        if (!token) {
            setDeleteError('You are signed out. Sign in again from the settings panel.');
            return;
        }
        setDeleting(true);
        setDeleteError(null);
        try {
            await deletePost(token, existingPost.slug, existingPost.title, (message) => setDeleteMessage(message));
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

    if (!isOwner) return null;

    return (
        <motion.div
            className="page post-editor-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container editor-container">
                <div className="editor-top-row">
                    <h1 className="page-title gradient-text editor-page-title">
                        {isEditing ? 'Edit Post' : 'New Post'}
                    </h1>
                    <Link to="/blog" className="editor-cancel-link">Cancel</Link>
                </div>

                {restoredNotice && (
                    <div className="editor-notice">
                        <i className="fas fa-history"></i> Restored your unsaved draft from this session.
                    </div>
                )}

                <div className="editor-layout">
                    <div className="editor-main">
                        <input
                            className="editor-title-input"
                            placeholder="Post title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <EditorToolbar editor={editor} onInsertImage={handleInsertImage} />
                        <EditorContent editor={editor} />
                    </div>

                    <aside className="editor-sidebar">
                        <details className="editor-panel" open>
                            <summary>Post settings</summary>

                            <label className="editor-field">
                                <span>Slug (file name, not shown in the URL)</span>
                                <input
                                    value={slug}
                                    onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                                    disabled={isEditing}
                                />
                                {slugCollision && <span className="editor-field-error">A post with this slug already exists.</span>}
                            </label>

                            <label className="editor-field">
                                <span>Excerpt</span>
                                <textarea
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    placeholder="Auto-generated if left blank"
                                    rows={3}
                                />
                            </label>

                            <label className="editor-field">
                                <span>Tags</span>
                                <div className="editor-tag-input-row">
                                    <input
                                        list="existing-tags"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                        placeholder="Add a tag…"
                                    />
                                    <button type="button" onClick={addTag}>Add</button>
                                </div>
                                <datalist id="existing-tags">
                                    {allTags.map((t) => <option key={t} value={t} />)}
                                </datalist>
                                <div className="editor-tag-list">
                                    {tags.map((t) => (
                                        <span key={t} className="post-tag-pill editor-tag-pill">
                                            {t}
                                            <button type="button" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>✕</button>
                                        </span>
                                    ))}
                                </div>
                            </label>

                            <label className="editor-field">
                                <span>Cover image</span>
                                <input type="file" accept="image/*" onChange={handleCoverChange} />
                                {coverPreview && <img src={coverPreview} alt="Cover preview" className="editor-cover-preview" />}
                            </label>

                            <label className="editor-checkbox-field">
                                <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                                <span>Featured (you can mark more than one)</span>
                            </label>

                            <label className="editor-checkbox-field">
                                <input type="checkbox" checked={draft} onChange={(e) => setDraft(e.target.checked)} />
                                <span>Save as draft</span>
                            </label>
                        </details>

                        <button
                            className="publish-btn"
                            onClick={handlePublish}
                            disabled={publishState.phase === 'working'}
                        >
                            {publishState.phase === 'working'
                                ? <><i className="fas fa-spinner fa-spin"></i> {publishState.message}</>
                                : <><i className="fas fa-paper-plane"></i> {draft ? 'Save draft' : (isEditing ? 'Update post' : 'Publish')}</>
                            }
                        </button>

                        {publishState.phase === 'success' && (
                            <div className="editor-result success">
                                <i className="fas fa-check-circle"></i>
                                <p>Committed! Live on the site in ~60–90s once the build finishes.</p>
                                <a href="https://github.com/jhrahman/jhrahman.github.io/actions" target="_blank" rel="noopener noreferrer">
                                    Watch the deploy →
                                </a>
                                <Link to={`/blog/${publishState.id}`}>View post →</Link>
                            </div>
                        )}

                        {publishState.phase === 'error' && (
                            <div className="editor-result error">
                                <i className="fas fa-triangle-exclamation"></i>
                                <p>{publishState.message}</p>
                                <button type="button" onClick={() => downloadFallback(publishState.fallback)}>
                                    <i className="fas fa-download"></i> Download draft as backup
                                </button>
                            </div>
                        )}

                        {isEditing && existingPost && (
                            <>
                                <button
                                    type="button"
                                    className="delete-btn"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                >
                                    {deleting
                                        ? <><i className="fas fa-spinner fa-spin"></i> {deleteMessage}</>
                                        : <><i className="fas fa-trash"></i> Delete post</>
                                    }
                                </button>
                                {deleteError && <p className="editor-field-error">{deleteError}</p>}
                            </>
                        )}
                    </aside>
                </div>
            </div>
        </motion.div>
    );
};

export default PostEditor;
