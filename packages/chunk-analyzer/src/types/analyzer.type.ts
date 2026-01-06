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
