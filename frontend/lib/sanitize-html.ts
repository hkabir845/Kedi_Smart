import { Marked } from 'marked'
import sanitizeHtmlLibrary from 'sanitize-html'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  's',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'h4',
  'a',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'code',
  'pre',
  'hr',
]

/** Sanitize CMS-authored HTML before rendering it in public pages. */
export function sanitizeContentHtml(value?: string | null): string {
  if (!value) return ''

  return sanitizeHtmlLibrary(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
      th: ['scope', 'colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
        },
      }),
      img: (_tagName, attribs) => ({
        tagName: 'img',
        attribs: {
          ...attribs,
          alt: attribs.alt || '',
          loading: attribs.loading || 'lazy',
        },
      }),
    },
  })
}

/** Render GFM Markdown (or embedded HTML) and sanitize the result. */
export function renderContentHtml(value?: string | null): string {
  if (!value) return ''

  const headingCounts = new Map<string, number>()
  const markdown = new Marked({
    gfm: true,
    breaks: false,
  })
  markdown.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens)
        const text = sanitizeHtmlLibrary(html, { allowedTags: [], allowedAttributes: {} }).trim()
        const base =
          text
            .toLowerCase()
            .replace(/[^a-z0-9\u0980-\u09FF]+/gi, '-')
            .replace(/^-|-$/g, '') || 'section'
        const count = headingCounts.get(base) || 0
        headingCounts.set(base, count + 1)
        const id = count ? `${base}-${count + 1}` : base
        return `<h${depth} id="${id}">${html}</h${depth}>`
      },
    },
  })

  return sanitizeContentHtml(markdown.parse(value) as string)
}
