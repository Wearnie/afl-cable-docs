import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { loadDJMapping, lookupProductCode } from '../data/djLookup'
import { findDocuments } from '../data/documentMap'
import { loadFinalTestCerts, findFinalTestCert } from '../data/finalTestCerts'
import { loadDJOverrides, applyOverrides } from '../data/djOverrides'
import CableBreakdown from '../components/CableBreakdown'
import DocumentCard from '../components/DocumentCard'

export default function DJDocumentPage() {
  const { djNumber } = useParams()
  const dj = djNumber.replace(/\D/g, '') // digits only
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [productCode, setProductCode] = useState(null)

  useEffect(() => {
    Promise.all([loadDJMapping(), loadFinalTestCerts(), loadDJOverrides()])
      .then(() => {
        setProductCode(lookupProductCode(dj))
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [dj])

  const documents = productCode ? applyOverrides(dj, findDocuments(productCode)) : []
  const finalTestCert = findFinalTestCert(dj) || findFinalTestCert('DJ' + dj)
  const finalTestDoc = finalTestCert
    ? { type: 'Final Test Certificate', name: `Test Certificate — ${dj}`, url: finalTestCert.url }
    : null
  const allDocs = finalTestDoc ? [...documents, finalTestDoc] : documents
  const hasDjButNoCert = !finalTestCert

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 160px, #F0F4F8 160px)' }}>
        <header className="px-6 pt-5 pb-14">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
            <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3.5 py-1.5">
              <span className="font-mono text-[13px] text-white tracking-[0.2em] font-medium">
                DJ {dj}
              </span>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 -mt-6 pb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-afl-border overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="px-3 pb-3 space-y-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-afl-light px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-afl-text font-heading">Unable to Load</h2>
          <p className="text-afl-muted mt-2 text-sm">
            We couldn't load the documents right now. Please try again in a moment.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2.5 bg-afl-navy text-white rounded-xl text-sm font-semibold font-heading hover:bg-afl-navy/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 160px, #F0F4F8 160px)' }}>
      <header className="px-6 pt-5 pb-14">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
          <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3.5 py-1.5">
            <span className="font-mono text-[13px] text-white tracking-[0.2em] font-medium">
              DJ {dj}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-6 pb-8">
        {!productCode ? (
          <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-afl-text font-heading">DJ Number Not Found</h2>
            <p className="text-afl-muted mt-2">
              DJ number "<span className="font-mono font-semibold text-afl-text">{dj}</span>" is not in our lookup table.
            </p>
            <p className="text-afl-muted text-sm mt-1">
              This DJ number may not have been registered yet. Contact AFL for assistance.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Documents */}
            <div className="bg-white rounded-2xl shadow-sm border border-afl-border overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-afl-muted font-heading">
                  Your Documents
                </h2>
                <span className="text-[11px] font-bold text-afl-cyan uppercase tracking-wider font-heading">
                  {allDocs.length + (hasDjButNoCert ? 1 : 0)} {allDocs.length + (hasDjButNoCert ? 1 : 0) === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div className="px-3 pb-3 space-y-1.5">
                {allDocs.map((doc, i) => (
                  <DocumentCard key={`${doc.type}-${i}`} document={doc} index={i} />
                ))}

                {hasDjButNoCert && (
                  <div
                    className="card-enter flex items-center gap-4 px-4 py-4 rounded-xl border border-dashed border-afl-border bg-afl-light/50"
                    style={{ animationDelay: `${allDocs.length * 60}ms` }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-500">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[16px] font-bold text-afl-navy leading-tight">
                        Test Certificate
                      </span>
                      <p className="text-amber-600 text-[12px] leading-snug mt-0.5">
                        {dj} — pending upload
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DJ + Product Code badges */}
            <div className="bg-white rounded-2xl shadow-sm border border-afl-border px-5 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">DJ Number</span>
                <span className="font-mono text-sm font-semibold text-afl-navy tracking-wide">{dj}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">Product Code</span>
                <span className="font-mono text-sm font-semibold text-afl-navy tracking-wide">{productCode}</span>
              </div>
            </div>

            {/* Cable breakdown */}
            <CableBreakdown productCode={productCode} />

            <p className="text-[11px] text-afl-muted text-center pt-2 pb-1">
              Documents provided by AFL. For queries contact your AFL representative.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
