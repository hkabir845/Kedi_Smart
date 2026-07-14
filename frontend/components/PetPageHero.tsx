import Link from 'next/link'

type Crumb = {
  label: string
  href?: string
}

type Props = {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  children?: React.ReactNode
}

export default function PetPageHero({ title, description, breadcrumbs, children }: Props) {
  const crumbs: Crumb[] = breadcrumbs ?? [{ label: 'Home', href: '/' }, { label: title }]

  return (
    <div className="mb-4">
      <nav className="text-xs text-gray-500 mb-3 flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={`${crumb.label}-${i}`} className="contents">
              {i > 0 && <span>/</span>}
              {isLast || !crumb.href ? (
                <span className="text-gray-800 font-medium">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-primary-700 hover:underline">
                  {crumb.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-gray-600 mt-1 max-w-2xl leading-relaxed">{description}</p>
            )}
          </div>
          {children ? <div className="shrink-0 flex items-center gap-2">{children}</div> : null}
        </div>
      </div>
    </div>
  )
}
