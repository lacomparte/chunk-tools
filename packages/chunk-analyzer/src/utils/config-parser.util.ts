import { existsSync, readFileSync } from 'node:fs';

import type { ChunkGroup } from '../types/index.js';

/**
 * 기존 chunk-groups.config.ts 파일에서 CHUNK_GROUPS 배열을 파싱합니다.
 * TypeScript/JavaScript 파일에서 CHUNK_GROUPS 배열을 추출합니다.
 *
 * @param configPath - config 파일 경로
 * @returns ChunkGroup 배열 또는 null (파일이 없거나 파싱 실패 시)
 */
export const parseExistingConfig = (
  configPath: string,
): ChunkGroup[] | null => {
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return parseChunkGroupsFromContent(content);
  } catch {
    return null;
  }
};

/**
 * 파일 내용에서 CHUNK_GROUPS 배열을 추출합니다.
 * 정규식으로 객체 배열을 파싱합니다.
 */
const parseChunkGroupsFromContent = (content: string): ChunkGroup[] | null => {
  // CHUNK_GROUPS 배열 찾기
  const arrayMatch = content.match(
    /export const CHUNK_GROUPS[^=]*=\s*\[([\s\S]*?)\];/,
  );

  if (!arrayMatch || !arrayMatch[1]) {
    return null;
  }

  const arrayContent = arrayMatch[1].trim();

  // 빈 배열인 경우
  if (!arrayContent) {
    return [];
  }

  return parseArrayContent(arrayContent);
};

/**
 * 배열 내용에서 각 객체를 파싱합니다.
 */
const parseArrayContent = (arrayContent: string): ChunkGroup[] => {
  const groups: ChunkGroup[] = [];

  // 각 객체 블록 찾기: { ... }
  const objectPattern = /\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let match;

  while ((match = objectPattern.exec(arrayContent)) !== null) {
    const objectContent = match[1];
    const group = parseObjectContent(objectContent);

    if (group) {
      groups.push(group);
    }
  }

  return groups;
};

/**
 * 단일 객체 내용을 파싱하여 ChunkGroup으로 변환합니다.
 */
const parseObjectContent = (objectContent: string): ChunkGroup | null => {
  // name 추출
  const nameMatch = objectContent.match(/name:\s*['"]([^'"]+)['"]/);
  if (!nameMatch) {
    return null;
  }

  // patterns 배열 추출
  const patternsMatch = objectContent.match(
    /patterns:\s*\[([\s\S]*?)\](?:\s*,|\s*$)/,
  );
  if (!patternsMatch) {
    return null;
  }

  const patterns = parsePatterns(patternsMatch[1]);

  return {
    name: nameMatch[1],
    patterns,
    // 기존 config에서는 크기 정보가 주석으로만 존재하므로 0으로 설정
    estimatedSize: 0,
    gzipSize: 0,
    brotliSize: 0,
    reason: '',
  };
};

/**
 * patterns 배열 문자열에서 패턴들을 추출합니다.
 */
const parsePatterns = (patternsContent: string): string[] => {
  const patterns: string[] = [];
  const patternRegex = /['"]([^'"]+)['"]/g;
  let match;

  while ((match = patternRegex.exec(patternsContent)) !== null) {
    patterns.push(match[1]);
  }

  return patterns;
};
