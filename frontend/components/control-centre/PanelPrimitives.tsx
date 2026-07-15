import Link from 'next/link'
import type { ReactNode } from 'react'

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900 tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  )
}

export function StatusPill({
  tone = 'neutral',
  children,
}: {
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  children: ReactNode
}) {
  const tones = {
    success: 'bg-green-50 text-green-800',
    warning: 'bg-amber-50 text-amber-900',
    danger: 'bg-red-50 text-red-800',
    info: 'bg-sky-50 text-sky-900',
    neutral: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function QuickLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="block bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-100 transition-all"
    >
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  )
}

export function PanelNotice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'success'
  children: ReactNode
}) {
  const tones = {
    info: 'bg-sky-50 border-sky-200 text-sky-950',
    warning: 'bg-amber-50 border-amber-200 text-amber-950',
    success: 'bg-green-50 border-green-200 text-green-950',
  }
  return (
    <div className={`text-sm border rounded-lg px-4 py-3 ${tones[tone]}`}>{children}</div>
  )
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

export function SectionHeading({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
  )
}
