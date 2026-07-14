'use client'

export type TimelineStep = {
  key: string
  label: string
  done?: boolean
  active?: boolean
  detail?: string
}

export default function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  if (!steps?.length) return null

  return (
    <ol className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0 w-full">
      {steps.map((step, index) => {
        const tone = step.done
          ? 'border-primary-600 bg-primary-600 text-white'
          : step.active
            ? 'border-primary-600 bg-primary-50 text-primary-800'
            : 'border-gray-200 bg-white text-gray-400'
        return (
          <li key={step.key} className="flex sm:flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center relative">
            {index < steps.length - 1 && (
              <span
                className={`hidden sm:block absolute top-4 left-[calc(50%+1.1rem)] right-[calc(-50%+1.1rem)] h-0.5 ${
                  step.done ? 'bg-primary-500' : 'bg-gray-200'
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${tone}`}
            >
              {step.done ? '✓' : index + 1}
            </span>
            <div className="min-w-0 sm:mt-2">
              <p className={`text-sm font-semibold ${step.done || step.active ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </p>
              {step.detail && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
