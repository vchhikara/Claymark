import type { Root } from 'hast'

export type RenderMode = 'static' | 'streaming'

export interface PipelineOptions {
  mode?: RenderMode
}

export interface PipelineResult {
  tree: Root
}
