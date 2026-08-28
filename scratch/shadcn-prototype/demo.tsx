import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider'
import { PortedButton } from './ported-button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ported-dialog'
import {
  PortedTable,
  PortedTableBody,
  PortedTableCaption,
  PortedTableCell,
  PortedTableHead,
  PortedTableHeader,
  PortedTableRow,
} from './ported-table'
import { PortedBadge } from './ported-badge'
import { PortedAlert, PortedAlertDescription, PortedAlertTitle } from './ported-alert'
import { PortedSkeleton } from './ported-skeleton'
import { PortedSeparator } from './ported-separator'
import { PortedTooltip, PortedTooltipContent, PortedTooltipProvider, PortedTooltipTrigger } from './ported-tooltip'
import { PortedScrollArea } from './ported-scroll-area'
import {
  PortedMenubar,
  PortedMenubarCheckboxItem,
  PortedMenubarContent,
  PortedMenubarItem,
  PortedMenubarMenu,
  PortedMenubarSeparator,
  PortedMenubarShortcut,
  PortedMenubarTrigger,
} from './ported-menubar'
import { PortedToaster, useToast } from './ported-toast'
import './prototype.css'
import '../../src/theme/tokens.css'
import '../../src/theme/claymark.css'

// D4: standalone demo/visual-check page for the shadcn-prototype batch
// (see /home/vipul/.claude/plans/moonlit-crafting-pnueli.md). Renders
// PortedButton/Dialog/Table with a live light/dark toggle so both palettes
// can be checked, plus a manual verification checklist for the things an
// automated check can't confirm (focus return, contrast).

function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  return (
    <PortedButton
      variant="outline"
      size="sm"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      Theme: {theme} (click to toggle)
    </PortedButton>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBlock: 'var(--space-6)' }}>
      <h2 style={{ font: 'var(--font-ui)', fontSize: '1rem', marginBottom: 'var(--space-3)' }}>{title}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
        {children}
      </div>
    </section>
  )
}

function ToastButtons() {
  const toast = useToast()
  return (
    <>
      <PortedButton size="sm" onClick={() => toast.toast('A neutral toast message.')}>
        Default toast
      </PortedButton>
      <PortedButton size="sm" onClick={() => toast.success('Saved successfully.')}>
        Success toast
      </PortedButton>
      <PortedButton size="sm" onClick={() => toast.error('Something went wrong.')}>
        Error toast
      </PortedButton>
    </>
  )
}

