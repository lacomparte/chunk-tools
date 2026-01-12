/**
 * 그래프 기반 클러스터링 상수
 *
 * chunk-analyzer의 클러스터링 알고리즘에서 사용하는 임계값과 설정값입니다.
 * 성능 튜닝이 필요한 경우 이 값들을 조정하세요.
 */
export const CLUSTERING_CONSTANTS = {
  /**
   * 최소 co-import 횟수
   *
   * 패키지들이 동일한 모듈에서 함께 import되어야 하는 최소 횟수입니다.
   * 이 값보다 적게 함께 사용되는 패키지는 클러스터에 포함되지 않습니다.
   */
  MIN_CO_IMPORT_COUNT: 3,

  /**
   * 최소 응집도 임계값 (0.0 ~ 1.0)
   *
   * 클러스터의 응집도 = 내부 연결 수 / (내부 연결 수 + 외부 연결 수)
   * - 1.0: 완벽한 응집 (외부 연결 없음)
   * - 0.5: 내부/외부 연결 비율 동일
   * - 0.0: 응집 없음 (내부 연결 없음)
   */
  MIN_COHESION_THRESHOLD: 0.5,

  /**
   * 최소 클러스터 크기 (bytes) - 20KB
   *
   * 이 크기보다 작은 클러스터는 생성하지 않습니다.
   * 너무 작은 청크는 HTTP 요청 오버헤드가 더 클 수 있습니다.
   */
  MIN_CLUSTER_SIZE: 20 * 1024,

  /**
   * 매우 큰 패키지 임계값 (bytes) - 100KB
   *
   * 이 크기 이상의 패키지는 importer 수와 관계없이 개별 청크로 분리됩니다.
   * 대형 패키지를 별도로 캐싱하여 변경 시 영향을 최소화합니다.
   */
  VERY_LARGE_PACKAGE_THRESHOLD: 100 * 1024,

  /**
   * 독립 패키지로 분리할 최대 importer 수
   *
   * 이 값 이하의 importer를 가진 대형 패키지는 개별 청크로 분리됩니다.
   * 적은 곳에서만 사용되는 대형 패키지는 별도 분리가 효율적입니다.
   */
  MAX_ISOLATED_IMPORTERS: 2,

  /**
   * 최소 연결 강도
   *
   * Connected Components 알고리즘에서 클러스터를 형성하기 위한
   * 최소 연결 강도입니다. A→B import + B→A import = 2 (양방향)
   */
  MIN_CONNECTION_STRENGTH: 1,
} as const;

export type ClusteringConstants = typeof CLUSTERING_CONSTANTS;
