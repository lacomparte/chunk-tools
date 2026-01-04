# chunk-analyzer

Vite/Rollup 번들을 분석하여 최적의 청크 그룹을 제안합니다.
Analyze Vite/Rollup bundles and suggest optimal chunk groupings.

---

<details>
<summary><b>🇰🇷 한글</b></summary>

## 기능

- 의존성 그래프 기반 번들 분석
- 최적의 `manualChunks` 설정 자동 생성
- CLI 도구 지원
- TypeScript 설정 파일 생성

## 설치

```bash
pnpm add -D chunk-analyzer rollup-plugin-visualizer
```

## 빠른 시작

### 1. 초기 설정 (최초 1회)

```bash
# 빈 config 파일 생성
npx chunk-analyzer init
```

### 2. vite.config.ts 설정

```typescript
import { visualizer } from 'rollup-plugin-visualizer';
import { CHUNK_GROUPS, createManualChunks } from './chunk-groups.config';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.json',
      json: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: createManualChunks(CHUNK_GROUPS),
      },
    },
  },
});
```

### 3. package.json scripts 수정

```json
{
  "scripts": {
    "build": "npx chunk-analyzer -q && vite build"
  }
}
```

### 4. 빌드 실행

```bash
pnpm build
```

첫 빌드 시 stats.json이 생성되고, 이후 빌드부터는 분석된 최적 config가 적용됩니다.

## CLI 사용법

```bash
# 기본: 빌드 → 분석 → config 생성
chunk-analyzer

# 조용히 실행 (config만 생성)
chunk-analyzer -q

# 커스텀 config 출력 경로
chunk-analyzer -c src/chunk-groups.config.ts

# 커스텀 빌드 명령어
chunk-analyzer -b "pnpm build:visualizer"

# 기존 stats.json 분석 (빌드 없이)
chunk-analyzer analyze dist/stats.json

# JSON 리포트 생성
chunk-analyzer analyze -f json -o report.json dist/stats.json

# 커스텀 threshold (50KB)
chunk-analyzer -t 50
```

## CLI 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-c, --config <file>` | config 출력 경로 | `chunk-groups.config.ts` |
| `-s, --stats <file>` | stats.json 경로 | `dist/stats.json` |
| `-b, --build <cmd>` | 빌드 명령어 | `vite build` |
| `-t, --threshold <kb>` | 대형 패키지 기준 (KB) | `100` |
| `-q, --quiet` | 분석 결과 출력 생략 | `false` |
| `-f, --format <type>` | 출력 형식: text, json, config | `text` |
| `--ignore <pattern>` | 무시할 패키지 (반복 가능) | - |

## 동작 방식

### 분석 알고리즘

chunk-analyzer는 **의존성 그래프 기반** 분석을 수행합니다:

1. **React Core 그룹** - 변경 빈도가 낮은 핵심 런타임
   - react, react-dom, scheduler 등

2. **대형 패키지 분리** - 100KB 이상인 패키지는 개별 청크로
   - 독립적 캐싱 이점 > 추가 요청 비용

3. **의존성 클러스터** - 함께 import되는 패키지 묶기
   - state-routing: 라우팅 + 상태관리
   - utils: 유틸리티 라이브러리
   - animation: 애니메이션 관련

4. **나머지** → `vendor/misc`

### 내장 패키지 그룹 (Known Groups)

다음 패키지들은 자동으로 최적의 그룹으로 분류됩니다:

| 그룹 | 패키지 | 설명 |
|------|--------|------|
| `react-core` | react, react-dom, scheduler, react-is, react-fast-compare, react-style-singleton, use-callback-ref, use-sidecar, hoist-non-react-statics, prop-types | React 핵심 런타임 |
| `react-extensions` | react-error-boundary, react-helmet-async, react-remove-scroll, react-transition-group | React 확장 라이브러리 |
| `state-management` | @tanstack/react-query, @tanstack/query-core, jotai, zustand, recoil | 상태 관리 |
| `styling` | styled-components, stylis, @emotion/react, @emotion/styled | CSS-in-JS |
| `routing` | react-router, react-router-dom, @remix-run/router, use-query-params | 라우팅 |
| `utils` | axios, dayjs, lodash, lodash.throttle, lodash.debounce, jwt-decode | 유틸리티 |
| `monitoring` | @datadog/browser-rum, @datadog/browser-logs, @sentry/react, @sentry/browser | 모니터링 |
| `animation` | framer-motion, motion, lottie-web, lottie-react | 애니메이션 |
| `heavy-ui` | swiper, react-virtuoso, @tanstack/react-virtual | 무거운 UI 컴포넌트 |
| `form` | react-hook-form, @hookform/resolvers, zod, yup | 폼 관리 |

> 📌 **버전 기준**: 2024년 12월 기준 최신 안정 버전 (React 18.x, React Router 6.x, TanStack Query v5 등)

### 청크 크기 권장 기준

| 구분 | 크기 | 설명 |
|------|------|------|
| 최소 | 20KB 이상 | HTTP 오버헤드 방지 |
| 이상적 | 50~150KB | 병렬 로딩 + 캐시 균형 |
| 대형 분리 | 100KB 이상 | 기본 threshold |
| 최대 | 250KB 이하 | 초기 로딩 지연 방지 |

### 워크플로우

