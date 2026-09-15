import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { JobStatusPanel } from '../components/JobStatusPanel'
import { Field, TextArea, TextInput } from '../components/TextField'
import { useJobPolling } from '../hooks/useJobPolling'
import { ingestPdf, ingestText, ingestUrl } from '../lib/api'

type Tab = 'text' | 'url' | 'pdf'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'text', label: 'Paste text' },
  { id: 'url', label: 'From URL' },
  { id: 'pdf', label: 'Upload PDF' },
]

interface IngestViewProps {
  /** Lets the documents list refresh once something lands. */
  onIngested?: () => void
}

export function IngestView({ onIngested }: IngestViewProps) {
  const [tab, setTab] = useState<Tab>('text')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const job = useJobPolling()
  const fieldId = useId()

  // Clear the inputs once the server confirms the document landed.
  useEffect(() => {
    if (job.state !== 'done') return
    setTitle('')
    setText('')
    setUrl('')
    setFile(null)
    onIngested?.()
  }, [job.state, onIngested])

  const switchTab = (next: Tab) => {
    setTab(next)
    setSubmitError(null)
    job.reset()
  }

  const busy = submitting || job.isPolling

  const canSubmit =
    !busy &&
    ((tab === 'text' && text.trim() !== '' && title.trim() !== '') ||
      (tab === 'url' && url.trim() !== '') ||
      (tab === 'pdf' && file !== null))

  const submit = async () => {
    if (!canSubmit) return
    setSubmitError(null)
    job.reset()
    setSubmitting(true)
    try {
      const response =
        tab === 'text'
          ? await ingestText({ text: text.trim(), title: title.trim() })
          : tab === 'url'
            ? await ingestUrl(url.trim())
            : await ingestPdf(file!)
      job.start(response.job_id)
    } catch (caught) {
      setSubmitError(caught)
    } finally {
      setSubmitting(false)
    }
  }

  const chooseFile = (picked: File | undefined) => {
    if (!picked) return
    setSubmitError(null)
    job.reset()
    setFile(picked)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-bright">Add to the knowledge base</h1>
        <p className="mt-1 text-sm text-muted">
          Documents are chunked and embedded before they become searchable.
        </p>
      </header>

      <div role="tablist" aria-label="Ingest source" className="flex gap-1 border-b border-line">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            id={`${fieldId}-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`${fieldId}-panel-${id}`}
            onClick={() => switchTab(id)}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === id
                ? 'border-accent text-bright'
                : 'border-transparent text-muted hover:text-body'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        role="tabpanel"
        id={`${fieldId}-panel-${tab}`}
        aria-labelledby={`${fieldId}-tab-${tab}`}
        className="mt-6 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {tab === 'text' ? (
          <>
            <Field label="Title" htmlFor={`${fieldId}-title`}>
              <TextInput
                id={`${fieldId}-title`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Onboarding notes"
                disabled={busy}
              />
            </Field>
            <Field label="Text" htmlFor={`${fieldId}-text`} hint={`${text.length} characters`}>
              <TextArea
                id={`${fieldId}-text`}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Paste the content you want to make searchable…"
                rows={10}
                disabled={busy}
              />
            </Field>
          </>
        ) : null}

        {tab === 'url' ? (
          <Field label="URL" htmlFor={`${fieldId}-url`} hint="The page is fetched server-side">
            <TextInput
              id={`${fieldId}-url`}
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/article"
              disabled={busy}
            />
          </Field>
        ) : null}

        {tab === 'pdf' ? (
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              chooseFile(event.dataTransfer.files[0])
            }}
            className={`rounded-panel border border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            <p className="text-sm text-body">
              {file ? file.name : 'Drop a PDF here, or choose one.'}
            </p>
            <p className="mt-1 text-xs text-faint">
              {file ? formatBytes(file.size) : 'PDF only'}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? 'Choose another' : 'Choose file'}
            </Button>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit} loading={busy}>
            {busy ? 'Adding…' : 'Add document'}
          </Button>
          {tab === 'text' && title.trim() === '' && text.trim() !== '' ? (
            <span className="text-xs text-faint">A title is required.</span>
          ) : null}
        </div>

        {submitError ? <ErrorMessage error={submitError} /> : null}
        <JobStatusPanel state={job.state} job={job.job} error={job.error} />
      </form>
    </div>
  )
}
