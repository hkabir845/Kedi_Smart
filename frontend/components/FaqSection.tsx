import type { FaqEntry } from '@/lib/schema'

export default function FaqSection({
  title = 'Frequently asked questions',
  faqs,
}: {
  title?: string
  faqs: FaqEntry[]
}) {
  if (!faqs.length) return null
  return (
    <section className="mt-12 max-w-3xl" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
        {title}
      </h2>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-xl border border-gray-200 bg-white px-4 py-3 open:shadow-sm"
          >
            <summary className="cursor-pointer list-none font-medium text-gray-900 flex items-start justify-between gap-3">
              <span>{faq.question}</span>
              <span
                aria-hidden
                className="shrink-0 text-gray-400 group-open:rotate-45 transition-transform text-lg leading-none"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
