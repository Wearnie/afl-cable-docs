import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { loadDJMapping, lookupProductCode } from '../data/djLookup'
import { findDocuments } from '../data/documentMap'
import { docTypeInfo } from '../data/documentMap'
import { findFinalTestCert } from '../data/finalTestCerts'
import QRGenerator from '../components/QRGenerator'

export default function GeneratePage() {
  const [djInput, setDjInput] = useState('')
  const [mappingLoaded, setMappingLoaded] = useState(false)
  const djNumber = djInput.replace(/\D/g, '') // digits only

  useEffect(() => {
    loadDJMapping().then(() => setMappingLoaded(true))
  }, [])

  const productCode = mappingLoaded ? lookupProductCode(djNumber) : null
  const isValid = djNumber.length === 8
  const documents = useMemo(() => (productCode ? findDocuments(productCode) : []), [productCode])
  const finalTestCert = useMemo(() => findFinalTestCert(djNumber) || findFinalTestCert('DJ' + djNumber), [djNumber])

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:5173'

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #003366 0%, #003366 160px, #F0F4F8 160px)' }}>
      {/* Header */}
      <header className="px-6 pt-5 pb-14 no-print">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/afl-logo.svg" alt="AFL" className="h-12 w-auto" />
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-lg font-bold text-white font-heading">QR Code Generator</h1>
              <p className="text-blue-300 text-sm">Generate QR labels for cable drums</p>
            </div>
          </div>
          <Link to="/" className="text-blue-300 hover:text-white text-sm font-medium transition-colors">
            Home
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-6 pb-8 space-y-4 no-print">
        {/* Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-2 font-heading">
                DJ Number
              </label>
              <input
                type="text"
                value={djInput}
                onChange={(e) => setDjInput(e.target.value)}
                placeholder="e.g. 03429835"
                maxLength={8}
                className="w-full px-4 py-3 border border-afl-border rounded-xl font-mono text-lg tracking-[0.15em] focus:outline-none focus:ring-2 focus:ring-afl-cyan focus:border-transparent transition-shadow"
                autoFocus
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs font-medium ${djNumber.length === 8 ? 'text-emerald-600' : 'text-afl-muted'}`}>
                  {djNumber.length}/8 digits
                </span>
                {djNumber.length > 0 && djNumber.length !== 8 && (
                  <span className="text-xs text-amber-500 font-medium">
                    {8 - djNumber.length} more needed
                  </span>
                )}
              </div>
            </div>

            {/* Resolved product code */}
            {isValid && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-afl-light border border-afl-border">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted font-heading">Product Code</span>
                {productCode ? (
                  <span className="font-mono text-sm font-semibold text-afl-navy tracking-[0.15em]">{productCode}</span>
                ) : (
                  <span className="text-sm text-amber-600 font-medium">Not found in lookup — QR will still generate</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* QR Code + preview */}
        {isValid && (
          <>
            <QRGenerator djNumber={djNumber} productCode={productCode} baseUrl={baseUrl} />

            <div className="bg-white rounded-2xl shadow-sm border border-afl-border p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-afl-muted mb-3 font-heading">
                Documents that will appear ({documents.length + (djNumber ? 1 : 0)})
              </h3>
              {documents.length > 0 || djNumber ? (
                <div className="space-y-2.5">
                  {documents.map((doc, i) => {
                    const info = docTypeInfo[doc.type] || docTypeInfo.Other
                    return (
                      <div key={`${doc.type}-${i}`} className="flex items-center gap-3 text-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-afl-navy" style={{ minWidth: '110px' }}>
                          {info.label}
                        </span>
                        <span className="text-afl-text truncate text-[13px]">{doc.name}</span>
                      </div>
                    )
                  })}
                  {djNumber && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-afl-navy" style={{ minWidth: '110px' }}>
                        Final Test Cert
                      </span>
                      <span className="text-afl-text truncate text-[13px]">
                        {finalTestCert ? finalTestCert.name : `${djNumber} — pending upload`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-afl-muted text-sm">
                  {productCode
                    ? 'No documents match this product code. The QR will still work.'
                    : 'DJ number not in lookup table. Documents will show once mapping is added.'}
                </p>
              )}
            </div>

            <div className="text-center">
              <Link
                to={`/dj/${djNumber}`}
                className="inline-block px-5 py-2 bg-afl-cyan text-white rounded-lg text-sm font-semibold uppercase tracking-wider hover:brightness-110 transition font-heading"
              >
                Preview customer page →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
