import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import picomatch from 'picomatch';

const IGNORE_FILE_NAME = '.chunkgroupignore';

type ParsedPattern = {
  pattern: string;
  negated: boolean;
  matcher: (input: string) => boolean;
};

/**
 * .chunkgroupignore 파일 경로를 찾습니다.
 * @param cwd 탐색 시작 디렉토리 (기본값: process.cwd())
 * @returns 파일 경로 또는 null
 */
export const findIgnoreFile = (cwd: string = process.cwd()): string | null => {
  const filePath = resolve(cwd, IGNORE_FILE_NAME);
  return existsSync(filePath) ? filePath : null;
};

/**
 * .chunkgroupignore 파일을 파싱하여 패턴 배열로 반환합니다.
 * - # 주석 무시
 * - 빈 줄 무시
 * - 인라인 주석 제거 (# 이후)
 * @param filePath 파일 경로
 * @returns 패턴 배열
 */
export const parseIgnoreFile = (filePath: string): string[] => {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');

  return content
    .split('\n')
    .map((line) => {
      // 인라인 주석 제거 (# 이후, 단 패턴 시작의 !는 유지)
      const commentIndex = line.indexOf('#');
      const trimmed =
        commentIndex > 0 ? line.slice(0, commentIndex).trim() : line.trim();
      return trimmed;
    })
    .filter((line) => line && !line.startsWith('#'));
};

/**
 * 패턴 문자열을 파싱하여 matcher 함수를 생성합니다.
 */
const parsePattern = (pattern: string): ParsedPattern => {
  const negated = pattern.startsWith('!');
  const actualPattern = negated ? pattern.slice(1) : pattern;

  // picomatch로 glob 패턴 매칭
  const matcher = picomatch(actualPattern, {
    dot: true, // .으로 시작하는 패키지도 매칭
    nocase: false, // 대소문자 구분
  });

  return {
    pattern: actualPattern,
    negated,
    matcher,
  };
};

/**
 * 패키지명이 ignore 패턴에 매칭되는지 확인합니다.
 * .gitignore와 같이 마지막 매칭 결과가 최종 결정입니다.
 *
 * @param packageName 패키지명
 * @param patterns ignore 패턴 배열
 * @returns true면 제외, false면 포함
 */
export const shouldIgnorePackage = (
  packageName: string,
  patterns: string[],
): boolean => {
  if (patterns.length === 0) {
    return false;
  }

  const parsedPatterns = patterns.map(parsePattern);

  // 마지막으로 매칭된 패턴의 negated 값으로 결정
  // negated=false면 제외, negated=true면 포함(제외 취소)
  let ignored = false;

  for (const { matcher, negated } of parsedPatterns) {
    if (matcher(packageName)) {
      ignored = !negated; // negated면 포함(ignored=false), 아니면 제외(ignored=true)
    }
  }

  return ignored;
};

/**
 * 패키지 배열에서 ignore 패턴에 매칭되는 패키지를 필터링합니다.
 *
 * @param packages 패키지 배열
 * @param patterns ignore 패턴 배열
 * @returns 필터링된 패키지 배열
 */
export const filterIgnoredPackages = <T extends { name: string }>(
  packages: T[],
  patterns: string[],
): T[] => {
  if (patterns.length === 0) {
    return packages;
  }

  return packages.filter((pkg) => !shouldIgnorePackage(pkg.name, patterns));
};
