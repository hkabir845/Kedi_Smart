'use client'

import Link from 'next/link'
import { useState } from 'react'
import { downloadOrderPdf } from '@/lib/download-order-pdf'

type Mode = 'invoice' | 'receipt'

type Props = {
  orderId: number | string
  filenameHint?: string
  /** Current document mode for print/PDF */
  mode?: Mode
  onModeChange?: (mode: Mode) => void
  /** Show invoice/receipt toggle (seller manual docs) */
  showModeToggle?: boolean
  /** Link to clean preview (hides edit chrome) */
  previewHref?: string
  /** When true, this page is already the preview surface */
  isPreview?: boolean
  className?: string
  onError?: (message: string) => void
}

const btnBase =
  'min-h-[40px] inline-flex items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors'
const btnPrimary = `${btnBase} bg-primary-600 text-white hover:bg-primary-700 border border-primary-600`
const btnDark = `${btnBase} bg-slate-900 text-white hover:bg-slate-800 border border-slate-900`
const btnGhost = `${btnBase} bg-white text-gray-800 border border-gray-200 hover:bg-gray-50`
const btnActive = `${btnBase} bg-primary-600 text-white border border-primary-600`
const btnIdle = `${btnBase} bg-white text-gray-700 border border-gray-200 hover:bg-gray-50`

export default function InvoiceDocumentToolbar({
  orderId,
  filenameHint,
  mode = 'invoice',
  onModeChange,
  showModeToggle = false,
  previewHref,
  isPreview = false,
  className = '',
  onError,
}: Props) {
  const [busy, setBusy] = useState(false)

  const handleDownload = async () => {
    setBusy(true)
    try {
      await downloadOrderPdf(orderId, mode, filenameHint)
    } catch {
      onError?.('Could not download PDF')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {showModeToggle && onModeChange && (
        <>
          <button
            type="button"
            onClick={() => onModeChange('invoice')}
            className={mode === 'invoice' ? btnActive : btnIdle}
          >
            Invoice
          </button>
          <button
            type="button"
            onClick={() => onModeChange('receipt')}
            className={mode === 'receipt' ? btnActive : btnIdle}
          >
            Receipt
          </button>
        </>
      )}
      {!isPreview && previewHref && (
        <Link href={previewHref} className={btnGhost} target="_blank" rel="noopener noreferrer">
          Preview
        </Link>
      )}
      <button type="button" onClick={() => window.print()} className={btnDark}>
        Print
      </button>
      <button type="button" disabled={busy} onClick={handleDownload} className={btnPrimary}>
        {busy ? 'Downloading…' : 'Download PDF'}
      </button>
    </div>
  )
}
