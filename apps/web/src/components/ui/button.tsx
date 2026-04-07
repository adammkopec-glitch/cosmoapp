// filepath: apps/web/src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-[10px] font-sans font-medium tracking-[0.2em] uppercase transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-espresso text-ivory shadow hover:bg-espresso/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-espresso bg-transparent text-espresso shadow-sm hover:bg-espresso hover:text-ivory",
        secondary: "bg-cream text-espresso shadow-sm hover:bg-cream/80",
        ghost: "text-espresso hover:bg-cream",
        link: "text-espresso underline-offset-4 hover:underline border-b border-caramel pb-0.5 tracking-[0.15em]",
        caramel: "bg-caramel text-espresso shadow hover:bg-caramel/90",
      },
      size: {
        default: "h-10 px-8 py-2",
        sm: "h-8 px-5 py-1.5 text-[9px]",
        lg: "h-12 px-10 py-3 text-[11px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
