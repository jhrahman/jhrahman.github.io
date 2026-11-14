# Jahidur Rahman's Portfolio

This is the source code for my personal portfolio. I'm a Senior SQA Engineer, and my work covers manual testing, API testing, test automation with Playwright and TypeScript, and performance testing. I've worked in QA and technical support side by side, so I tend to test with production in mind. I care about how a system fails for real users, not just whether it passes in a test environment.

You can see the live site at [jhrahman.github.io](https://jhrahman.github.io/).

## What's on the site

- **Home:** a short introduction, the areas I work in, and links to my profile, projects and socials.
- **About:** my background, my skills grouped by area, a career timeline with the responsibilities for each role, my education and certifications, and recommendations from people I've worked with.
- **Activities:** the projects I've built. Some are test automation repositories, and each has an animated diagram showing how it works, such as a CI/CD pipeline, an API test flow, AI-generated tests and the Page Object Model. There are also a couple of full applications.
- **Blog:** posts about QA, testing and automation. You can browse by tag, search, and see the reading time. Posts have a table of contents, highlighted code and comments. I write them with a built-in editor.
- **Contact:** a form that sends a message straight to my inbox. There's no backend behind it.

## Design

The dark theme uses layered surfaces to give a sense of depth instead of one flat gray. The light theme uses white cards on a soft gray background. Visitors can pick from nine accent colors, and the choice is saved in the browser. The layout works well on phones, and I removed a few effects that made scrolling feel janky. Animations also respect the reduced motion setting.

## Tech stack

- React 18, TypeScript and Vite
- React Router, with a fallback so direct links work on GitHub Pages
- Framer Motion for transitions and small interactions
- TipTap for the post editor, DOMPurify for cleaning up content, and lowlight for code highlighting
- EmailJS for the contact form

## Running it locally

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
```

## Deployment

Pushing to `master` starts a GitHub Actions workflow (`.github/workflows/deploy.yml`). It builds the site and publishes it to GitHub Pages, so there's no manual deploy step.
