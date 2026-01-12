import type { AnalyzerOptions } from '../types/index.js';

export const DEFAULT_OPTIONS: Required<AnalyzerOptions> = {
  largePackageThreshold: 100 * 1024, // 100KB
  smallPackageThreshold: 5 * 1024, // 5KB
  initialChunkMaxSize: 14 * 1024, // 14KB (TCP Initial Window 기준)
  preservedChunks: [],
  entryChunks: [],
  ignore: [],
  customGroups: {},
};
