import { useEffect, useRef, useState } from 'react';
import './Comments.css';

const GISCUS_REPO_ID = 'MDEwOlJlcG9zaXRvcnkzNzY5MDA2NTM=';
const GISCUS_CATEGORY_ID = 'DIC_kwDOFncMLc4DCc_i';

interface CommentsProps {
    slug: string;
    theme: 'dark' | 'light';
}

const Comments = ({ slug, theme }: CommentsProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        iframeRef.current?.contentWindow?.postMessage(
            { giscus: { setConfig: { theme: theme === 'dark' ? 'dark_dimmed' : 'light' } } },
            'https://giscus.app'
        );
    }, [theme]);

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://giscus.app') return;
            const height = event.data?.giscus?.resizeHeight;
            if (typeof height === 'number' && iframeRef.current) {
                iframeRef.current.style.height = `${height}px`;
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    const params = new URLSearchParams({
        origin: window.location.href,
        session: '',
        repo: 'jhrahman/jhrahman.github.io',
        repoId: GISCUS_REPO_ID,
        category: 'Discussions',
        categoryId: GISCUS_CATEGORY_ID,
        mapping: 'specific',
        term: slug,
        strict: '0',
        reactionsEnabled: '1',
        emitMetadata: '0',
        inputPosition: 'top',
        theme: theme === 'dark' ? 'dark_dimmed' : 'light',
        lang: 'en',
    });

    return (
        <section className="comments-section" aria-label="Comments">
            <h2 className="comments-heading">Discussion</h2>
            <iframe
                ref={iframeRef}
                title="Comments"
                className={`giscus-frame ${loaded ? 'is-loaded' : ''}`}
                src={`https://giscus.app/en/widget?${params.toString()}`}
                loading="lazy"
                scrolling="no"
                allow="clipboard-write"
                onLoad={() => setLoaded(true)}
            />
        </section>
    );
};

export default Comments;
