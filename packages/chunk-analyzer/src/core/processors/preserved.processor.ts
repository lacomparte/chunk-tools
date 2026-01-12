import type {
  AnalyzerOptions,
  ChunkGroup,
  PackageInfo,
  PreservedChunk,
} from '../../types/index.js';
import {
  calculateSizes,
  type SizeResult,
} from '../../utils/calculate-sizes.util.js';
import { findMatchedPackages } from '../../utils/find-matched-packages.util.js';
import { formatSize } from '../../utils/format-size.util.js';
import type { DependencyGraph } from '../dependency-graph.js';

type SizeGroup = {
  packages: string[];
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
};

/** Preserved 청크 처리 */
export const processPreservedChunks = (
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  opts: Required<AnalyzerOptions>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  if (!opts.preservedChunks?.length) return;

  console.log(
    `\n📊 Processing ${opts.preservedChunks.length} preserved chunks...`,
  );

  for (const preserved of opts.preservedChunks) {
    processPreservedChunk(
      preserved,
      graph,
      packageMap,
      opts,
      assigned,
      suggestions,
    );
  }
};

/** 개별 preserved 청크 처리 */
const processPreservedChunk = (
  preserved: PreservedChunk,
  graph: DependencyGraph,
  packageMap: Map<string, PackageInfo>,
  opts: Required<AnalyzerOptions>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  logChunkInfo(preserved);

  const matched = findMatchedPackages(graph, preserved.patterns);
  if (!validateMatched(matched, preserved.name)) return;

  const sizes = calculateSizes(matched, packageMap);
  const maxSize = preserved.maxSize ?? opts.initialChunkMaxSize;
  const splitStrategy = preserved.splitStrategy ?? 'manual';

  if (sizes.gzipSize > maxSize) {
    handleOversizedChunk(
      preserved,
      matched,
      sizes,
      maxSize,
      splitStrategy,
      packageMap,
      assigned,
      suggestions,
    );
  } else {
    addPreservedChunk(
      preserved.name,
      matched,
      sizes,
      preserved.reason ?? 'Preserved chunk',
      suggestions,
    );
    matched.forEach((pkg) => assigned.add(pkg));
  }
};

/** 청크 정보 로깅 */
const logChunkInfo = (preserved: PreservedChunk): void => {
  console.log(`\n🔍 Processing preserved chunk: ${preserved.name}`);
  console.log(`   Patterns: ${preserved.patterns.join(', ')}`);
};

/** 매칭 결과 검증 */
const validateMatched = (matched: string[], name: string): boolean => {
  const preview =
    matched.length > 5
      ? `${matched.slice(0, 5).join(', ')}...`
      : matched.join(', ');
  console.log(`   Matched ${matched.length} packages: ${preview}`);

  if (matched.length === 0) {
    console.warn(`⚠️  No packages matched for preserved chunk: ${name}`);
    return false;
  }
  return true;
};

/** 크기 초과 청크 처리 */
const handleOversizedChunk = (
  preserved: PreservedChunk,
  matched: string[],
  sizes: SizeResult,
  maxSize: number,
  splitStrategy: string,
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  console.warn(
    `⚠️  ${preserved.name} (${formatSize(sizes.gzipSize)} gzipped) exceeds maxSize ${formatSize(maxSize)}`,
  );

  if (splitStrategy === 'auto') {
    processAutoSplit(
      preserved.name,
      matched,
      maxSize,
      packageMap,
      assigned,
      suggestions,
    );
  } else {
    console.log(
      `💡 Recommendation: Split ${preserved.name} into smaller chunks (<${formatSize(maxSize)})`,
    );
    addPreservedChunk(
      preserved.name,
      matched,
      sizes,
      preserved.reason ?? 'Preserved chunk (manual)',
      suggestions,
    );
    matched.forEach((pkg) => assigned.add(pkg));
  }
};

/** 자동 분할 처리 */
const processAutoSplit = (
  name: string,
  matched: string[],
  maxSize: number,
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  console.log(`📊 Auto-split suggestions for ${name}:`);
  const groups = autoSplitBySize(matched, packageMap, maxSize);

  for (const [index, group] of groups.entries()) {
    addSplitChunk(name, index, group, suggestions);
    console.log(
      `  - ${name}-${index + 1}.js: ${group.packages.join(', ')} (${formatSize(group.gzipSize)} gzipped)`,
    );
    group.packages.forEach((pkg) => assigned.add(pkg));
  }
};

/** Preserved 청크 추가 */
const addPreservedChunk = (
  name: string,
  patterns: string[],
  sizes: SizeResult,
  reason: string,
  suggestions: ChunkGroup[],
): void => {
  suggestions.push({
    name,
    patterns,
    estimatedSize: sizes.totalSize,
    gzipSize: sizes.gzipSize,
    brotliSize: sizes.brotliSize,
    reason,
    metadata: { clusteringMethod: 'preserved' },
  });
};

/** 분할 청크 추가 */
const addSplitChunk = (
  baseName: string,
  index: number,
  group: SizeGroup,
  suggestions: ChunkGroup[],
): void => {
  suggestions.push({
    name: `${baseName}-${index + 1}`,
    patterns: group.packages,
    estimatedSize: group.totalSize,
    gzipSize: group.gzipSize,
    brotliSize: group.brotliSize,
    reason: `Auto-split from ${baseName} (TCP optimization)`,
    metadata: {
      clusteringMethod: 'preserved',
      splitIndex: index + 1,
      originalChunkName: baseName,
    },
  });
};

/** 크기 기준 자동 분할 */
const autoSplitBySize = (
  packages: string[],
  packageMap: Map<string, PackageInfo>,
  maxSize: number,
): SizeGroup[] => {
  const sorted = sortPackagesBySize(packages, packageMap);
  return groupPackagesBySize(sorted, maxSize);
};

/** 패키지를 크기순으로 정렬 */
const sortPackagesBySize = (
  packages: string[],
  packageMap: Map<string, PackageInfo>,
): PackageInfo[] =>
  packages
    .map((name) => {
      const pkg = packageMap.get(name);
      if (!pkg) console.warn(`⚠️  Package not found in packageMap: ${name}`);
      return pkg;
    })
    .filter((pkg): pkg is PackageInfo => pkg !== undefined)
    .sort((a, b) => b.gzipSize - a.gzipSize);

/** 패키지를 크기 제한에 맞게 그룹화 */
const groupPackagesBySize = (
  sorted: PackageInfo[],
  maxSize: number,
): SizeGroup[] => {
  const groups: SizeGroup[] = [];
  let current: SizeGroup = {
    packages: [],
    totalSize: 0,
    gzipSize: 0,
    brotliSize: 0,
  };

  for (const pkg of sorted) {
    if (
      current.gzipSize + pkg.gzipSize > maxSize &&
      current.packages.length > 0
    ) {
      groups.push(current);
      current = { packages: [], totalSize: 0, gzipSize: 0, brotliSize: 0 };
    }
    current.packages.push(pkg.name);
    current.totalSize += pkg.totalSize;
    current.gzipSize += pkg.gzipSize;
    current.brotliSize += pkg.brotliSize;
  }

  if (current.packages.length > 0) groups.push(current);
  return groups;
};
