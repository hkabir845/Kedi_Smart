/** Decorative KediSmart NFC pet tag — position over a pet photo’s neck. */
export default function NfcTagOnPet({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute z-[2] select-none ${className}`}
      aria-hidden
    >
      {/* Collar strip */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[70%] w-[118%] h-[9px] rounded-full bg-gradient-to-b from-[#2a2a2a] via-[#1a1a1a] to-[#0d0d0d] shadow-md ring-1 ring-black/40" />
      {/* Tag body */}
      <div className="relative flex h-[4.5rem] w-[4.5rem] sm:h-[5.25rem] sm:w-[5.25rem] items-center justify-center rounded-full bg-gradient-to-br from-[#f8f4ef] via-[#e8e0d6] to-[#c4b8a8] shadow-[0_8px_20px_rgba(0,0,0,0.45)] ring-2 ring-[#a89880]/80">
        <div className="absolute inset-[5px] rounded-full bg-gradient-to-b from-white/50 to-transparent" />
        <div className="relative flex flex-col items-center px-1 text-center">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 sm:h-5 sm:w-5 text-[#f26522] mb-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              d="M8.5 15.5a5.5 5.5 0 017 0M6 12.5a9 9 0 0112 0M4 9.5a12 12 0 0116 0"
            />
            <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
          </svg>
          <span className="text-[9px] sm:text-[10px] font-bold leading-none tracking-tight text-[#1a1a1a]">
            KediSmart
          </span>
          <span className="mt-0.5 text-[7px] sm:text-[8px] font-semibold uppercase tracking-wider text-[#f26522]">
            NFC
          </span>
        </div>
        {/* Bail / ring connecting to collar */}
        <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[#8a8070] bg-transparent shadow-sm" />
      </div>
    </div>
  )
}
