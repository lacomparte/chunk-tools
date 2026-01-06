import { DEFAULT_OPTIONS } from '../constants/defaults.constant.js';
import { KNOWN_GROUPS } from '../constants/known-groups.constant.js';
import type {
  ChunkGroup,
  PackageInfo,
  AnalyzerOptions,
} from '../types/index.js';
import { formatSize } from '../utils/format-size.util.js';
import { filterIgnoredPackages } from '../utils/ignore-file.util.js';

import type { DependencyGraph } from './dependency-graph.js';
import { calculateCentrality } from './dependency-graph.js';

type ClusterCandidate = {
  packages: Set<string>;
  totalSize: number;
  gzipSize: number;
  centralPackage: string; // 가장 중심이 되는 패키지
  reason: string;
};

// 의존성 기반 청크 그룹 분석
export const analyzeWithDependencyGraph = (
  packages: PackageInfo[],
  graph: DependencyGraph,
  options: AnalyzerOptions = {},
): ChunkGroup[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const assigned = new Set<string>();
  const suggestions: ChunkGroup[] = [];

  // ignore 패턴으로 필터링
  const filteredPackages = filterIgnoredPackages(packages, opts.ignore);

  // 패키지 맵 생성 (필터링된 패키지만)
  const packageMap = new Map<string, PackageInfo>();
  for (const pkg of filteredPackages) {
    packageMap.set(pkg.name, pkg);
  }

  // 1단계: 핵심 패키지 식별 (React, 상태관리 등 - 변경 빈도 낮음)
  processKnownCoreGroups(graph, packageMap, assigned, suggestions);

  // 2단계: 대형 패키지 개별 분리 (100KB 이상)
  processLargeIsolatedPackages(graph, packageMap, opts, assigned, suggestions);

  // 3단계: 의존성 클러스터 분석 - 함께 import되는 패키지 그룹
  processDependencyClusters(graph, packageMap, opts, assigned, suggestions);

  // 4단계: 남은 패키지 처리
  processRemainingPackages(packageMap, assigned, suggestions);

  return suggestions.sort((a, b) => b.estimatedSize - a.estimatedSize);
};

// 핵심 패키지 그룹 (변경 빈도 낮은 안정적인 라이브러리)
const processKnownCoreGroups = (
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  // 핵심 그룹만 처리 (react-core, styling 등 변경 빈도 매우 낮은 것들)
  const coreGroups = ['react-core', 'styling'];

  for (const groupKey of coreGroups) {
    const groupDef = KNOWN_GROUPS[groupKey];
    if (!groupDef) continue;

    const matched = findMatchedPackages(graph, groupDef.patterns);
    if (matched.length === 0) continue;

    const totalSize = matched.reduce((sum, name) => {
      const pkg = packageMap.get(name);
      return sum + (pkg?.totalSize ?? 0);
    }, 0);

    const gzipSize = matched.reduce((sum, name) => {
      const pkg = packageMap.get(name);
      return sum + (pkg?.gzipSize ?? 0);
    }, 0);

    const brotliSize = matched.reduce((sum, name) => {
      const pkg = packageMap.get(name);
      return sum + (pkg?.brotliSize ?? 0);
    }, 0);

    suggestions.push({
      name: `vendor/${groupKey}`,
      patterns: matched,
      estimatedSize: totalSize,
      gzipSize,
      brotliSize,
      reason: `${groupDef.description} (${formatSize(totalSize)})`,
    });

    matched.forEach((name) => assigned.add(name));
  }
};

