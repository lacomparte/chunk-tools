import type { GroupDefinition } from '../../constants/framework-groups/index.js';
import type { ChunkGroup, PackageInfo } from '../../types/index.js';
import { calculateSizes } from '../../utils/calculate-sizes.util.js';
import { findMatchedPackages } from '../../utils/find-matched-packages.util.js';
import type { DependencyGraph } from '../dependency-graph.js';

/**
 * 프레임워크 코어 그룹 처리
 *
 * Critical 우선순위 그룹만 처리합니다 (react-core, vue-core, svelte-core, angular-core)
 */
export const processFrameworkCoreGroups = (
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
  frameworkGroups: Record<string, GroupDefinition>,
  criticalGroupKeys: string[],
): void => {
  for (const groupKey of criticalGroupKeys) {
    processGroup(
      groupKey,
      graph,
      packageMap,
      assigned,
      suggestions,
      frameworkGroups,
    );
  }
};

/** 개별 그룹 처리 */
const processGroup = (
  groupKey: string,
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
  frameworkGroups: Record<string, GroupDefinition>,
): void => {
  const groupDef = frameworkGroups[groupKey];
  if (!groupDef) return;

  const matched = findMatchedPackages(graph, groupDef.patterns);
  if (matched.length === 0) return;

  const sizes = calculateSizes(matched, packageMap);
  suggestions.push(buildChunkGroup(groupKey, matched, sizes, groupDef));
  matched.forEach((name) => assigned.add(name));
};

/** ChunkGroup 객체 생성 */
const buildChunkGroup = (
  groupKey: string,
  matched: string[],
  sizes: { totalSize: number; gzipSize: number; brotliSize: number },
  groupDef: GroupDefinition,
): ChunkGroup => ({
  name: `vendor/${groupKey}`,
  patterns: matched,
  estimatedSize: sizes.totalSize,
  gzipSize: sizes.gzipSize,
  brotliSize: sizes.brotliSize,
  reason: groupDef.reason,
  metadata: {
    clusteringMethod: 'framework-core',
    priority: groupDef.priority,
    description: groupDef.description,
  },
});
