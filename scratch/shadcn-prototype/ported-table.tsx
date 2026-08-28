import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `table` (get_component "table", 2026-08-27).
// Structural match test: shadcn's Table/TableHeader/TableBody/TableRow/
// TableHead/TableCell map directly onto Claymark's *existing*
// `.claymark-table-scroll` / `.claymark-table` / `.claymark-th` /
// `.claymark-td` classes (src/theme/claymark.css) — no new CSS needed here
// beyond wiring the class names, unlike Button/Dialog which needed new
// pb-* rules. That's the finding this component is meant to test.

export function PortedTable({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="claymark-table-scroll">
      {/* claymark-table alone draws a full grid (right for markdown content
          tables) — shadcn's Table convention is horizontal rules only. pb-table
          in prototype.css overrides the vertical borders for this UI-style use,
          without touching the shared claymark-table rule used elsewhere. */}
      <table data-slot="table" className={['claymark-table', 'pb-table', className].filter(Boolean).join(' ')} {...props} />
    </div>
  )
}

export function PortedTableHeader(props: ComponentProps<'thead'>) {
  return <thead data-slot="table-header" {...props} />
}

export function PortedTableBody(props: ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" {...props} />
}

export function PortedTableRow(props: ComponentProps<'tr'>) {
  return <tr data-slot="table-row" {...props} />
}

export function PortedTableHead({ className, ...props }: ComponentProps<'th'>) {
  return <th data-slot="table-head" className={['claymark-th', className].filter(Boolean).join(' ')} {...props} />
}

export function PortedTableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={['claymark-td', className].filter(Boolean).join(' ')} {...props} />
}

export function PortedTableCaption(props: ComponentProps<'caption'>) {
  return <caption data-slot="table-caption" className="pb-table-caption" {...props} />
}
