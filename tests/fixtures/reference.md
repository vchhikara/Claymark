# Claymark Reference Document

This document exercises every component mapped in `src/components/map.tsx`.
It is the frozen input for baseline visual snapshots in both themes.

## Headings

## A Repeated Heading

### Nested Depth Three

#### Depth Four

##### Depth Five

###### Depth Six

## Inline Styles

Body text carries **strong emphasis**, *italic emphasis*, ***bold italic***,
~~struck-through text~~, and `inline code with a token: --accent-brand`.

Links appear as [internal](/docs/getting-started), [external](https://example.com),
and bare autolinks like <https://claude.ai>.

## Lists

### Unordered, three levels deep

- Root level alpha
  - Second level beta
    - Third level gamma
    - Third level delta
  - Second level epsilon
- Root level zeta

### Ordered, three levels deep

1. First ordered item
   1. Nested ordered item
      1. Deepest ordered item
      2. Another deepest item
   2. Second nested item
2. Second top-level item
3. Third top-level item

### Task list

- [x] Ship the sanitizer
- [x] Pass CommonMark conformance
- [ ] Land syntax highlighting
- [ ] Package the desktop shell

## Blockquotes

> Single-line quotation resting against the left rule.
>
> > A nested quotation, one level deeper, still inside the measure.
>
> And a closing paragraph of the outer quote.

## Code

Inline code sits beside a fenced block:

```ts
export const clay = '#d97757'
```

## Tables

| Token | Light | Dark  | Role          |
|:------|------:|:-----:|---------------|
| body  | left  | right | centered text |
| rule  | 1px   | 1px   | hairline      |

## Rules

---

Above is a horizontal rule; below is the document end.
