# Max / Websites & Telegram bots

A personal portfolio for Max. Dark surfaces, a live WebGL ribbon, kinetic typography, and custom project previews.

English is the default language. The EN / RU switch also translates project details, the bot demo, form labels, validation messages, and document metadata. The selected language is remembered on this device.

## Run locally

Requires Node.js. No dependency installation or build step is needed.

```sh
npm run dev
```

Open http://localhost:5173.

```sh
npm run check
```

## Files

- `max-portfolio/dist/index.html` — page structure and default English content.
- `max-portfolio/dist/content.js` — translations and concept descriptions.
- `max-portfolio/dist/app.js` — interactions, language, project dialogs, bot demo, brief generator.
- `max-portfolio/dist/scene.js` — parametric geometry, shaders, rendering, and fallback.
- `max-portfolio/dist/style.css` — theme, hero, dialogs, motion, responsive styles.
- `max-portfolio/dist/layout.css` — project and section layouts.
- `max-portfolio/dist/fonts/` — local fonts and their SIL Open Font Licenses.

## Contact and content

Telegram: https://t.me/cylaro

FORMA, FLOW, and MONO are self-initiated concepts, explicitly labelled on the page. They do not claim client results. The brief generator prepares a message for the visitor to copy and send on Telegram; no form data is stored or sent to a backend. The booking conversation is a browser demo and does not create real appointments.

## Motion

The header pause button stops animation. The site respects `prefers-reduced-motion`. The 3D renderer stops when offscreen or when the tab is hidden, caps resolution, and limits rendering to around 30 fps. A canvas fallback is used when WebGL is unavailable. Native dialog focus handling and keyboard navigation are preserved.

## Publish

GitHub Actions checks all JavaScript modules and deploys `max-portfolio/dist` to GitHub Pages on each push to `main`. Relative asset URLs support the repository subpath. The same directory can be served by any static host.
