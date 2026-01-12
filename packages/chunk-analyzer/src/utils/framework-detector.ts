import type { Framework } from '../constants/framework-groups/index.js';
import type { PackageInfo } from '../types/index.js';

/**
 * 패키지 목록에서 프레임워크 자동 감지
 *
 * 우선순위:
 * 1. react-dom → React (react만 있으면 React Native일 수 있음)
 * 2. @vue/runtime-dom → Vue 3
 * 3. svelte → Svelte
 * 4. @angular/core → Angular
 * 5. 감지 실패 → unknown
 *
 * @param packageMap 패키지 정보 맵
 * @returns 감지된 프레임워크
 */
export const detectFramework = (
  packageMap: Map<string, PackageInfo>,
): Framework => {
  const packages = [...packageMap.keys()];

  // React 감지: react-dom이 있으면 React 웹 앱
  if (packages.some((pkg) => pkg === 'react-dom')) {
    return 'react';
  }

  // Vue 감지: @vue/runtime-dom이 있으면 Vue 3
  // (Vue 2는 'vue'만 있지만, Vue 2는 레거시이므로 Vue 3을 우선 지원)
  if (packages.some((pkg) => pkg.startsWith('@vue/runtime'))) {
    return 'vue';
  }

  // Svelte 감지
  if (packages.some((pkg) => pkg === 'svelte')) {
    return 'svelte';
  }

  // Angular 감지
  if (packages.some((pkg) => pkg === '@angular/core')) {
    return 'angular';
  }

  // 감지 실패
  return 'unknown';
};

/**
 * 프레임워크 이름 표시용 (로그, CLI 출력)
 */
export const getFrameworkDisplayName = (framework: Framework): string => {
  const names: Record<Framework, string> = {
    react: 'React',
    vue: 'Vue 3',
    svelte: 'Svelte',
    angular: 'Angular',
    unknown: 'Unknown (framework-agnostic)',
  };

  return names[framework];
};
