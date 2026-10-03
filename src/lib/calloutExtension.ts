import { Node, mergeAttributes } from '@tiptap/core';

export const CALLOUT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;
export type CalloutType = typeof CALLOUT_TYPES[number];

/** GitHub-style alert box (> [!NOTE] etc.). The label is drawn by CSS from the type, so the stored HTML is just a typed wrapper around normal blocks. */
export const Callout = Node.create({
    name: 'callout',
    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
        return {
            type: {
                default: 'note',
                parseHTML: (el) => {
                    const t = el.getAttribute('data-callout') ?? 'note';
                    return (CALLOUT_TYPES as readonly string[]).includes(t) ? t : 'note';
                },
                renderHTML: (attrs) => ({ 'data-callout': attrs.type }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-callout]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
        return ['div', mergeAttributes({ class: `callout callout-${node.attrs.type}` }, HTMLAttributes), 0];
    },
});
