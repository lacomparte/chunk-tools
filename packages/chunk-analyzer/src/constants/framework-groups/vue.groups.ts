import type { GroupDefinition } from './types.js';

/**
 * Vue 프레임워크 코어 그룹
 *
 * Vue 3의 경우:
 * 1. @vue/shared는 모든 Vue 패키지의 공통 유틸리티
 * 2. @vue/runtime-core, runtime-dom, reactivity는 강하게 연결됨
 * 3. compiler-sfc는 SFC 컴파일러 (빌드 타임에만 사용되지만 포함)
 */
export const VUE_CORE_GROUPS: Record<string, GroupDefinition> = {
  'vue-core': {
    patterns: [
      'vue',
      '@vue/runtime-dom',
      '@vue/runtime-core',
      '@vue/reactivity',
      '@vue/shared', // 모든 Vue 패키지의 공통 유틸리티
      '@vue/compiler-sfc',
      '@vue/compiler-dom',
      '@vue/compiler-core',
    ],
    description: 'Vue 핵심 런타임',
    reason:
      'Framework core with tightly coupled packages - internal shared utilities',
    priority: 'critical',
  },
};
