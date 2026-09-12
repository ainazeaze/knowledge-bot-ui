import { useCallback, useEffect, useRef, useState } from 'react'
import { getJob } from '../lib/api'
import type { JobResponse } from '../lib/api'

/** Poll quickly at first — most ingests finish in about a second. */
const FIRST_DELAY_MS = 500
const MAX_DELAY_MS = 4000
const BACKOFF_FACTOR = 1.5
/** Give up rather than poll a wedged job forever. */
const TIMEOUT_MS = 120_000
/** Ride out a blip; only give up once the server is repeatedly unreachable. */
const MAX_CONSECUTIVE_ERRORS = 3

export type JobPollingState = 'idle' | 'polling' | 'done' | 'failed' | 'error'

interface Run {
  jobId: string
  /** Lets the same job id be polled again after a retry. */
  token: number
}

export interface UseJobPolling {
  state: JobPollingState
  /** Latest response from the server, including its `detail` message. */
  job: JobResponse | null
  /** Set only when polling itself broke, never when the job reports `failed`. */
  error: unknown
  isPolling: boolean
  start: (jobId: string) => void
  reset: () => void
}

/**
 * Follows one ingest job to completion.
 *
 * Distinguishes a job that finished unsuccessfully (`failed`, with the
 * server's reason in `job.detail`) from polling that broke (`error`).
 */
export function useJobPolling(): UseJobPolling {
  const [run, setRun] = useState<Run | null>(null)
  const [state, setState] = useState<JobPollingState>('idle')
  const [job, setJob] = useState<JobResponse | null>(null)
  const [error, setError] = useState<unknown>(null)
  const tokenRef = useRef(0)

  const start = useCallback((jobId: string) => {
    setJob(null)
    setError(null)
    setState('polling')
    tokenRef.current += 1
    setRun({ jobId, token: tokenRef.current })
  }, [])

  const reset = useCallback(() => {
    setRun(null)
    setJob(null)
    setError(null)
    setState('idle')
  }, [])

  useEffect(() => {
    if (!run) return

    const controller = new AbortController()
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms)
      })

    const poll = async () => {
      let delay = FIRST_DELAY_MS
      let consecutiveErrors = 0
      const deadline = Date.now() + TIMEOUT_MS

      while (!cancelled) {
        try {
          const next = await getJob(run.jobId, controller.signal)
          if (cancelled) return
          consecutiveErrors = 0
          setJob(next)
          if (next.status === 'done' || next.status === 'failed') {
            setState(next.status)
            return
          }
        } catch (caught) {
          if (cancelled || controller.signal.aborted) return
          consecutiveErrors += 1
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            setError(caught)
            setState('error')
            return
          }
        }

        if (Date.now() >= deadline) {
          setError(new Error('The job is taking longer than expected.'))
          setState('error')
          return
        }

        await sleep(delay)
        delay = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY_MS)
      }
    }

    void poll()

    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [run])

  return {
    state,
    job,
    error,
    isPolling: state === 'polling',
    start,
    reset,
  }
}
