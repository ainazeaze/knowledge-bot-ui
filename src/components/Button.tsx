import type { ComponentProps, ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  variant?: Variant
  size?: 'sm' | 'md'
  /** Shows a spinner and blocks interaction without collapsing the layout. */
  loading?: boolean
  children: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press font-medium',
  secondary:
    'bg-raised text-body border border-line hover:border-line-strong hover:text-bright',
  ghost: 'text-muted hover:bg-raised hover:text-bright',
  danger: 'bg-danger-soft text-danger border border-transparent hover:border-danger/40',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
} as const

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // `loading` is a busy state, not a permanent one — keep it focusable.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex cursor-pointer items-center justify-center rounded-lg whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size="sm" label={null} /> : null}
      {children}
    </button>
  )
}
