import pc from 'picocolors';

import type {
  AnalysisResult,
  ChunkGroup,
  PackageInfo,
} from '../types/index.js';
import { formatSize } from '../utils/format-size.util.js';

/**
 * 원본 크기와 압축 크기를 포맷팅합니다.
 * gzip/brotli 중 사용 가능한 것만 표시합니다.
 */
const formatSizeWithCompression = (
  rawSize: number,
  gzipSize: number,
  brotliSize?: number,
): string => {
  const raw = formatSize(rawSize);
  const hasGzip = gzipSize > 0;
  const hasBrotli = brotliSize && brotliSize > 0;

  if (hasGzip && hasBrotli) {
    return `${raw} → gzip: ${formatSize(gzipSize)} / brotli: ${formatSize(brotliSize)}`;
  }
  if (hasGzip) {
    return `${raw} → gzip: ${formatSize(gzipSize)}`;
  }
  if (hasBrotli) {
    return `${raw} → brotli: ${formatSize(brotliSize)}`;
  }

  return raw;
};

/**
 * reason 문자열에서 기존 크기 정보를 제거합니다.
 * 예: "큰 패키지 (385.8KB)" → "큰 패키지"
 */
const stripSizeFromReason = (reason: string): string =>
  reason.replace(/\s*\([^)]*[KMG]?B\)\s*$/, '').trim();

/**
 * config 파일용 크기 정보 포맷팅
 * 예: "(385.8KB) (gzip: 130.4KB, brotli: 113.9KB)"
 */
const formatConfigSizeComment = (
  rawSize: number,
  gzipSize: number,
  brotliSize?: number,
): string => {
  const raw = formatSize(rawSize);
  const hasGzip = gzipSize > 0;
  const hasBrotli = brotliSize && brotliSize > 0;

  if (hasGzip && hasBrotli) {
    return `(${raw}) (gzip: ${formatSize(gzipSize)}, brotli: ${formatSize(brotliSize)})`;
  }
  if (hasGzip) {
    return `(${raw}) (gzip: ${formatSize(gzipSize)})`;
  }
  if (hasBrotli) {
    return `(${raw}) (brotli: ${formatSize(brotliSize)})`;
  }
  return `(${raw})`;
};

export const createAnalysisResult = (
  packages: PackageInfo[],
  suggestions: ChunkGroup[],
): AnalysisResult => ({
  packages,
  suggestedGroups: suggestions,
  summary: {
    totalSize: packages.reduce((sum, pkg) => sum + pkg.totalSize, 0),
    totalGzipSize: packages.reduce((sum, pkg) => sum + pkg.gzipSize, 0),
    totalBrotliSize: packages.reduce((sum, pkg) => sum + pkg.brotliSize, 0),
    packageCount: packages.length,
    groupCount: suggestions.length,
  },
  generatedAt: new Date().toISOString(),
});

export const formatTextReport = (result: AnalysisResult): string => {
  const lines: string[] = [];

  formatHeader(lines);
  formatSummary(lines, result.summary);
  formatTop15Packages(lines, result.packages, result.summary.totalSize);
  formatSuggestedGroups(lines, result.suggestedGroups);
  formatManualChunksHelper(lines);
  formatNotes(lines);

  return lines.join('\n');
};

const formatHeader = (lines: string[]): void => {
  lines.push('');
  lines.push(pc.bold(pc.cyan('═'.repeat(60))));
  lines.push(pc.bold(pc.cyan('  Bundle Chunk Analysis Report')));
  lines.push(pc.bold(pc.cyan('═'.repeat(60))));
  lines.push('');
};

const formatSummary = (
  lines: string[],
  summary: AnalysisResult['summary'],
): void => {
  lines.push(pc.bold('Summary'));
  lines.push(pc.dim('─'.repeat(60)));

  const sizeInfo = formatSummarySizeInfo(summary);
  lines.push(`  Total size:     ${sizeInfo}`);
  lines.push(`  Packages:       ${pc.yellow(String(summary.packageCount))}`);
  lines.push(`  Chunk groups:   ${pc.yellow(String(summary.groupCount))}`);
  lines.push('');
};

const formatSummarySizeInfo = (summary: AnalysisResult['summary']): string => {
  const raw = pc.yellow(formatSize(summary.totalSize));
  const hasGzip = summary.totalGzipSize > 0;
  const hasBrotli = summary.totalBrotliSize > 0;

  if (hasGzip && hasBrotli) {
    return `${raw} → gzip: ${pc.cyan(formatSize(summary.totalGzipSize))} / brotli: ${pc.magenta(formatSize(summary.totalBrotliSize))}`;
  }
  if (hasGzip) {
    return `${raw} → gzip: ${pc.cyan(formatSize(summary.totalGzipSize))}`;
  }
  if (hasBrotli) {
    return `${raw} → brotli: ${pc.magenta(formatSize(summary.totalBrotliSize))}`;
  }
  return raw;
};

const formatTop15Packages = (
  lines: string[],
  packages: PackageInfo[],
  totalSize: number,
): void => {
  lines.push(pc.bold('Top 15 Largest Packages'));
  lines.push(pc.dim('─'.repeat(60)));

  const top15 = packages.slice(0, 15);
  const maxNameLen = Math.max(...top15.map((p) => p.name.length), 20);

  top15.forEach((pkg, i) => {
    const rank = String(i + 1).padStart(2);
    const name = pkg.name.padEnd(maxNameLen);
    const size = formatSize(pkg.totalSize).padStart(10);
    const barLen = Math.ceil((pkg.totalSize / totalSize) * 30);
    const bar = pc.green('█'.repeat(barLen));
    const compressionInfo = formatPackageCompression(pkg.gzipSize, pkg.brotliSize);

    lines.push(`  ${pc.dim(rank)}. ${name} ${pc.yellow(size)} ${compressionInfo} ${bar}`);
  });
  lines.push('');
};

