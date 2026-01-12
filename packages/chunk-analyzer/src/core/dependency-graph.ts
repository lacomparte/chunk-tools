import { CLUSTERING_CONSTANTS } from '../constants/clustering.constant.js';
import type { VisualizerStatsV2 } from '../types/index.js';
import { extractPackageName } from '../utils/extract-package.util.js';

export type PackageNode = {
  name: string;
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
  imports: Set<string>; // 이 패키지가 import하는 패키지들
  importedBy: Set<string>; // 이 패키지를 import하는 패키지들
  modules: string[]; // 이 패키지에 속한 모듈 uid들
};

export type DependencyGraph = {
  packages: Map<string, PackageNode>;
  edges: Map<string, Set<string>>; // package -> imported packages
};

export const buildDependencyGraph = (
  stats: VisualizerStatsV2,
): DependencyGraph => {
  const { nodeParts, nodeMetas } = stats;
  const packages = new Map<string, PackageNode>();
  const moduleToPackage = new Map<string, string>();

  groupModulesByPackage(nodeParts, nodeMetas, packages, moduleToPackage);
  buildPackageDependencies(nodeMetas, packages, moduleToPackage);

  const edges = createEdgesMap(packages);
  return { packages, edges };
};

/**
 * 1단계: 모든 node_modules 모듈을 패키지별로 그룹화
 */
const groupModulesByPackage = (
  nodeParts: VisualizerStatsV2['nodeParts'],
  nodeMetas: VisualizerStatsV2['nodeMetas'],
  packages: Map<string, PackageNode>,
  moduleToPackage: Map<string, string>,
): void => {
  for (const [uid, meta] of Object.entries(nodeMetas)) {
    if (!meta.id.includes('node_modules')) continue;

    const packageName = extractPackageName(meta.id);
    if (!packageName) continue;

    moduleToPackage.set(uid, packageName);

    const existing =
      packages.get(packageName) ?? createEmptyPackageNode(packageName);
    existing.modules.push(uid);

    // 사이즈 계산
    for (const partUid of Object.values(meta.moduleParts)) {
      const part = nodeParts[partUid];
      if (part && typeof part === 'object') {
        existing.totalSize += part.renderedLength;
        existing.gzipSize += part.gzipLength;
        existing.brotliSize += part.brotliLength;
      }
    }

    packages.set(packageName, existing);
  }
};

/**
 * 2단계: 패키지 간 의존성 엣지 구축
 */
const buildPackageDependencies = (
  nodeMetas: VisualizerStatsV2['nodeMetas'],
  packages: Map<string, PackageNode>,
  moduleToPackage: Map<string, string>,
): void => {
  for (const [uid, meta] of Object.entries(nodeMetas)) {
    const sourcePackage = moduleToPackage.get(uid);
    if (!sourcePackage) continue;

    const sourceNode = packages.get(sourcePackage);
    if (!sourceNode) continue;

    // 이 모듈이 import하는 다른 패키지들
    for (const imported of meta.imported ?? []) {
      const targetPackage = moduleToPackage.get(imported.uid);
      if (targetPackage && targetPackage !== sourcePackage) {
        sourceNode.imports.add(targetPackage);
      }
    }

    // 이 모듈을 import하는 다른 패키지들
    for (const importer of meta.importedBy ?? []) {
      const importerPackage = moduleToPackage.get(importer.uid);
      if (importerPackage && importerPackage !== sourcePackage) {
        sourceNode.importedBy.add(importerPackage);
      }
    }
  }
};

/**
 * 3단계: 엣지 맵 생성
 */
const createEdgesMap = (
  packages: Map<string, PackageNode>,
): Map<string, Set<string>> => {
  const edges = new Map<string, Set<string>>();
  for (const [name, node] of packages) {
    edges.set(name, node.imports);
  }
  return edges;
};

const createEmptyPackageNode = (name: string): PackageNode => ({
  name,
  totalSize: 0,
  gzipSize: 0,
  brotliSize: 0,
  imports: new Set(),
  importedBy: new Set(),
  modules: [],
});

