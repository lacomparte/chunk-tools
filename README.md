# chunk-tools

Vite/Rollup 번들 최적화를 위한 도구 모음입니다.
A collection of tools for optimizing Vite/Rollup bundles.

## Packages

| Package | Description |
|---------|-------------|
| [chunk-analyzer](./packages/chunk-analyzer) | 번들 분석 및 최적의 manualChunks 설정 생성 |

## Getting Started

```bash
# Install
pnpm add -D chunk-analyzer rollup-plugin-visualizer

# Initialize
npx chunk-analyzer init

# Analyze and generate config
npx chunk-analyzer
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## License

MIT
