import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const Select = ({ children, value, onValueChange }: any) => {
  const [open, setOpen] = React.useState(false)

  // Buscamos el valor seleccionado para mostrarlo en el trigger
  const selectedLabel = React.useMemo(() => {
    let label = ""
    React.Children.forEach(children, (child: any) => {
      if (child.type === SelectContent) {
        React.Children.forEach(child.props.children, (item: any) => {
          if (item?.props?.value === value) {
            label = item.props.children
          }
        })
      }
    })
    return label
  }, [children, value])

  return (
    <div className="relative w-full">
      <select
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="" disabled>Seleccionar...</option>
        {React.Children.map(children, (child: any) => {
          if (child.type === SelectContent) {
            return child.props.children
          }
          return null
        })}
      </select>
      {React.Children.map(children, (child: any) => {
        if (child.type === SelectTrigger) {
          return React.cloneElement(child, { 
            children: selectedLabel || child.props.children || "Seleccionar..."
          })
        }
        return null
      })}
    </div>
  )
}

const SelectTrigger = React.forwardRef<any, any>(({ className, children, ...props }, ref) => (
  <div 
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-slate-50", 
      className
    )} 
    {...props}
  >
    <span className="truncate">{children}</span>
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="h-4 w-4 opacity-50"
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  </div>
))

const SelectValue = ({ placeholder, value }: any) => null // No lo usamos directamente ahora

const SelectContent = ({ children }: any) => <>{children}</>
const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
