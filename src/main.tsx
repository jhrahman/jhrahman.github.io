import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

import '@fortawesome/fontawesome-free/css/all.min.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/lobster/400.css'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
