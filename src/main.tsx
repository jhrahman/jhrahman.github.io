import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

import '@fortawesome/fontawesome-free/css/all.min.css'
// Variable fonts instead of individual per-weight static files: each of
// these packs every weight (and, where used, italic) into one file split
// only by unicode-range subset, so a Latin-text page fetches ONE file per
// family instead of five - fewer requests, smaller total transfer, and
// weights interpolate smoothly instead of snapping between separately
// loaded static files. Same look as before, just how it's shipped.
import '@fontsource-variable/inter'
import '@fontsource-variable/inter/standard-italic.css'
import '@fontsource-variable/outfit'
import '@fontsource/lobster/400.css'
// Code blocks had no font-family set, so they fell back to the browser's
// default monospace (Courier New on Windows) - a serifed, low-x-height
// typewriter font that reads as sharp/harsh next to the rest of the site.
// JetBrains Mono is the modern-industry-standard coding font (built for
// this exact purpose): larger x-height, distinct look-alike characters
// (0/O, 1/l/I), and smooth, humanist curves instead of typewriter serifs.
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/jetbrains-mono/wght-italic.css'

import './index.css'
import './styles/prose.css'
import './styles/hljs-theme.css'

// Rewrite legacy hash-router links (e.g. /#/blog/13, shared before the
// BrowserRouter migration) to the real path before the router mounts, since
// a URL fragment never reaches the server and BrowserRouter never reads it.
if (window.location.pathname === '/' && window.location.hash.startsWith('#/')) {
    const legacyPath = window.location.hash.slice(1);
    window.history.replaceState(null, '', legacyPath + window.location.search);
}

// Opt out of the browser's own scroll restoration as early as possible -
// before React even mounts - so it never gets a chance to jump the page on
// its own ahead of useScrollRestoration's explicit, sessionStorage-backed
// restore (previously this was set inside a useEffect, which only runs
// after the first paint - late enough for the native and manual restores to
// occasionally race and land a few pixels apart on a refresh).
if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
