import type { GroupDefinition } from './types.js';

/**
 * Svelte 프레임워크 코어 그룹
 *
 * Svelte의 경우:
 * 1. svelte/internal은 컴파일된 컴포넌트가 사용하는 내부 API
 * 2. svelte/store, animate, transition 등은 자주 함께 사용됨
 */
export const SVELTE_CORE_GROUPS: Record<string, GroupDefinition> = {
  'svelte-core': {
    patterns: [
      'svelte',
      'svelte/internal', // 컴파일된 컴포넌트의 내부 의존성
      'svelte/store',
      'svelte/animate',
      'svelte/transition',
      'svelte/easing',
      'svelte/motion',
    ],
    description: 'Svelte 핵심 런타임',
    reason:
      'Framework core with internal modules - compiled component dependencies',
    priority: 'critical',
  },
};
