import type {
  AnalysisResult,
  AnalysisSummary,
  BudgetOptions,
  BudgetReport,
  BudgetViolation,
  ChunkGroup,
} from '../types/index.js';

const KB = 1024;

/**
 * 예산 위반 여부를 체크하는 함수
 */
const createViolation = (
  type: BudgetViolation['type'],
  actual: number,
  budget: number,
  warnThreshold = 0.9,
  target?: string,
): BudgetViolation => {
  const percentage = actual / budget;
  const exceeded = Math.max(0, actual - budget);

  let severity: BudgetViolation['severity'] = 'ok';
  if (percentage >= 1) severity = 'error';
  else if (percentage >= warnThreshold) severity = 'warning';

  return { type, target, actual, budget, exceeded, percentage, severity };
};

/**
 * 분석 결과에 대해 예산 검증을 수행
 */
export const checkBudgets = (
  result: AnalysisResult,
  options: BudgetOptions,
): BudgetReport => {
  const violations: BudgetViolation[] = [];
  const warnThreshold = options.warnThreshold ?? 0.9;

  checkTotalSizeBudgets(result.summary, options, warnThreshold, violations);
  checkChunkSizeBudgets(
    result.suggestedGroups,
    options,
    warnThreshold,
    violations,
  );

  const hasError = violations.some((v) => v.severity === 'error');

  return {
    violations,
    passed: !hasError,
    summary: hasError ? 'Budget exceeded!' : 'All budgets passed',
  };
};

/**
 * 총 크기 예산 체크 (total, gzip, brotli)
 */
const checkTotalSizeBudgets = (
  summary: AnalysisSummary,
  options: BudgetOptions,
  warnThreshold: number,
  violations: BudgetViolation[],
): void => {
  if (options.totalSize) {
    violations.push(
      createViolation(
        'total',
        summary.totalSize,
        options.totalSize * KB,
        warnThreshold,
      ),
    );
  }

  if (options.gzipSize) {
    violations.push(
      createViolation(
        'gzip',
        summary.totalGzipSize,
        options.gzipSize * KB,
        warnThreshold,
      ),
    );
  }

  if (options.brotliSize) {
    violations.push(
      createViolation(
        'brotli',
        summary.totalBrotliSize,
        options.brotliSize * KB,
        warnThreshold,
      ),
    );
  }
};

/**
 * 개별 청크 크기 예산 체크
 */
const checkChunkSizeBudgets = (
  suggestedGroups: ChunkGroup[],
  options: BudgetOptions,
  warnThreshold: number,
  violations: BudgetViolation[],
): void => {
  if (!options.chunkSize) return;

  const budget = options.chunkSize * KB;
  for (const group of suggestedGroups) {
    const violation = createViolation(
      'chunk',
      group.estimatedSize,
      budget,
      warnThreshold,
      group.name,
    );
    if (violation.severity !== 'ok') {
      violations.push(violation);
    }
  }
};

/**
 * budget 옵션이 하나라도 설정되어 있는지 확인
 */
export const hasBudgetOptions = (options: {
  budgetTotal?: number;
  budgetGzip?: number;
  budgetBrotli?: number;
  budgetChunk?: number;
}): boolean =>
  !!(
    options.budgetTotal ||
    options.budgetGzip ||
    options.budgetBrotli ||
    options.budgetChunk
  );
