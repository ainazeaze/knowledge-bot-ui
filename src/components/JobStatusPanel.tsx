import type { JobPollingState } from '../hooks/useJobPolling'
import type { JobResponse } from '../lib/api'
import { errorText } from '../lib/errors'
import { Spinner } from './Spinner'

interface JobStatusPanelProps {
  state: JobPollingState
  job: JobResponse | null
  error: unknown
}

const WAITING_COPY: Record<string, string> = {
  pending: 'Queued…',
  processing: 'Processing…',
}

/**
 * Feedback for one ingest job.
 *
 * `failed` and `error` look similar but mean different things: the first is
 * the server rejecting the document, the second is polling breaking down.
 */
export function JobStatusPanel({ state, job, error }: JobStatusPanelProps) {
  if (state === 'idle') return null

  if (state === 'polling') {
    return (
      <div className="flex animate-fade-up items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <Spinner size="sm" className="text-accent" label={null} />
        <p className="text-sm text-muted" role="status">
          {WAITING_COPY[job?.status ?? 'pending'] ?? 'Working…'}
        </p>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="flex animate-fade-up items-start gap-3 rounded-lg border border-success/30 bg-success-soft px-4 py-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="mt-0.5 size-4 shrink-0 text-success"
        >
          <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="m6.75 10.25 2.25 2.25 4.25-4.75"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-sm text-body" role="status">
          Added to the knowledge base.
          {job?.detail ? <span className="text-muted"> {job.detail}.</span> : null}
        </p>
      </div>
    )
  }

  const message =
    state === 'failed'
      ? (job?.detail ?? 'The server could not process this document.')
      : errorText(error)

  return (
    <div
      role="alert"
      className="flex animate-fade-up items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3"
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
      <div className="flex-1">
        <p className="text-sm font-medium text-bright">
          {state === 'failed' ? 'Ingest failed' : 'Lost track of this job'}
        </p>
        <p className="mt-0.5 text-sm text-muted">{message}</p>
      </div>
    </div>
  )
}
