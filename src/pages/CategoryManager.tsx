import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { categories, categoryStats, getCategoryById, nextCategoryId } from '../data/categories';
import { slugify } from '../data/posts';
import { publishCategory } from '../lib/publishCategory';
import { deleteCategory } from '../lib/deleteCategory';
import { GitHubApiError, actionsUrl } from '../lib/github';
// Reuses the editor-field/editor-panel/publish-btn primitives already
// defined for the post editor, rather than duplicating that vocabulary -
// CategoryManager.css only adds what's specific to the category list/form.
import './PostEditor.css';
import './CategoryManager.css';

type SaveState =
    | { phase: 'idle' }
    | { phase: 'working' }
    | { phase: 'success'; commitSha: string; id: number }
    | { phase: 'error'; message: string };

const emptyForm = { slug: '', title: '', description: '', featured: false };

const CategoryManager = () => {
    const { isOwner, getToken } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const numericEditId = editId ? Number(editId) : null;
    const existing = numericEditId !== null ? getCategoryById(numericEditId) : undefined;

    const [slug, setSlug] = useState(existing?.slug ?? '');
    // Always starts un-touched, for new categories *and* edits alike, so the
    // slug auto-follows the title live in both cases - same as the post
    // editor. Typing directly into the Slug field flips this and takes over.
    const [slugTouched, setSlugTouched] = useState(false);
    const [title, setTitle] = useState(existing?.title ?? '');
    const [description, setDescription] = useState(existing?.description ?? '');
    const [featured, setFeatured] = useState(existing?.featured ?? false);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(existing?.cover ?? null);
    const [saveState, setSaveState] = useState<SaveState>({ phase: 'idle' });
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOwner) navigate('/blog', { replace: true });
    }, [isOwner, navigate]);

    // Re-sync the form whenever the ?edit= target changes (including
    // switching to "new" by clearing it).
    useEffect(() => {
        const cat = numericEditId !== null ? getCategoryById(numericEditId) : undefined;
        setSlug(cat?.slug ?? emptyForm.slug);
        setSlugTouched(false);
        setTitle(cat?.title ?? emptyForm.title);
        setDescription(cat?.description ?? emptyForm.description);
        setFeatured(cat?.featured ?? emptyForm.featured);
        setCoverFile(null);
        setCoverPreview(cat?.cover ?? null);
        setSaveState({ phase: 'idle' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numericEditId]);

    useEffect(() => {
        if (!slugTouched) setSlug(slugify(title));
    }, [title, slugTouched]);

    const isEditing = Boolean(existing);
    // A collision is any *other* category already sitting at this slug -
    // not the one being edited, which still occupies its own current slug
    // until the rename actually goes through.
    const slugCollision = (() => {
        const match = categories.find((c) => c.slug === slug);
        if (!match) return false;
        return match.id !== existing?.id;
    })();

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const startNew = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('edit');
        setSearchParams(next);
    };

    const startEdit = (targetId: number) => {
        const next = new URLSearchParams(searchParams);
        next.set('edit', String(targetId));
        setSearchParams(next);
    };

    const handleSave = async () => {
        const token = getToken();
        if (!token) {
            setSaveState({ phase: 'error', message: 'You are signed out. Sign in again from the settings panel.' });
            return;
        }
        if (slugCollision) {
            setSaveState({ phase: 'error', message: `A category with the slug "${slug}" already exists.` });
            return;
        }
        setSaveState({ phase: 'working' });
        try {
            const result = await publishCategory({
                token,
                id: existing?.id ?? nextCategoryId(),
                slug,
                previousSlug: existing?.slug ?? null,
                title,
                description,
                featured,
                coverFile,
                existingCover: coverFile ? null : (existing?.cover ?? coverPreview),
                existingDate: existing?.date ?? null,
            });
            setSaveState({ phase: 'success', commitSha: result.commitSha, id: result.category.id });
        } catch (err) {
            const message = err instanceof GitHubApiError
                ? `GitHub rejected this: ${err.message}`
                : err instanceof Error ? err.message : 'Something went wrong while saving.';
            setSaveState({ phase: 'error', message });
        }
    };

    const handleDelete = async (targetId: number, targetSlug: string, targetTitle: string) => {
        if (!window.confirm(`Delete "${targetTitle}"? This can't be undone.`)) return;
        const token = getToken();
        if (!token) {
            setDeleteError('You are signed out. Sign in again from the settings panel.');
            return;
        }
        setDeletingId(targetId);
        setDeleteError(null);
        try {
            await deleteCategory(token, targetId, targetSlug, targetTitle);
            if (numericEditId === targetId) startNew();
        } catch (err) {
            setDeleteError(
                err instanceof GitHubApiError
                    ? `GitHub rejected this: ${err.message}`
                    : err instanceof Error ? err.message : 'Something went wrong while deleting.'
            );
        } finally {
            setDeletingId(null);
        }
    };

    if (!isOwner) return null;

    return (
        <motion.div
            className="page category-manager-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container">
                <div className="editor-top-row">
                    <h1 className="page-title gradient-text editor-page-title">Manage Categories</h1>
                    <Link to="/blog" className="editor-cancel-link">Back to blog</Link>
                </div>

                {categories.length > 0 && (
                    <ul className="category-manager-list">
                        {categories.map((c) => {
                            const stats = categoryStats(c.id, true);
                            return (
                                <li key={c.id} className={`category-manager-row ${numericEditId === c.id ? 'active' : ''}`}>
                                    <div className="category-manager-row-info">
                                        <span className="category-manager-row-title">
                                            {c.title}
                                            {c.featured && <span className="post-part-badge">Featured</span>}
                                        </span>
                                        <span className="category-manager-row-meta">{stats.parts} part{stats.parts === 1 ? '' : 's'}</span>
                                    </div>
                                    <div className="category-manager-row-actions">
                                        <button type="button" onClick={() => startEdit(c.id)}>
                                            <i className="fas fa-pen"></i> Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="delete-btn-inline"
                                            onClick={() => handleDelete(c.id, c.slug, c.title)}
                                            disabled={deletingId === c.id}
                                        >
                                            <i className={`fas ${deletingId === c.id ? 'fa-spinner fa-spin' : 'fa-trash'}`}></i>
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {deleteError && <p className="editor-field-error">{deleteError}</p>}

                <div className="category-manager-form glass-effect">
                    <div className="category-manager-form-header">
                        <h2>{isEditing ? `Edit "${existing?.title}"` : 'New category'}</h2>
                        {isEditing && (
                            <button type="button" className="clear-all-filters" onClick={startNew}>+ New category instead</button>
                        )}
                    </div>

                    <label className="editor-field">
                        <span>Title</span>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Playwright with TypeScript" />
                    </label>

                    <label className="editor-field">
                        <span>Slug (URL segment, not shown in the title)</span>
                        <input
                            value={slug}
                            onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                        />
                        {slugCollision && <span className="editor-field-error">A category with this slug already exists.</span>}
                        {isEditing && slug !== existing?.slug && (
                            <span className="editor-field-hint">
                                Renaming from "{existing?.slug}" - the category's file and cover move automatically on save.
                            </span>
                        )}
                    </label>

                    <label className="editor-field">
                        <span>Description</span>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Shown on the series card and the category page" />
                    </label>

                    <label className="editor-field">
                        <span>Cover image</span>
                        <input type="file" accept="image/*" onChange={handleCoverChange} />
                        {coverPreview && <img src={coverPreview} alt="Cover preview" className="editor-cover-preview" />}
                        <span className="category-manager-hint">Falls back to Part 1's cover if left blank.</span>
                    </label>

                    <label className="editor-checkbox-field">
                        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                        <span>Featured (pins this series to the Blog list hero)</span>
                    </label>

                    <button className="publish-btn" onClick={handleSave} disabled={saveState.phase === 'working' || !title.trim() || !slug.trim()}>
                        {saveState.phase === 'working'
                            ? <><i className="fas fa-spinner fa-spin"></i> Saving…</>
                            : <><i className="fas fa-paper-plane"></i> {isEditing ? 'Update category' : 'Create category'}</>
                        }
                    </button>

                    {saveState.phase === 'success' && (
                        <div className="editor-result success">
                            <i className="fas fa-check-circle"></i>
                            <p>Committed! Live on the site in ~60–90s once the build finishes.</p>
                            <a href={actionsUrl} target="_blank" rel="noopener noreferrer">Watch the deploy →</a>
                            <Link to={`/blog/category/${saveState.id}`}>View category →</Link>
                        </div>
                    )}

                    {saveState.phase === 'error' && (
                        <div className="editor-result error">
                            <i className="fas fa-triangle-exclamation"></i>
                            <p>{saveState.message}</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default CategoryManager;
