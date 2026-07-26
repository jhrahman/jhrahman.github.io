# Jahidur Rahman — Portfolio

Personal portfolio site for Jahidur Rahman (QA & Test Automation / Technical Support). Built as a single-page app with React, TypeScript, and Vite.

**Live**: [jhrahman.github.io](https://jhrahman.github.io/)

## Pages

- **Home** — hero intro with capability pills, quick links to profile and projects, social links
- **About** — bio, categorized skills, career timeline (with responsibilities per role), education, certifications, and a touch-swipeable recommendations carousel
- **Activities** — 10 projects, including 4 test-automation repos with animated SVG workflow-diagram previews (CI/CD pipeline, API test flow, AI-generated tests, Page Object Model), plus Applywise and Peoplix
- **Contact** — EmailJS-powered contact form with a compact toast notification on send

## Design

- Dark theme uses a layered "elevation" surface system (à la Linear/Vercel) instead of a flat gray scale
- Light theme follows the macOS convention: white card "sheets" floating on a soft gray canvas, with real vibrancy-style blur on glass panels
- 9 accent color options (Petrol Navy is the default), all swappable live from the settings panel and persisted to `localStorage`
- Fully responsive, with care taken to avoid scroll jank on mobile (no `backdrop-filter` on repeated elements like skill chips)
- Respects `prefers-reduced-motion` throughout

## Stack

- React 18 + TypeScript + Vite
- React Router (`HashRouter`, for GitHub Pages compatibility)
- Framer Motion for page transitions and micro-interactions
- EmailJS for the contact form (no backend)

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build
```

## Deployment

Pushes to `master` trigger a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds the site and publishes it via GitHub Pages — no manual deploy step needed.
