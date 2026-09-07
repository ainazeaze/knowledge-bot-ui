interface SpinnerProps {
  /** Matches the surrounding text size by default. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Announced to screen readers; pass null inside a labelled control. */
  label?: string | null
}

const SIZES = {
  sm: 'size-3.5 border-[1.5px]',
  md: 'size-4 border-2',
  lg: 'size-6 border-2',
} as const

export function Spinner({ size = 'md', className = '', label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      className={`inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent align-[-0.125em] ${SIZES[size]} ${className}`}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
