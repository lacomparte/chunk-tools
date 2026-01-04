// v1 형식 (legacy)
export type VisualizerNode = {
  name: string;
  value?: number;
  gzipSize?: number;
  brotliSize?: number;
  children?: VisualizerNode[];
  uid?: string;
};

// v2 형식
export type NodePart = {
  renderedLength: number;
  gzipLength: number;
  brotliLength: number;
  metaUid: string;
};

export type NodeMeta = {
  id: string;
  moduleParts: Record<string, string>;
  imported: { uid: string }[];
  importedBy: { uid: string }[];
};

export type VisualizerStatsV1 = {
  version?: 1;
  tree: VisualizerNode;
};

export type VisualizerStatsV2 = {
  version: 2;
  tree: VisualizerNode;
  nodeParts: Record<string, string | NodePart>;
  nodeMetas: Record<string, NodeMeta>;
  env?: Record<string, unknown>;
  options?: Record<string, unknown>;
};

export type VisualizerStats = VisualizerStatsV1 | VisualizerStatsV2;
