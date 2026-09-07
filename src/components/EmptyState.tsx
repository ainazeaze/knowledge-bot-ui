import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** Decorative glyph or icon shown above the title. */
  icon?: ReactNode
  title: string
  description?: string
  /** Optional call to action, usually a Button. */
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-4 flex size-11 items-center justify-center rounded-full bg-raised text-muted"
        >
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-bright">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
