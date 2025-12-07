import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const Spinner = React.forwardRef(
  ({ className, ...props }, ref) => (
    <Loader2
      ref={ref}
      className={cn("h-4 w-4 animate-spin", className)}
      {...props}
    />
  )
)
Spinner.displayName = "Spinner"

const LoadingSpinner = ({ description, className, ...props }) => {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <Spinner />
      {description && <span className="text-sm">{description}</span>}
    </div>
  )
}
LoadingSpinner.displayName = "LoadingSpinner"

export { Spinner, LoadingSpinner }
