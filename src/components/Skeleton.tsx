interface SkeletonProps {
  className?: string
}

/** Placeholder block sized by the caller; mirrors the shape it stands in for. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-raised ${className}`} />
}
