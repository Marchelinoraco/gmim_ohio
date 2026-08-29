import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Varian & ukuran diselaraskan ke token desain GMIM (Task 3). Dark mode dikirim
// di Task 8b lewat `data-theme` + `@media` pada token CSS var — jadi warnanya
// ikut tema otomatis tanpa perlu class `dark:` di sini.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // teks putih (text-surface) di atas primary ~7.1:1 — lolos AA
        primary: "bg-primary text-surface hover:bg-primary-hover",
        // teks putih (text-surface) di atas secondary — lolos AA
        secondary: "bg-secondary text-surface hover:bg-secondary-hover",
        // text-primary di atas surface putih ~7.1:1 (sedikit lebih rendah di
        // atas hover surface-2) — lolos AA
        outline:
          "border border-primary bg-surface text-primary hover:bg-surface-2",
        // text-primary di atas surface / surface-2 ~7.1:1 — lolos AA
        ghost: "text-primary hover:bg-surface-2",
      },
      size: {
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        md: "h-9 px-4 py-2 has-[>svg]:px-3",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "md",
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
