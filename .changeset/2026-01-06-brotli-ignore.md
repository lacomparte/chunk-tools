---
'chunk-analyzer': minor
---

## New Features

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
