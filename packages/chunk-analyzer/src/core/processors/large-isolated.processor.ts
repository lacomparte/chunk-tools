import { CLUSTERING_CONSTANTS } from '../../constants/clustering.constant.js';
import type { AnalyzerOptions, ChunkGroup } from '../../types/index.js';
import { formatSize } from '../../utils/format-size.util.js';
import { generateSafeName } from '../../utils/package-name.util.js';
import type { DependencyGraph, PackageNode } from '../dependency-graph.js';

/**
 * 대형 패키지 개별 분리
 *
 * 크기 임계값 이상이면서 독립적이거나 매우 큰 패키지는 개별 청크로 분리
 */
export const processLargeIsolatedPackages = (
  graph: DependencyGraph,
  opts: Required<AnalyzerOptions>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const candidates = getLargePackageCandidates(
    graph,
    opts.largePackageThreshold,
    assigned,
  );

  for (const [pkgName, node] of candidates) {
    if (shouldIsolate(node, assigned)) {
      suggestions.push(buildChunkGroup(pkgName, node));
      assigned.add(pkgName);
    }
  }
};

/** 대형 패키지 후보 필터링 및 정렬 */
const getLargePackageCandidates = (
  graph: DependencyGraph,
  threshold: number,
  assigned: Set<string>,
): Array<[string, PackageNode]> =>
  Array.from(graph.packages.entries())
    .filter(
      ([name, node]) => !assigned.has(name) && node.totalSize >= threshold,
    )
    .sort((a, b) => b[1].totalSize - a[1].totalSize);

/** 개별 분리 여부 판단 */
const shouldIsolate = (node: PackageNode, assigned: Set<string>): boolean => {
  const unassignedImporters = [...node.importedBy].filter(
    (imp) => !assigned.has(imp),
  );
  return (
    unassignedImporters.length <= CLUSTERING_CONSTANTS.MAX_ISOLATED_IMPORTERS ||
    node.totalSize >= CLUSTERING_CONSTANTS.VERY_LARGE_PACKAGE_THRESHOLD
  );
};

/** ChunkGroup 객체 생성 */
const buildChunkGroup = (pkgName: string, node: PackageNode): ChunkGroup => ({
  name: `vendor/${generateSafeName(pkgName)}`,
  patterns: [pkgName],
  estimatedSize: node.totalSize,
  gzipSize: node.gzipSize,
  brotliSize: node.brotliSize,
  reason: `Large package (${formatSize(node.totalSize)})`,
  metadata: { clusteringMethod: 'large-isolated' },
});
