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
    // 1. JSON stats - chunk-analyzer용 (브라우저에 안 열림)
    visualizer({
      filename: 'dist/stats.json',
      template: 'raw-data',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // 2. HTML treemap - 시각화용 (브라우저에 열림)
    visualizer({
      filename: 'dist/report.html',
      template: 'treemap',
      open: true,  // false로 변경하면 브라우저 안 열림
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

> ⚠️ **중요**: visualizer를 2개 설정해야 합니다.
> - `template: 'raw-data'` + `open: false` → chunk-analyzer가 읽는 JSON
> - `template: 'treemap'` + `open: true` → 브라우저에서 시각화

### 3. package.json scripts 수정

**방법 A: 기본 (단순 프로젝트용)**

```json
{
  "scripts": {
    "build": "npx chunk-analyzer -q"
  }
}
```

chunk-analyzer가 내부에서 빌드를 실행합니다.

**방법 B: 2단계 빌드 (권장)**

```json
{
  "scripts": {
    "build": "pnpm build:analyze && tsc && vite build --mode prd",
    "build:analyze": "OPEN_VISUALIZER=false npx chunk-analyzer -b 'tsc && vite build --mode prd'"
  }
}
```

이 방식의 장점:
1. **chunk-analyzer 빌드**: 분석용 빌드 실행 → config 갱신 (브라우저 열지 않음)
2. **프로덕션 빌드**: 갱신된 config로 최종 빌드 실행 (vite.config.ts의 `open` 설정 따름)

> 💡 **팁**: 2단계 빌드는 매 빌드마다 최신 분석 결과를 config에 반영합니다.

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

| 옵션                   | 설명                          | 기본값                   |
| ---------------------- | ----------------------------- | ------------------------ |
| `-c, --config <file>`  | config 출력 경로              | `chunk-groups.config.ts` |
| `-s, --stats <file>`   | stats.json 경로               | `dist/stats.json`        |
| `-b, --build <cmd>`    | 빌드 명령어                   | `vite build`             |
| `-t, --threshold <kb>` | 대형 패키지 기준 (KB)         | `100`                    |
| `-q, --quiet`          | 분석 결과 출력 생략           | `false`                  |
| `-f, --format <type>`  | 출력 형식: text, json, config | `text`                   |
| `--ignore <pattern>`   | 무시할 패키지 (반복 가능)     | -                        |

## .chunkgroupignore 파일

특정 패키지를 청크 그룹핑에서 제외하려면 프로젝트 루트에 `.chunkgroupignore` 파일을 생성하세요.
제외된 패키지는 Vite의 기본 `splitVendorChunkPlugin` 동작을 따릅니다.

### 파일 형식

`.gitignore`와 동일한 형식을 사용합니다:

```gitignore
# 주석
lodash              # 정확히 lodash만 제외
lodash*             # lodash, lodash.debounce, lodash.throttle 등 모두 제외
@sentry/*           # @sentry/react, @sentry/browser 등 모두 제외

# 부정 패턴: 특정 패키지만 다시 포함
@tanstack/*         # 모든 @tanstack 패키지 제외
!@tanstack/react-query  # 단, react-query는 그룹핑에 포함
```

### 패턴 처리 순서

1. 모든 패턴을 순서대로 적용
2. 마지막 매칭 결과가 최종 결정
3. `!`로 시작하면 "포함", 그 외는 "제외"

### CLI --ignore와 함께 사용

`.chunkgroupignore` 파일과 `--ignore` 옵션을 함께 사용할 수 있습니다:

```bash
# .chunkgroupignore 파일의 패턴 + CLI 패턴 모두 적용
chunk-analyzer --ignore "dayjs"
```

CLI 패턴이 파일 패턴보다 나중에 적용되므로 우선순위가 높습니다.

## 캐싱 (의존성 변경 감지)

chunk-analyzer는 **lockfile 해시 기반 캐싱**을 통해 불필요한 빌드를 스킵합니다.

### 동작 원리

```
npx chunk-analyzer 실행
├─ lockfile 해시 계산 (pnpm-lock.yaml / package-lock.json / yarn.lock)
├─ chunk-groups.config.ts의 CACHE_KEY와 비교
├─ 해시가 같으면 → 빌드 스킵! (약 7ms)
└─ 해시가 다르면 → 빌드 + 분석 + config 갱신
```

### 생성되는 config 파일

```typescript
// chunk-groups.config.ts
export const CACHE_KEY = 'e0d3e9db625afd4e20ffc4d8481d3a71';  // lockfile MD5 해시

export const CHUNK_GROUPS: ChunkGroup[] = [
  // ...
];
```

### 캐시 무효화

다음 경우에 자동으로 캐시가 무효화됩니다:

- `pnpm add/remove` 등으로 패키지 추가/삭제
- lockfile 직접 수정
- `chunk-groups.config.ts` 파일 삭제
- `CACHE_KEY` 수동 삭제

> 💡 **강제 재분석**: config 파일을 삭제하면 다음 빌드에서 재분석됩니다.

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

| 그룹               | 패키지                                                                                                                                               | 설명                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `react-core`       | react, react-dom, scheduler, react-is, react-fast-compare, react-style-singleton, use-callback-ref, use-sidecar, hoist-non-react-statics, prop-types | React 핵심 런타임     |
| `react-extensions` | react-error-boundary, react-helmet-async, react-remove-scroll, react-transition-group                                                                | React 확장 라이브러리 |
| `state-management` | @tanstack/react-query, @tanstack/query-core, jotai, zustand, recoil                                                                                  | 상태 관리             |
| `styling`          | styled-components, stylis, @emotion/react, @emotion/styled                                                                                           | CSS-in-JS             |
| `routing`          | react-router, react-router-dom, @remix-run/router, use-query-params                                                                                  | 라우팅                |
| `utils`            | axios, dayjs, lodash, lodash.throttle, lodash.debounce, jwt-decode                                                                                   | 유틸리티              |
| `monitoring`       | @datadog/browser-rum, @datadog/browser-logs, @sentry/react, @sentry/browser                                                                          | 모니터링              |
| `animation`        | framer-motion, motion, lottie-web, lottie-react                                                                                                      | 애니메이션            |
| `heavy-ui`         | swiper, react-virtuoso, @tanstack/react-virtual                                                                                                      | 무거운 UI 컴포넌트    |
| `form`             | react-hook-form, @hookform/resolvers, zod, yup                                                                                                       | 폼 관리               |

> 📌 **버전 기준**: 2024년 12월 기준 최신 안정 버전 (React 18.x, React Router 6.x, TanStack Query v5 등)

### 청크 크기 권장 기준

| 구분      | 크기       | 설명                  |
| --------- | ---------- | --------------------- |
| 최소      | 20KB 이상  | HTTP 오버헤드 방지    |
| 이상적    | 50~150KB   | 병렬 로딩 + 캐시 균형 |
| 대형 분리 | 100KB 이상 | 기본 threshold        |
| 최대      | 250KB 이하 | 초기 로딩 지연 방지   |

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
    // 1. JSON stats - for chunk-analyzer (no browser open)
    visualizer({
      filename: 'dist/stats.json',
      template: 'raw-data',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // 2. HTML treemap - for visualization (opens in browser)
    visualizer({
      filename: 'dist/report.html',
      template: 'treemap',
      open: true,  // set to false to disable browser open
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

> ⚠️ **Important**: You need TWO visualizer configurations.
> - `template: 'raw-data'` + `open: false` → JSON for chunk-analyzer
> - `template: 'treemap'` + `open: true` → Visual treemap in browser

### 3. Update package.json scripts

**Option A: Basic (for simple projects)**

```json
{
  "scripts": {
    "build": "npx chunk-analyzer -q"
  }
}
```

chunk-analyzer runs the build internally.

**Option B: Two-stage build (recommended)**

```json
{
  "scripts": {
    "build": "pnpm build:analyze && tsc && vite build --mode prd",
    "build:analyze": "OPEN_VISUALIZER=false npx chunk-analyzer -b 'tsc && vite build --mode prd'"
  }
}
```

Benefits of this approach:
1. **chunk-analyzer build**: Runs analysis build → updates config (no browser open)
2. **Production build**: Runs final build with updated config (follows vite.config.ts `open` setting)

> 💡 **Tip**: Two-stage build ensures every build uses the latest analysis results in config.

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

| Option                 | Description                       | Default                  |
| ---------------------- | --------------------------------- | ------------------------ |
| `-c, --config <file>`  | Config output path                | `chunk-groups.config.ts` |
| `-s, --stats <file>`   | Stats.json path                   | `dist/stats.json`        |
| `-b, --build <cmd>`    | Build command                     | `vite build`             |
| `-t, --threshold <kb>` | Large package threshold in KB     | `100`                    |
| `-q, --quiet`          | Suppress analysis output          | `false`                  |
| `-f, --format <type>`  | Output format: text, json, config | `text`                   |
| `--ignore <pattern>`   | Ignore packages (repeatable)      | -                        |

## .chunkgroupignore File

To exclude specific packages from chunk grouping, create a `.chunkgroupignore` file in your project root.
Excluded packages will follow Vite's default `splitVendorChunkPlugin` behavior.

### File Format

Uses the same format as `.gitignore`:

```gitignore
# Comments
lodash              # Exclude only lodash
lodash*             # Exclude lodash, lodash.debounce, lodash.throttle, etc.
@sentry/*           # Exclude @sentry/react, @sentry/browser, etc.

# Negation patterns: Include specific packages back
@tanstack/*         # Exclude all @tanstack packages
!@tanstack/react-query  # But include react-query in grouping
```

### Pattern Processing Order

1. All patterns are applied in order
2. Last matching result is the final decision
3. Patterns starting with `!` mean "include", others mean "exclude"

### Using with CLI --ignore

You can use `.chunkgroupignore` file together with `--ignore` option:

```bash
# Both .chunkgroupignore patterns + CLI patterns are applied
chunk-analyzer --ignore "dayjs"
```

CLI patterns are applied after file patterns, so they have higher priority.

## Caching (Dependency Change Detection)

chunk-analyzer uses **lockfile hash-based caching** to skip unnecessary builds.

### How It Works

```
npx chunk-analyzer runs
├─ Calculate lockfile hash (pnpm-lock.yaml / package-lock.json / yarn.lock)
├─ Compare with CACHE_KEY in chunk-groups.config.ts
├─ If hash matches → Skip build! (~7ms)
└─ If hash differs → Build + analyze + update config
```

### Generated Config File

```typescript
// chunk-groups.config.ts
export const CACHE_KEY = 'e0d3e9db625afd4e20ffc4d8481d3a71';  // lockfile MD5 hash

export const CHUNK_GROUPS: ChunkGroup[] = [
  // ...
];
```

### Cache Invalidation

Cache is automatically invalidated when:

- Packages added/removed via `pnpm add/remove`
- Lockfile modified directly
- `chunk-groups.config.ts` file deleted
- `CACHE_KEY` manually removed

> 💡 **Force re-analysis**: Delete the config file to trigger re-analysis on next build.

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

| Group              | Packages                                                                                                                                             | Description               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `react-core`       | react, react-dom, scheduler, react-is, react-fast-compare, react-style-singleton, use-callback-ref, use-sidecar, hoist-non-react-statics, prop-types | React core runtime        |
| `react-extensions` | react-error-boundary, react-helmet-async, react-remove-scroll, react-transition-group                                                                | React extension libraries |
| `state-management` | @tanstack/react-query, @tanstack/query-core, jotai, zustand, recoil                                                                                  | State management          |
| `styling`          | styled-components, stylis, @emotion/react, @emotion/styled                                                                                           | CSS-in-JS                 |
| `routing`          | react-router, react-router-dom, @remix-run/router, use-query-params                                                                                  | Routing                   |
| `utils`            | axios, dayjs, lodash, lodash.throttle, lodash.debounce, jwt-decode                                                                                   | Utilities                 |
| `monitoring`       | @datadog/browser-rum, @datadog/browser-logs, @sentry/react, @sentry/browser                                                                          | Monitoring                |
| `animation`        | framer-motion, motion, lottie-web, lottie-react                                                                                                      | Animation                 |
| `heavy-ui`         | swiper, react-virtuoso, @tanstack/react-virtual                                                                                                      | Heavy UI components       |
| `form`             | react-hook-form, @hookform/resolvers, zod, yup                                                                                                       | Form management           |

> 📌 **Version Reference**: Based on latest stable versions as of December 2024 (React 18.x, React Router 6.x, TanStack Query v5, etc.)

### Recommended Chunk Size Guidelines

| Category         | Size     | Description                      |
| ---------------- | -------- | -------------------------------- |
| Minimum          | 20KB+    | Avoid HTTP overhead              |
| Ideal            | 50-150KB | Balance parallel loading + cache |
| Large separation | 100KB+   | Default threshold                |
| Maximum          | 250KB-   | Prevent initial load delay       |

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