// 패키지 간 연결 강도 계산 (양방향 import 횟수)
export const calculateConnectionStrength = (
  graph: DependencyGraph,
  pkgA: string,
  pkgB: string,
): number => {
  const nodeA = graph.packages.get(pkgA);
  const nodeB = graph.packages.get(pkgB);
  if (!nodeA || !nodeB) return 0;

  let strength = 0;

  // A가 B를 import하면 +1
  if (nodeA.imports.has(pkgB)) strength += 1;
  // B가 A를 import하면 +1
  if (nodeB.imports.has(pkgA)) strength += 1;

  return strength;
};

// 함께 사용되는 패키지 클러스터 찾기 (Connected Components 기반)
// eslint-disable-next-line max-lines-per-function -- Complex graph traversal algorithm for cluster detection
export const findConnectedClusters = (
  graph: DependencyGraph,
  minConnectionStrength = CLUSTERING_CONSTANTS.MIN_CONNECTION_STRENGTH,
): Set<string>[] => {
  const visited = new Set<string>();
  const clusters: Set<string>[] = [];

  const bfs = (startPkg: string): Set<string> => {
    const cluster = new Set<string>();
    const queue = [startPkg];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      cluster.add(current);

      const node = graph.packages.get(current);
      if (!node) continue;

      // 연결된 패키지들 탐색
      for (const neighbor of [...node.imports, ...node.importedBy]) {
        if (!visited.has(neighbor)) {
          const strength = calculateConnectionStrength(
            graph,
            current,
            neighbor,
          );
          if (strength >= minConnectionStrength) {
            queue.push(neighbor);
          }
        }
      }
    }

    return cluster;
  };

  for (const pkgName of graph.packages.keys()) {
    if (!visited.has(pkgName)) {
      const cluster = bfs(pkgName);
      if (cluster.size > 0) {
        clusters.push(cluster);
      }
    }
  }

  return clusters;
};

// 패키지의 "핵심도" 계산 - 많이 사용될수록 높음
export const calculateCentrality = (
  graph: DependencyGraph,
  pkgName: string,
): number => {
  const node = graph.packages.get(pkgName);
  if (!node) return 0;

  // importedBy 수가 많을수록 핵심 패키지
  return node.importedBy.size;
};

// 앱 코드에서 직접 import하는 패키지 찾기 (진입점)
export const findEntryPackages = (
  stats: VisualizerStatsV2,
  _graph: DependencyGraph,
): Set<string> => {
  const entryPackages = new Set<string>();
  const { nodeMetas } = stats;

  for (const meta of Object.values(nodeMetas)) {
    // 앱 코드 (node_modules가 아닌 모듈)
    if (meta.id.includes('node_modules')) continue;

    // 앱 코드가 직접 import하는 패키지들
    for (const imported of meta.imported ?? []) {
      const importedMeta = nodeMetas[imported.uid];
      if (importedMeta?.id.includes('node_modules')) {
        const pkgName = extractPackageName(importedMeta.id);
        if (pkgName) {
          entryPackages.add(pkgName);
        }
      }
    }
  }

  return entryPackages;
};

// ==================== Graph-Based Clustering Utilities ====================

/**
 * Co-import 매트릭스 생성
 *
 * 패키지 A와 B가 동일한 모듈에서 함께 import되는 빈도를 계산합니다.
 * 예: react-hook-form과 zod가 10개 파일에서 함께 사용됨 → co-import 빈도 = 10
 *
 * @param graph 의존성 그래프
 * @returns Map<패키지A, Map<패키지B, 함께 import된 횟수>>
 */
