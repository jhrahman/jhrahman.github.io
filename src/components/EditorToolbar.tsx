import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import './EditorToolbar.css';

const FONT_OPTIONS = [
    { label: 'Default', value: '' },
    { label: 'Inter', value: 'Inter Variable' },
    { label: 'Outfit', value: 'Outfit Variable' },
    { label: 'Lobster', value: 'Lobster' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Monospace', value: '"Courier New", monospace' },
];

const CODE_LANGUAGES = [
    'plaintext', 'javascript', 'typescript', 'python', 'bash', 'json',
    'html', 'css', 'java', 'csharp', 'yaml', 'sql', 'markdown',
];

const ACCENT_COLORS = [
    '#0e6684', '#3b82f6', '#0ea5e9', '#2547c9', '#4a6d99',
    '#64748b', '#7a8b3f', '#f4511e', '#10b981',
];

interface ToolbarProps {
    editor: Editor | null;
    onInsertImage: (file: File) => void;
}

function ToolbarButton({ active, disabled, onClick, label, icon, children }: {
    active?: boolean; disabled?: boolean; onClick: () => void; label: string; icon?: string; children?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            className={`toolbar-btn ${active ? 'active' : ''}`}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            title={label}
        >
            {icon ? <i className={`fas ${icon}`}></i> : children}
        </button>
    );
}

const EditorToolbar = ({ editor, onInsertImage }: ToolbarProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showTextColor, setShowTextColor] = useState(false);
    const [showHighlight, setShowHighlight] = useState(false);

    if (!editor) return null;

    const applyLink = () => {
        const url = linkUrl.trim();
        if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run();
        } else {
            editor.chain().focus().unsetLink().run();
        }
        setShowLinkInput(false);
        setLinkUrl('');
    };

    return (
        <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
            <select
                className="toolbar-select"
                aria-label="Text style"
                value={
                    editor.isActive('heading', { level: 1 }) ? 'h1' :
                        editor.isActive('heading', { level: 2 }) ? 'h2' :
                            editor.isActive('heading', { level: 3 }) ? 'h3' :
                                editor.isActive('heading', { level: 4 }) ? 'h4' : 'p'
                }
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'p') editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 | 4 }).run();
                }}
            >
                <option value="p">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
            </select>

            <select
                className="toolbar-select"
                aria-label="Font family"
                onChange={(e) => {
                    const v = e.target.value;
                    if (v) editor.chain().focus().setFontFamily(v).run();
                    else editor.chain().focus().unsetFontFamily().run();
                }}
            >
                {FONT_OPTIONS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
            </select>

            <div className="toolbar-divider" />

            <ToolbarButton label="Bold" icon="fa-bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
            <ToolbarButton label="Italic" icon="fa-italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
            <ToolbarButton label="Underline" icon="fa-underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
            <ToolbarButton label="Strikethrough" icon="fa-strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />

            <div className="toolbar-divider" />

            <div className="toolbar-popover-wrap">
                <ToolbarButton label="Text color" icon="fa-font" onClick={() => { setShowTextColor((s) => !s); setShowHighlight(false); }} />
                {showTextColor && (
                    <div className="toolbar-popover swatch-popover">
                        {ACCENT_COLORS.map((c) => (
                            <button key={c} type="button" style={{ background: c }} onClick={() => { editor.chain().focus().setColor(c).run(); setShowTextColor(false); }} aria-label={`Set text color ${c}`} />
                        ))}
                        <button type="button" className="swatch-clear" onClick={() => { editor.chain().focus().unsetColor().run(); setShowTextColor(false); }}>Clear</button>
                    </div>
                )}
            </div>

            <div className="toolbar-popover-wrap">
                <ToolbarButton label="Highlight" icon="fa-highlighter" active={editor.isActive('highlight')} onClick={() => { setShowHighlight((s) => !s); setShowTextColor(false); }} />
                {showHighlight && (
                    <div className="toolbar-popover swatch-popover">
                        {ACCENT_COLORS.map((c) => (
                            <button key={c} type="button" style={{ background: c }} onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setShowHighlight(false); }} aria-label={`Highlight ${c}`} />
                        ))}
                        <button type="button" className="swatch-clear" onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }}>Clear</button>
                    </div>
                )}
            </div>

            <div className="toolbar-divider" />

            <ToolbarButton label="Align left" icon="fa-align-left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
            <ToolbarButton label="Align center" icon="fa-align-center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
            <ToolbarButton label="Align right" icon="fa-align-right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
            <ToolbarButton label="Justify" icon="fa-align-justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} />

            <div className="toolbar-divider" />

            <ToolbarButton label="Bullet list" icon="fa-list-ul" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
            <ToolbarButton label="Numbered list" icon="fa-list-ol" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
            <ToolbarButton label="Quote" icon="fa-quote-left" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
            <ToolbarButton label="Horizontal rule" icon="fa-minus" onClick={() => editor.chain().focus().setHorizontalRule().run()} />

            <div className="toolbar-divider" />

            <div className="toolbar-popover-wrap">
                <ToolbarButton label="Link" icon="fa-link" active={editor.isActive('link')} onClick={() => { setLinkUrl(editor.getAttributes('link').href ?? ''); setShowLinkInput((s) => !s); }} />
                {showLinkInput && (
                    <div className="toolbar-popover link-popover">
                        <input
                            type="url"
                            placeholder="https://…"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                            autoFocus
                        />
                        <button type="button" onClick={applyLink}>Apply</button>
                    </div>
                )}
            </div>

            <ToolbarButton label="Insert image" icon="fa-image" onClick={() => fileInputRef.current?.click()} />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onInsertImage(file);
                    e.target.value = '';
                }}
            />

            <ToolbarButton
                label="Insert table"
                icon="fa-table"
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            />

            {editor.isActive('table') && (
                <>
                    <ToolbarButton label="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                        <span className="toolbar-btn-text">+Col</span>
                    </ToolbarButton>
                    <ToolbarButton label="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
                        <span className="toolbar-btn-text">-Col</span>
                    </ToolbarButton>
                    <ToolbarButton label="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
                        <span className="toolbar-btn-text">+Row</span>
                    </ToolbarButton>
                    <ToolbarButton label="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
                        <span className="toolbar-btn-text">-Row</span>
                    </ToolbarButton>
                    <ToolbarButton label="Toggle header row" icon="fa-heading" onClick={() => editor.chain().focus().toggleHeaderRow().run()} />
                    <ToolbarButton label="Delete table" icon="fa-trash" onClick={() => editor.chain().focus().deleteTable().run()} />
                </>
            )}

            <div className="toolbar-popover-wrap">
                <ToolbarButton label="Code block" icon="fa-code" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
            </div>
            {editor.isActive('codeBlock') && (
                <select
                    className="toolbar-select"
                    aria-label="Code language"
                    value={editor.getAttributes('codeBlock').language ?? 'plaintext'}
                    onChange={(e) => editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run()}
                >
                    {CODE_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                </select>
            )}

            <div className="toolbar-divider" />

            <ToolbarButton label="Undo" icon="fa-undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
            <ToolbarButton label="Redo" icon="fa-redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
        </div>
    );
};

export default EditorToolbar;
