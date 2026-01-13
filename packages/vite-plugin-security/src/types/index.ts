/**
 * 보안 이슈 심각도
 */
export type Severity = 'critical' | 'high' | 'warning' | 'info';

/**
 * 스캐너가 발견한 보안 이슈
 */
export type SecurityIssue = {
  /** 규칙 고유 식별자 (ignore 옵션에서 사용) */
  key?: string;
  /** 이슈 제목 */
  title: string;
  /** 상세 설명 */
  description: string;
  /** 심각도 */
  severity: Severity;
  /** 파일 경로 */
  filePath: string;
  /** 라인 번호 */
  line: number;
  /** 컬럼 번호 */
  column: number;
  /** 문제가 된 코드 스니펫 */
  code?: string;
  /** 수정 방법 제안 */
  fix?: string;
  /** 참고 링크 */
  ref?: string;
  /** 스캐너 이름 */
  scanner: string;
};

/**
 * 스캔 결과 요약
 */
export type ScanSummary = {
  critical: number;
  high: number;
  warning: number;
  info: number;
  total: number;
};

/**
 * 스캔 리포트
 */
export type ScanReport = {
  issues: SecurityIssue[];
  summary: ScanSummary;
  scannedFiles: number;
  duration: number;
};

/**
 * HMR 오버레이 옵션
 */
export type OverlayOptions = {
  /** 오버레이 활성화 여부 */
  enabled?: boolean;
  /** 오버레이 표시 조건 */
  showOn?: 'critical' | 'high' | 'all';
  /** 오버레이 위치 */
  position?: 'top' | 'bottom';
  /** 자동 숨김 시간 (초), false면 숨기지 않음 */
  autoHide?: number | false;
};

/**
 * 검사 규칙 설정
 */
export type RulesOptions = {
  /** 하드코딩된 시크릿 검사 */
  hardcodedSecrets?: boolean;
  /** RSC 서버 코드 누출 검사 */
  rscLeaks?: boolean;
  /** 위험한 패턴 검사 (eval, innerHTML 등) */
  dangerousPatterns?: boolean;
  /** 의존성 취약점 검사 */
  dependencyAudit?: 'always' | 'ci' | 'never';
  /**
   * 무시할 규칙 key 목록
   * 예: ['eval', 'innerHTML', 'rsc-prisma']
   */
  ignoreRules?: string[];
};

/**
 * 검사 범위 설정
 */
export type ScopeOptions = {
  /** package.json 직접 의존성 검사 */
  package?: boolean;
  /** 전체 node_modules 검사 */
  nodeModules?: boolean;
  /** 빌드 결과물에 포함된 패키지만 검사 */
  bundle?: boolean;
};

/**
 * 플러그인 전체 옵션
 */
export type SecurityScannerOptions = {
  /**
   * 실행 모드
   * - incremental: HMR 시 변경 파일만 검사
   * - dry-run: 전체 검사, 리포트만 출력
   * - full: 전체 검사 + 의존성 DB 조회 + 실패 시 exit
   */
  mode?: 'incremental' | 'dry-run' | 'full';
  /** 검사 범위 */
  scope?: ScopeOptions;
  /** 검사 규칙 */
  rules?: RulesOptions;
  /**
   * 실패 조건 - 해당 심각도 이상 발견 시 빌드 실패
   * false면 실패하지 않음
   */
  failOn?: 'critical' | 'high' | 'medium' | false;
  /** HMR 오버레이 설정 */
  overlay?: OverlayOptions;
  /** 무시할 파일 패턴 (glob) */
  exclude?: string[];
  /**
   * 무시할 규칙 key 목록
   * .ignoresecurity 파일과 병합됨
   * 예: ['eval', 'innerHTML', 'dangerouslySetInnerHTML']
   */
  ignoreRules?: string[];
  /** GitHub Wiki DB URL (자동 감지) */
  wikiUrl?: string;
};

/**
 * 스캐너 인터페이스
 */
export type Scanner = {
  name: string;
  scan: (code: string, filePath: string) => SecurityIssue[];
};

/**
 * 패턴 정의
 */
export type PatternDef = {
  /** 고유 식별자 (ignore 옵션에서 사용) */
  key: string;
  /** 표시 이름 */
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
  fix?: string;
  ref?: string;
};

// ============================================
// 의존성 취약점 관련 타입
// ============================================

/**
 * npm audit 결과의 취약점 정보
 */
export type NpmAuditVulnerability = {
  name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  isDirect: boolean;
  via: Array<string | { name: string; severity: string; title: string }>;
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable:
    | boolean
    | {
        name: string;
        version: string;
        isSemVerMajor: boolean;
      };
};

/**
 * npm audit 결과 전체
 */
export type NpmAuditResult = {
  auditReportVersion: number;
  vulnerabilities: Record<string, NpmAuditVulnerability>;
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
      total: number;
    };
    dependencies: {
      prod: number;
      dev: number;
      optional: number;
      peer: number;
      peerOptional: number;
      total: number;
    };
  };
};

/**
 * OSV (Open Source Vulnerabilities) API 응답
 */
export type OsvVulnerability = {
  id: string;
  summary: string;
  details: string;
  aliases: string[];
  modified: string;
  published: string;
  database_specific?: {
    severity?: string;
    cwe_ids?: string[];
  };
  references: Array<{
    type: string;
    url: string;
  }>;
  affected: Array<{
    package: {
      name: string;
      ecosystem: string;
    };
    ranges: Array<{
      type: string;
      events: Array<{
        introduced?: string;
        fixed?: string;
      }>;
    }>;
    versions?: string[];
  }>;
  severity?: Array<{
    type: string;
    score: string;
  }>;
};

/**
 * OSV API 쿼리 응답
 */
export type OsvQueryResponse = {
  vulns?: OsvVulnerability[];
};

/**
 * 통합된 취약점 정보
 */
export type Vulnerability = {
  /** 패키지 이름 */
  packageName: string;
  /** 취약점 ID (CVE, GHSA 등) */
  id: string;
  /** 제목/요약 */
  title: string;
  /** 상세 설명 */
  description: string;
  /** 심각도 */
  severity: Severity;
  /** 영향 받는 버전 범위 */
  vulnerableRange: string;
  /** 현재 설치된 버전 */
  installedVersion?: string;
  /** 수정된 버전 */
  fixedVersion?: string;
  /** 수정 가능 여부 */
  fixAvailable: boolean;
  /** 참고 링크 */
  references: string[];
  /** 데이터 소스 */
  source: 'npm-audit' | 'osv';
};

/**
 * 취약점 검사 결과
 */
export type VulnerabilityReport = {
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    total: number;
  };
  scannedPackages: number;
};
