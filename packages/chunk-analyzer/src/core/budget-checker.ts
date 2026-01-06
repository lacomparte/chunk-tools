import type {
  AnalysisResult,
  BudgetOptions,
  BudgetReport,
  BudgetViolation,
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
  const { summary, suggestedGroups } = result;
  const warnThreshold = options.warnThreshold ?? 0.9;

  // 총 크기 체크
  if (options.totalSize) {
    const budget = options.totalSize * KB;
    violations.push(
      createViolation('total', summary.totalSize, budget, warnThreshold),
    );
  }

  // gzip 크기 체크
  if (options.gzipSize) {
    const budget = options.gzipSize * KB;
    violations.push(
      createViolation('gzip', summary.totalGzipSize, budget, warnThreshold),
    );
  }

  // brotli 크기 체크
  if (options.brotliSize) {
    const budget = options.brotliSize * KB;
    violations.push(
      createViolation('brotli', summary.totalBrotliSize, budget, warnThreshold),
    );
  }

  // 개별 청크 크기 체크
  if (options.chunkSize) {
    const budget = options.chunkSize * KB;
    for (const group of suggestedGroups) {
      // 모든 청크에 대해 체크, 경고/에러만 필터링
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
  }

  const hasError = violations.some((v) => v.severity === 'error');

  return {
    violations,
    passed: !hasError,
    summary: hasError ? 'Budget exceeded!' : 'All budgets passed',
  };
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
