import type {
  AnalyzerOptions,
  ChunkGroup,
  PackageInfo,
} from '../../types/index.js';
import {
  calculateSizes,
  type SizeResult,
} from '../../utils/calculate-sizes.util.js';
import { findMatchedPackages } from '../../utils/find-matched-packages.util.js';
import type { DependencyGraph } from '../dependency-graph.js';

/**
 * 사용자 정의 그룹 처리 (최우선 단계)
 *
 * customGroups에 정의된 패키지 그룹을 가장 먼저 처리합니다.
 * 여기서 할당된 패키지는 이후 단계(preserved, framework-core 등)에서 제외됩니다.
 */
export const processCustomGroups = (
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  opts: Required<AnalyzerOptions>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  if (!opts.customGroups || Object.keys(opts.customGroups).length === 0) return;

  console.log(
    `\n📦 Processing ${Object.keys(opts.customGroups).length} custom groups...`,
  );

  for (const [groupName, patterns] of Object.entries(opts.customGroups)) {
    processGroup(groupName, patterns, graph, packageMap, assigned, suggestions);
  }
};

/** 개별 커스텀 그룹 처리 */
const processGroup = (
  groupName: string,
  patterns: string[],
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const matched = findMatchedPackages(graph, patterns);
  if (!validateMatched(matched, groupName)) return;

  const unassigned = filterUnassigned(matched, assigned, groupName);
  if (!unassigned) return;

  addCustomChunk(groupName, unassigned, packageMap, assigned, suggestions);
};

/** 매칭 결과 검증 */
const validateMatched = (matched: string[], groupName: string): boolean => {
  if (matched.length === 0) {
    console.warn(`⚠️  No packages matched for custom group: ${groupName}`);
    return false;
  }
  return true;
};

/** 미할당 패키지 필터링 */
const filterUnassigned = (
  matched: string[],
  assigned: Set<string>,
  groupName: string,
): string[] | null => {
  const unassigned = matched.filter((pkg) => !assigned.has(pkg));
  if (unassigned.length === 0) {
    console.warn(
      `⚠️  All packages in ${groupName} are already assigned to other groups`,
    );
    return null;
  }
  return unassigned;
};

/** 커스텀 청크 추가 */
const addCustomChunk = (
  groupName: string,
  packages: string[],
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const sizes = calculateSizes(packages, packageMap);
  suggestions.push(buildChunkGroup(groupName, packages, sizes));
  packages.forEach((pkg) => assigned.add(pkg));
  console.log(`   ✓ ${groupName}: ${packages.length} packages`);
};

/** ChunkGroup 객체 생성 */
const buildChunkGroup = (
  name: string,
  patterns: string[],
  sizes: SizeResult,
): ChunkGroup => ({
  name,
  patterns,
  estimatedSize: sizes.totalSize,
  gzipSize: sizes.gzipSize,
  brotliSize: sizes.brotliSize,
  reason: 'User-defined custom group',
  metadata: { clusteringMethod: 'custom' },
});
