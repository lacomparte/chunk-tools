import pc from 'picocolors';

import type { ChunkGroup } from '../types/index.js';

import { formatSize } from './format-size.util.js';

export type DiffResult = {
  added: ChunkGroup[];
  removed: ChunkGroup[];
  modified: Array<{
    name: string;
    before: ChunkGroup;
    after: ChunkGroup;
    changes: string[];
  }>;
  unchanged: ChunkGroup[];
};

/**
 * 두 ChunkGroup 배열을 비교하여 차이점을 계산합니다.
 */
export const calculateDiff = (
  before: ChunkGroup[],
  after: ChunkGroup[],
): DiffResult => {
  const beforeMap = new Map(before.map((g) => [g.name, g]));
  const afterMap = new Map(after.map((g) => [g.name, g]));

  const added: ChunkGroup[] = [];
  const removed: ChunkGroup[] = [];
  const modified: DiffResult['modified'] = [];
  const unchanged: ChunkGroup[] = [];

  // after에 있고 before에 없는 것 = added
  for (const [name, group] of afterMap) {
    if (!beforeMap.has(name)) {
      added.push(group);
    }
  }

  // before에 있고 after에 없는 것 = removed
  for (const [name, group] of beforeMap) {
    if (!afterMap.has(name)) {
      removed.push(group);
    }
  }

  // 둘 다 있는 것 = modified 또는 unchanged
  for (const [name, beforeGroup] of beforeMap) {
    const afterGroup = afterMap.get(name);
    if (!afterGroup) continue;

    const changes = getGroupChanges(beforeGroup, afterGroup);

    if (changes.length > 0) {
      modified.push({
        name,
        before: beforeGroup,
        after: afterGroup,
        changes,
      });
    } else {
      unchanged.push(afterGroup);
    }
  }

  return { added, removed, modified, unchanged };
};

/**
 * 두 ChunkGroup 간의 변경사항을 계산합니다.
 */
const getGroupChanges = (before: ChunkGroup, after: ChunkGroup): string[] => {
  const changes: string[] = [];

  // patterns 변경 확인
  const beforePatterns = new Set(before.patterns);
  const afterPatterns = new Set(after.patterns);

  const addedPatterns = after.patterns.filter((p) => !beforePatterns.has(p));
  const removedPatterns = before.patterns.filter((p) => !afterPatterns.has(p));

  if (addedPatterns.length > 0) {
    changes.push(`+patterns: ${addedPatterns.join(', ')}`);
  }
  if (removedPatterns.length > 0) {
    changes.push(`-patterns: ${removedPatterns.join(', ')}`);
  }

  // 크기 변경 확인 (before가 0이면 비교하지 않음 - 기존 config에서 읽은 경우)
  if (before.estimatedSize > 0 && after.estimatedSize > 0) {
    const sizeDiff = after.estimatedSize - before.estimatedSize;
    if (Math.abs(sizeDiff) > 1024) {
      // 1KB 이상 변경 시에만 표시
      const sign = sizeDiff > 0 ? '+' : '';
      changes.push(`size: ${sign}${formatSize(sizeDiff)}`);
    }
  }

  return changes;
};

/**
 * DiffResult를 사람이 읽을 수 있는 형식으로 포맷팅합니다.
 */
export const formatDiff = (diff: DiffResult): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(pc.bold(pc.cyan('Dry-run Analysis Results')));
  lines.push(pc.dim('─'.repeat(50)));
  lines.push('');

  // 변경사항이 없는 경우
  if (
    diff.added.length === 0 &&
    diff.removed.length === 0 &&
    diff.modified.length === 0
  ) {
    lines.push(pc.green('No changes detected. Config is up to date.'));
    lines.push('');
    return lines.join('\n');
  }

  lines.push(pc.bold('Changes detected:'));
  lines.push('');

  // Added groups
  for (const group of diff.added) {
    const sizeInfo =
      group.estimatedSize > 0 ? ` (${formatSize(group.estimatedSize)})` : '';
    lines.push(
      pc.green(`  + ${group.name}${sizeInfo} - ${group.reason || 'New group'}`),
    );
    if (group.patterns.length > 0) {
      lines.push(
        pc.dim(
          `      patterns: [${group.patterns.slice(0, 3).join(', ')}${group.patterns.length > 3 ? ', ...' : ''}]`,
        ),
      );
    }
  }

  // Removed groups
  for (const group of diff.removed) {
    lines.push(pc.red(`  - ${group.name} - Group removed`));
  }

  // Modified groups
  for (const mod of diff.modified) {
    const sizeInfo =
      mod.after.estimatedSize > 0
        ? ` (${formatSize(mod.after.estimatedSize)})`
        : '';
    lines.push(pc.yellow(`  ~ ${mod.name}${sizeInfo}`));
    for (const change of mod.changes) {
      lines.push(pc.dim(`      ${change}`));
    }
  }

  lines.push('');
  lines.push(pc.bold('Summary:'));
  lines.push(`  Added:     ${pc.green(String(diff.added.length))} groups`);
  lines.push(`  Modified:  ${pc.yellow(String(diff.modified.length))} groups`);
  lines.push(`  Removed:   ${pc.red(String(diff.removed.length))} groups`);
  lines.push(`  Unchanged: ${pc.dim(String(diff.unchanged.length))} groups`);
  lines.push('');
  lines.push(pc.dim('Run without --dry-run to apply changes.'));
  lines.push('');

  return lines.join('\n');
};
