# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build              # typecheck + lint + build both browser targets
npm run build:firefox      # build Firefox extension only
npm run build:chrome       # build Chrome extension only
npm run build:prod         # production build (minified) for all browsers
npm run typecheck          # TypeScript strict checks (no emit)
npm run lint               # ESLint on src/**/*.ts
npm run lint:fix           # ESLint with auto-fixes
npm run format:check       # Prettier check
npm run format             # Prettier write
npm run test               # run all Vitest tests
npm run test:coverage      # run tests with coverage report
npm run knip               # find unused exports/files/dependencies
npm run bump -- bugfix     # bump version (also: major, minor) across package.json + manifests
```

Run a single test file:
```bash
npx vitest run tests/dateUtils.test.ts
```

The pre-commit hook runs `lint` and `format:check`. Run `npm run prepare` to reinstall Husky hooks if missing.

## Architecture

This is a dual-target browser extension (Firefox MV2 + Chrome MV3) with three entry points compiled by esbuild (`build.js`):

**`src/content/content.ts`** — Content script injected into Amazon order history pages. Orchestrates the entire export flow: discovers year filters, navigates through paginated order lists, scrapes order cards, and fetches individual order detail pages for accurate item prices and promotions. Export state is persisted in `sessionStorage` under the key `amazonExporter` so it survives the page navigations required to walk through multiple years and pages.

**`src/background/background.ts`** — Background script (service worker on Chrome MV3, persistent script on Firefox MV2). Handles file downloads and forwards `updateProgress` messages from the content script to the popup. Chrome MV3 service workers lack `Blob`/`URL.createObjectURL`, so downloads use base64 data URLs there; Firefox uses Blob URLs.

**`src/popup/popup.ts`** — Popup UI. Collects export options (format, date range) and sends an `exportOrders` message to the content script to start the export.

**`src/utils/*.ts`** — All parsing logic lives here: date formats (German/English/French), price/currency extraction, order status localization, CSV generation, URL detection and construction. These are the only files with unit test coverage.

**`src/types/index.ts`** — Shared TypeScript interfaces: `Order`, `OrderItem`, `Promotion`, `ExportState`, `ExportOptions`, `DownloadData`, `MessagePayload`.

**`src/_locales/`** — i18n strings for de, en, es, fr. All user-facing strings go through `browser.i18n.getMessage`.

**`src/manifest.chrome.json` / `src/manifest.firefox.json`** — Both must be updated together when changing permissions, URL match patterns, or extension entry points.

## Cross-browser constraints

- Chrome MV3 service worker has no DOM APIs and no `Blob`/`createObjectURL` — the download path handles this explicitly in `background.ts`.
- Firefox MV2 uses IIFE bundle format; Chrome MV3 uses ESM. This is configured in `build.js` per target.
- `webextension-polyfill` normalizes the `browser.*` API surface across both browsers.

## Test coverage

Unit tests in `tests/` cover `src/utils/` only — these run in a Node/Vitest environment without browser globals. The content script, background, and popup are not unit tested. Each utility file maps directly to a test file:

| Source | Test |
|--------|------|
| `src/utils/dateUtils.ts` | `tests/dateUtils.test.ts` |
| `src/utils/priceUtils.ts` | `tests/priceUtils.test.ts` |
| `src/utils/orderUtils.ts` | `tests/orderUtils.test.ts` |
| `src/utils/csvUtils.ts` | `tests/csvUtils.test.ts` |
| `src/utils/urlUtils.ts` | `tests/urlUtils.test.ts` |
| `src/utils/statusUtils.ts` | `tests/statusUtils.test.ts` |

## Key conventions

- If the exported data shape (`Order`, `OrderItem`, etc.) changes, update `src/types/index.ts`, JSON/CSV generation, tests, and the README schema docs together.
- i18n keys must stay in sync across all four locale files when adding/removing user-facing strings.
- Do not edit files under `dist/` — they are build artifacts.
- Do not run `npm run watch` or `npm run test:watch` — interactive/long-lived commands are not appropriate in this repo's CI context.
