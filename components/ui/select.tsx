import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const Select = ({ children, value, onValueChange }: any) => {
  return React.cloneElement(children, { value, onValueChange })
}

const SelectTrigger = React.forwardRef<any, any>(({ className, children, ...props }, ref) => (
  <div className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm", className)} {...props}>
    {children}
  </div>
))

const SelectValue = ({ placeholder, value }: any) => <span>{value || placeholder}</span>

const SelectContent = ({ children }: any) => <div className="hidden">{children}</div>
const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>

// Simplificación extrema para que el formulario no rompa si no hay Radix completo
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
