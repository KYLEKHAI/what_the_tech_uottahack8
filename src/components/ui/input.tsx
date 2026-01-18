import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

function Input({ className, type, error, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-9 w-full min-w-0 rounded-md bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // Default border
        !error && "border border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        // Error state - destructive color border
        error && "border-2 border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20 focus-visible:ring-[3px]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
