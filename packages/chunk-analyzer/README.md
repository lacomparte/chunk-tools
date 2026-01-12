# chunk-analyzer

Vite/Rollup 번들을 분석하여 최적의 청크 그룹을 제안합니다.
Analyze Vite/Rollup bundles and suggest optimal chunk groupings.

---

<details>
<summary><b>🇰🇷 한글</b></summary>

## 기능

- **의존성 그래프 기반** 번들 분석
- **프레임워크 자동 감지** (React, Vue, Svelte, Angular)
- **그래프 기반 자동 클러스터링** - co-import 패턴 분석
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
      open: true, // false로 변경하면 브라우저 안 열림
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
>
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

### 기본 옵션

| 옵션                   | 설명                          | 기본값                   |
| ---------------------- | ----------------------------- | ------------------------ |
| `-c, --config <file>`  | config 출력 경로              | `chunk-groups.config.ts` |
| `-s, --stats <file>`   | stats.json 경로               | `dist/stats.json`        |
| `-b, --build <cmd>`    | 빌드 명령어                   | `vite build`             |
| `-t, --threshold <kb>` | 대형 패키지 기준 (KB)         | `100`                    |
| `-q, --quiet`          | 분석 결과 출력 생략           | `false`                  |
| `-f, --format <type>`  | 출력 형식: text, json, config | `text`                   |
| `--ignore <pattern>`   | 무시할 패키지 (반복 가능)     | -                        |

### TCP Slow Start 최적화 옵션 ✨ **NEW**

| 옵션                             | 설명                                   | 기본값 |
| -------------------------------- | -------------------------------------- | ------ |
| `--preserved-chunks <json-file>` | 초기 HTML 청크 설정 JSON 파일 경로     | -      |
| `--entry-chunks <names>`         | 진입점 청크 이름 (쉼표 구분)           | -      |
| `--initial-chunk-max-size <kb>`  | 초기 청크 최대 크기 (KB, gzipped 기준) | `14`   |

### 사용 예시

**chunks-config.json 파일 예시**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": ["react", "react-dom"],
      "maxSize": 14336,
      "splitStrategy": "auto",
      "reason": "Initial HTML vendors (TCP IW10 optimized)"
    }
  ],
  "entryChunks": ["search", "main"],
  "initialChunkMaxSize": 14336,
  "customGroups": {
    "vendor/charts": ["chart.js", "chartjs-*", "react-chartjs-*"],
    "vendor/maps": ["leaflet", "react-leaflet"],
    "vendor/date": ["date-fns", "dayjs", "moment"]
  }
}
```

**CLI 실행**:

```bash
# JSON 파일로 설정
chunk-analyzer --preserved-chunks chunks-config.json

# CLI 옵션으로 override
chunk-analyzer \
  --preserved-chunks chunks-config.json \
  --entry-chunks "search,main" \
  --initial-chunk-max-size 20