export const buildCoImportMatrix = (
  graph: DependencyGraph,
): Map<string, Map<string, number>> => {
  const matrix = new Map<string, Map<string, number>>();

  // 각 패키지에 대해
  for (const [pkgA, nodeA] of graph.packages) {
    const coImports = new Map<string, number>();

    // pkgA를 import하는 모듈들 순회
    for (const importer of nodeA.importedBy) {
      const importerNode = graph.packages.get(importer);
      if (!importerNode) continue;

      // 해당 모듈이 import하는 다른 패키지들
      for (const pkgB of importerNode.imports) {
        if (pkgB !== pkgA) {
          coImports.set(pkgB, (coImports.get(pkgB) || 0) + 1);
        }
      }
    }

    if (coImports.size > 0) {
      matrix.set(pkgA, coImports);
    }
  }

  return matrix;
};

/**
 * 클러스터 응집도 계산
 *
 * 응집도 = 내부 연결 수 / (내부 연결 수 + 외부 연결 수)
 * - 1.0: 완벽한 응집 (외부 연결 없음)
 * - 0.5: 내부/외부 연결 비율 동일
 * - 0.0: 응집 없음 (내부 연결 없음)
 *
 * @param graph 의존성 그래프
 * @param cluster 클러스터 패키지 집합
 * @returns 응집도 (0.0 ~ 1.0)
 */
export const calculateClusterCohesion = (
  graph: DependencyGraph,
  cluster: Set<string>,
): number => {
  let internalEdges = 0;
  let externalEdges = 0;

  for (const pkg of cluster) {
    const node = graph.packages.get(pkg);
    if (!node) continue;

    for (const imported of node.imports) {
      if (cluster.has(imported)) {
        internalEdges++;
      } else {
        externalEdges++;
      }
    }
  }

  const total = internalEdges + externalEdges;
  return total === 0 ? 0 : internalEdges / total;
};

/**
 * Co-import 패턴 기반 클러스터 탐지
 *
 * 함께 import되는 빈도가 높은 패키지들을 자동으로 클러스터링합니다.
 * 응집도가 높은 클러스터만 반환합니다.
 *
 * @param graph 의존성 그래프
 * @param minCoImportCount 최소 co-import 횟수 (기본값: 3)
 * @param minCohesion 최소 응집도 (기본값: 0.5)
 * @returns 클러스터 목록 (응집도 높은 순)
 */
// eslint-disable-next-line max-lines-per-function -- Co-import clustering algorithm with cohesion calculation
export const findCoImportClusters = (
  graph: DependencyGraph,
  minCoImportCount: number = 3,
  minCohesion: number = 0.5,
): Array<{
  packages: Set<string>;
  cohesion: number;
  coImportFreq: number;
}> => {
  const coImportMatrix = buildCoImportMatrix(graph);
  const visited = new Set<string>();
  const clusters: Array<{
    packages: Set<string>;
    cohesion: number;
    coImportFreq: number;
  }> = [];

  for (const [pkgA, coImports] of coImportMatrix) {
    if (visited.has(pkgA)) continue;

    // pkgA와 자주 함께 import되는 패키지들 찾기
    const frequentCoImports = [...coImports.entries()]
      .filter(([_, count]) => count >= minCoImportCount)
      .sort((a, b) => b[1] - a[1])
      .map(([pkg]) => pkg);

    if (frequentCoImports.length === 0) continue;

    // 클러스터 형성 (pkgA + 자주 함께 사용되는 패키지들)
    const cluster = new Set([pkgA, ...frequentCoImports]);
    const cohesion = calculateClusterCohesion(graph, cluster);

    // 응집도 검증
    if (cohesion >= minCohesion) {
      // 평균 co-import 빈도 계산
      const avgCoImportFreq =
        [...coImports.values()].reduce((a, b) => a + b, 0) / coImports.size;

      clusters.push({
        packages: cluster,
        cohesion,
        coImportFreq: avgCoImportFreq,
      });

      // 클러스터에 포함된 패키지들은 방문 완료 표시
      cluster.forEach((pkg) => visited.add(pkg));
    }
  }

  // 응집도 높은 순으로 정렬
  return clusters.sort((a, b) => b.cohesion - a.cohesion);
};
