import Link from 'next/link'
import type { BreadcrumbItem } from '@/lib/schema'

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${item.path}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="text-gray-300">
                  /
                </span>
              )}
              {last ? (
                <span aria-current="page" className="text-gray-800 font-medium line-clamp-1">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="hover:text-primary-700 transition-colors">
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
