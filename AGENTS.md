# AGENTS.md - Order History Exporter for Amazon

## Purpose

This guide defines how AI coding agents should work in this repository.
It combines project-specific workflows with general engineering guardrails.

## Project Snapshot

- TypeScript browser extension for exporting Amazon orders as JSON/CSV.
- Dual browser targets:
  - Firefox (Manifest V2, background script bundle format `iife`)
  - Chrome/Chromium (Manifest V3, service worker bundle format `esm`)
- Build output is generated under `dist/` and should not be edited manually.

## Repository Map

- `src/background/background.ts`: download handling and runtime message bridge.
- `src/content/content.ts`: scraping/export orchestration across Amazon order pages.
- `src/popup/*`: popup UI (HTML/CSS/TS) and user interaction.
- `src/utils/*.ts`: parsing, URL, date, CSV, and order utility logic.
- `src/types/index.ts`: shared data contracts for export flow and messages.
- `src/manifest.firefox.json`: Firefox MV2 manifest.
- `src/manifest.chrome.json`: Chrome MV3 manifest.
- `src/_locales/*/messages.json`: i18n strings.
- `tests/*.test.ts`: Vitest unit tests (primarily utility coverage).
- `build.js`: esbuild-based build pipeline for all browser targets.
- `.husky/pre-commit`: git pre-commit quality gate.

## Safety and Scope

1. Preserve behavior unless the task explicitly requests behavior changes.
2. Keep changes minimal and reversible.
3. Do not run long-lived or interactive commands unless explicitly requested, including:
   - `npm run watch`
   - `npm run test:watch`
   - browser launch/debug commands
4. Do not manually edit generated output in `dist/`.
5. Never commit secrets, personal data, or scraped order data.

## Core Architecture Rules

1. Keep responsibilities separated:
   - Popup handles UX only.
   - Content script handles scraping/export state.
   - Background handles downloads and message fan-out.
2. Reuse `src/utils` and `src/types` instead of duplicating logic in scripts.
3. Preserve cross-browser behavior:
   - Chrome service worker constraints (no Blob URL assumption).
   - Firefox background script behavior.
4. If permissions, URL matches, or extension entry points change, update both manifests unless intentionally browser-specific.
5. If exported data shape changes, update all affected layers:
   - `src/types/index.ts`
   - JSON/CSV generation paths
   - tests
   - README export schema docs

## Coding Conventions

1. Follow existing patterns in nearby files before introducing anything new.
2. Keep TypeScript strictness intact (`tsconfig.json` rules are intentional).
3. Prefer explicit, readable code over clever abstractions.
4. Handle runtime errors explicitly; do not silently swallow failures unless there is a clear boundary reason.
5. Keep comments focused on intent when code is non-obvious; avoid redundant comments.
6. Keep i18n keys synchronized across locale files when changing user-facing strings.

## Error Handling and Logging

1. Fail fast on programmer errors and guard against external/runtime failures.
2. Log at the boundary where failures are actionable.
3. Do not log sensitive content (credentials, tokens, personal data, full payload dumps).
4. Keep existing `console` usage patterns unless a task asks for broader logging changes.

## Testing Expectations

Add or update tests for behavior changes, bug fixes, or non-trivial refactors.

- `src/utils/dateUtils.ts` -> `tests/dateUtils.test.ts`
- `src/utils/priceUtils.ts` -> `tests/priceUtils.test.ts`
- `src/utils/orderUtils.ts` -> `tests/orderUtils.test.ts`
- `src/utils/csvUtils.ts` -> `tests/csvUtils.test.ts`
- `src/utils/urlUtils.ts` -> `tests/urlUtils.test.ts`

Test rules:

1. Test behavior, not implementation details.
2. Keep tests deterministic and isolated.
3. Use Node/Vitest-friendly tests (no browser-only globals in unit tests).

## Build, Lint, and Quality Commands

Use npm scripts from `package.json`:

- `npm run build` - typecheck + lint + build both browser targets.
- `npm run build:firefox` / `npm run build:chrome` - target-specific builds.
- `npm run build:prod*` - production builds with minification.
- `npm run typecheck` - strict TypeScript checks (`noEmit`).
- `npm run lint` / `npm run lint:fix` - ESLint for `src/**/*.ts`.
- `npm run format` / `npm run format:check` - Prettier write/check.
- `npm run test` / `npm run test:coverage` - Vitest test suites.
- `npm run knip` - unused exports/dependency checks.

## Git Hooks (Husky)

- `npm install` triggers `prepare` and installs Husky hooks.
- Pre-commit hook (`.husky/pre-commit`) runs:
  - `npm run lint`
  - `npm run format:check`
- Do not bypass hooks unless explicitly requested.
- Do not modify `.husky/_` generated shim files unless there is a hook tooling issue.

## Dependencies and Configuration

1. Prefer existing dependencies and utilities before adding new packages.
2. Avoid overlapping libraries that solve the same problem.
3. Do not hard-code environment-specific values.
4. Preserve current build and CI compatibility unless asked to change it.

## When Unsure

1. Inspect similar files and follow the dominant local pattern.
2. Choose the least invasive option.
3. Keep behavior unchanged by default.
4. Make assumptions explicit in the final summary when they affect outcomes.

## Completion Checklist

Before finishing, verify:

1. Relevant code compiles (`npm run typecheck` or `npm run build`).
2. Lint and formatting pass (`npm run lint`, `npm run format:check`).
3. Related tests pass (`npm run test` and targeted coverage when useful).
4. Documentation is updated when behavior or developer workflow changed.
