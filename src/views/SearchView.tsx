import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Markdown } from '../components/Markdown'
import { ErrorMessage } from '../components/ErrorMessage'
import { Skeleton } from '../components/Skeleton'
import { search } from '../lib/api'
import type { SearchResponse, SearchResult } from '../lib/api'

const TOP_K = 5
/**
 * Scores arrive as reranker logits rather than 0–1 similarities: a strong hit
 * scores well above zero and an unrelated chunk well below it.
 */
const LOW_RELEVANCE_BELOW = 0
/** Sources longer than this start collapsed. */
const CLAMP_AFTER_CHARS = 280

export function SearchView() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const controllerRef = useRef<AbortController | null>(null)

  // Drop any in-flight request if the view goes away mid-search.
  useEffect(() => () => controllerRef.current?.abort(), [])

  const run = async (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return

    // A newer search supersedes the last one.
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setSubmitted(trimmed)
    setLoading(true)
    setError(null)
    try {
      const result = await search(trimmed, TOP_K, controller.signal)
      setResponse(result)
    } catch (caught) {
      if (controller.signal.aborted) return
      setResponse(null)
      setError(caught)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-bright">Search</h1>
        <p className="mt-1 text-sm text-muted">
          Ask a question and the answer is drawn from your indexed documents.
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void run(query)
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What would you like to know?"
          aria-label="Search query"
          className="w-full rounded-lg border border-line bg-raised px-4 py-2.5 text-sm text-body placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
        />
        <Button type="submit" disabled={query.trim() === ''} loading={loading}>
          Search
        </Button>
      </form>

      <div className="mt-8">
        {loading ? <SearchSkeleton /> : null}

        {!loading && error ? (
          <ErrorMessage error={error} onRetry={() => void run(submitted)} />
        ) : null}

        {!loading && !error && response ? <Results response={response} /> : null}

        {!loading && !error && !response ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 20 20" fill="none" className="size-5">
                <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="m13.5 13.5 3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
            title="Nothing searched yet"
            description="Results and a generated answer will appear here."
          />
        ) : null}
      </div>
    </div>
  )
}

function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-panel border border-line bg-surface p-5">
        <Skeleton className="h-3 w-24" />
        <div className="mt-4 flex flex-col gap-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[92%]" />
          <Skeleton className="h-3.5 w-[70%]" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="rounded-lg border border-line bg-surface p-4">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-[60%]" />
          </div>
        ))}
      </div>
    </div>
  )
}

function Results({ response }: { response: SearchResponse }) {
  if (response.results.length === 0) {
    return (
      <EmptyState
        title="No matches"
        description={`Nothing in the knowledge base matched “${response.query}”. Try different wording, or add more documents.`}
      />
    )
  }

  return (
    <div className="flex animate-fade-up flex-col gap-6">
      <section
        aria-label="Generated answer"
        className="rounded-panel border border-accent-line bg-surface p-5"
      >
        <h2 className="text-xs font-medium tracking-wide text-accent uppercase">Answer</h2>
        {response.answer.trim() ? (
          <div className="mt-3 text-[0.9375rem] leading-relaxed text-body">
            <Markdown>{response.answer}</Markdown>
          </div>
        ) : (
          // The backend returns an empty answer when generation fails but retrieval worked.
          <p className="mt-3 text-sm text-muted">
            An answer couldn’t be generated this time. The matching sources are listed below.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">
          {response.results.length} source{response.results.length === 1 ? '' : 's'}
        </h2>
        <ol className="flex flex-col gap-3">
          {response.results.map((result, index) => (
            <li key={`${result.doc_id}-${index}`}>
              <SourceCard result={result} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function SourceCard({ result }: { result: SearchResult }) {
  const [expanded, setExpanded] = useState(false)
  const long = result.text.length > CLAMP_AFTER_CHARS
  const lowRelevance = result.score < LOW_RELEVANCE_BELOW
  // URL-ingested documents use the URL as their title, so the source line
  // would just repeat it.
  const showSource = result.source !== '' && result.source !== result.title

  return (
    // Low-relevance cards step their text down a colour rather than using
    // opacity, which would push them below AA contrast.
    <article className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <div className="flex items-baseline justify-between gap-4">
        <h3
          className={`truncate text-sm font-medium ${lowRelevance ? 'text-muted' : 'text-bright'}`}
        >
          {result.title}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {lowRelevance ? <span className="text-xs text-faint">Low relevance</span> : null}
          <span
            title={`Relevance score ${result.score.toFixed(4)}`}
            className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-muted"
          >
            {result.score.toFixed(2)}
          </span>
        </div>
      </div>
      <p
        className={`mt-2 text-sm leading-relaxed ${lowRelevance ? 'text-faint' : 'text-muted'} ${
          long && !expanded ? 'line-clamp-3' : ''
        }`}
      >
        {result.text}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-1.5 cursor-pointer text-xs text-accent hover:text-accent-hover"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
      {showSource ? (
        <p className="mt-3 truncate text-xs text-faint">{result.source}</p>
      ) : null}
    </article>
  )
}
