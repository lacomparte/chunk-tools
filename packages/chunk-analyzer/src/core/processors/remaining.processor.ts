import type { ChunkGroup, PackageInfo } from '../../types/index.js';
import { calculateSizes } from '../../utils/calculate-sizes.util.js';
import { formatSize } from '../../utils/format-size.util.js';

/**
 * 남은 패키지들을 misc 그룹으로 묶기
 */
export const processRemainingPackages = (
  packageMap: Map<string, PackageInfo>,
  assigned: Set<string>,
  suggestions: ChunkGroup[],
): void => {
  const remaining = [...packageMap.keys()].filter(
    (name) => !assigned.has(name),
  );
  if (remaining.length === 0) return;

  const { totalSize, gzipSize, brotliSize } = calculateSizes(
    remaining,
    packageMap,
  );

  suggestions.push({
    name: 'vendor/misc',
    patterns: remaining,
    estimatedSize: totalSize,
    gzipSize,
    brotliSize,
    reason: `Miscellaneous ${remaining.length} packages (${formatSize(totalSize)})`,
    metadata: {
      clusteringMethod: 'misc',
    },
  });
};
