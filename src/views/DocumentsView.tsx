import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { Skeleton } from '../components/Skeleton'
import { deleteDocument, listDocuments } from '../lib/api'
import type { DocumentItem } from '../lib/api'

const LIMIT = 50

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatAdded(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : DATE_FORMAT.format(parsed)
}

interface DocumentsViewProps {
  /** Bump to refetch — the ingest view uses this after a job lands. */
  refreshToken?: number
}

export function DocumentsView({ refreshToken = 0 }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<unknown>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const result = await listDocuments(LIMIT, controller.signal)
      setDocuments(result.documents)
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(caught)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    return () => controllerRef.current?.abort()
  }, [load, refreshToken])

  const remove = async (docId: string) => {
    setDeletingId(docId)
    setDeleteError(null)
    try {
      await deleteDocument(docId)
      // Drop it locally rather than refetching the whole list.
      setDocuments((current) => current?.filter((doc) => doc.doc_id !== docId) ?? null)
      setConfirmingId(null)
    } catch (caught) {
      setDeleteError(caught)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-bright">Documents</h1>
          <p className="mt-1 text-sm text-muted">
            Everything currently indexed and searchable.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </header>

      {deleteError ? (
        <ErrorMessage error={deleteError} className="mb-4" />
      ) : null}

      {loading && !documents ? <DocumentsSkeleton /> : null}

      {!loading && error ? <ErrorMessage error={error} onRetry={() => void load()} /> : null}

      {!error && documents && documents.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 20 20" fill="none" className="size-5">
              <path
                d="M5.5 3.5h6l3.5 3.5v9.5h-9.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M11.25 3.75V7.5h3.75" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          }
          title="No documents yet"
          description="Add something from the Ingest tab and it will show up here."
        />
      ) : null}

      {!error && documents && documents.length > 0 ? (
        <ul className="flex animate-fade-up flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.doc_id}
              className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-medium text-bright">{doc.title}</h2>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
                  <span className="truncate">{doc.source}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {doc.total_chunks} chunk{doc.total_chunks === 1 ? '' : 's'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={doc.added_at}>{formatAdded(doc.added_at)}</time>
                </p>
              </div>

              {confirmingId === doc.doc_id ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted">Delete?</span>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deletingId === doc.doc_id}
                    onClick={() => void remove(doc.doc_id)}
                  >
                    Yes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === doc.doc_id}
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  aria-label={`Delete ${doc.title}`}
                  onClick={() => {
                    setDeleteError(null)
                    setConfirmingId(doc.doc_id)
                  }}
                >
                  Delete
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function DocumentsSkeleton() {
  return (
    <ul className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((row) => (
        <li key={row} className="rounded-lg border border-line bg-surface p-4">
          <Skeleton className="h-3.5 w-56" />
          <Skeleton className="mt-2.5 h-3 w-40" />
        </li>
      ))}
    </ul>
  )
}
