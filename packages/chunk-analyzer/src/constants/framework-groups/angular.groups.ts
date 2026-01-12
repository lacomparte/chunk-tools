import type { GroupDefinition } from './types.js';

/**
 * Angular 프레임워크 코어 그룹
 *
 * Angular의 경우:
 * 1. @angular/core, common, platform-browser는 필수 패키지
 * 2. rxjs는 Angular의 핵심 의존성
 * 3. tslib은 TypeScript 헬퍼 함수
 */
export const ANGULAR_CORE_GROUPS: Record<string, GroupDefinition> = {
  'angular-core': {
    patterns: [
      '@angular/core',
      '@angular/common',
      '@angular/platform-browser',
      '@angular/platform-browser-dynamic',
      '@angular/compiler',
      'rxjs', // Angular의 필수 의존성
      'rxjs/operators',
      'tslib', // TypeScript helpers
      'zone.js', // Angular 변경 감지
    ],
    description: 'Angular 핵심 런타임',
    reason: 'Framework core with RxJS integration - tightly coupled ecosystem',
    priority: 'critical',
  },
};
