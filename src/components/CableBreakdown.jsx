import { useState } from 'react'
import { decodeProductCode } from '../data/documentMap'

export default function CableBreakdown({ productCode, defaultOpen = false }) {
  const breakdown = decodeProductCode(productCode)
  const [open, setOpen] = useState(defaultOpen)

  if (breakdown.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-afl-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-afl-navy/8 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-afl-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-[13px] font-semibold text-afl-text font-heading">Product Code Breakdown</h3>
            <p className="font-mono text-[11px] text-afl-muted tracking-[0.15em] mt-0.5">{productCode.toUpperCase()}</p>
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-afl-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="slide-down border-t border-afl-border">
          <div className="divide-y divide-gray-50">
            {breakdown.map((field) => (
              <div key={field.positions} className="flex items-start px-5 py-3">
                <span className="text-afl-muted w-9 shrink-0 font-mono text-[11px] pt-0.5">
                  {field.positions}
                </span>
                <span className="bg-afl-navy text-white font-mono px-2 py-0.5 rounded text-[11px] shrink-0 mr-3 font-medium">
                  {field.code}
                </span>
                <div className="min-w-0">
                  <span className="text-afl-muted text-[11px]">{field.label}</span>
                  <p className="text-afl-text font-medium text-[13px]">{field.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