```

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
export const CACHE_KEY = 'e0d3e9db625afd4e20ffc4d8481d3a71'; // lockfile MD5 해시

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

## 사용자 정의 그룹 (customGroups) ✨ **NEW**

특정 패키지를 원하는 청크로 직접 그룹핑할 수 있습니다. `customGroups`는 **모든 자동 분석보다 먼저** 처리됩니다.

**chunks-config.json에 추가**:

```json
{
  "customGroups": {
    "vendor/charts": ["chart.js", "chartjs-*", "react-chartjs-*"],
    "vendor/maps": ["leaflet", "react-leaflet", "@react-leaflet/*"],
    "vendor/date": ["date-fns", "dayjs", "moment"]
  }
}
```

**패턴 매칭 규칙**:

- 정확한 이름: `chart.js` → `chart.js` 패키지만
- 접두사 매칭: `chartjs-*` → `chartjs-plugin-datalabels`, `chartjs-adapter-date-fns` 등
- 스코프 패턴: `@react-leaflet/*` → `@react-leaflet/core`, `@react-leaflet/hooks` 등

**사용 사례**:

- 특정 기능별 벤더 청크 분리 (차트, 지도, 날짜 처리 등)
- 레거시 라이브러리 별도 분리
- A/B 테스트용 청크 분리

## 동작 방식

### 분석 알고리즘 (하이브리드 접근)

chunk-analyzer는 **프레임워크 감지 + 그래프 기반 분석 + TCP Slow Start 최적화**를 수행합니다:

#### 0. Preserved Chunks (초기 HTML 최적화) ✨ **NEW**

**TCP Slow Start 최적화**를 위해 초기 HTML에 포함될 필수 청크를 관리합니다:

- **initialChunkMaxSize**: 14KB (gzipped) - TCP Initial Window (IW10) 기준
- **preservedChunks**: 초기 렌더링에 필요한 패키지를 보장된 청크로 생성
- **entryChunks**: 애플리케이션 진입점 파일 (예: `search.js`)

**왜 14KB인가?**

- TCP Slow Start는 초기 연결 시 14.6KB (IW10 = 10 segments × 1460 bytes)까지만 한 번에 전송
- 이를 초과하면 추가 RTT(왕복 시간)가 필요하여 초기 로딩 속도 저하
- HTTP/2 환경에서는 여러 작은 파일을 병렬 로드하는 것이 하나의 큰 파일보다 빠름

**자동 분할 기능**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": ["react", "react-dom"],
      "maxSize": 14336, // 14KB (bytes)
      "splitStrategy": "auto" // 초과 시 자동 분할
    }
  ]
}
```

크기가 14KB를 초과하면 자동으로 `vendor-1.js`, `vendor-2.js` 등으로 분할됩니다.

**프레임워크별 설정 (Circular Dependency 주의)**:

`npx chunk-analyzer init` 명령어는 프레임워크를 자동 감지하고 최적화된 `chunks-config.json`을 생성합니다.

**React 프로젝트**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": ["react", "react-dom", "scheduler", "prop-types"],
      "maxSize": 14336,
      "splitStrategy": "manual",
      "reason": "React has circular dependencies - react-dom depends on react internals"
    }
  ]
}
```

⚠️ **주의**: React는 `react-dom`이 `react` 내부 API에 의존하므로 **자동 분할하면 안 됩니다**. `splitStrategy: "manual"`로 설정하여 하나의 청크로 유지해야 합니다.

**Vue 프로젝트**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": [
        "vue",
        "@vue/runtime-dom",
        "@vue/runtime-core",
        "@vue/reactivity",
        "@vue/shared"
      ],
      "maxSize": 14336,
      "splitStrategy": "manual",
      "reason": "Vue runtime modules share internal utilities"
    }
  ]
}
```

⚠️ **주의**: Vue도 `@vue/shared`가 모든 Vue 패키지의 공통 유틸리티이므로 **자동 분할하면 안 됩니다**.

**Svelte 프로젝트**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": ["svelte"],
      "maxSize": 14336,
      "splitStrategy": "auto",
      "reason": "Svelte has no circular dependencies - safe to auto-split"
    }
  ]
}
```

✅ **안전**: Svelte는 circular dependency가 없어 `splitStrategy: "auto"`로 안전하게 분할할 수 있습니다.

**Angular 프로젝트**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": [
        "@angular/core",
        "@angular/common",
        "@angular/platform-browser",
        "rxjs",
        "tslib"
      ],
      "maxSize": 14336,
      "splitStrategy": "manual",
      "reason": "Angular modules have strong DI dependencies"
    }
  ]
}
```

⚠️ **주의**: Angular는 Dependency Injection으로 인한 강한 내부 의존성이 있어 **자동 분할하면 안 됩니다**.

**splitStrategy 옵션 설명**:

- `"auto"`: maxSize 초과 시 자동으로 여러 청크로 분할 (circular dependency 없을 때만 안전)
- `"manual"`: maxSize 초과 시 경고만 표시, 분할하지 않음 (circular dependency 있을 때 필수)

#### 1. 프레임워크 자동 감지

프로젝트의 패키지를 분석하여 사용 중인 프레임워크를 자동으로 감지합니다:

- **React**: `react-dom` 패키지 존재
- **Vue**: `@vue/runtime-dom` 패키지 존재
- **Svelte**: `svelte` 패키지 존재
- **Angular**: `@angular/core` 패키지 존재
- **Unknown**: 프레임워크 미감지 (공통 그룹만 사용)

#### 2. 프레임워크 코어 그룹 (Critical Priority)

프레임워크별 핵심 패키지를 우선 그룹핑합니다:

**React 프로젝트**:

- `vendor/react-core`: react, react-dom, scheduler, prop-types 등
- 이유: 프레임워크 내부 의존성 (의존성 그래프로 발견 어려움)

**Vue 프로젝트**:

- `vendor/vue-core`: vue, @vue/runtime-dom, @vue/shared 등
- 이유: Vue 내부 공통 유틸리티

**Svelte 프로젝트**:

- `vendor/svelte-core`: svelte, svelte/internal 등
- 이유: 컴파일된 컴포넌트의 내부 의존성

**Angular 프로젝트**:

- `vendor/angular-core`: @angular/core, rxjs, zone.js 등
- 이유: Angular + RxJS 생태계 통합

**공통 그룹 (모든 프레임워크)**:

- `vendor/styling`: styled-components, @emotion/react 등 (CSS-in-JS)

#### 3. 대형 패키지 개별 분리

100KB 이상인 패키지는 개별 청크로 분리:

- 독립적 캐싱 이점 > 추가 요청 비용

#### 4. 그래프 기반 자동 클러스터링 ✨ **NEW**

**co-import 패턴 분석**을 통해 자주 함께 사용되는 패키지를 자동으로 클러스터링:

- **최소 co-import 빈도**: 3회 이상 함께 import
- **최소 응집도**: 0.5 이상 (내부 연결 / 전체 연결)
- **최소 크기**: 20KB 이상

**예시**:

```
react-hook-form + zod + @hookform/resolvers
→ 10개 파일에서 함께 import됨
→ 응집도: 0.87
→ vendor/react-hook-form 클러스터 생성
```

**장점**:

- ✅ 프레임워크 무관 (React/Vue/Svelte 모두 동작)
- ✅ 새 패키지 자동 대응
- ✅ 실제 사용 패턴 기반 (하드코딩 제거)
- ✅ 의존성 그래프 무결성 보장

#### 5. 나머지 패키지

분류되지 않은 패키지는 `vendor/misc`로 묶음

### 프레임워크별 최적화 예시

**React 프로젝트**:

```typescript
// 자동 생성되는 청크 그룹
[
  { name: 'vendor/react-core', patterns: ['react', 'react-dom', 'scheduler', ...] },
  { name: 'vendor/styling', patterns: ['styled-components', 'stylis'] },
  { name: 'vendor/react-hook-form', patterns: ['react-hook-form', 'zod'], cohesion: 0.87 },
  // ... 그래프 기반 자동 클러스터
]
```

**Vue 프로젝트**:

```typescript
[
  { name: 'vendor/vue-core', patterns: ['vue', '@vue/runtime-dom', '@vue/shared', ...] },
  { name: 'vendor/styling', patterns: ['@emotion/vue'] },
  { name: 'vendor/pinia', patterns: ['pinia', 'vue-demi'], cohesion: 0.92 },
  // ... 그래프 기반 자동 클러스터
]
```

### 청크 크기 권장 기준

| 구분      | 크기       | 설명                  |
| --------- | ---------- | --------------------- |
| 최소      | 20KB 이상  | HTTP 오버헤드 방지    |
| 이상적    | 50~150KB   | 병렬 로딩 + 캐시 균형 |
| 대형 분리 | 100KB 이상 | 기본 threshold        |
| 최대      | 250KB 이하 | 초기 로딩 지연 방지   |

### 워크플로우

```
chunk-analyzer 실행
  │
  ├─ Step 1: vite build (stats.json 생성)
  │
  ├─ Step 2: 의존성 그래프 분석
  │   ├─ 프레임워크 감지 (React/Vue/Svelte/Angular)
  │   ├─ Framework Core Groups 처리
  │   ├─ Large Isolated Packages (100KB+)
  │   ├─ Graph-Based Clustering (co-import 패턴)
  │   └─ Remaining → misc
  │
  └─ Step 3: chunk-groups.config.ts 생성
       └─ vite build가 이 config 사용
```

## 출력 메타데이터

생성된 config 파일은 각 청크 그룹에 대한 메타데이터를 포함합니다:

```typescript
export const CHUNK_GROUPS: ChunkGroup[] = [
  {
    name: 'vendor/react-core',
    patterns: ['react', 'react-dom', 'scheduler'],
    estimatedSize: 156234,
    reason: 'Framework core with internal dependencies',
    metadata: {
      clusteringMethod: 'framework-core',
      priority: 'critical',
      description: 'React 핵심 런타임',
    },
  },
  {
    name: 'vendor/react-hook-form',
    patterns: ['react-hook-form', 'zod', '@hookform/resolvers'],
    estimatedSize: 87654,
    reason: 'Co-imported cluster (cohesion: 0.87, avg freq: 9.3x)',
    metadata: {
      clusteringMethod: 'graph-based',
      cohesion: 0.87,
      coImportFrequency: 9.3,
      centralPackage: 'react-hook-form',
    },
  },
];
```

**클러스터링 방법**:

- `custom`: 사용자 정의 그룹 (최우선 처리) ✨ **NEW**
- `preserved`: 초기 HTML 보장 청크 (TCP 최적화)
- `entry`: 애플리케이션 진입점 청크
- `framework-core`: 프레임워크 코어 그룹
- `large-isolated`: 대형 패키지 개별 분리
- `graph-based`: 그래프 기반 자동 클러스터링
- `misc`: 나머지 패키지

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

- **Dependency graph-based** bundle analysis
- **Automatic framework detection** (React, Vue, Svelte, Angular)
- **Graph-based auto-clustering** - co-import pattern analysis
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
      open: true, // set to false to disable browser open
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
>
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

### Basic Options

| Option                 | Description                       | Default                  |
| ---------------------- | --------------------------------- | ------------------------ |
| `-c, --config <file>`  | Config output path                | `chunk-groups.config.ts` |
| `-s, --stats <file>`   | Stats.json path                   | `dist/stats.json`        |
| `-b, --build <cmd>`    | Build command                     | `vite build`             |
| `-t, --threshold <kb>` | Large package threshold in KB     | `100`                    |
| `-q, --quiet`          | Suppress analysis output          | `false`                  |
| `-f, --format <type>`  | Output format: text, json, config | `text`                   |
| `--ignore <pattern>`   | Ignore packages (repeatable)      | -                        |

### TCP Slow Start Optimization Options ✨ **NEW**

| Option                           | Description                                  | Default |
| -------------------------------- | -------------------------------------------- | ------- |
| `--preserved-chunks <json-file>` | JSON file path for initial HTML chunk config | -       |
| `--entry-chunks <names>`         | Entry chunk names (comma-separated)          | -       |
| `--initial-chunk-max-size <kb>`  | Max size for initial chunks (KB, gzipped)    | `14`    |

### Usage Example

**chunks-config.json example**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": ["react", "react-dom"],
      "maxSize": 14336,
      "splitStrategy": "auto",
      "reason": "Initial HTML vendors (TCP IW10 optimized)"
    }
  ],
  "entryChunks": ["search", "main"],
  "initialChunkMaxSize": 14336,
  "customGroups": {
    "vendor/charts": ["chart.js", "chartjs-*", "react-chartjs-*"],
    "vendor/maps": ["leaflet", "react-leaflet"],
    "vendor/date": ["date-fns", "dayjs", "moment"]
  }
}
```

**CLI execution**:

```bash
# Use JSON file
chunk-analyzer --preserved-chunks chunks-config.json

# Override with CLI options
chunk-analyzer \
  --preserved-chunks chunks-config.json \
  --entry-chunks "search,main" \
  --initial-chunk-max-size 20
```

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
export const CACHE_KEY = 'e0d3e9db625afd4e20ffc4d8481d3a71'; // lockfile MD5 hash

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

## Custom Groups (customGroups) ✨ **NEW**

You can directly group specific packages into desired chunks. `customGroups` are processed **before all automatic analysis**.

**Add to chunks-config.json**:

```json
{
  "customGroups": {
    "vendor/charts": ["chart.js", "chartjs-*", "react-chartjs-*"],
    "vendor/maps": ["leaflet", "react-leaflet", "@react-leaflet/*"],
    "vendor/date": ["date-fns", "dayjs", "moment"]
  }
}
```

**Pattern Matching Rules**:

- Exact name: `chart.js` → only the `chart.js` package
- Prefix matching: `chartjs-*` → `chartjs-plugin-datalabels`, `chartjs-adapter-date-fns`, etc.
- Scope pattern: `@react-leaflet/*` → `@react-leaflet/core`, `@react-leaflet/hooks`, etc.

**Use Cases**:

- Separate vendor chunks by feature (charts, maps, date handling, etc.)
- Isolate legacy libraries
- Separate chunks for A/B testing

## How It Works

### Analysis Algorithm (Hybrid Approach)

chunk-analyzer uses **framework detection + graph-based analysis + TCP Slow Start optimization**:

#### 0. Preserved Chunks (Initial HTML Optimization) ✨ **NEW**

Manages essential chunks for initial HTML to optimize **TCP Slow Start**:

- **initialChunkMaxSize**: 14KB (gzipped) - Based on TCP Initial Window (IW10)
- **preservedChunks**: Guaranteed chunks containing packages needed for initial rendering
- **entryChunks**: Application entry point files (e.g., `search.js`)

**Why 14KB?**

- TCP Slow Start can only send 14.6KB (IW10 = 10 segments × 1460 bytes) in the first roundtrip
- Exceeding this size requires additional RTTs, slowing initial load
- In HTTP/2 environments, loading multiple small files in parallel is faster than one large file

**Auto-split feature**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": ["react", "react-dom"],
      "maxSize": 14336, // 14KB (bytes)
      "splitStrategy": "auto" // Auto-split when exceeded
    }
  ]
}
```

When size exceeds 14KB, automatically splits into `vendor-1.js`, `vendor-2.js`, etc.

**Framework-Specific Configuration (Circular Dependency Warning)**:

`npx chunk-analyzer init` detects your framework and generates an optimized `chunks-config.json`.

**React Projects**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": ["react", "react-dom", "scheduler", "prop-types"],
      "maxSize": 14336,
      "splitStrategy": "manual",
      "reason": "React has circular dependencies - react-dom depends on react internals"
    }
  ]
}
```

⚠️ **Warning**: React has circular dependencies between `react-dom` and `react` internals. **DO NOT use auto-split**. Keep `splitStrategy: "manual"` to maintain a single chunk.

**Vue Projects**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": [
        "vue",
        "@vue/runtime-dom",
        "@vue/runtime-core",
        "@vue/reactivity",
        "@vue/shared"
      ],
      "maxSize": 14336,
      "splitStrategy": "manual",
      "reason": "Vue runtime modules share internal utilities"
    }
  ]
}
```

⚠️ **Warning**: Vue's `@vue/shared` is a common utility for all Vue packages. **DO NOT use auto-split**.

**Svelte Projects**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": ["svelte"],
      "maxSize": 14336,
      "splitStrategy": "auto",
      "reason": "Svelte has no circular dependencies - safe to auto-split"
    }
  ]
}
```

✅ **Safe**: Svelte has no circular dependencies, so `splitStrategy: "auto"` is safe.

**Angular Projects**:

```json
{
  "preservedChunks": [
    {
      "name": "vendor",
      "patterns": [
        "@angular/core",
        "@angular/common",
        "@angular/platform-browser",
        "rxjs",
        "tslib"
      ],
      "maxSize": 14336,
      "splitStrategy": "manual",
      "reason": "Angular modules have strong DI dependencies"
    }
  ]
}
```

⚠️ **Warning**: Angular has strong Dependency Injection dependencies. **DO NOT use auto-split**.

**splitStrategy Options**:

- `"auto"`: Auto-split into multiple chunks when exceeding maxSize (safe only without circular dependencies)
- `"manual"`: Only show warning when exceeding maxSize, no splitting (required with circular dependencies)

#### 1. Automatic Framework Detection

Analyzes your project's packages to automatically detect the framework:

- **React**: `react-dom` package exists
- **Vue**: `@vue/runtime-dom` package exists
- **Svelte**: `svelte` package exists
- **Angular**: `@angular/core` package exists
- **Unknown**: No framework detected (uses common groups only)

#### 2. Framework Core Groups (Critical Priority)

Groups core framework packages first:

**React Projects**:

- `vendor/react-core`: react, react-dom, scheduler, prop-types, etc.
- Reason: Framework internal dependencies (hard to discover via dependency graph)

**Vue Projects**:

- `vendor/vue-core`: vue, @vue/runtime-dom, @vue/shared, etc.
- Reason: Vue internal shared utilities

**Svelte Projects**:

- `vendor/svelte-core`: svelte, svelte/internal, etc.
- Reason: Compiled component internal dependencies

**Angular Projects**:

- `vendor/angular-core`: @angular/core, rxjs, zone.js, etc.
- Reason: Angular + RxJS ecosystem integration

**Common Groups (All Frameworks)**:

- `vendor/styling`: styled-components, @emotion/react, etc. (CSS-in-JS)

#### 3. Large Package Separation

Packages over 100KB get their own chunk:

- Independent caching benefit > additional request cost

#### 4. Graph-Based Auto-Clustering ✨ **NEW**

Automatically clusters packages frequently imported together using **co-import pattern analysis**:

- **Minimum co-import frequency**: 3+ times imported together
- **Minimum cohesion**: 0.5+ (internal edges / total edges)
- **Minimum size**: 20KB+

**Example**:

```
react-hook-form + zod + @hookform/resolvers
→ Imported together in 10 files
→ Cohesion: 0.87
→ Creates vendor/react-hook-form cluster
```

**Benefits**:

- ✅ Framework-agnostic (works for React/Vue/Svelte)
- ✅ Automatic adaptation to new packages
- ✅ Based on actual usage patterns (no hardcoding)
- ✅ Guarantees dependency graph integrity

#### 5. Remaining Packages

Uncategorized packages go to `vendor/misc`

### Framework-Specific Optimization Examples

**React Projects**:

```typescript
// Auto-generated chunk groups
[
  { name: 'vendor/react-core', patterns: ['react', 'react-dom', 'scheduler', ...] },
  { name: 'vendor/styling', patterns: ['styled-components', 'stylis'] },
  { name: 'vendor/react-hook-form', patterns: ['react-hook-form', 'zod'], cohesion: 0.87 },
  // ... graph-based auto-clusters
]
```

**Vue Projects**:

```typescript
[
  { name: 'vendor/vue-core', patterns: ['vue', '@vue/runtime-dom', '@vue/shared', ...] },
  { name: 'vendor/styling', patterns: ['@emotion/vue'] },
  { name: 'vendor/pinia', patterns: ['pinia', 'vue-demi'], cohesion: 0.92 },
  // ... graph-based auto-clusters
]
```

### Recommended Chunk Size Guidelines

| Category         | Size     | Description                      |
| ---------------- | -------- | -------------------------------- |
| Minimum          | 20KB+    | Avoid HTTP overhead              |
| Ideal            | 50-150KB | Balance parallel loading + cache |
| Large separation | 100KB+   | Default threshold                |
| Maximum          | 250KB-   | Prevent initial load delay       |

### Workflow

```
chunk-analyzer execution
  │
  ├─ Step 1: vite build (generates stats.json)
  │
  ├─ Step 2: Dependency graph analysis
  │   ├─ Framework detection (React/Vue/Svelte/Angular)
  │   ├─ Framework Core Groups processing
  │   ├─ Large Isolated Packages (100KB+)
  │   ├─ Graph-Based Clustering (co-import patterns)
  │   └─ Remaining → misc
  │
  └─ Step 3: Generate chunk-groups.config.ts
       └─ vite build uses this config
```

## Output Metadata

Generated config file includes metadata for each chunk group:

```typescript
export const CHUNK_GROUPS: ChunkGroup[] = [
  {
    name: 'vendor/react-core',
    patterns: ['react', 'react-dom', 'scheduler'],
    estimatedSize: 156234,
    reason: 'Framework core with internal dependencies',
    metadata: {
      clusteringMethod: 'framework-core',
      priority: 'critical',
      description: 'React core runtime',
    },
  },
  {
    name: 'vendor/react-hook-form',
    patterns: ['react-hook-form', 'zod', '@hookform/resolvers'],
    estimatedSize: 87654,
    reason: 'Co-imported cluster (cohesion: 0.87, avg freq: 9.3x)',
    metadata: {
      clusteringMethod: 'graph-based',
      cohesion: 0.87,
      coImportFrequency: 9.3,
      centralPackage: 'react-hook-form',
    },
  },
];
```

**Clustering Methods**:

- `custom`: User-defined custom groups (highest priority) ✨ **NEW**
- `preserved`: Initial HTML guaranteed chunks (TCP optimization)
- `entry`: Application entry point chunks
- `framework-core`: Framework core groups
- `large-isolated`: Large package separation
- `graph-based`: Graph-based auto-clustering
- `misc`: Remaining packages

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
