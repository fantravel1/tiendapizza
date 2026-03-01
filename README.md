# TiendaPizza

Mobile-first pizza management game in Spanish (`es-MX`) with two loops:
- Real-time pizza shift mode (move, cook, serve, upgrade stores).
- City expansion mini-game (build and upgrade restaurants across city lots).

Last updated: **March 1, 2026**

## Current Status

- Deploy-ready build is in `/deploy`.
- Main runtime is canvas-based (`deploy/game.js`).
- Recent visual upgrade added sprite-driven pizzas, characters, stations, storefronts, and scenery.
- City mini-game now renders as an actual city grid with roads, districts, traffic, pedestrians, and day/night lighting.
- Mobile HUD now prioritizes core stats, a live objective chip, and optional collapsible detail stats.
- Low-end devices now use an automatic performance profile for smoother city-mode gameplay.

## Project Structure

- `/deploy`: production bundle used for the live game.
- `/deploy/index.html`: game entry point.
- `/deploy/game.js`: full gameplay logic and rendering.
- `/deploy/styles.css`: UI and layout styles.
- `/deploy/assets`: generated art assets (pizza, people, station/store, city buildings, scenery).
- `/deploy/analysis-visuals`: screenshot outputs and visual review captures.
- `/tools/capture-deploy-visuals.js`: automated screenshot capture for key game states.
- `/tools/generate-visual-concepts.js`: concept board generator.
- `/tools/rasterize-concepts.js`: SVG-to-PNG conversion for concept boards.
- `/smoke-test.js`: Playwright smoke test for core interactions.

## Gameplay Systems (Live)

- Campaign selector: USA, Canada, Mexico with different tuning.
- Zone-based storefront progression (3 zones).
- Pizza flow: dough -> sauce -> cheese -> bake -> serve.
- AI workers per zone: cook, runner, cleaner.
- Store upgrades + prestige loop.
- Autosave/load via `localStorage`.
- Unlockable city mode with restaurant construction on empty lots.
- Unit upgrades increase passive income over time.
- City view includes district styling, animated vehicles/pedestrians, and time-of-day mood lighting.
- Compact HUD with contextual objective guidance and toggleable secondary indicators.
- Automatic low-end optimization: reduced city visual density, capped city render frequency, and lower DPR.

## Art/Visual System

Rendering is hybrid:
- Primary: image sprites loaded from `deploy/assets` at bootstrap.
- Fallback: primitive canvas shapes if an asset fails to load.

Sprite registration lives in `SPRITE_SOURCES` inside `deploy/game.js`.

## Run Locally

Option 1:
- Open `deploy/index.html` directly in a browser.

Option 2:
- Serve project root with any static server and open `/deploy/index.html`.

## Test

- Smoke test: `node smoke-test.js`
- Visual capture: `node tools/capture-deploy-visuals.js`

## Screenshots (Latest)

- Start overlay: `deploy/analysis-visuals/01-start-overlay.png`
- Gameplay core: `deploy/analysis-visuals/02-gameplay-core.png`
- Gameplay art detail: `deploy/analysis-visuals/02b-gameplay-art-detail.png`
- City mode: `deploy/analysis-visuals/03-city-mode.png`
- City mode night: `deploy/analysis-visuals/03b-city-mode-night.png`

## Major Changes Log

### 2026-03-01

- Added sprite asset pack in `deploy/assets` (pizza, characters, station/storefront art, city lot/building art, scenery).
- Integrated sprite loading and fallback rendering in `deploy/game.js`.
- Upgraded city-mode visuals to city-grid style with roads and restaurant builds.
- Added second city visual pass: district theming, road markings, animated traffic/pedestrians, and day/night lighting.
- Sprint 1 mobile safety/perf pass: spend-confirm taps for purchases, clipped hint prevention, DPR clamp, and microcopy cleanup.
- Sprint 2 mobile input pass: pointer-up tap filtering (drag threshold), dedicated hold-to-sprint control, and vibration toggle with save persistence.
- Sprint 3 mobile HUD pass: priority-chip HUD layout, contextual objective messaging, collapsible details panel, and cached HUD text updates to reduce per-frame DOM writes.
- Sprint 4 low-end performance pass: auto-detected low-performance mode (coarse-pointer low-spec devices), reduced DPR cap, lighter city-scene effects, city render throttle (~30 FPS), and hidden-tab tick pause to cut CPU/battery usage.
- Added/updated screenshot automation in `tools/capture-deploy-visuals.js`.

## README Maintenance Policy

This file should be updated after every **major** change.

Major change means any of:
- New gameplay system or mode behavior.
- Visual/art direction update.
- Save format or progression logic change.
- Tooling/test workflow updates.
- Deploy structure/path changes.

When updating after major work, always refresh:
- `Last updated` date.
- `Current Status`.
- `Gameplay Systems (Live)`.
- `Art/Visual System` (if rendering/assets changed).
- `Major Changes Log`.

Suggested commit habit:
- Include README update in the same PR/commit as the major change.
