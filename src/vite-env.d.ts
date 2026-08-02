/// <reference types="vite/client" />

// commentbox.io ships no types (dist/commentBox.min.js only) - minimal
// ambient declaration for the surface this project actually uses.
declare module 'commentbox.io' {
    export interface CommentBoxOptions {
        className?: string;
        defaultBoxId?: string;
        createBoxUrl?: (boxId: string, pageLocation: string) => string;
        sortOrder?: 'best' | 'newest' | 'oldest';
        backgroundColor?: string | null;
        textColor?: string | null;
        subtextColor?: string | null;
        onCommentCount?: (count: number) => void;
    }

    export default function commentBox(
        projectId: string,
        options?: CommentBoxOptions
    ): () => void;
}
