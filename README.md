# Knowledge Base UI

A web interface for a retrieval-augmented (RAG) knowledge base. Add documents from text, URLs or PDFs, then ask questions and get an LLM-generated answer grounded in the passages it was drawn from.

This repository is the frontend. It talks to the **knowledge-bot** backend, a FastAPI service that chunks, embeds and searches the documents.

## Features

- **Search**: ask a question in plain language. The generated answer is shown first, followed by the source passages it came from, each with its relevance score. Weak matches are dimmed so they don't compete with the real hits.
- **Ingest**: add a document by pasting text, entering a URL or uploading a PDF. Ingestion runs as a background job on the server; the UI follows it until it finishes and reports success or the server's reason for failure.
- **Documents**: browse everything indexed, with source, chunk count and date added, and delete documents with an inline confirmation.

Every view has deliberate loading, empty and error states, so the interface stays readable when the backend is slow, empty or unavailable.

## Tech stack

- [React 19](https://react.dev) with TypeScript in strict mode
- [Vite](https://vite.dev) for the dev server and build
- [Tailwind CSS v4](https://tailwindcss.com), using a custom dark theme defined as design tokens
- [Oxlint](https://oxc.rs) for linting

No UI component library: buttons, form fields, tabs and the Markdown renderer are all built in this repo.

## Getting started

### Prerequisites

- Node.js `20.19+` or `22.12+`
- The knowledge-bot backend running locally, by default on `http://localhost:8000`

### Install and run

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). The port is fixed because the backend's CORS configuration allows this origin.

### Configuration

The backend URL is read from `VITE_API_URL` and defaults to `http://localhost:8000`. To point at a different server, create a `.env.local` file:

```bash
VITE_API_URL=https://your-backend.example.com
```

That origin also needs to be allowed by the backend's CORS settings.

## Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the dev server on port 3000             |
| `npm run build`   | Type-check, then build for production into `dist/` |
| `npm run preview` | Serve the production build locally            |
| `npm run lint`    | Lint the project with Oxlint                  |

## Project structure

```
src/
├── App.tsx             App shell: sidebar navigation and view switching
├── index.css           Tailwind theme: colour tokens, fonts, animations
├── views/              One component per section
│   ├── SearchView.tsx
│   ├── IngestView.tsx
│   └── DocumentsView.tsx
├── components/         Shared UI: Button, form fields, Markdown, states
├── hooks/
│   └── useJobPolling.ts   Follows an ingest job until it completes
└── lib/
    ├── api.ts          Typed client for every backend endpoint
    └── errors.ts       Turns any failure into a user-facing message
```

## Implementation notes

A few decisions worth calling out:

- **One typed API client.** Every request goes through `src/lib/api.ts`, whose types mirror the backend's OpenAPI schema. All failures surface as a single `ApiError` type, so each view handles errors the same way.
- **Job polling with backoff.** Ingestion is asynchronous, so `useJobPolling` polls the job endpoint starting at 500 ms and backing off to every 4 s, with a two-minute timeout. It tolerates brief network blips, and it keeps "the job failed" (the server rejected the document) separate from "polling failed" (the server became unreachable), because each needs a different message.
- **Cancellable requests.** A new search cancels the one still in flight, so a slow earlier response can never replace a newer one.
- **Honest error messages.** When a server error comes back without CORS headers, the browser hides it and it looks exactly like the server being down. The client makes a follow-up `no-cors` request to tell the two apart, so users aren't told the backend is offline when it isn't.
- **Safe Markdown.** LLM answers are rendered by a small built-in Markdown renderer that produces React elements rather than HTML. Model output can't inject markup, and only `http(s)` links become clickable.

## Backend API

The endpoints this UI uses:

| Method   | Endpoint                 | Purpose                                         |
| -------- | ------------------------ | ----------------------------------------------- |
| `GET`    | `/search?q=&top_k=`      | Generated answer plus the top matching passages |
| `POST`   | `/ingest/text`           | Add pasted text (`text`, `title`)               |
| `POST`   | `/ingest/url`            | Fetch and add a web page                        |
| `POST`   | `/ingest/pdf`            | Upload and add a PDF (multipart, field `file`)  |
| `GET`    | `/jobs/{job_id}`         | Status of an ingest job                         |
| `GET`    | `/documents?limit=`      | List indexed documents                          |
| `DELETE` | `/documents/{doc_id}`    | Remove a document                               |
