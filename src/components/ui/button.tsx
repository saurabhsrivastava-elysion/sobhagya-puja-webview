import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/*
 * Sized for touch inside the app WebView: the default is 44px, primary actions use `lg` (48px).
 * Every variant has an `active:` state because there is no hover on a phone.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_2px_8px_rgb(255_152_0/0.25)] active:bg-primary-strong",
        soft: "bg-primary-soft text-primary-strong active:bg-primary-tint/60",
        outline:
          "border-border bg-card text-foreground active:bg-muted aria-expanded:bg-muted",
        "outline-primary":
          "border-primary bg-card text-primary-strong active:bg-primary-soft",
        secondary:
          "bg-secondary text-secondary-foreground active:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)] aria-expanded:bg-secondary",
        ghost:
          "text-foreground active:bg-muted aria-expanded:bg-muted",
        destructive:
          "bg-destructive/10 text-danger-text active:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary-strong underline-offset-4 active:underline",
      },
      size: {
        default:
          "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 gap-1 rounded-md px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 rounded-md px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 gap-2 rounded-xl px-5 text-[15px]",
        icon: "size-11 rounded-full",
        "icon-xs": "size-8 rounded-full [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 rounded-full",
        "icon-lg": "size-11 rounded-full [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
