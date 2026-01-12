import type { GroupDefinition } from './types.js';

/**
 * 프레임워크 무관 공통 그룹
 *
 * 모든 프레임워크에서 공통적으로 사용되는 라이브러리들:
 * - Styling: CSS-in-JS 라이브러리
 * - Monitoring: APM, 로깅, 에러 트래킹
 *
 * 이런 패키지들은 프레임워크와 무관하게 항상 함께 사용됩니다.
 */
export const COMMON_GROUPS: Record<string, GroupDefinition> = {
  styling: {
    patterns: [
      'styled-components',
      'stylis', // styled-components 내부 의존성
      '@emotion/react',
      '@emotion/styled',
      '@emotion/cache',
      '@emotion/serialize',
      '@emotion/utils',
      '@emotion/sheet',
    ],
    description: 'CSS-in-JS',
    reason:
      'Common styling libraries - framework agnostic, stable dependencies',
    priority: 'high',
  },
  monitoring: {
    patterns: [
      '@datadog/browser-rum',
      '@datadog/browser-logs',
      '@datadog/browser-core',
      '@sentry/react',
      '@sentry/vue',
      '@sentry/browser',
      '@sentry/core',
      '@sentry/utils',
    ],
    description: '모니터링 및 로깅',
    reason: 'Monitoring SDKs - large, stable, rarely change',
    priority: 'medium',
  },
};
