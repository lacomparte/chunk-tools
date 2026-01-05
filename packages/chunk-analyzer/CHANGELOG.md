# chunk-analyzer

## 0.2.0

### Minor Changes

- 8a6f9d9: ## New Features

  ### Lockfile-based Caching
  - Cache validation using MD5 hash of lockfile (pnpm-lock.yaml / package-lock.json / yarn.lock)
  - Generated config now includes `CACHE_KEY` for cache invalidation detection
  - Skip build & analysis when dependencies haven't changed (~7ms check)
  - Support for monorepo lockfile detection (checks parent directory)

  ### Two-stage Build Workflow
  - New recommended workflow: `build:analyze` (no browser) + production build (with browser)
  - Documentation for `OPEN_VISUALIZER=false` environment variable pattern
  - Updated README with "Option B: Two-stage build" guide

  ### Documentation Updates
  - Added caching section to README (Korean + English)
  - Updated package.json scripts examples with two-stage build pattern
  - Clarified visualizer 2x configuration (JSON + treemap)

- package publish
