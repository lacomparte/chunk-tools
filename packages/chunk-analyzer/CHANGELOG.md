# chunk-analyzer

## 0.3.0

### Minor Changes

- 00f295e: ## New Features

  ### brotliSize Support
  - Add brotliSize to PackageInfo and ChunkGroup types
  - Display gzip/brotli sizes in config comments: `(385.8KB) (gzip: 130.4KB, brotli: 113.9KB)`

  ### .chunkgroupignore File Support
  - Add `.chunkgroupignore` file support for excluding packages from grouping
  - Supports .gitignore-style syntax: comments (#), glob patterns (\*), negation (!)
  - CLI `--ignore` patterns are merged with file patterns

  ### Git Hooks (husky + lint-staged)
  - Add pre-commit hooks for typecheck and lint
  - Automatically run eslint + prettier on staged files

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
