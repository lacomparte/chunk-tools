import { DEFAULT_OPTIONS } from '../constants/defaults.constant.js';
import { KNOWN_GROUPS } from '../constants/known-groups.constant.js';
import type {
  AnalyzerOptions,
  ChunkGroup,
  PackageInfo,
} from '../types/index.js';
import { formatSize } from '../utils/format-size.util.js';
import { filterIgnoredPackages } from '../utils/ignore-file.util.js';

export const analyzePackages = (
  packages: PackageInfo[],
  options: AnalyzerOptions = {},
): ChunkGroup[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const assigned = new Set<string>();
  const suggestions: ChunkGroup[] = [];

  const filteredPackages = filterIgnoredPackages(packages, opts.ignore);
  const allGroups = mergeGroups(opts.customGroups);

  processKnownGroups(filteredPackages, allGroups, assigned, suggestions);
  processLargePackages(filteredPackages, opts, assigned, suggestions);
  processRemainingPackages(filteredPackages, assigned, suggestions);

  return suggestions.sort((a, b) => b.estimatedSize - a.estimatedSize);
};

const mergeGroups = (
  customGroups: Record<string, string[]>,
): Record<string, { patterns: string[]; description: string }> => {
  const merged = { ...KNOWN_GROUPS };
  for (const [name, patterns] of Object.entries(customGroups)) {
    merged[name] = { patterns, description: `커스텀 그룹: ${name}` };
  }
  return merged;
};

const processKnownGroups = (
  packages: PackageInfo[],
  groups: Record<string, { patterns: string[]; description: string }>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  for (const [groupKey, groupDef] of Object.entries(groups)) {
    const matched = findMatchedPackages(packages, groupDef.patterns);
    if (matched.length === 0) continue;

    suggestions.push(createChunkGroup(groupKey, matched, groupDef.description));
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
    const safeName = pkg.name.replace(/[@/]/g, '-').replace(/^-/, '');
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
