# Pretty URLs Migration (Hash to Path-based Routing)

**Date**: 2026-02-07
**Type**: Enhancement / Refactor

## Overview

Migrated the entire application from hash-based routing (`#journals`, `#page/...`, `#block/...`) to clean path-based routing (`/journals`, `/page/...`, `/block/...`). This modernizes the navigation system, producing cleaner URLs and better alignment with standard web conventions.

## Motivation

- Hash-based URLs (`#journals`) are a legacy SPA pattern
- Path-based URLs (`/journals`) are cleaner and more user-friendly
- Better compatibility with browser history APIs and navigation expectations
- Improved URL readability and shareability

## Implementation

### Routing Architecture Change

**Before**: AppRun hash-based routing with `location.hash`, `#` prefixed routes, and `@on('#route')` decorators
**After**: AppRun `addComponents` API with path-based route registration and `location.pathname` / `location.href`

### Files Changed (15 files)

#### Core Routing (`src/main.tsx`)
- Removed `app['no-init-route'] = true` and individual `.mount()` calls
- Added `app.addComponents('my-app', { ... })` with path-based route map: `/`, `/journals`, `/pages`, `/page`
- Moved `app.render()` after store/plugin initialization for correct startup order

#### Home Component (`src/ui/home.tsx`)
- Converted from `rendered` lifecycle hook to `update` handler listening on `/`
- Redirects to `/journals` when directory access is granted
- Added explicit `state` initialization

#### Page Components
- **`src/ui/journals.tsx`**: Changed route from `#journals` to `/journals`; updated `location.hash` check to `location.pathname`
- **`src/ui/page.tsx`**: Changed route from `#page` to `/page`
- **`src/ui/pages.tsx`**: Removed `@on('#pages')` decorator; added `update` handler for `/pages` route; removed unused `on` import
- **`src/ui/block.tsx`**: Changed route from `#block` to `/block`

#### Link Updates (href attributes)
- **`src/ui/components/sidebar.tsx`**: Updated all `href` and `onclick` navigation from `#` to `/` paths (journals link, pages link, open-new-dir logic)
- **`src/ui/components/top-toolbar.tsx`**: Updated toolbar links (add page, journals, all pages) from `#` to `/`
- **`src/ui/components/page-view.tsx`**: Updated page title links and block bullet links
- **`src/ui/components/block-view.tsx`**: Updated breadcrumb block links
- **`src/ui/search.tsx`**: Updated `app.run` call from `#page` to `/page`

#### Navigation Handler (`src/ui/components/layout.tsx`)
- Replaced hash extraction (`target.href.indexOf('#')` + `location.hash`) with URL parsing (`new URL(target.href).pathname` + `window.location.href`)

#### Wiki Links (`src/ui/utils/md.ts`)
- Updated `to_html` wiki link replacement from `#page/pages/` to `/page/pages/`

#### Tests (`src/ui/utils/md.spec.ts`)
- Updated expected HTML output to use `/page/` instead of `#page/`

#### Build Config (`vite.config.js`)
- Added `server.historyApiFallback: true` for SPA dev server support
- Cleaned up trailing whitespace

### New File

#### `src/ui/components/pages-list.tsx`
- Sidebar pages list component displaying alphabetically sorted pages
- Links use new `/page/` URL format
- Hidden by default, visibility controlled by parent sidebar

## Key Decisions

1. **`addComponents` over individual mounts**: Centralizes route registration, making the route map explicit and easier to maintain
2. **`window.location.href` for navigation**: Standard browser navigation API for path-based URLs
3. **Vite `historyApiFallback`**: Required so the dev server serves `index.html` for all routes (SPA behavior)

## Testing

- Unit tests updated in `md.spec.ts` to reflect new URL format
- All route handlers migrated to path-based patterns
- Wiki link rendering verified via updated test expectations

## Related Work

- Prior: [req-pages-menu.md](../../reqs/2026-02-01/req-pages-menu.md) — Pages menu originally used hash routing
- Prior: [plan-pages-menu.md](../../plans/2026-02-01/plan-pages-menu.md) — Implementation plan referenced `#pages` route
- These documents reflect the original hash-based approach; this migration supersedes that routing pattern
