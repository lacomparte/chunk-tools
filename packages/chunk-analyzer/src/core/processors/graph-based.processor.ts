import { CLUSTERING_CONSTANTS } from '../../constants/clustering.constant.js';
import type {
  AnalyzerOptions,
  ChunkGroup,
  PackageInfo,
} from '../../types/index.js';
import { calculateSizes } from '../../utils/calculate-sizes.util.js';
import { generateSafeName } from '../../utils/package-name.util.js';
import {
  calculateCentrality,
  findCoImportClusters,
  type DependencyGraph,
} from '../dependency-graph.js';

type CoImportCluster = {
  packages: Set<string>;
  cohesion: number;
  coImportFreq: number;
};

/**
 * 그래프 기반 동적 클러스터링
 *
 * co-import 패턴을 분석하여 자주 함께 사용되는 패키지들을 자동으로 클러스터링합니다.
 */
export const processGraphBasedClusters = (
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
  _opts: Required<AnalyzerOptions>,
): void => {
  const unassignedPackages = [...graph.packages.keys()].filter(
    (pkg) => !assigned.has(pkg),
  );

  if (unassignedPackages.length === 0) return;

  const unassignedGraph = createSubgraph(graph, unassignedPackages);
  const clusters = findCoImportClusters(
    unassignedGraph,
    CLUSTERING_CONSTANTS.MIN_CO_IMPORT_COUNT,
    CLUSTERING_CONSTANTS.MIN_COHESION_THRESHOLD,
  );

  for (const cluster of clusters) {
    processCluster(cluster, unassignedGraph, packageMap, assigned, suggestions);
  }
};

/** 개별 클러스터를 ChunkGroup으로 변환 */
const processCluster = (
  cluster: CoImportCluster,
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const packages = [...cluster.packages];
  const sizes = calculateSizes(packages, packageMap);

  if (sizes.totalSize < CLUSTERING_CONSTANTS.MIN_CLUSTER_SIZE) return;

  const centralPkg = findCentralPackage(graph, cluster.packages);
  const chunkGroup = buildChunkGroup(packages, sizes, cluster, centralPkg);

  suggestions.push(chunkGroup);
  packages.forEach((pkg) => assigned.add(pkg));
};

/** ChunkGroup 객체 생성 */
const buildChunkGroup = (
  packages: string[],
  sizes: { totalSize: number; gzipSize: number; brotliSize: number },
  cluster: CoImportCluster,
  centralPkg: string,
): ChunkGroup => ({
  name: `vendor/${generateSafeName(centralPkg)}`,
  patterns: packages,
  estimatedSize: sizes.totalSize,
  gzipSize: sizes.gzipSize,
  brotliSize: sizes.brotliSize,
  reason: `Co-imported cluster (cohesion: ${cluster.cohesion.toFixed(2)}, avg freq: ${cluster.coImportFreq.toFixed(1)}x)`,
  metadata: {
    clusteringMethod: 'graph-based',
    cohesion: cluster.cohesion,
    coImportFrequency: cluster.coImportFreq,
    centralPackage: centralPkg,
  },
});

/** 서브그래프 생성 (특정 패키지들만 포함) */
const createSubgraph = (
  graph: DependencyGraph,
  packages: string[],
): DependencyGraph => {
  const packageSet = new Set(packages);

  return {
    packages: buildPackagesMap(graph, packages),
    edges: buildEdgesMap(graph, packages, packageSet),
  };
};

/** 패키지 노드 맵 생성 */
const buildPackagesMap = (
  graph: DependencyGraph,
  packages: string[],
): DependencyGraph['packages'] => {
  const packagesMap = new Map<
    string,
    DependencyGraph['packages'] extends Map<string, infer V> ? V : never
  >();

  for (const pkg of packages) {
    const node = graph.packages.get(pkg);
    if (node) packagesMap.set(pkg, node);
  }

  return packagesMap;
};

/** 엣지 맵 생성 */
const buildEdgesMap = (
  graph: DependencyGraph,
  packages: string[],
  packageSet: Set<string>,
): DependencyGraph['edges'] => {
  const edgesMap = new Map<string, Set<string>>();

  for (const pkg of packages) {
    const edges = graph.edges.get(pkg);
    if (!edges) continue;

    const filteredEdges = new Set(
      [...edges].filter((target) => packageSet.has(target)),
    );
    if (filteredEdges.size > 0) edgesMap.set(pkg, filteredEdges);
  }

  return edgesMap;
};

/** 클러스터의 중심 패키지 찾기 (Centrality 기반) */
const findCentralPackage = (
  graph: DependencyGraph,
  cluster: Set<string>,
): string => {
  let maxCentrality = -1;
  let centralPkg = [...cluster][0];

  for (const pkg of cluster) {
    const centrality = calculateCentrality(graph, pkg);
    if (centrality > maxCentrality) {
      maxCentrality = centrality;
      centralPkg = pkg;
    }
  }

  return centralPkg;
};