```
chunk-analyzer → vite build
     │                │
     │                └── chunk-groups.config.ts 사용
     │
     ├── Step 1: vite build (stats.json 생성)
     ├── Step 2: 의존성 그래프 분석
     └── Step 3: chunk-groups.config.ts 생성
```

## stats.json 자동 탐색 경로

다음 경로에서 자동으로 stats.json을 찾습니다:

- `dist/stats.json`
- `dist/report.json`
- `build/stats.json`
- `out/stats.json`
- `.next/stats.json`
- `stats.json`

</details>

---

<details open>
<summary><b>🇺🇸 English</b></summary>

## Features

- Dependency graph-based bundle analysis
- Automatic optimal `manualChunks` configuration
- CLI tool support
- TypeScript config file generation

## Installation

```bash
pnpm add -D chunk-analyzer rollup-plugin-visualizer
```

## Quick Start

### 1. Initialize (first time only)

```bash
# Generate empty config file
npx chunk-analyzer init
```

### 2. Configure vite.config.ts

```typescript
import { visualizer } from 'rollup-plugin-visualizer';
import { CHUNK_GROUPS, createManualChunks } from './chunk-groups.config';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.json',
      json: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: createManualChunks(CHUNK_GROUPS),
      },
    },
  },
});
```

### 3. Update package.json scripts

```json
{
  "scripts": {
    "build": "npx chunk-analyzer -q && vite build"
  }
}
```

### 4. Run build

```bash
pnpm build
```

The first build generates stats.json. Subsequent builds use the optimized config.

## CLI Usage

```bash
# Default: build → analyze → generate config
chunk-analyzer

# Quiet mode (only generate config)
chunk-analyzer -q

# Custom config output path
chunk-analyzer -c src/chunk-groups.config.ts

# Custom build command
chunk-analyzer -b "pnpm build:visualizer"

# Analyze existing stats.json (no build)
chunk-analyzer analyze dist/stats.json

# Generate JSON report
chunk-analyzer analyze -f json -o report.json dist/stats.json

# Custom threshold (50KB)
chunk-analyzer -t 50
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <file>` | Config output path | `chunk-groups.config.ts` |
| `-s, --stats <file>` | Stats.json path | `dist/stats.json` |
| `-b, --build <cmd>` | Build command | `vite build` |
| `-t, --threshold <kb>` | Large package threshold in KB | `100` |
| `-q, --quiet` | Suppress analysis output | `false` |
| `-f, --format <type>` | Output format: text, json, config | `text` |
| `--ignore <pattern>` | Ignore packages (repeatable) | - |

## How It Works

### Analysis Algorithm

chunk-analyzer uses **dependency graph-based** analysis:

1. **React Core Group** - Low change frequency core runtime
   - react, react-dom, scheduler, etc.

2. **Large Package Separation** - Packages over 100KB get their own chunk
   - Independent caching benefit > additional request cost

3. **Dependency Clusters** - Group packages imported together
   - state-routing: routing + state management
   - utils: utility libraries
   - animation: animation related

4. **Remaining** → `vendor/misc`

### Built-in Package Groups (Known Groups)

The following packages are automatically classified into optimal groups:

| Group | Packages | Description |
|-------|----------|-------------|
| `react-core` | react, react-dom, scheduler, react-is, react-fast-compare, react-style-singleton, use-callback-ref, use-sidecar, hoist-non-react-statics, prop-types | React core runtime |
| `react-extensions` | react-error-boundary, react-helmet-async, react-remove-scroll, react-transition-group | React extension libraries |
| `state-management` | @tanstack/react-query, @tanstack/query-core, jotai, zustand, recoil | State management |
| `styling` | styled-components, stylis, @emotion/react, @emotion/styled | CSS-in-JS |
| `routing` | react-router, react-router-dom, @remix-run/router, use-query-params | Routing |
| `utils` | axios, dayjs, lodash, lodash.throttle, lodash.debounce, jwt-decode | Utilities |
| `monitoring` | @datadog/browser-rum, @datadog/browser-logs, @sentry/react, @sentry/browser | Monitoring |
| `animation` | framer-motion, motion, lottie-web, lottie-react | Animation |
| `heavy-ui` | swiper, react-virtuoso, @tanstack/react-virtual | Heavy UI components |
| `form` | react-hook-form, @hookform/resolvers, zod, yup | Form management |

> 📌 **Version Reference**: Based on latest stable versions as of December 2024 (React 18.x, React Router 6.x, TanStack Query v5, etc.)

### Recommended Chunk Size Guidelines

| Category | Size | Description |
|----------|------|-------------|
| Minimum | 20KB+ | Avoid HTTP overhead |
| Ideal | 50-150KB | Balance parallel loading + cache |
| Large separation | 100KB+ | Default threshold |
| Maximum | 250KB- | Prevent initial load delay |

### Workflow

```
chunk-analyzer → vite build
     │                │
     │                └── Uses chunk-groups.config.ts
     │
     ├── Step 1: vite build (generates stats.json)
     ├── Step 2: Dependency graph analysis
     └── Step 3: Generate chunk-groups.config.ts
```

## Auto-detected stats.json Paths

Automatically searches for stats.json in these locations:

- `dist/stats.json`
- `dist/report.json`
- `build/stats.json`
- `out/stats.json`
- `.next/stats.json`
- `stats.json`

</details>

---

## License

MIT
