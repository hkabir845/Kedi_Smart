'use client'

type Props = {
  url: string
  label?: string
  size?: number
}

/** Client-side QR via public QR image API (no extra npm dependency). */
export default function QrCodeCard({ url, label = 'Scan QR code', size = 200 }: Props) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        width={size}
        height={size}
        className="rounded-lg bg-white p-2 shadow-sm"
      />
      <p className="text-xs text-gray-500 text-center max-w-[220px] break-all">{url}</p>
    </div>
  )
}
