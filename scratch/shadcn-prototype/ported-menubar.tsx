import { Menubar as MenubarPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `menubar` (get_component "menubar", 2026-08-28).
// Real Radix primitives kept throughout (Root/Menu/Trigger/Portal/Content/
// Item/CheckboxItem/RadioGroup/RadioItem/Label/Separator/Shortcut/Sub/
// SubTrigger/SubContent — full keyboard nav across top-level menus, submenus,
// checkbox/radio items). lucide-react's Check/ChevronRight/Circle icons
// swapped for plain glyphs (✓ / › / ●) to avoid adding an icon-library
// dependency, matching the same call made for ported-dialog.tsx's close icon.

export function PortedMenubar({ className, ...props }: ComponentProps<typeof MenubarPrimitive.Root>) {
  return <MenubarPrimitive.Root data-slot="menubar" className={['pb-menubar', className].filter(Boolean).join(' ')} {...props} />
}

export function PortedMenubarMenu(props: ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />
}

export function PortedMenubarTrigger({ className, ...props }: ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={['pb-menubar-trigger', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export function PortedMenubarContent({
  className,
  align = 'start',
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof MenubarPrimitive.Content>) {
  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={['pb-menubar-content', className].filter(Boolean).join(' ')}
        {...props}
      />
    </MenubarPrimitive.Portal>
  )
}

export function PortedMenubarItem({
  className,
  inset,
  variant = 'default',
  ...props
}: ComponentProps<typeof MenubarPrimitive.Item> & { inset?: boolean; variant?: 'default' | 'destructive' }) {
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={['pb-menubar-item', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export function PortedMenubarCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      className={['pb-menubar-item', 'pb-menubar-checkbox-item', className].filter(Boolean).join(' ')}
      checked={checked}
      {...props}
    >
      <span className="pb-menubar-item-indicator">
        <MenubarPrimitive.ItemIndicator>✓</MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
}

export function PortedMenubarSeparator({ className, ...props }: ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator
      data-slot="menubar-separator"
      className={['pb-menubar-separator', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export function PortedMenubarShortcut({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="menubar-shortcut" className={['pb-menubar-shortcut', className].filter(Boolean).join(' ')} {...props} />
}
