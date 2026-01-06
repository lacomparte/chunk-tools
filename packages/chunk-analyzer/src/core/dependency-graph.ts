import type { VisualizerStatsV2 } from '../types/index.js';
import { extractPackageName } from '../utils/extract-package.util.js';

export type PackageNode = {
  name: string;
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
  imports: Set<string>; // 이 패키지가 import하는 패키지들
  importedBy: Set<string>; // 이 패키지를 import하는 패키지들
  modules: string[]; // 이 패키지에 속한 모듈 uid들
};

export type DependencyGraph = {
  packages: Map<string, PackageNode>;
  edges: Map<string, Set<string>>; // package -> imported packages
};

export const buildDependencyGraph = (
  stats: VisualizerStatsV2,
): DependencyGraph => {
  const { nodeParts, nodeMetas } = stats;
  const packages = new Map<string, PackageNode>();
  const moduleToPackage = new Map<string, string>(); // uid -> packageName

  // 1단계: 모든 node_modules 모듈을 패키지별로 그룹화
  for (const [uid, meta] of Object.entries(nodeMetas)) {
    if (!meta.id.includes('node_modules')) continue;

    const packageName = extractPackageName(meta.id);
    if (!packageName) continue;

    moduleToPackage.set(uid, packageName);

    const existing =
      packages.get(packageName) ?? createEmptyPackageNode(packageName);
    existing.modules.push(uid);

    // 사이즈 계산
    for (const partUid of Object.values(meta.moduleParts)) {
      const part = nodeParts[partUid];
      if (part && typeof part === 'object') {
        existing.totalSize += part.renderedLength;
        existing.gzipSize += part.gzipLength;
        existing.brotliSize += part.brotliLength;
      }
    }

    packages.set(packageName, existing);
  }

  // 2단계: 패키지 간 의존성 엣지 구축
  for (const [uid, meta] of Object.entries(nodeMetas)) {
    const sourcePackage = moduleToPackage.get(uid);
    if (!sourcePackage) continue;

    const sourceNode = packages.get(sourcePackage);
    if (!sourceNode) continue;

    // 이 모듈이 import하는 다른 패키지들
    for (const imported of meta.imported ?? []) {
      const targetPackage = moduleToPackage.get(imported.uid);
      if (targetPackage && targetPackage !== sourcePackage) {
        sourceNode.imports.add(targetPackage);
      }
    }

    // 이 모듈을 import하는 다른 패키지들
    for (const importer of meta.importedBy ?? []) {
      const importerPackage = moduleToPackage.get(importer.uid);
      if (importerPackage && importerPackage !== sourcePackage) {
        sourceNode.importedBy.add(importerPackage);
      }
    }
  }

  // 3단계: 엣지 맵 생성
  const edges = new Map<string, Set<string>>();
  for (const [name, node] of packages) {
    edges.set(name, node.imports);
  }

  return { packages, edges };
};

const createEmptyPackageNode = (name: string): PackageNode => ({
  name,
  totalSize: 0,
  gzipSize: 0,
  brotliSize: 0,
  imports: new Set(),
  importedBy: new Set(),
  modules: [],
});

// 패키지 간 연결 강도 계산 (양방향 import 횟수)
export const calculateConnectionStrength = (
  graph: DependencyGraph,
  pkgA: string,
  pkgB: string,
): number => {
  const nodeA = graph.packages.get(pkgA);
  const nodeB = graph.packages.get(pkgB);
  if (!nodeA || !nodeB) return 0;

  let strength = 0;

  // A가 B를 import하면 +1
  if (nodeA.imports.has(pkgB)) strength += 1;
  // B가 A를 import하면 +1
  if (nodeB.imports.has(pkgA)) strength += 1;

  return strength;
};

// 함께 사용되는 패키지 클러스터 찾기 (Connected Components 기반)
export const findConnectedClusters = (
  graph: DependencyGraph,
  minConnectionStrength = 1,
): Set<string>[] => {
  const visited = new Set<string>();
  const clusters: Set<string>[] = [];

  const bfs = (startPkg: string): Set<string> => {
    const cluster = new Set<string>();
    const queue = [startPkg];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      cluster.add(current);

      const node = graph.packages.get(current);
      if (!node) continue;

      // 연결된 패키지들 탐색
      for (const neighbor of [...node.imports, ...node.importedBy]) {
        if (!visited.has(neighbor)) {
          const strength = calculateConnectionStrength(
            graph,
            current,
            neighbor,
          );
          if (strength >= minConnectionStrength) {
            queue.push(neighbor);
          }
        }
      }
    }

    return cluster;
  };

  for (const pkgName of graph.packages.keys()) {
    if (!visited.has(pkgName)) {
      const cluster = bfs(pkgName);
      if (cluster.size > 0) {
        clusters.push(cluster);
      }
    }
  }

  return clusters;
};

// 패키지의 "핵심도" 계산 - 많이 사용될수록 높음
export const calculateCentrality = (
  graph: DependencyGraph,
  pkgName: string,
): number => {
  const node = graph.packages.get(pkgName);
  if (!node) return 0;

  // importedBy 수가 많을수록 핵심 패키지
  return node.importedBy.size;
};

// 앱 코드에서 직접 import하는 패키지 찾기 (진입점)
export const findEntryPackages = (
  stats: VisualizerStatsV2,
  _graph: DependencyGraph,
): Set<string> => {
  const entryPackages = new Set<string>();
  const { nodeMetas } = stats;

  for (const meta of Object.values(nodeMetas)) {
    // 앱 코드 (node_modules가 아닌 모듈)
    if (meta.id.includes('node_modules')) continue;

    // 앱 코드가 직접 import하는 패키지들
    for (const imported of meta.imported ?? []) {
      const importedMeta = nodeMetas[imported.uid];
      if (importedMeta?.id.includes('node_modules')) {
        const pkgName = extractPackageName(importedMeta.id);
        if (pkgName) {
          entryPackages.add(pkgName);
        }
      }
    }
  }

  return entryPackages;
};
