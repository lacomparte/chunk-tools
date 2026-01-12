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

/**
 * 클러스터링 방법
 * - custom: 사용자 정의 그룹 (최우선 처리)
 * - framework-core: 프레임워크 코어 그룹 (react-core, vue-core 등)
 * - large-isolated: 대형 패키지 개별 분리 (100KB 이상)
 * - graph-based: 그래프 기반 자동 클러스터링 (co-import 패턴)
 * - misc: 나머지 패키지
 * - preserved: 사용자 지정 보존 청크 (초기 HTML 포함)
 * - entry: 엔트리 청크 (애플리케이션 진입점)
 */
export type ClusteringMethod =
  | 'custom'
  | 'framework-core'
  | 'large-isolated'
  | 'graph-based'
  | 'misc'
  | 'preserved'
  | 'entry';

export type ChunkGroup = {
  name: string;
  patterns: string[];
  estimatedSize: number;
  gzipSize: number;
  brotliSize: number;
  reason: string;

  /** 클러스터링 메타데이터 (옵션) */
  metadata?: {
    /** 클러스터링 방법 */
    clusteringMethod: ClusteringMethod;

    /** 클러스터 응집도 (0.0 ~ 1.0, graph-based일 때) */
    cohesion?: number;

    /** Co-import 평균 빈도 (graph-based일 때) */
    coImportFrequency?: number;

    /** 클러스터의 중심 패키지 (graph-based일 때) */
    centralPackage?: string;

    /** 그룹 우선순위 (framework-core일 때) */
    priority?: 'critical' | 'high' | 'medium' | 'low';

    /** 그룹 설명 (framework-core일 때) */
    description?: string;

    /** 자동 분할 인덱스 (preserved + auto-split일 때) */
    splitIndex?: number;

    /** 원본 청크 이름 (auto-split일 때) */
    originalChunkName?: string;
  };
};

/**
 * Preserved 청크 설정
 * 초기 HTML에 포함되는 필수 청크 정의
 */
export type PreservedChunk = {
  /** 청크 이름 */
  name: string;

  /** 패키지 패턴 목록 */
  patterns: string[];

  /** 최대 크기 (바이트, gzipped 기준) */
  maxSize?: number;

  /** 크기 초과 시 분할 전략 */
  splitStrategy?: 'auto' | 'manual';

  /** 청크 설명 */
  reason?: string;
};

/**
 * 청크 설정 JSON 파일 형식
 */
export type ChunksConfig = {
  /** 보존 청크 목록 */
  preservedChunks?: PreservedChunk[];

  /** 엔트리 청크 이름 목록 */
  entryChunks?: string[];

  /** 초기 청크 최대 크기 (바이트, gzipped 기준) */
  initialChunkMaxSize?: number;

  /** 사용자 정의 그룹 (그룹명 → 패키지 패턴 배열) */
  customGroups?: Record<string, string[]>;
};

export type AnalyzerOptions = {
  largePackageThreshold?: number;
  smallPackageThreshold?: number;

  /** 초기 HTML 청크 최대 크기 (바이트, TCP slow start 최적화) */
  initialChunkMaxSize?: number;

  /** 보존 청크 설정 (초기 HTML 포함) */
  preservedChunks?: PreservedChunk[];

  /** 엔트리 청크 이름 목록 */
  entryChunks?: string[];

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
