import { useParams, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { findDocuments } from '../data/documentMap'
import { loadFinalTestCerts, findFinalTestCert } from '../data/finalTestCerts'
import CableBreakdown from '../components/CableBreakdown'
import DocumentCard from '../components/DocumentCard'

export default function DocumentPage() {
  const { productCode } = useParams()
  const [searchParams] = useSearchParams()
  const code = productCode.toUpperCase()
  const djNumber = searchParams.get('dj')?.toUpperCase().trim() || ''
  const isValidLength = code.length === 13
  const [certsLoaded, setCertsLoaded] = useState(false)

  useEffect(() => {
    loadFinalTestCerts().then(() => setCertsLoaded(true))
  }, [])

  const documents = findDocuments(code)
  const finalTestCert = certsLoaded && djNumber ? findFinalTestCert(djNumber) : null

  // Build the final test cert document object for DocumentCard
  const finalTestDoc = djNumber
    ? finalTestCert
      ? { type: 'Final Test Certificate', name: `Test Certificate — ${djNumber}`, url: finalTestCert.url }
      : null // DJ number present but cert not uploaded yet
    : null // No DJ number in URL

  const allDocs = finalTestDoc ? [...documents, finalTestDoc] : documents
  const hasDjButNoCert = djNumber && !finalTestCert

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 160px, #F0F4F8 160px)' }}>
      {/* Header — logo top-left, product code right */}
      <header className="px-6 pt-5 pb-14">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
          {isValidLength && (
            <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3.5 py-1.5">
              <span className="font-mono text-[13px] text-white tracking-[0.2em] font-medium">
                {code}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-6 pb-8">
        {!isValidLength ? (
          <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-afl-text font-heading">Invalid Product Code</h2>
            <p className="text-afl-muted mt-2">
              "<span className="font-mono font-semibold text-afl-text">{code}</span>" is {code.length} characters.
              AFL product codes are exactly 13 characters.
            </p>
          </div>
        ) : documents.length === 0 && !djNumber ? (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-afl-text font-heading">No Documents Found</h2>
              <p className="text-afl-muted mt-2">
                No documents match "<span className="font-mono font-semibold text-afl-text">{code}</span>".
              </p>
              <p className="text-afl-muted text-sm mt-1">
                This code may not be in our database yet. Contact AFL for assistance.
              </p>
            </div>
            <CableBreakdown productCode={code} defaultOpen />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Documents — THE MAIN EVENT */}
            <div className="bg-white rounded-2xl shadow-sm border border-afl-border overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-afl-muted font-heading">
                  Your Documents
                </h2>
                <span className="text-[11px] font-bold text-afl-cyan uppercase tracking-wider font-heading">
                  {allDocs.length} {allDocs.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div className="px-3 pb-3 space-y-1.5">
                {allDocs.map((doc, i) => (
                  <DocumentCard key={`${doc.type}-${i}`} document={doc} index={i} />
                ))}

              </div>
            </div>

            {/* DJ number badge */}
            {djNumber && (
              <div className="bg-white rounded-2xl shadow-sm border border-afl-border px-5 py-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">DJ Number</span>
                <span className="font-mono text-sm font-semibold text-afl-navy tracking-wide">{djNumber}</span>
              </div>
            )}

            {/* Cable breakdown — collapsed */}
            <CableBreakdown productCode={code} />

            <p className="text-[11px] text-afl-muted text-center pt-2 pb-1">
              Documents provided by AFL. For queries contact your AFL representative.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