const formatPackageCompression = (gzipSize: number, brotliSize: number): string => {
  const hasGzip = gzipSize > 0;
  const hasBrotli = brotliSize > 0;

  if (hasGzip && hasBrotli) {
    return pc.dim(`→ g:${formatSize(gzipSize)} / b:${formatSize(brotliSize)}`);
  }
  if (hasGzip) {
    return pc.dim(`→ gzip: ${formatSize(gzipSize)}`);
  }
  if (hasBrotli) {
    return pc.dim(`→ brotli: ${formatSize(brotliSize)}`);
  }
  return '';
};

const formatSuggestedGroups = (
  lines: string[],
  groups: ChunkGroup[],
): void => {
  lines.push(pc.bold('Suggested CHUNK_GROUPS'));
  lines.push(pc.dim('─'.repeat(60)));
  lines.push('');
  lines.push(pc.dim('// vite.config.ts'));
  lines.push('const CHUNK_GROUPS = [');

  for (const group of groups) {
    const reasonWithoutSize = stripSizeFromReason(group.reason);
    const sizeInfo = formatSizeWithCompression(group.estimatedSize, group.gzipSize, group.brotliSize);
    lines.push(`  ${pc.dim(`// ${reasonWithoutSize} (${sizeInfo})`)}`);
    lines.push(`  {`);
    lines.push(`    name: ${pc.green(`'${group.name}'`)},`);
    formatPatterns(lines, group.patterns);
    lines.push(`  },`);
  }

  lines.push('];');
  lines.push('');
};

const formatPatterns = (lines: string[], patterns: string[]): void => {
  if (patterns.length <= 3) {
    const patternsStr = patterns.map((p) => pc.green(`'${p}'`)).join(', ');
    lines.push(`    patterns: [${patternsStr}],`);
  } else {
    lines.push(`    patterns: [`);
    patterns.forEach((p) => lines.push(`      ${pc.green(`'${p}'`)},`));
    lines.push(`    ],`);
  }
};

const formatManualChunksHelper = (lines: string[]): void => {
  lines.push(pc.dim('// manualChunks helper'));
  lines.push(pc.dim(MANUAL_CHUNKS_CODE));
  lines.push('');
};

const formatNotes = (lines: string[]): void => {
  lines.push(pc.bold(pc.yellow('Notes')));
  lines.push(pc.dim('─'.repeat(60)));
  lines.push('  • splitVendorChunkPlugin()과 manualChunks를 동시 사용하지 마세요.');
  lines.push('  • react-core 그룹은 의존성 순서 문제 방지를 위해 함께 묶으세요.');
  lines.push('  • 이 설정은 자동 생성된 추천입니다. 프로젝트에 맞게 조정하세요.');
  lines.push('');
};

const MANUAL_CHUNKS_CODE = `
export function createManualChunks(groups: ChunkGroup[] = CHUNK_GROUPS) {
  const includesAny = (id: string, patterns: string[]): boolean =>
    patterns.some((pattern) => id.includes(\`node_modules/\${pattern}\`));

  return (id: string): string | undefined => {
    if (!id.includes('node_modules')) return;

    const matchedGroup = groups.find((group) => includesAny(id, group.patterns));
    if (matchedGroup) return matchedGroup.name;

    const match = id.match(/node_modules\\/((?:@[^/]+\\/)?[^/]+)/);
    return match ? \`vendor/\${match[1]}\` : undefined;
  };
}
`.trim();

export const generateConfigCode = (
  suggestions: ChunkGroup[],
  cacheKey?: string,
): string => {
  const lines: string[] = [];

  lines.push(`// Auto-generated by chunk-analyzer`);
  lines.push(`// Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('export type ChunkGroup = { name: string; patterns: string[] };');
  lines.push('');

  // lockfile 해시 기반 캐시키 (의존성 변경 감지용)
  if (cacheKey) {
    lines.push(`// Lockfile hash for cache invalidation`);
    lines.push(`export const CACHE_KEY = '${cacheKey}';`);
    lines.push('');
  }

  lines.push('export const CHUNK_GROUPS: ChunkGroup[] = [');

  for (const group of suggestions) {
    const reasonWithoutSize = stripSizeFromReason(group.reason);
    const sizeInfo = formatConfigSizeComment(group.estimatedSize, group.gzipSize, group.brotliSize);
    lines.push(`  // ${reasonWithoutSize} ${sizeInfo}`);
    lines.push(`  {`);
    lines.push(`    name: '${group.name}',`);
    formatPatternsPlain(lines, group.patterns);
    lines.push(`  },`);
  }

  lines.push('];');
  lines.push('');
  lines.push(MANUAL_CHUNKS_CODE);

  return lines.join('\n');
};

const formatPatternsPlain = (lines: string[], patterns: string[]): void => {
  if (patterns.length <= 3) {
    lines.push(`    patterns: [${patterns.map((p) => `'${p}'`).join(', ')}],`);
  } else {
    lines.push(`    patterns: [`);
    patterns.forEach((p) => lines.push(`      '${p}',`));
    lines.push(`    ],`);
  }
};
