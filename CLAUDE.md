# National Park Checker

- Published with GitHub Pages from the `main` branch; the page is `index.html`.
- `index.html` is a build output. Edit the source, then rebuild:
  - `src/app.jsx` — the React app (JSX)
  - `src/index.template.html` — the page shell (styles, boot/offline scripts)
  - `npm install && npm run build` regenerates `index.html` (React inlined, JSX precompiled) and stamps `sw.js` with a new cache version.
- Commit the rebuilt `index.html` and `sw.js` together with the source change and push to `main` (this overwrites the live `index.html`). Do not add a new HTML file with a different name.
- Offline support: `sw.js` (service worker), `manifest.json`, `icon.svg`, `icon-*.png` must stay next to `index.html`.
- Write every message to the user in Japanese, including progress updates during work (not just the final report).
