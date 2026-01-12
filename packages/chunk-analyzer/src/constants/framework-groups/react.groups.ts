import type { GroupDefinition } from './types.js';

/**
 * React 프레임워크 코어 그룹
 *
 * React의 경우 다음과 같은 특징이 있습니다:
 * 1. scheduler, prop-types 등은 직접 import하지 않지만 react-dom이 내부적으로 사용
 * 2. use-callback-ref, use-sidecar 등은 styled-components, react-remove-scroll 등에서 사용
 * 3. 이런 간접 의존성은 의존성 그래프 분석만으로는 발견하기 어려움
 * 4. 하지만 캐시 효율성을 위해 같은 chunk에 있어야 함
 */
export const REACT_CORE_GROUPS: Record<string, GroupDefinition> = {
  'react-core': {
    patterns: [
      'react',
      'react-dom',
      'scheduler', // react-dom 내부 의존성
      'react-is',
      'react-fast-compare',
      'react-style-singleton',
      'use-callback-ref', // styled-components 등이 사용
      'use-sidecar', // react-remove-scroll 등이 사용
      'hoist-non-react-statics', // 여러 HOC 라이브러리가 사용
      'prop-types',
    ],
    description: 'React 핵심 런타임',
    reason:
      'Framework core with internal dependencies - must be grouped for cache stability',
    priority: 'critical',
  },
};
