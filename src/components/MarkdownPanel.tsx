import { useEffect, useMemo, useRef, useState } from 'react';
import { parseMarkdown, type MarkdownMeta } from '../lib/markdown';
import { highlightCodeBlocks } from '../lib/publish';
import { sanitizeHtml } from '../lib/sanitize';
import { parseEmbedUrl, EMBED_HELP } from '../lib/embeds';
import { CALLOUT_TYPES } from '../lib/calloutExtension';
import { ATTACHMENT_ACCEPT, validateAttachment } from '../lib/attachments';
import * as md from '../lib/markdownEditing';
import type { EditState } from '../lib/markdownEditing';
import './MarkdownPanel.css';

const MAX_MD_BYTES = 1024 * 1024;
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl+';
const FENCE_LANGUAGES = ['javascript', 'typescript', 'python', 'bash', 'json', 'html', 'css', 'java', 'csharp', 'yaml', 'sql', 'markdown', 'diff'];

type View = 'write' | 'split' | 'preview';

interface MarkdownPanelProps {
    /** Persistence key for the in-progress Markdown, so a refresh doesn't lose it. */
    draftKey: string;
    /** True when the rich editor already has content, so Replace needs confirming. */
    hasContent: boolean;
    /** Replaces the whole post body; meta (title/tags/excerpt from front matter or a leading # heading) is offered to fill empty fields. */
    onReplace: (html: string, meta: MarkdownMeta) => void;
    onInsert: (html: string) => void;
    /** Stages an image as a pending upload and returns the temporary URL to reference in the Markdown. */
    stageImage: (file: File) => string;
    /** Same for non-image files; returns an error message instead when the file isn't allowed. */
    stageAttachment: (file: File) => { url: string } | { error: string };
}

function loadDraft(key: string): string {
    try {
        return sessionStorage.getItem(key) ?? '';
    } catch {
        return '';
    }
}

function Btn({ label, icon, onClick, text }: { label: string; icon?: string; onClick: () => void; text?: string }) {
    return (
        <button type="button" className="toolbar-btn" onClick={onClick} aria-label={label} title={label}>
            {icon ? <i className={`fas ${icon}`} aria-hidden="true"></i> : <span className="toolbar-btn-text">{text}</span>}
        </button>
    );
}

