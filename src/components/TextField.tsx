import type { ComponentProps, ReactNode } from 'react'

export const controlClass =
  'w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-body placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent focus:outline-none disabled:opacity-50'

interface FieldProps {
  label: string
  htmlFor: string
  /** Shown to the right of the label, for optional/hint text. */
  hint?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-xs font-medium text-muted">
          {label}
        </label>
        {hint ? <span className="text-xs text-faint">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

export function TextInput({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${controlClass} ${className}`} {...props} />
}

export function TextArea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${controlClass} resize-y ${className}`} {...props} />
}
