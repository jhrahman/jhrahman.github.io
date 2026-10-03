import { Node } from '@tiptap/core';
import { embedIframeAttrs } from './embeds';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        embed: {
            setEmbed: (options: { src: string; title: string }) => ReturnType;
        };
    }
}

/** Block node for a sandboxed, lazy-loaded provider iframe inside a responsive wrapper. Only src/title are stored; everything else is fixed here so saved HTML can't smuggle in extra permissions. */
export const Embed = Node.create({
    name: 'embed',
    group: 'block',
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: { default: null },
            title: { default: 'Embedded content' },
        };
    },

    parseHTML() {
        return [{
            tag: 'div[data-embed]',
            getAttrs: (el) => {
                const iframe = (el as HTMLElement).querySelector('iframe');
                const src = iframe?.getAttribute('src');
                return src ? { src, title: iframe?.getAttribute('title') ?? 'Embedded content' } : false;
            },
        }];
    },

    renderHTML({ node }) {
        return [
            'div',
            { class: 'embed', 'data-embed': '' },
            ['iframe', embedIframeAttrs(node.attrs.src, node.attrs.title)],
        ];
    },

    addCommands() {
        return {
            setEmbed: (options) => ({ commands }) => commands.insertContent({ type: this.name, attrs: options }),
        };
    },
});
