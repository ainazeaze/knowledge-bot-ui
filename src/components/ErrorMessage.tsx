import { errorText } from '../lib/errors'
import { Button } from './Button'

interface ErrorMessageProps {
  error: unknown
  /** Renders a retry affordance when provided. */
  onRetry?: () => void
  className?: string
}

export function ErrorMessage({ error, onRetry, className = '' }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="mt-0.5 size-4 shrink-0 text-danger"
      >
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 6.5v4M10 13.4v.1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <p className="flex-1 text-sm text-body">{errorText(error)}</p>
      {onRetry ? (
        <Button variant="ghost" size="sm" onClick={onRetry} className="-my-1 -mr-2">
          Retry
        </Button>
      ) : null}
    </div>
  )
}
