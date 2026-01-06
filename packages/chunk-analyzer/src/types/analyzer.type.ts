export type ModuleInfo = {
  name: string;
  size: number;
  gzipSize?: number;
  brotliSize?: number;
  path: string;
};

export type PackageInfo = {
  name: string;
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
  modules: ModuleInfo[];
};

export type ChunkGroup = {
  name: string;
  patterns: string[];
  estimatedSize: number;
  gzipSize: number;
  brotliSize: number;
  reason: string;
};

export type AnalyzerOptions = {
  largePackageThreshold?: number;
  smallPackageThreshold?: number;
  ignore?: string[];
  customGroups?: Record<string, string[]>;
};

export type AnalysisSummary = {
  totalSize: number;
  totalGzipSize: number;
  totalBrotliSize: number;
  packageCount: number;
  groupCount: number;
};

export type AnalysisResult = {
  packages: PackageInfo[];
  suggestedGroups: ChunkGroup[];
  summary: AnalysisSummary;
  generatedAt: string;
};

// Budget 관련 타입
export type BudgetOptions = {
  totalSize?: number; // 총 크기 제한 (KB)
  gzipSize?: number; // gzip 크기 제한 (KB)
  brotliSize?: number; // brotli 크기 제한 (KB)
  chunkSize?: number; // 단일 청크 최대 크기 (KB)
  warnThreshold?: number; // 경고 임계값 (기본 0.9 = 90%)
  failOnExceed?: boolean; // 초과 시 exit code 1
};

export type BudgetViolation = {
  type: 'total' | 'gzip' | 'brotli' | 'chunk';
  target?: string; // 청크 이름 (chunk 타입일 때)
  actual: number; // 실제 크기 (바이트)
  budget: number; // 예산 (바이트)
  exceeded: number; // 초과량 (바이트)
  percentage: number; // 사용률 (0~1)
  severity: 'ok' | 'warning' | 'error';
};

export type BudgetReport = {
  violations: BudgetViolation[];
  passed: boolean;
  summary: string;
};
