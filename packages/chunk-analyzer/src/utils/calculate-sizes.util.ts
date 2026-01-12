import type { PackageInfo } from '../types/index.js';

/**
 * 패키지 크기 계산 결과
 */
export type SizeResult = {
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
};

/**
 * 패키지 목록의 총 크기 계산
 *
 * @param packages 패키지 이름 배열
 * @param packageMap 패키지 정보 맵
 * @returns 총 크기, gzip 크기, brotli 크기
 */
export const calculateSizes = (
  packages: string[],
  packageMap: Map<string, PackageInfo>,
): SizeResult => {
  let totalSize = 0;
  let gzipSize = 0;
  let brotliSize = 0;

  for (const name of packages) {
    const pkg = packageMap.get(name);
    if (pkg) {
      totalSize += pkg.totalSize;
      gzipSize += pkg.gzipSize;
      brotliSize += pkg.brotliSize;
    }
  }

  return { totalSize, gzipSize, brotliSize };
};
