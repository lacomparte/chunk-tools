import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCKFILE_NAMES = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
];

/**
 * 현재 디렉토리에서 lockfile을 찾습니다.
 * 모노레포 지원을 위해 상위 디렉토리를 최대 5단계까지 탐색합니다.
 * 우선순위: pnpm-lock.yaml > package-lock.json > yarn.lock > bun.lockb
 */
export const findLockfile = (cwd: string = process.cwd()): string | null => {
  let currentDir = cwd;
  const maxDepth = 5;

  for (let depth = 0; depth < maxDepth; depth++) {
    for (const lockfileName of LOCKFILE_NAMES) {
      const lockfilePath = resolve(currentDir, lockfileName);
      if (existsSync(lockfilePath)) {
        return lockfilePath;
      }
    }

    // 상위 디렉토리로 이동
    const parentDir = resolve(currentDir, '..');
    if (parentDir === currentDir) {
      // 루트에 도달
      break;
    }
    currentDir = parentDir;
  }

  return null;
};

/**
 * lockfile의 MD5 해시를 계산합니다.
 * ~600KB 파일 기준 약 7ms 소요
 */
export const calculateLockfileHash = (cwd: string = process.cwd()): string | null => {
  const lockfilePath = findLockfile(cwd);

  if (!lockfilePath) {
    return null;
  }

  const content = readFileSync(lockfilePath);
  return createHash('md5').update(content).digest('hex');
};

/**
 * 기존 config 파일에서 CACHE_KEY를 추출합니다.
 */
export const extractCacheKeyFromConfig = (configPath: string): string | null => {
  if (!existsSync(configPath)) {
    return null;
  }

  const content = readFileSync(configPath, 'utf-8');

  // export const CACHE_KEY = "abc123..."; 형식에서 추출
  const match = content.match(/export\s+const\s+CACHE_KEY\s*=\s*["']([^"']+)["']/);

  return match ? match[1] : null;
};

/**
 * 캐시가 유효한지 확인합니다.
 * lockfile 해시가 기존 config의 CACHE_KEY와 일치하면 true
 */
export const isCacheValid = (configPath: string, cwd: string = process.cwd()): boolean => {
  const existingCacheKey = extractCacheKeyFromConfig(configPath);

  if (!existingCacheKey) {
    return false;
  }

  const currentHash = calculateLockfileHash(cwd);

  if (!currentHash) {
    return false;
  }

  return existingCacheKey === currentHash;
};
