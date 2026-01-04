import type {
  ModuleInfo,
  NodeMeta,
  NodePart,
  PackageInfo,
  VisualizerNode,
  VisualizerStats,
  VisualizerStatsV2,
} from '../types/index.js';
import { extractPackageName } from '../utils/extract-package.util.js';

export const parseStats = (stats: VisualizerStats): PackageInfo[] => {
  const packageMap = new Map<string, PackageInfo>();

  if (isV2Stats(stats)) {
    parseV2Stats(stats, packageMap);
  } else {
    traverseTree(stats.tree, packageMap);
  }

  return Array.from(packageMap.values()).sort(
    (a, b) => b.totalSize - a.totalSize,
  );
};

const isV2Stats = (stats: VisualizerStats): stats is VisualizerStatsV2 =>
  stats.version === 2 && 'nodeParts' in stats && 'nodeMetas' in stats;

const parseV2Stats = (
  stats: VisualizerStatsV2,
  packageMap: Map<string, PackageInfo>,
): void => {
  const { nodeParts, nodeMetas } = stats;

  for (const [_uid, meta] of Object.entries(nodeMetas)) {
    if (!meta.id.includes('node_modules')) continue;

    const packageName = extractPackageName(meta.id);
    if (!packageName) continue;

    const sizes = collectModuleSizes(meta, nodeParts);
    if (sizes.totalSize === 0) continue;

    addToPackageMap(packageMap, packageName, meta.id, sizes);
  }
};

type ModuleSizes = {
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
};

const collectModuleSizes = (
  meta: NodeMeta,
  nodeParts: Record<string, string | NodePart>,
): ModuleSizes => {
  let totalSize = 0;
  let gzipSize = 0;
  let brotliSize = 0;

  for (const partUid of Object.values(meta.moduleParts)) {
    const part = nodeParts[partUid];
    if (part && typeof part === 'object') {
      totalSize += part.renderedLength;
      gzipSize += part.gzipLength;
      brotliSize += part.brotliLength;
    }
  }

  return { totalSize, gzipSize, brotliSize };
};

const addToPackageMap = (
  packageMap: Map<string, PackageInfo>,
  packageName: string,
  moduleId: string,
  sizes: ModuleSizes,
): void => {
  const existing =
    packageMap.get(packageName) ?? createEmptyPackageInfo(packageName);

  existing.totalSize += sizes.totalSize;
  existing.gzipSize += sizes.gzipSize;
  existing.modules.push({
    name: moduleId.split('/').pop() ?? moduleId,
    size: sizes.totalSize,
    gzipSize: sizes.gzipSize,
    brotliSize: sizes.brotliSize,
    path: moduleId,
  });

  packageMap.set(packageName, existing);
};

const traverseTree = (
  node: VisualizerNode,
  packageMap: Map<string, PackageInfo>,
  currentPath = '',
): void => {
  const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;

  if (shouldProcessNode(fullPath, node)) {
    processNodeModule(fullPath, node, packageMap);
  }

  node.children?.forEach((child) => traverseTree(child, packageMap, fullPath));
};

const shouldProcessNode = (path: string, node: VisualizerNode): boolean =>
  path.includes('node_modules') && node.value !== undefined;

const processNodeModule = (
  fullPath: string,
  node: VisualizerNode,
  packageMap: Map<string, PackageInfo>,
): void => {
  const packageName = extractPackageName(fullPath);
  if (!packageName) return;

  const existing =
    packageMap.get(packageName) ?? createEmptyPackageInfo(packageName);

  existing.totalSize += node.value ?? 0;
  existing.gzipSize += node.gzipSize ?? 0;
  existing.modules.push(createModuleInfo(node, fullPath));

  packageMap.set(packageName, existing);
};

const createEmptyPackageInfo = (name: string): PackageInfo => ({
  name,
  totalSize: 0,
  gzipSize: 0,
  modules: [],
});

const createModuleInfo = (node: VisualizerNode, path: string): ModuleInfo => ({
  name: node.name,
  size: node.value ?? 0,
  gzipSize: node.gzipSize,
  brotliSize: node.brotliSize,
  path,
});

export const parseStatsFile = (content: string): VisualizerStats => {
  try {
    return JSON.parse(content) as VisualizerStats;
  } catch {
    throw new Error(
      'Invalid stats.json format. Ensure visualizer with json: true option.',
    );
  }
};
