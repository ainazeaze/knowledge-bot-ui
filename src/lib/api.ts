/**
 * Typed client for the knowledge-bot backend.
 *
 * Every call either resolves with the parsed body or throws an `ApiError`,
 * so views only ever branch on one error shape.
 */

const BASE_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '')

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface SearchResult {
  text: string
  title: string
  source: string
  doc_id: string
  score: number
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  answer: string
}

export interface IngestResponse {
  job_id: string
  status: string
}

export interface JobResponse {
  job_id: string
  status: JobStatus
  detail?: string | null
}

export interface DocumentItem {
  doc_id: string
  title: string
  source: string
  added_at: string
  total_chunks: number
}

export interface DocumentListResponse {
  documents: DocumentItem[]
}

/**
 * A failed request. `status` is 0 when no readable response came back; `reason`
 * then says whether the server was down or answered in a way the browser hid.
 */
export class ApiError extends Error {
  readonly status: number
  readonly reason: 'http' | 'offline' | 'unreadable'

  constructor(message: string, status: number, reason: ApiError['reason'] = 'http') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.reason = reason
  }

  /** True when the backend was unreachable rather than returning an error. */
  get isOffline(): boolean {
    return this.reason === 'offline'
  }
}

/**
 * A `no-cors` request resolves whenever the server answers at all, even when
 * CORS headers are missing — so it separates "down" from "responded unreadably".
 */
async function isServerReachable(): Promise<boolean> {
  try {
    await fetch(`${BASE_URL}/`, { mode: 'no-cors', cache: 'no-store' })
    return true
  } catch {
    return false
  }
}

/** Pull a human-readable message out of FastAPI's several error shapes. */
async function errorMessage(response: Response): Promise<string> {
  let detail: unknown
  try {
    detail = (await response.json())?.detail
  } catch {
    // Non-JSON body (a proxy error page, or an empty 500).
    return `${response.status} ${response.statusText}`.trim()
  }

  if (typeof detail === 'string' && detail) return detail

  // 422 validation errors arrive as [{ loc, msg, type }, ...].
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item?.msg === 'string' ? item.msg : null))
      .filter((msg): msg is string => Boolean(msg))
    if (messages.length) return messages.join('; ')
  }

  return `${response.status} ${response.statusText}`.trim()
}

interface RequestOptions {
  method?: string
  body?: BodyInit
  headers?: HeadersInit
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch (error) {
    // Let genuine cancellations propagate so callers can ignore them.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    // Unhandled server errors often skip the CORS middleware, so the browser
    // reports them exactly like a dead server. Check which one this was.
    if (await isServerReachable()) {
      throw new ApiError(
        'The server hit an unexpected error while handling this request.',
        0,
        'unreadable',
      )
    }
    throw new ApiError('Could not reach the server. Is the backend running?', 0, 'offline')
  }

  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status)
  }

  // 204 and other empty bodies have nothing to parse.
  if (response.status === 204) return undefined as T

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError('The server returned a malformed response.', response.status)
  }
}

function postJson<T>(path: string, payload: unknown, signal?: AbortSignal) {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
}

export function search(
  query: string,
  topK = 5,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, top_k: String(topK) })
  return request<SearchResponse>(`/search?${params}`, { signal })
}

export function ingestText(
  input: { text: string; title: string; source?: string },
  signal?: AbortSignal,
): Promise<IngestResponse> {
  return postJson<IngestResponse>('/ingest/text', input, signal)
}

export function ingestUrl(url: string, signal?: AbortSignal): Promise<IngestResponse> {
  return postJson<IngestResponse>('/ingest/url', { url }, signal)
}

export function ingestPdf(file: File, signal?: AbortSignal): Promise<IngestResponse> {
  const form = new FormData()
  form.append('file', file)
  // No Content-Type header: the browser sets the multipart boundary itself.
  return request<IngestResponse>('/ingest/pdf', { method: 'POST', body: form, signal })
}

export function getJob(jobId: string, signal?: AbortSignal): Promise<JobResponse> {
  return request<JobResponse>(`/jobs/${encodeURIComponent(jobId)}`, { signal })
}

export function listDocuments(
  limit = 10,
  signal?: AbortSignal,
): Promise<DocumentListResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  return request<DocumentListResponse>(`/documents?${params}`, { signal })
}

export function deleteDocument(docId: string, signal?: AbortSignal): Promise<void> {
  return request<void>(`/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
    signal,
  })
}