function Demo() {
  const [dialogOpenCount, setDialogOpenCount] = useState(0)
  const [checkedA, setCheckedA] = useState(true)
  const [checkedB, setCheckedB] = useState(false)

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: 'var(--space-6)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ font: 'var(--font-ui)', fontSize: '1.25rem', margin: 0 }}>
          shadcn-prototype demo (D4)
        </h1>
        <ThemeSwitch />
      </header>

      <Section title="PortedButton — variants">
        <PortedButton variant="default">Default</PortedButton>
        <PortedButton variant="destructive">Destructive</PortedButton>
        <PortedButton variant="outline">Outline</PortedButton>
        <PortedButton variant="secondary">Secondary</PortedButton>
        <PortedButton variant="ghost">Ghost</PortedButton>
        <PortedButton variant="link">Link</PortedButton>
      </Section>

      <Section title="PortedButton — sizes">
        <PortedButton size="sm">Small</PortedButton>
        <PortedButton size="default">Default</PortedButton>
        <PortedButton size="lg">Large</PortedButton>
        <PortedButton size="icon" aria-label="icon button">
          ★
        </PortedButton>
        <PortedButton disabled>Disabled</PortedButton>
      </Section>

      <Section title="PortedDialog (Radix behavior kept: focus trap, ESC, portal)">
        <Dialog onOpenChange={(open) => open && setDialogOpenCount((n) => n + 1)}>
          <DialogTrigger asChild>
            <PortedButton>Open dialog</PortedButton>
          </DialogTrigger>
          <DialogContent aria-describedby="pb-dialog-desc">
            <DialogHeader>
              <DialogTitle>Prototype dialog</DialogTitle>
              <DialogDescription id="pb-dialog-desc">
                Styled entirely from Claymark tokens.css — try Tab to see the
                focus trap, Escape to close, or click the overlay.
              </DialogDescription>
            </DialogHeader>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'hsl(var(--text-secondary))' }}>
              Opened {dialogOpenCount} time(s) this session.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <DialogClose asChild>
                <PortedButton variant="outline">Close</PortedButton>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="PortedTable (reuses existing .claymark-table classes directly)">
        <PortedTable style={{ width: '100%' }}>
          <PortedTableCaption>A ported shadcn table, reusing claymark-table with a horizontal-rules override.</PortedTableCaption>
          <PortedTableHeader>
            <PortedTableRow>
              <PortedTableHead>Component</PortedTableHead>
              <PortedTableHead>New CSS needed?</PortedTableHead>
              <PortedTableHead>Verdict</PortedTableHead>
            </PortedTableRow>
          </PortedTableHeader>
          <PortedTableBody>
            <PortedTableRow>
              <PortedTableCell>Button</PortedTableCell>
              <PortedTableCell>Yes — .pb-button rules</PortedTableCell>
              <PortedTableCell>Clean port</PortedTableCell>
            </PortedTableRow>
            <PortedTableRow>
              <PortedTableCell>Dialog</PortedTableCell>
              <PortedTableCell>Yes — .pb-dialog-* rules</PortedTableCell>
              <PortedTableCell>Clean port, Radix behavior intact</PortedTableCell>
            </PortedTableRow>
            <PortedTableRow>
              <PortedTableCell>Table</PortedTableCell>
              <PortedTableCell>Minor — reused claymark-table + border override</PortedTableCell>
              <PortedTableCell>Cleanest port</PortedTableCell>
            </PortedTableRow>
          </PortedTableBody>
        </PortedTable>
      </Section>

      <Section title="PortedBadge — variants">
        <PortedBadge variant="default">Default</PortedBadge>
        <PortedBadge variant="secondary">Secondary</PortedBadge>
        <PortedBadge variant="destructive">Destructive</PortedBadge>
        <PortedBadge variant="outline">Outline</PortedBadge>
      </Section>

      <Section title="PortedAlert — variants">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
          <PortedAlert>
            <PortedAlertTitle>Heads up</PortedAlertTitle>
            <PortedAlertDescription>
              <p>This is a default alert styled from tokens.css.</p>
            </PortedAlertDescription>
          </PortedAlert>
          <PortedAlert variant="destructive">
            <PortedAlertTitle>Error</PortedAlertTitle>
            <PortedAlertDescription>
              <p>This is a destructive alert.</p>
            </PortedAlertDescription>
          </PortedAlert>
        </div>
      </Section>

      <Section title="PortedSkeleton">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '16rem' }}>
          <PortedSkeleton style={{ height: '1rem', width: '80%' }} />
          <PortedSkeleton style={{ height: '1rem', width: '60%' }} />
          <PortedSkeleton style={{ height: '3rem', width: '100%' }} />
        </div>
      </Section>

      <Section title="PortedSeparator">
        <div style={{ width: '100%' }}>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Above the separator</p>
          <PortedSeparator style={{ marginBlock: 'var(--space-3)' }} />
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Below the separator</p>
        </div>
      </Section>

      <Section title="PortedTooltip (hover the button)">
        <PortedTooltipProvider>
          <PortedTooltip>
            <PortedTooltipTrigger asChild>
              <PortedButton variant="outline">Hover me</PortedButton>
            </PortedTooltipTrigger>
            <PortedTooltipContent>Tooltip content from tokens.css</PortedTooltipContent>
          </PortedTooltip>
        </PortedTooltipProvider>
      </Section>

      <Section title="PortedScrollArea">
        <PortedScrollArea style={{ height: '8rem', width: '16rem', border: '1px solid hsl(var(--border-default))', borderRadius: 'var(--radius-md)' }}>
          <div style={{ padding: 'var(--space-3)', fontSize: '0.875rem' }}>
            {Array.from({ length: 20 }, (_, i) => (
              <p key={i} style={{ margin: '0 0 var(--space-2) 0' }}>
                Scrollable row {i + 1}
              </p>
            ))}
          </div>
        </PortedScrollArea>
      </Section>

      <Section title="PortedMenubar">
        <PortedMenubar>
          <PortedMenubarMenu>
            <PortedMenubarTrigger>File</PortedMenubarTrigger>
            <PortedMenubarContent>
              <PortedMenubarItem>
                New <PortedMenubarShortcut>⌘N</PortedMenubarShortcut>
              </PortedMenubarItem>
              <PortedMenubarItem>
                Open <PortedMenubarShortcut>⌘O</PortedMenubarShortcut>
              </PortedMenubarItem>
              <PortedMenubarSeparator />
              <PortedMenubarItem variant="destructive">Delete</PortedMenubarItem>
            </PortedMenubarContent>
          </PortedMenubarMenu>
          <PortedMenubarMenu>
            <PortedMenubarTrigger>View</PortedMenubarTrigger>
            <PortedMenubarContent>
              <PortedMenubarCheckboxItem checked={checkedA} onCheckedChange={setCheckedA}>
                Show sidebar
              </PortedMenubarCheckboxItem>
              <PortedMenubarCheckboxItem checked={checkedB} onCheckedChange={setCheckedB}>
                Show status bar
              </PortedMenubarCheckboxItem>
            </PortedMenubarContent>
          </PortedMenubarMenu>
        </PortedMenubar>
      </Section>

      <Section title="PortedToast (custom-built — see FINDINGS.md)">
        <ToastButtons />
      </Section>

      <Section title="Manual verification checklist">
        <ul style={{ margin: 0, paddingInlineStart: 'var(--space-5)', fontSize: '0.875rem', color: 'hsl(var(--text-secondary))' }}>
          <li>Toggle theme above — every element should restyle, nothing left unstyled/black-on-black.</li>
          <li>Open the dialog, press Tab repeatedly — focus should stay trapped inside it.</li>
          <li>Open the dialog, press Escape — it should close and focus should return to the trigger button.</li>
          <li>Open the dialog, click the dark overlay outside it — it should close.</li>
          <li>Inspect elements — no `class` should contain Tailwind-style utility names (bg-, text-, hover:, etc.).</li>
        </ul>
      </Section>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <ThemeProvider>
      <PortedToaster>
        <Demo />
      </PortedToaster>
    </ThemeProvider>,
  )
}
