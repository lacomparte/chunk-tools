import { ANGULAR_CORE_GROUPS } from './angular.groups.js';
import { COMMON_GROUPS } from './common.groups.js';
import { REACT_CORE_GROUPS } from './react.groups.js';
import { SVELTE_CORE_GROUPS } from './svelte.groups.js';
import type { GroupDefinition } from './types.js';
import { VUE_CORE_GROUPS } from './vue.groups.js';

export type { GroupDefinition, GroupPriority } from './types.js';

/**
 * 지원하는 프레임워크 타입
 */
export type Framework = 'react' | 'vue' | 'svelte' | 'angular' | 'unknown';

/**
 * 프레임워크별 그룹 정의
 */
export const FRAMEWORK_GROUPS: Record<
  Exclude<Framework, 'unknown'>,
  Record<string, GroupDefinition>
> = {
  react: REACT_CORE_GROUPS,
  vue: VUE_CORE_GROUPS,
  svelte: SVELTE_CORE_GROUPS,
  angular: ANGULAR_CORE_GROUPS,
};

/**
 * 감지된 프레임워크에 맞는 그룹 반환
 *
 * @param framework 프레임워크 타입
 * @returns 프레임워크별 코어 그룹 + 공통 그룹
 */
export const getGroupsForFramework = (
  framework: Framework,
): Record<string, GroupDefinition> => {
  if (framework === 'unknown') {
    // 프레임워크를 감지하지 못한 경우 공통 그룹만 반환
    return COMMON_GROUPS;
  }

  const frameworkGroups = FRAMEWORK_GROUPS[framework] ?? {};

  return {
    ...frameworkGroups, // 프레임워크별 코어
    ...COMMON_GROUPS, // 공통 그룹 (styling, monitoring)
  };
};

/**
 * Critical 우선순위 그룹 키 반환
 *
 * @param framework 프레임워크 타입
 * @returns Critical 그룹 키 목록 (예: ['react-core', 'vue-core'])
 */
export const getCriticalGroups = (framework: Framework): string[] => {
  const groups = getGroupsForFramework(framework);

  return Object.entries(groups)
    .filter(([_, def]) => def.priority === 'critical')
    .map(([key]) => key);
};