const findMatchedPackages = (
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

// 대형 패키지 개별 분리 (의존성이 적고 크기가 큰 패키지)
const processLargeIsolatedPackages = (
  graph: DependencyGraph,
  _packageMap: Map<string, PackageInfo>,
  opts: Required<AnalyzerOptions>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const threshold = opts.largePackageThreshold;

  // 크기순 정렬
  const sortedPackages = Array.from(graph.packages.entries())
    .filter(([name]) => !assigned.has(name))
    .sort((a, b) => b[1].totalSize - a[1].totalSize);

  for (const [pkgName, node] of sortedPackages) {
    if (node.totalSize < threshold) continue;

    // 이 패키지를 import하는 다른 미할당 패키지가 적으면 개별 분리
    const unassignedImporters = [...node.importedBy].filter(
      (imp) => !assigned.has(imp),
    );

    // 독립적이거나, 아주 큰 패키지(100KB 이상)는 개별 분리
    if (unassignedImporters.length <= 2 || node.totalSize >= 100 * 1024) {
      const safeName = pkgName.replace(/[@/]/g, '-').replace(/^-/, '');
      suggestions.push({
        name: `vendor/${safeName}`,
        patterns: [pkgName],
        estimatedSize: node.totalSize,
        gzipSize: node.gzipSize,
        brotliSize: node.brotliSize,
        reason: `큰 패키지 (${formatSize(node.totalSize)})`,
      });
      assigned.add(pkgName);
    }
  }
};

// 의존성 클러스터 분석 - 실제로 함께 사용되는 패키지 묶기
const processDependencyClusters = (
  graph: DependencyGraph,
  _packageMap: Map<string, PackageInfo>,
  _opts: Required<AnalyzerOptions>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const unassigned = Array.from(graph.packages.entries()).filter(
    ([name]) => !assigned.has(name),
  );

  if (unassigned.length === 0) return;

  // 클러스터 후보 찾기
  const clusters = findDependencyClusters(graph, assigned);

  for (const cluster of clusters) {
    if (cluster.packages.size < 2) continue;

    const clusterPackages = [...cluster.packages];
    const totalSize = clusterPackages.reduce((sum, name) => {
      const node = graph.packages.get(name);
      return sum + (node?.totalSize ?? 0);
    }, 0);

    const gzipSize = clusterPackages.reduce((sum, name) => {
      const node = graph.packages.get(name);
      return sum + (node?.gzipSize ?? 0);
    }, 0);

    const brotliSize = clusterPackages.reduce((sum, name) => {
      const node = graph.packages.get(name);
      return sum + (node?.brotliSize ?? 0);
    }, 0);

    // 클러스터 이름 결정 (가장 중심이 되는 패키지 기반)
    const centralPkg = findCentralPackage(graph, clusterPackages);
    const clusterName = categorizeCluster(clusterPackages, centralPkg);

    suggestions.push({
      name: `vendor/${clusterName}`,
      patterns: clusterPackages,
      estimatedSize: totalSize,
      gzipSize,
      brotliSize,
      reason: cluster.reason,
    });

    clusterPackages.forEach((name) => assigned.add(name));
  }
};

// 의존성 기반 클러스터 찾기
const findDependencyClusters = (
  graph: DependencyGraph,
  assigned: Set<string>,
): ClusterCandidate[] => {
  const clusters: ClusterCandidate[] = [];
  const visited = new Set<string>();

  // 카테고리별로 클러스터 생성
  const categoryGroups: Record<string, Set<string>> = {
    'state-routing': new Set(),
    'form': new Set(),
    'utils': new Set(),
    'monitoring': new Set(),
    'animation': new Set(),
    'ui': new Set(),
  };

  for (const [pkgName] of graph.packages.entries()) {
    if (assigned.has(pkgName) || visited.has(pkgName)) continue;

    const category = categorizePackage(pkgName);
    if (category && categoryGroups[category]) {
      categoryGroups[category].add(pkgName);
      visited.add(pkgName);
    }
  }

  // 각 카테고리를 클러스터로 변환
  for (const [category, packages] of Object.entries(categoryGroups)) {
    if (packages.size === 0) continue;

    const pkgArray = [...packages];
    const totalSize = pkgArray.reduce((sum, name) => {
      const node = graph.packages.get(name);
      return sum + (node?.totalSize ?? 0);
    }, 0);

    clusters.push({
      packages,
      totalSize,
      gzipSize: 0,
      centralPackage: pkgArray[0],
      reason: getCategoryDescription(category, totalSize),
    });
  }

  return clusters.sort((a, b) => b.totalSize - a.totalSize);
};

// 패키지 카테고리 분류
const categorizePackage = (pkgName: string): string | null => {
  // 상태 관리 + 라우팅
  if (
    pkgName.includes('@tanstack') ||
    pkgName.includes('jotai') ||
    pkgName.includes('zustand') ||
    pkgName.includes('react-router') ||
    pkgName.includes('@remix-run') ||
    pkgName.includes('query-params')
  ) {
    return 'state-routing';
  }

  // 폼
  if (
    pkgName.includes('react-hook-form') ||
    pkgName.includes('@hookform') ||
    pkgName.includes('zod') ||
    pkgName.includes('yup')
  ) {
    return 'form';
  }

  // 유틸리티
  if (
    pkgName.includes('axios') ||
    pkgName.includes('dayjs') ||
    pkgName.includes('lodash') ||
    pkgName.includes('jwt-decode') ||
    pkgName.includes('core-js') ||
    pkgName.includes('tslib')
  ) {
    return 'utils';
  }

  // 모니터링
  if (pkgName.includes('@datadog') || pkgName.includes('@sentry')) {
    return 'monitoring';
  }

  // 애니메이션
  if (
    pkgName.includes('framer-motion') ||
    pkgName.includes('motion') ||
    pkgName.includes('lottie')
  ) {
    return 'animation';
  }

  // UI 컴포넌트
  if (
    pkgName.includes('swiper') ||
    pkgName.includes('virtuoso') ||
    pkgName.includes('react-remove-scroll')
  ) {
    return 'ui';
  }

  return null;
};

const getCategoryDescription = (
  category: string,
  totalSize: number,
): string => {
  const descriptions: Record<string, string> = {
    'state-routing': '상태 관리 + 라우팅',
    'form': '폼 관리',
    'utils': '유틸리티',
    'monitoring': '모니터링',
    'animation': '애니메이션',
    'ui': 'UI 컴포넌트',
  };

  return `${descriptions[category] ?? category} (${formatSize(totalSize)})`;
};

// 클러스터에서 가장 중심이 되는 패키지 찾기
const findCentralPackage = (
  graph: DependencyGraph,
  packages: string[],
): string => {
  let maxCentrality = -1;
  let centralPkg = packages[0];

  for (const pkgName of packages) {
    const centrality = calculateCentrality(graph, pkgName);
    if (centrality > maxCentrality) {
      maxCentrality = centrality;
      centralPkg = pkgName;
    }
  }

  return centralPkg;
};

// 클러스터 이름 결정
const categorizeCluster = (_packages: string[], centralPkg: string): string => {
  // 먼저 카테고리로 시도
  const category = categorizePackage(centralPkg);
  if (category) return category;

  // 중심 패키지 이름 기반
  return centralPkg.replace(/[@/]/g, '-').replace(/^-/, '');
};

// 남은 패키지 처리
const processRemainingPackages = (
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const remaining = [...packageMap.keys()].filter(
    (name) => !assigned.has(name),
  );
  if (remaining.length === 0) return;

  const totalSize = remaining.reduce((sum, name) => {
    const pkg = packageMap.get(name);
    return sum + (pkg?.totalSize ?? 0);
  }, 0);

  const gzipSize = remaining.reduce((sum, name) => {
    const pkg = packageMap.get(name);
    return sum + (pkg?.gzipSize ?? 0);
  }, 0);

  const brotliSize = remaining.reduce((sum, name) => {
    const pkg = packageMap.get(name);
    return sum + (pkg?.brotliSize ?? 0);
  }, 0);

  suggestions.push({
    name: 'vendor/misc',
    patterns: remaining,
    estimatedSize: totalSize,
    gzipSize,
    brotliSize,
    reason: `기타 패키지 ${remaining.length}개 (${formatSize(totalSize)})`,
  });
};
