import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * .ignoresecurity 파일 이름
 */
const IGNORE_FILE_NAME = '.ignoresecurity';

/**
 * .ignoresecurity 파일을 찾습니다.
 * 현재 디렉토리부터 상위로 탐색합니다.
 */
export const findIgnoreFile = (cwd?: string): string | null => {
  const startDir = cwd ?? process.cwd();
  let currentDir = startDir;

  // 최대 10단계까지 상위 디렉토리 탐색
  for (let i = 0; i < 10; i++) {
    const ignoreFilePath = resolve(currentDir, IGNORE_FILE_NAME);
    if (existsSync(ignoreFilePath)) {
      return ignoreFilePath;
    }

    const parentDir = resolve(currentDir, '..');
    if (parentDir === currentDir) {
      // 루트 디렉토리에 도달
      break;
    }
    currentDir = parentDir;
  }

  return null;
};

/**
 * .ignoresecurity 파일을 파싱하여 무시할 규칙 key 목록을 반환합니다.
 *
 * 파일 형식:
 * - 한 줄에 하나의 규칙 key
 * - # 으로 시작하면 주석
 * - 빈 줄은 무시
 *
 * 예시:
 * ```
 * # 이 파일에서 eval 사용이 필요함
 * eval
 *
 * # React의 dangerouslySetInnerHTML 허용
 * dangerouslySetInnerHTML
 *
 * # 특정 RSC 모듈 허용
 * rsc-prisma
 * rsc-lib-db
 * ```
 */
export const parseIgnoreFile = (filePath: string): string[] => {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const rules: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 빈 줄 무시
    if (trimmed === '') continue;

    // 주석 무시
    if (trimmed.startsWith('#')) continue;

    rules.push(trimmed);
  }

  return rules;
};

/**
 * .ignoresecurity 파일을 찾아서 파싱합니다.
 * 파일이 없으면 빈 배열을 반환합니다.
 */
export const loadIgnoreRules = (cwd?: string): string[] => {
  const ignoreFilePath = findIgnoreFile(cwd);
  if (!ignoreFilePath) {
    return [];
  }
  return parseIgnoreFile(ignoreFilePath);
};
