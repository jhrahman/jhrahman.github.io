import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
    plugins: [react()],
    base: '/',
    resolve: {
        alias: {
            // commentbox.io's package.json "module" field points at
            // src/commentBox.js, which isn't actually included in the
            // published npm package (only dist/ is) - alias straight to
            // the real, shipped build so Vite's resolver doesn't 404 on it.
            'commentbox.io': fileURLToPath(new URL('./node_modules/commentbox.io/dist/commentBox.min.js', import.meta.url)),
        },
    },
})
