import type { DependencyGraph } from '../core/dependency-graph.js';

/**
 * 그래프에서 패턴과 일치하는 패키지 찾기
 *
 * 패턴과 정확히 일치하거나, 패턴으로 시작하는 스코프 패키지를 찾습니다.
 * 예: 'react' 패턴은 'react', 'react/jsx-runtime' 등과 매치됩니다.
 *
 * @param graph 의존성 그래프
 * @param patterns 패턴 배열 (예: ['react', 'lodash'])
 * @returns 매칭된 패키지 이름 배열
 */
export const findMatchedPackages = (
  graph: DependencyGraph,
  patterns: string[],
): string[] => {
  const matched: string[] = [];

  for (const pkgName of graph.packages.keys()) {
    const isMatch = patterns.some(
      (pattern) => pkgName === pattern || pkgName.startsWith(`${pattern}/`),
    );
    if (isMatch) {
      matched.push(pkgName);
    }
  }

  return matched;
};
