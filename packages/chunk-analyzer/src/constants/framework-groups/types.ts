/**
 * 그룹 우선순위
 *
 * - critical: 프레임워크 코어 (react-core, vue-core 등) - 항상 먼저 처리
 * - high: 공통 안정적 라이브러리 (styling 등)
 * - medium: 모니터링, 유틸리티 등
 * - low: 기타
 */
export type GroupPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * 그룹 정의
 */
export type GroupDefinition = {
  /** 그룹에 포함될 패키지 패턴 */
  patterns: string[];

  /** 그룹 설명 (한글) */
  description: string;

  /** 그룹핑 이유 (영문 - 로그용) */
  reason: string;

  /** 우선순위 */
  priority: GroupPriority;
};
