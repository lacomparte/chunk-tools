// Core exports
export { parseStats, parseStatsFile } from './core/parser.js';
export { analyzePackages } from './core/analyzer.js';
export {
  createAnalysisResult,
  formatTextReport,
  generateConfigCode,
} from './core/reporter.js';

// Types
export type {
  ModuleInfo,
  PackageInfo,
  ChunkGroup,
  AnalyzerOptions,
  AnalysisResult,
  VisualizerStats,
  VisualizerNode,
} from './types/index.js';
