type GroupDefinition = {
  patterns: string[];
  description: string;
};

export const KNOWN_GROUPS: Record<string, GroupDefinition> = {
  'react-core': {
    patterns: [
      'react',
      'react-dom',
      'scheduler',
      'react-is',
      'react-fast-compare',
      'react-style-singleton',
      'use-callback-ref',
      'use-sidecar',
      'hoist-non-react-statics',
      'prop-types',
    ],
    description: 'React 핵심 런타임',
  },
  'react-extensions': {
    patterns: [
      'react-error-boundary',
      'react-helmet-async',
      'react-remove-scroll',
      'react-transition-group',
    ],
    description: 'React 확장 라이브러리',
  },
  'state-management': {
    patterns: [
      '@tanstack/react-query',
      '@tanstack/query-core',
      'jotai',
      'zustand',
      'recoil',
    ],
    description: '상태 관리',
  },
  'styling': {
    patterns: [
      'styled-components',
      'stylis',
      '@emotion/react',
      '@emotion/styled',
    ],
    description: 'CSS-in-JS',
  },
  'routing': {
    patterns: [
      'react-router',
      'react-router-dom',
      '@remix-run/router',
      'use-query-params',
    ],
    description: '라우팅',
  },
  'utils': {
    patterns: [
      'axios',
      'dayjs',
      'lodash',
      'lodash.throttle',
      'lodash.debounce',
      'jwt-decode',
    ],
    description: '유틸리티',
  },
  'monitoring': {
    patterns: [
      '@datadog/browser-rum',
      '@datadog/browser-logs',
      '@sentry/react',
      '@sentry/browser',
    ],
    description: '모니터링',
  },
  'animation': {
    patterns: ['framer-motion', 'motion', 'lottie-web', 'lottie-react'],
    description: '애니메이션',
  },
  'heavy-ui': {
    patterns: ['swiper', 'react-virtuoso', '@tanstack/react-virtual'],
    description: '무거운 UI 컴포넌트',
  },
  'form': {
    patterns: ['react-hook-form', '@hookform/resolvers', 'zod', 'yup'],
    description: '폼 관리',
  },
};
