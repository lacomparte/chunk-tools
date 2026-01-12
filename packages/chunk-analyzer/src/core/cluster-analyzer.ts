import { DEFAULT_OPTIONS } from '../constants/defaults.constant.js';
import {
  getCriticalGroups,
  getGroupsForFramework,
} from '../constants/framework-groups/index.js';
import type { GroupDefinition } from '../constants/framework-groups/types.js';
import type {
  AnalyzerOptions,
  ChunkGroup,
  PackageInfo,
} from '../types/index.js';
import {
  detectFramework,
  getFrameworkDisplayName,
} from '../utils/framework-detector.js';
import { filterIgnoredPackages } from '../utils/ignore-file.util.js';

import type { DependencyGraph } from './dependency-graph.js';
import {
  processCustomGroups,
  processPreservedChunks,
  processFrameworkCoreGroups,
  processGraphBasedClusters,
  processLargeIsolatedPackages,
  processRemainingPackages,
} from './processors/index.js';

/**
 * 의존성 그래프 기반 청크 그룹 분석
 *
 * 하이브리드 접근 (6단계):
 * -1. Custom Groups - 사용자 정의 그룹 (최우선)
 * 0. Preserved Chunks - 초기 HTML 포함 청크 (TCP slow start 최적화)
 * 1. Framework Core Groups (정적) - 프레임워크별 코어 패키지
 * 2. Large Isolated Packages - 대형 패키지 개별 분리
 * 3. Graph-Based Clustering (동적) - co-import 패턴 기반 자동 클러스터링
 * 4. Remaining Packages - misc 그룹
 *
 * @param packages 패키지 정보 목록
 * @param graph 의존성 그래프
 * @param options 분석 옵션
 * @returns 제안된 청크 그룹 목록
 */
export const analyzeWithDependencyGraph = (
  packages: PackageInfo[],
  graph: DependencyGraph,
  options: AnalyzerOptions = {},
): ChunkGroup[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const assigned = new Set<string>();
  const suggestions: ChunkGroup[] = [];

  const { packageMap, frameworkGroups, criticalGroupKeys } =
    prepareAnalysisContext(packages, opts);

  // 4단계 청킹 파이프라인 실행
  runChunkingPipeline(
    graph,
    packageMap,
    opts,
    frameworkGroups,
    criticalGroupKeys,
    assigned,
    suggestions,
  );

  return suggestions.sort((a, b) => b.estimatedSize - a.estimatedSize);
};

/**
 * 분석 컨텍스트 준비
 * - ignore 패턴 필터링
 * - 패키지 맵 생성
 * - 프레임워크 감지 및 그룹 로드
 */
const prepareAnalysisContext = (
  packages: PackageInfo[],
  opts: Required<AnalyzerOptions>,
) => {
  const filteredPackages = filterIgnoredPackages(packages, opts.ignore);

  const packageMap = new Map<string, PackageInfo>();
  for (const pkg of filteredPackages) {
    packageMap.set(pkg.name, pkg);
  }

  const framework = detectFramework(packageMap);
  const frameworkGroups = getGroupsForFramework(framework);
  const criticalGroupKeys = getCriticalGroups(framework);

  console.log(`📦 Detected framework: ${getFrameworkDisplayName(framework)}`);
  if (criticalGroupKeys.length > 0) {
    console.log(`🎯 Critical groups: ${criticalGroupKeys.join(', ')}`);
  }

  return { packageMap, frameworkGroups, criticalGroupKeys };
};

/**
 * 6단계 청킹 파이프라인 실행
 */
const runChunkingPipeline = (
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  opts: Required<AnalyzerOptions>,
  frameworkGroups: Record<string, GroupDefinition>,
  criticalGroupKeys: string[],
  assigned: Set<string>,
  suggestions: ChunkGroup[],
) => {
  // -1단계: 사용자 정의 그룹 (최우선)
  processCustomGroups(graph, packageMap, opts, assigned, suggestions);

  // 0단계: Preserved 청크 (초기 HTML 포함 청크)
  processPreservedChunks(graph, packageMap, opts, assigned, suggestions);

  // 1단계: 프레임워크 코어 그룹
  processFrameworkCoreGroups(
    graph,
    packageMap,
    assigned,
    suggestions,
    frameworkGroups,
    criticalGroupKeys,
  );

  // 2단계: 대형 패키지 개별 분리
  processLargeIsolatedPackages(graph, opts, assigned, suggestions);

  // 3단계: 그래프 기반 동적 클러스터링
  processGraphBasedClusters(graph, packageMap, assigned, suggestions, opts);

  // 4단계: 남은 패키지 misc로
  processRemainingPackages(packageMap, assigned, suggestions);
};
