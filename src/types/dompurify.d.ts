// `dompurify` (a direct devDependency, see package.json) ships no `.d.ts` of
// its own in this version and `@types/dompurify` isn't installed — a minimal
// ambient declaration covering only the API surface this project actually
// calls (see src/components/MermaidDiagram.tsx), rather than adding a new
// dependency for T-P5-07's single-file scope.
declare module 'dompurify' {
  export interface DOMPurifyConfig {
    USE_PROFILES?: { html?: boolean; svg?: boolean; svgFilters?: boolean; mathMl?: boolean }
    ADD_TAGS?: string[]
    ADD_ATTR?: string[]
  }

  interface DOMPurifyInstance {
    sanitize(source: string, config?: DOMPurifyConfig): string
  }

  const DOMPurify: DOMPurifyInstance
  export default DOMPurify
}
