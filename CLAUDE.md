# National Park Checker

- Published with GitHub Pages from the `main` branch; the page is `index.html`.
- `index.html` is a build output. Edit the source, then rebuild:
  - `src/main.jsx` — entry; `src/App.jsx` — main screen and state
  - `src/components/` — `Chrome.jsx` (bottom tab bar, progress hero), `ParkSheet.jsx` (park details + visits), `MenuSheet.jsx` (profiles, theme, language, backup), `AwardsView.jsx` (badges/quests + `StatsView`), `SVGMap.jsx`, `TimelineView.jsx`, `ShareCardModal.jsx`, `Sheet.jsx` (bottom-sheet wrapper), `Delight.jsx` (animations, confetti, help/onboarding)
  - `src/data/` — parks, themes, badges/quests; `src/i18n.js` — EN/JA strings (add both)
  - `src/storage.js` — localStorage, import/export; `src/utils.js` — helpers
  - `src/index.template.html` — the page shell (styles, boot/offline scripts)
  - `npm install && npm run lint && npm run build` checks the code, regenerates `index.html` (React inlined, JSX bundled with esbuild) and stamps `sw.js` with a new cache version.
- React is a global (inlined UMD); import hooks from `src/react.js`.
- Design mobile-first (iPhone width ~390px): touch targets ≥ 36–44px, inputs at 16px (avoids iOS zoom), respect `env(safe-area-inset-*)`, and use theme tokens (`T.*`) rather than hard-coded colors so all three themes work. Text on `T.btnBgActive` uses `T.accentText`; text on `T.chipBgActive` uses `T.chipTextActive`.
- Commit the rebuilt `index.html` and `sw.js` together with the source change and push to `main` (this overwrites the live `index.html`). Do not add a new HTML file with a different name.
- Offline support: `sw.js` (service worker), `manifest.json`, `icon.svg`, `icon-*.png` must stay next to `index.html`.
- Write every message to the user in Japanese, including progress updates during work (not just the final report).
