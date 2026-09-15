import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { DocumentsView } from './views/DocumentsView'
import { IngestView } from './views/IngestView'
import { SearchView } from './views/SearchView'

type ViewId = 'search' | 'ingest' | 'documents'

interface NavItem {
  id: ViewId
  label: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  {
    id: 'search',
    label: 'Search',
    icon: (
      <>
        <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
        <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'ingest',
    label: 'Ingest',
    icon: (
      <>
        <path
          d="M10 3.75v8.5m0 0 3-3m-3 3-3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.25 13.75v1.5a1 1 0 0 0 1 1h9.5a1 1 0 0 0 1-1v-1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: (
      <>
        <path
          d="M5.5 3.5h6l3.5 3.5v9.5h-9.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M11.25 3.75V7.5h3.75" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
  },
]

function App() {
  const [view, setView] = useState<ViewId>('search')
  const [documentsToken, setDocumentsToken] = useState(0)

  // Ingesting invalidates the documents list, whichever view is showing.
  const handleIngested = useCallback(() => {
    setDocumentsToken((token) => token + 1)
  }, [])

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/favicon.svg" alt="" aria-hidden="true" className="size-6 rounded-md" />
          <span className="text-sm font-semibold text-bright">Knowledge Base</span>
        </div>

        <nav aria-label="Sections" className="flex flex-col gap-0.5 px-3">
          {NAV.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-accent-soft font-medium text-bright'
                    : 'text-muted hover:bg-raised hover:text-body'
                }`}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className={`size-4 shrink-0 ${active ? 'text-accent' : ''}`}
                >
                  {item.icon}
                </svg>
                {item.label}
              </button>
            )
          })}
        </nav>

        <p className="mt-auto px-5 py-4 text-xs text-faint">
          Retrieval-augmented search over your own documents.
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        {view === 'search' ? <SearchView /> : null}
        {view === 'ingest' ? <IngestView onIngested={handleIngested} /> : null}
        {view === 'documents' ? <DocumentsView refreshToken={documentsToken} /> : null}
      </main>
    </div>
  )
}

export default App
