// Phase 4.1: plain-text char-offset matching, shared between view/edit mode
// (both operate on the same source string). Pure so it's directly testable.
export interface SearchMatch {
  start: number
  end: number
}

export function findMatches(source: string, query: string): SearchMatch[] {
  if (query.length === 0) return []
  const matches: SearchMatch[] = []
  const lowerSource = source.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let from = 0
  for (;;) {
    const index = lowerSource.indexOf(lowerQuery, from)
    if (index === -1) break
    matches.push({ start: index, end: index + query.length })
    from = index + query.length
  }
  return matches
}

export function replaceOne(source: string, match: SearchMatch, replacement: string): string {
  return source.slice(0, match.start) + replacement + source.slice(match.end)
}

export function replaceAll(source: string, query: string, replacement: string): string {
  const matches = findMatches(source, query)
  let result = source
  for (let i = matches.length - 1; i >= 0; i--) {
    result = replaceOne(result, matches[i]!, replacement)
  }
  return result
}