const MarkdownPanel = ({ draftKey, hasContent, onReplace, onInsert, stageImage, stageAttachment }: MarkdownPanelProps) => {
    const [source, setSource] = useState(() => loadDraft(draftKey));
    const [view, setView] = useState<View>('write');
    const [confirmReplace, setConfirmReplace] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showEmbed, setShowEmbed] = useState(false);
    const [embedUrl, setEmbedUrl] = useState('');
    const [dragging, setDragging] = useState(false);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const mdFileRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLInputElement>(null);
    const attachRef = useRef<HTMLInputElement>(null);

    const parsed = useMemo(() => parseMarkdown(source), [source]);
    // Highlighting is a preview/publish-time bake-in, so it's applied only for display - the HTML handed to the editor stays plain.
    const previewHtml = useMemo(() => sanitizeHtml(highlightCodeBlocks(parsed.html), { allowBlob: true }), [parsed.html]);
    const empty = !source.trim();

    const stats = useMemo(() => {
        const words = source.trim() ? source.trim().split(/\s+/).length : 0;
        return { words, chars: source.length, lines: source ? source.split('\n').length : 0, minutes: Math.max(1, Math.round(words / 200)) };
    }, [source]);

    useEffect(() => {
        try {
            if (source) sessionStorage.setItem(draftKey, source);
            else sessionStorage.removeItem(draftKey);
        } catch {
            // Storage unavailable - drafts just won't survive a refresh.
        }
    }, [source, draftKey]);

    const readState = (): EditState => {
        const ta = taRef.current!;
        return { value: ta.value, start: ta.selectionStart, end: ta.selectionEnd };
    };

    /** Applies an edit as a minimal replace through execCommand so the browser's native undo/redo stack keeps working; falls back to a plain state write. */
    const apply = (next: EditState) => {
        const ta = taRef.current;
        if (!ta) return;
        const old = ta.value;
        const max = Math.min(old.length, next.value.length);
        let p = 0;
        while (p < max && old[p] === next.value[p]) p++;
        let s = 0;
        while (s < max - p && old[old.length - 1 - s] === next.value[next.value.length - 1 - s]) s++;
        const text = next.value.slice(p, next.value.length - s);

        ta.focus();
        ta.setSelectionRange(p, old.length - s);
        let ok = false;
        try {
            ok = text === '' ? document.execCommand('delete') : document.execCommand('insertText', false, text);
        } catch {
            ok = false;
        }
        if (!ok || ta.value !== next.value) {
            setSource(next.value);
        }
        setConfirmReplace(false);
        requestAnimationFrame(() => ta.setSelectionRange(next.start, next.end));
    };

    const run = (fn: (s: EditState) => EditState) => () => apply(fn(readState()));

    const insertText = (text: string) => {
        const s = readState();
        const pos = s.start + text.length;
        apply({ value: s.value.slice(0, s.start) + text + s.value.slice(s.end), start: pos, end: pos });
    };

    const handleFiles = (files: File[]) => {
        const chunks: string[] = [];
        let problem: string | null = null;
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                chunks.push(`![${file.name.replace(/\.[^.]+$/, '')}](${stageImage(file)})`);
            } else {
                const bad = validateAttachment(file);
                const staged = bad ? { error: bad } : stageAttachment(file);
                if ('error' in staged) problem = staged.error;
                else chunks.push(`[${file.name}](${staged.url})`);
            }
        }
        setError(problem);
        if (chunks.length) insertText(chunks.join('\n\n'));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && !e.shiftKey && !e.altKey) {
            const shortcut: Record<string, (s: EditState) => EditState> = {
                b: (s) => md.wrap(s, '**', '**', 'bold'),
                i: (s) => md.wrap(s, '*', '*', 'italic'),
                e: (s) => md.wrap(s, '`', '`', 'code'),
                k: md.link,
            };
            const fn = shortcut[e.key.toLowerCase()];
            if (fn) {
                e.preventDefault();
                apply(fn(readState()));
            }
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey && !mod && !e.altKey && !e.nativeEvent.isComposing) {
            const next = md.continueList(readState());
            if (next) {
                e.preventDefault();
                apply(next);
            }
        } else if (e.key === 'Tab' && !mod && !e.altKey) {
            const next = md.indent(readState(), e.shiftKey);
            e.preventDefault();
            if (next) apply(next);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (e.clipboardData.files.length) {
            e.preventDefault();
            handleFiles(Array.from(e.clipboardData.files));
            return;
        }
        // Pasting a URL over selected text makes it a link, like GitHub.
        const text = e.clipboardData.getData('text/plain').trim();
        const s = readState();
        if (s.start !== s.end && /^https?:\/\/\S+$/.test(text) && !s.value.slice(s.start, s.end).includes('\n')) {
            e.preventDefault();
            const label = s.value.slice(s.start, s.end);
            const out = `[${label}](${text})`;
            const pos = s.start + out.length;
            apply({ value: s.value.slice(0, s.start) + out + s.value.slice(s.end), start: pos, end: pos });
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        setDragging(false);
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        handleFiles(Array.from(e.dataTransfer.files));
    };

    const syncScroll = () => {
        const ta = taRef.current;
        const pv = previewRef.current;
        if (view !== 'split' || !ta || !pv) return;
        const ratio = ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight);
        pv.scrollTop = ratio * (pv.scrollHeight - pv.clientHeight);
    };

    const openMarkdownFile = (file: File) => {
        if (!/\.(md|markdown|txt)$/i.test(file.name)) {
            setError('Choose a .md, .markdown or .txt file.');
            return;
        }
        if (file.size > MAX_MD_BYTES) {
            setError('That file is over 1 MB.');
            return;
        }
        setError(null);
        const reader = new FileReader();
        reader.onload = () => setSource(String(reader.result ?? ''));
        reader.onerror = () => setError('Could not read that file.');
        reader.readAsText(file);
    };

    const downloadMarkdown = () => {
        const url = URL.createObjectURL(new Blob([source], { type: 'text/markdown' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${parsed.meta.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'post'}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const applyEmbed = () => {
        const info = parseEmbedUrl(embedUrl);
        if (!info) {
            setError(`Unsupported link. ${EMBED_HELP}`);
            return;
        }
        setError(null);
        // A bare provider URL on its own line is what the importer turns into an embed.
        apply(md.insertBlock(readState(), embedUrl.trim()));
        setEmbedUrl('');
        setShowEmbed(false);
    };

    const handleReplace = () => {
        if (hasContent && !confirmReplace) {
            setConfirmReplace(true);
            return;
        }
        setConfirmReplace(false);
        onReplace(parsed.htmlWithoutTitle, parsed.meta);
    };

    const detected = [
        parsed.meta.title && `title "${parsed.meta.title}"`,
        parsed.meta.excerpt && 'excerpt',
        parsed.meta.tags?.length && `${parsed.meta.tags.length} tag${parsed.meta.tags.length === 1 ? '' : 's'}`,
    ].filter(Boolean);

    return (
        <div className="md-panel">
            <div className="md-panel-bar">
                <div className="md-tabs" role="tablist">
                    {(['write', 'split', 'preview'] as View[]).map((v) => (
                        <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
                            {v[0].toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="md-bar-actions">
                    <button type="button" className="md-link-btn" onClick={() => mdFileRef.current?.click()}>
                        <i className="fas fa-file-import" aria-hidden="true"></i> Open .md
                    </button>
                    <button type="button" className="md-link-btn" onClick={downloadMarkdown} disabled={empty}>
                        <i className="fas fa-download" aria-hidden="true"></i> Download .md
                    </button>
                </div>
                <input ref={mdFileRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) openMarkdownFile(f); e.target.value = ''; }} />
            </div>

            {view !== 'preview' && (
                <div className="md-toolbar" role="toolbar" aria-label="Markdown formatting">
                    <Btn label={`Bold (${MOD}B)`} icon="fa-bold" onClick={run((s) => md.wrap(s, '**', '**', 'bold'))} />
                    <Btn label={`Italic (${MOD}I)`} icon="fa-italic" onClick={run((s) => md.wrap(s, '*', '*', 'italic'))} />
                    <Btn label="Strikethrough" icon="fa-strikethrough" onClick={run((s) => md.wrap(s, '~~', '~~', 'text'))} />
                    <span className="toolbar-divider" />
                    <Btn label="Heading 2" text="H2" onClick={run((s) => md.heading(s, 2))} />
                    <Btn label="Heading 3" text="H3" onClick={run((s) => md.heading(s, 3))} />
                    <Btn label="Heading 4" text="H4" onClick={run((s) => md.heading(s, 4))} />
                    <span className="toolbar-divider" />
                    <Btn label={`Inline code (${MOD}E)`} icon="fa-code" onClick={run((s) => md.wrap(s, '`', '`', 'code'))} />
                    <select className="md-select" aria-label="Insert code block" value="" onChange={(e) => { apply(md.codeBlock(readState(), e.target.value === '-' ? '' : e.target.value)); }}>
                        <option value="" disabled>{'</> Code block'}</option>
                        <option value="-">Plain text</option>
                        {FENCE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <span className="toolbar-divider" />
                    <Btn label={`Link (${MOD}K)`} icon="fa-link" onClick={run(md.link)} />
                    <Btn label="Image (or paste / drop one)" icon="fa-image" onClick={() => imageRef.current?.click()} />
                    <Btn label="Attach file" icon="fa-paperclip" onClick={() => attachRef.current?.click()} />
                    <Btn label="Embed video or demo" icon="fa-circle-play" onClick={() => { setError(null); setShowEmbed((v) => !v); }} />
                    <span className="toolbar-divider" />
                    <Btn label="Quote" icon="fa-quote-right" onClick={run(md.quote)} />
                    <Btn label="Bulleted list" icon="fa-list-ul" onClick={run(md.bulletList)} />
                    <Btn label="Numbered list" icon="fa-list-ol" onClick={run(md.numberedList)} />
                    <Btn label="Task list" icon="fa-list-check" onClick={run(md.taskList)} />
                    <Btn label="Table" icon="fa-table" onClick={run((s) => md.insertBlock(s, md.TABLE_TEMPLATE, [2, 10]))} />
                    <Btn label="Horizontal rule" icon="fa-minus" onClick={run((s) => md.insertBlock(s, '---'))} />
                    <select className="md-select" aria-label="Insert callout" value="" onChange={(e) => apply(md.callout(readState(), e.target.value))}>
                        <option value="" disabled>Callout</option>
                        {CALLOUT_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                    </select>
                    <input ref={imageRef} type="file" accept="image/*" multiple hidden
                        onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
                    <input ref={attachRef} type="file" accept={ATTACHMENT_ACCEPT} hidden
                        onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
                </div>
            )}

            {showEmbed && view !== 'preview' && (
                <div className="md-embed-row">
                    <input type="url" placeholder="YouTube, Vimeo, CodeSandbox… URL" value={embedUrl} autoFocus
                        onChange={(e) => { setEmbedUrl(e.target.value); setError(null); }}
                        onKeyDown={(e) => e.key === 'Enter' && applyEmbed()} />
                    <button type="button" className="md-btn" onClick={applyEmbed}>Embed</button>
                </div>
            )}

            {/* data-lenis-prevent on both scrollers: the page-level Lenis smooth-scroll would otherwise swallow wheel events over them. */}
            <div className={`md-body view-${view}`}>
                {view !== 'preview' && (
                    <textarea
                        ref={taRef}
                        className={`md-textarea ${dragging ? 'dragging' : ''}`}
                        data-lenis-prevent
                        value={source}
                        onChange={(e) => { setSource(e.target.value); setConfirmReplace(false); }}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onDrop={handleDrop}
                        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
                        onDragLeave={() => setDragging(false)}
                        onScroll={syncScroll}
                        placeholder={'Paste or write GitHub-flavored Markdown here…\n\nTip: paste or drop images and files, start a list and press Enter, or put a YouTube link on its own line to embed it.'}
                        spellCheck={false}
                    />
                )}
                {view !== 'write' && (
                    <div ref={previewRef} className="md-preview post-body" data-lenis-prevent>
                        {empty
                            ? <p className="md-empty">Nothing to preview yet.</p>
                            : <div dangerouslySetInnerHTML={{ __html: previewHtml }} />}
                    </div>
                )}
            </div>

            {error && <p className="editor-attach-error md-error" role="alert">{error}</p>}

            <div className="md-statusbar">
                <span>{stats.words} words · {stats.chars} chars · {stats.lines} lines · ~{stats.minutes} min read</span>
                {detected.length > 0 && <span className="md-detected">Detected {detected.join(', ')} - fills empty fields on Replace</span>}
            </div>

            <div className="md-panel-actions">
                <p className="md-hint">Tables, task lists, callouts (<code>&gt; [!NOTE]</code>), code blocks and provider links are converted. Remote images aren't (use paste/drop instead).</p>
                <button type="button" className="md-btn" onClick={() => onInsert(parsed.html)} disabled={empty}>Insert at cursor</button>
                <button type="button" className={`md-btn primary ${confirmReplace ? 'warn' : ''}`} onClick={handleReplace} disabled={empty}>
                    {confirmReplace ? 'Click again to replace everything' : 'Replace post content'}
                </button>
            </div>
        </div>
    );
};

export default MarkdownPanel;
