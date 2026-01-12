import { DEFAULT_OPTIONS } from '../constants/defaults.constant.js';
import type {
  AnalyzerOptions,
  ChunkGroup,
  PackageInfo,
} from '../types/index.js';
import { formatSize } from '../utils/format-size.util.js';
import { filterIgnoredPackages } from '../utils/ignore-file.util.js';
import { generateSafeName } from '../utils/package-name.util.js';

/**
 * 간단한 패키지 기반 분석
 *
 * 이 함수는 의존성 그래프 없이 패키지 정보만으로 분석합니다.
 * customGroups만 사용하며, 프레임워크별 최적화는 제공하지 않습니다.
 *
 * 프레임워크 최적화가 필요한 경우 analyzeWithDependencyGraph()를 사용하세요.
 */
export const analyzePackages = (
  packages: PackageInfo[],
  options: AnalyzerOptions = {},
): ChunkGroup[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const assigned = new Set<string>();
  const suggestions: ChunkGroup[] = [];

  const filteredPackages = filterIgnoredPackages(packages, opts.ignore);

  // customGroups만 처리 (기본 그룹 없음)
  if (opts.customGroups) {
    processCustomGroups(
      filteredPackages,
      opts.customGroups,
      assigned,
      suggestions,
    );
  }

  processLargePackages(filteredPackages, opts, assigned, suggestions);
  processRemainingPackages(filteredPackages, assigned, suggestions);

  return suggestions.sort((a, b) => b.estimatedSize - a.estimatedSize);
};

const processCustomGroups = (
  packages: PackageInfo[],
  customGroups: Record<string, string[]>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  for (const [groupKey, patterns] of Object.entries(customGroups)) {
    const matched = findMatchedPackages(packages, patterns);
    if (matched.length === 0) continue;

    suggestions.push(
      createChunkGroup(groupKey, matched, `Custom group: ${groupKey}`),
    );
    matched.forEach((pkg) => assigned.add(pkg.name));
  }
};

const findMatchedPackages = (
  packages: PackageInfo[],
  patterns: string[],
): PackageInfo[] =>
  packages.filter((pkg) =>
    patterns.some(
      (pattern) => pkg.name === pattern || pkg.name.startsWith(`${pattern}/`),
    ),
  );

const createChunkGroup = (
  name: string,
  packages: PackageInfo[],
  reason: string,
): ChunkGroup => ({
  name: `vendor/${name}`,
  patterns: packages.map((pkg) => pkg.name),
  estimatedSize: packages.reduce((sum, pkg) => sum + pkg.totalSize, 0),
  gzipSize: packages.reduce((sum, pkg) => sum + pkg.gzipSize, 0),
  brotliSize: packages.reduce((sum, pkg) => sum + pkg.brotliSize, 0),
  reason,
});

const processLargePackages = (
  packages: PackageInfo[],
  opts: Required<AnalyzerOptions>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const large = packages.filter(
    (pkg) =>
      !assigned.has(pkg.name) && pkg.totalSize >= opts.largePackageThreshold,
  );

  for (const pkg of large) {
    const safeName = generateSafeName(pkg.name);
    suggestions.push({
      name: `vendor/${safeName}`,
      patterns: [pkg.name],
      estimatedSize: pkg.totalSize,
      gzipSize: pkg.gzipSize,
      brotliSize: pkg.brotliSize,
      reason: `큰 패키지 (${formatSize(pkg.totalSize)})`,
    });
    assigned.add(pkg.name);
  }
};

const processRemainingPackages = (
  packages: PackageInfo[],
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const remaining = packages.filter((pkg) => !assigned.has(pkg.name));
  if (remaining.length === 0) return;

  suggestions.push({
    name: 'vendor/misc',
    patterns: remaining.map((p) => p.name),
    estimatedSize: remaining.reduce((sum, pkg) => sum + pkg.totalSize, 0),
    gzipSize: remaining.reduce((sum, pkg) => sum + pkg.gzipSize, 0),
    brotliSize: remaining.reduce((sum, pkg) => sum + pkg.brotliSize, 0),
    reason: `기타 패키지 ${remaining.length}개`,
  });
};
