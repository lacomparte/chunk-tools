import type { Framework } from '../constants/framework-groups/index.js';
import { REACT_CORE_GROUPS } from '../constants/framework-groups/react.groups.js';
import { VUE_CORE_GROUPS } from '../constants/framework-groups/vue.groups.js';
import type { ChunksConfig, PreservedChunk } from '../types/index.js';

const TCP_IW10_SIZE = 14336; // 14KB

type FrameworkPreset = {
  patterns: string[];
  splitStrategy: 'auto' | 'manual';
  reason: string;
};

/** 프레임워크별 프리셋 정의 */
const FRAMEWORK_PRESETS: Partial<Record<Framework, FrameworkPreset>> = {
  react: {
    patterns: REACT_CORE_GROUPS['react-core'].patterns,
    splitStrategy: 'manual',
    reason:
      'React has circular dependencies - react-dom depends on react internals. Splitting causes runtime errors.',
  },
  vue: {
    patterns: VUE_CORE_GROUPS['vue-core'].patterns,
    splitStrategy: 'manual',
    reason:
      'Vue runtime modules share internal utilities (@vue/shared). Tightly coupled packages must stay together.',
  },
  svelte: {
    patterns: ['svelte'],
    splitStrategy: 'auto',
    reason:
      'Svelte is a single package without circular dependencies. Safe to auto-split if size exceeds limit.',
  },
  angular: {
    patterns: [
      '@angular/core',
      '@angular/common',
      '@angular/platform-browser',
      '@angular/platform-browser-dynamic',
      '@angular/forms',
      '@angular/router',
      'rxjs',
      'tslib',
    ],
    splitStrategy: 'manual',
    reason:
      'Angular modules have strong internal dependencies through dependency injection. Must be grouped together.',
  },
};

/** 프레임워크별 preserved chunks 프리셋 생성 */
export const generatePreservedChunksConfig = (
  framework: Framework,
): ChunksConfig => {
  const preset = FRAMEWORK_PRESETS[framework];
  return {
    preservedChunks: preset ? [createPreservedChunk(preset)] : [],
    entryChunks: [],
    initialChunkMaxSize: TCP_IW10_SIZE,
  };
};

/** PreservedChunk 객체 생성 */
const createPreservedChunk = (preset: FrameworkPreset): PreservedChunk => ({
  name: 'vendor',
  patterns: preset.patterns,
  maxSize: TCP_IW10_SIZE,
  splitStrategy: preset.splitStrategy,
  reason: preset.reason,
});

/** 프레임워크별 설명 메시지 */
const FRAMEWORK_MESSAGES: Record<Framework, string> = {
  react: `⚠️  React는 circular dependency가 있어 자동 분할하지 않습니다
  - react-dom이 react 내부 API에 의존
  - 하나의 vendor 청크로 유지 (예상 크기: ~47KB gzipped)`,
  vue: `⚠️  Vue는 runtime 모듈 간 내부 유틸리티 공유로 자동 분할하지 않습니다
  - @vue/shared가 모든 Vue 패키지의 공통 유틸리티
  - 하나의 vendor 청크로 유지`,
  svelte: `✓ Svelte는 circular dependency가 없어 안전하게 분할 가능합니다
  - 크기가 14KB를 초과하면 자동으로 여러 청크로 분할됩니다`,
  angular: `⚠️  Angular는 Dependency Injection으로 인해 자동 분할하지 않습니다
  - 모듈 간 강한 의존성 존재
  - 하나의 vendor 청크로 유지`,
  unknown: `ℹ️  프레임워크를 감지하지 못했습니다
  - 빈 chunks-config.json이 생성됩니다
  - 필요시 수동으로 preservedChunks를 추가하세요`,
};

export const getFrameworkMessage = (framework: Framework): string =>
  FRAMEWORK_MESSAGES[framework];

/** 프레임워크별 생성된 설정 요약 */
export const getConfigSummary = (framework: Framework): string => {
  const config = generatePreservedChunksConfig(framework);

  if (framework === 'unknown' || !config.preservedChunks?.length) {
    return '빈 설정 파일이 생성되었습니다. 필요시 preservedChunks를 수동으로 추가하세요.';
  }

  const chunk = config.preservedChunks[0];
  const patternsStr = formatPatterns(chunk.patterns);

  return `📦 생성된 chunks-config.json:
  - vendor 청크: ${patternsStr}
  - splitStrategy: ${chunk.splitStrategy} ${chunk.splitStrategy === 'manual' ? '(자동 분할 비활성화)' : '(자동 분할 활성화)'}
  - maxSize: 14KB (TCP IW10 최적화)`;
};

/** 패턴 목록 포맷팅 */
const formatPatterns = (patterns: string[]): string =>
  patterns.length > 5
    ? `${patterns.slice(0, 5).join(', ')}... (${patterns.length}개)`
    : patterns.join(', ');
