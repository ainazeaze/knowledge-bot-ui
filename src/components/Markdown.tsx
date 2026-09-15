import type { ReactNode } from 'react'

/**
 * Renders the small slice of Markdown LLM answers actually use: paragraphs,
 * bullet and numbered lists, headings, **bold**, *italic*, `code` and links.
 *
 * Builds React elements rather than setting HTML, so model output can never
 * inject markup.
 */

const INLINE =
  /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\((?:[^()\s]|\([^()\s]*\))+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (!part) return null

    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return (
        <strong key={key} className="font-semibold text-bright">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className="rounded bg-raised px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    const link = part.match(/^\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)$/)
    if (link) {
      const [, label, href] = link
      // Only follow web links; anything else (javascript:, data:) stays plain text.
      return /^https?:\/\//i.test(href) ? (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline decoration-accent-line underline-offset-2 hover:text-accent-hover"
        >
          {label}
        </a>
      ) : (
        label
      )
    }
    if (
      part.length > 2 &&
      ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))
    ) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'h'; text: string }

const BULLET = /^\s*[-*•]\s+/
const NUMBERED = /^\s*\d+[.)]\s+/
const HEADING = /^\s*#{1,6}\s+/

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = []

  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const last = blocks[blocks.length - 1]

    if (line.trim() === '') {
      // A blank line ends the current paragraph or list.
      if (last && !(last.kind === 'p' && last.lines.length === 0)) {
        blocks.push({ kind: 'p', lines: [] })
      }
      continue
    }

    if (HEADING.test(line)) {
      blocks.push({ kind: 'h', text: line.replace(HEADING, '') })
      continue
    }

    const listKind = BULLET.test(line) ? 'ul' : NUMBERED.test(line) ? 'ol' : null
    if (listKind) {
      const item = line.replace(listKind === 'ul' ? BULLET : NUMBERED, '')
      if (last?.kind === listKind) last.items.push(item)
      else blocks.push({ kind: listKind, items: [item] })
      continue
    }

    if (last?.kind === 'p') last.lines.push(line.trim())
    else blocks.push({ kind: 'p', lines: [line.trim()] })
  }

  return blocks.filter((block) => block.kind !== 'p' || block.lines.length > 0)
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3">
      {parseBlocks(children).map((block, index) => {
        const key = `b${index}`
        if (block.kind === 'h') {
          return (
            <p key={key} className="font-semibold text-bright">
              {renderInline(block.text, key)}
            </p>
          )
        }
        if (block.kind !== 'p') {
          const List = block.kind
          return (
            <List
              key={key}
              className={`flex flex-col gap-1.5 pl-5 ${block.kind === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-faint`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </List>
          )
        }
        return (
          <p key={key}>
            {block.lines.map((line, lineIndex) => (
              <span key={`${key}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, `${key}-${lineIndex}`)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
