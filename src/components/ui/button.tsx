import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:shadow",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-tint-navy-border bg-background text-tint-navy-fg hover:bg-tint-navy-bg hover:text-tint-navy-fg",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent/70 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "soft-navy": "border border-tint-navy-border bg-tint-navy-bg text-tint-navy-fg hover:border-tint-navy-border/80 hover:bg-tint-navy-bg/70",
        "soft-green": "border border-tint-green-border bg-tint-green-bg text-tint-green-fg hover:border-tint-green-border/80 hover:bg-tint-green-bg/70",
        "soft-amber": "border border-tint-amber-border bg-tint-amber-bg text-tint-amber-fg hover:border-tint-amber-border/80 hover:bg-tint-amber-bg/70",
        "soft-red": "border border-tint-red-border bg-tint-red-bg text-tint-red-fg hover:border-tint-red-border/80 hover:bg-tint-red-bg/70",
      },
      size: {
        default: "h-10 px-4 py-2 sm:h-9 sm:px-3.5",
        sm: "h-9 rounded-md px-3 text-xs sm:h-8",
        toolbar: "h-9 rounded-[6px] px-2.5 text-xs",
        lg: "h-11 px-6 sm:h-10 sm:px-5",
        icon: "h-10 w-10 sm:h-9 sm:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp data-ui="button" data-size={size || 'default'} className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
